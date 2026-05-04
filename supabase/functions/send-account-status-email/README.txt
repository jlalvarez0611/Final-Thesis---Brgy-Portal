Deploy and configure (Supabase Dashboard or CLI):

1) Run SQL migration: supabase/migrations/add_registration_status.sql

2) Set Edge Function secrets:
   RESEND_API_KEY   = API key from https://resend.com
   EMAIL_FROM       = sender shown to recipients (see Resend rules below)
   SITE_NAME        = optional display name in emails

   supabase secrets set RESEND_API_KEY=re_xxxx
   supabase secrets set EMAIL_FROM="Barangay Portal <noreply@YOUR_DOMAIN.com>"

3) Deploy:
   supabase functions deploy send-account-status-email
   (Keep JWT verification enabled so only authenticated users can call the function; the function checks admin role.)

Supabase auto-provides SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

--- Resend: testing vs production ---

Without a verified domain, Resend only delivers "test" mail to YOUR account email (the email you used to sign up at Resend). Sending approve/reject mail to random resident addresses returns 403 until you:

  A) Verify a domain: https://resend.com/domains — add DNS records, wait for verification.

  B) Set EMAIL_FROM to an address on that domain, for example:
     "Barangay Portal <noreply@barangay-example.gov.ph>"

  C) No need to change code; the next invoke uses the new secret.

Default in code if EMAIL_FROM is unset: onboarding@resend.dev — still subject to Resend test-mode recipient rules.
