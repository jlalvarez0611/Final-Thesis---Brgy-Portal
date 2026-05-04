import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

Deno.serve(async (req) => {
  try {
    const { user_id, storage_paths } = await req.json();

    if (!user_id || typeof user_id !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing user_id' }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), {
        status: 500,
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Best-effort: remove uploaded verification images (if provided)
    if (Array.isArray(storage_paths) && storage_paths.length > 0) {
      await admin.storage.from('resident-verification').remove(storage_paths);
    }

    // Remove any profile row if it exists (best-effort)
    await admin.from('profiles').delete().eq('id', user_id);

    // Delete the auth user
    const { error } = await admin.auth.admin.deleteUser(user_id);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500 });
  }
});

