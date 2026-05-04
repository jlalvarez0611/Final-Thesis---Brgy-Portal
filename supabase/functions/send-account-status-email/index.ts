import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Status = 'approved' | 'rejected';

function buildEmailHtml(fullName: string, status: Status, siteName: string): { subject: string; html: string } {
  const safeName = fullName?.trim() || 'Resident';
  if (status === 'approved') {
    return {
      subject: `${siteName}: Your account has been approved`,
      html: `
        <p>Hello ${escapeHtml(safeName)},</p>
        <p>Your registration for the <strong>${escapeHtml(siteName)}</strong> has been <strong>approved</strong>.</p>
        <p>You can now sign in and use the resident portal.</p>
        <p style="color:#64748b;font-size:12px;margin-top:24px;">This is an automated message. Please do not reply to this email.</p>
      `,
    };
  }
  return {
    subject: `${siteName}: Update on your registration`,
    html: `
      <p>Hello ${escapeHtml(safeName)},</p>
      <p>We are writing to inform you that your registration for the <strong>${escapeHtml(siteName)}</strong> was <strong>not approved</strong> at this time.</p>
      <p>If you believe this is a mistake, you may contact the barangay office for more information.</p>
      <p style="color:#64748b;font-size:12px;margin-top:24px;">This is an automated message. Please do not reply to this email.</p>
    `,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendKey = Deno.env.get('RESEND_API_KEY')?.trim();
    const emailFrom = (Deno.env.get('EMAIL_FROM') || 'Barangay Portal <onboarding@resend.dev>').trim();
    const siteName = Deno.env.get('SITE_NAME') || 'Barangay Tubigan Florinda Community Portal';

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Server misconfigured (Supabase)' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!resendKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY is not set for this function' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser(jwt);
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid session', detail: userErr?.message ?? 'no user' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: adminProfile, error: profErr } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profErr || adminProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const status = body?.status as Status;

    if (status !== 'approved' && status !== 'rejected') {
      return new Response(JSON.stringify({ error: 'status must be approved or rejected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let toEmail = '';
    let fullName = '';

    const targetUserId = typeof body?.target_user_id === 'string' ? body.target_user_id.trim() : '';
    if (targetUserId) {
      const { data: targetProfile, error: targetErr } = await admin
        .from('profiles')
        .select('email, full_name, role')
        .eq('id', targetUserId)
        .maybeSingle();

      if (targetErr || !targetProfile || targetProfile.role !== 'resident') {
        return new Response(JSON.stringify({ error: 'Target resident not found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      fullName = (targetProfile.full_name || '').trim();
      toEmail = (targetProfile.email || '').trim();
      if (!toEmail || !toEmail.includes('@')) {
        const { data: authData } = await admin.auth.admin.getUserById(targetUserId);
        toEmail = (authData?.user?.email || '').trim();
      }
    } else {
      const raw = typeof body?.to_email === 'string' ? body.to_email.trim() : '';
      toEmail = raw;
      fullName = typeof body?.full_name === 'string' ? body.full_name.trim() : '';
    }

    if (!toEmail || !toEmail.includes('@')) {
      return new Response(
        JSON.stringify({
          error: 'Invalid or missing email',
          hint: 'Use target_user_id in the request body, or ensure profiles.email / auth email is set for the resident.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { subject, html } = buildEmailHtml(fullName, status, siteName);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [toEmail],
        subject,
        html,
      }),
    });

    const resendBody = (await res.json().catch(() => ({}))) as {
      message?: string;
      name?: string;
      statusCode?: number;
    };
    if (!res.ok) {
      console.error('Resend error:', res.status, resendBody);
      const msg = resendBody?.message || '';
      const isTestModeRestriction =
        res.status === 403 && /verify a domain|only send testing emails/i.test(msg);
      const hint = isTestModeRestriction
        ? 'Resend is in test mode: you can only send to your Resend account email, or use a verified domain. Fix: (1) Open https://resend.com/domains and add + verify your domain. (2) Set Edge Function secret EMAIL_FROM to an address on that domain, e.g. Barangay Portal <noreply@yourdomain.com>. (3) Redeploy or secrets apply automatically on next invoke.'
        : undefined;
      return new Response(
        JSON.stringify({
          error: 'Resend API error',
          details: resendBody,
          ...(hint ? { hint } : {}),
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ ok: true, id: (resendBody as { id?: string }).id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
