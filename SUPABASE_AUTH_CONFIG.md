# Supabase Authentication Configuration Guide

## Problem
`AuthApiError: Anonymous sign-ins are disabled`

This error occurs when registering new accounts because Supabase authentication settings conflict with email confirmation requirements.

## Solution

### Option 1: Disable Email Confirmation (Recommended for Development)

This is the quickest solution if you want to allow immediate account creation.

1. Go to your **Supabase Project Dashboard**
2. Navigate to **Authentication** → **Providers**
3. Click on **Email**
4. Uncheck the box: **"Confirm email"** (or set it to OFF)
5. Click **Save**

### Option 2: Enable Auto-Confirm for Email (Recommended for Testing)

If you want email confirmation but auto-confirm new registrations:

1. Go to your **Supabase Project Dashboard**
2. Navigate to **Authentication** → **Providers**
3. Click on **Email**
4. Enable: **"Confirm email"** (set to ON)
5. Go to **Authentication** → **Email Templates**
6. Create a test email or use the default confirmation email
7. In your app, users will need to confirm their email via a link sent to their email

### Option 3: Keep Email Confirmation with Manual Admin Approval

If you want email confirmation AND admin approval:

1. Keep email confirmation enabled in Supabase settings
2. Users will receive a confirmation email
3. After confirming email, they'll appear in admin panel as pending
4. Admin approves them to fully activate the account

## Disable Anonymous Sign-Ins (If Needed)

If you see issues related to anonymous sessions:

1. Go to **Authentication** → **Providers**
2. Look for **Anonymous** option
3. Make sure it's **disabled**

## Environment Configuration

Make sure your `.env` file has:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SITE_URL=http://localhost:3000
```

**Important for Production:**
- Set `VITE_SITE_URL` to your production domain (e.g., `https://yourdomain.com`)
- This ensures password reset links redirect to the correct URL when deployed
- For local development, use `http://localhost:3000`

## Test the Registration

After making changes:

1. **Clear browser cache** and cookies (or use incognito/private mode)
2. Go to register page
3. Fill in all fields
4. Accept terms
5. Click Register
6. You should see "Registration successful!" message
7. Check admin dashboard → Residents → Pending

## If Still Getting Error

1. Open browser **Developer Console** (F12)
2. Look for detailed error messages in the Console tab
3. Check your Supabase **Authentication** logs:
   - Go to your Supabase dashboard
   - Navigate to **Authentication** → **User Management**
   - Check if users are being created
   - Look for error logs in **Logs** section

## Email Configuration for Production

For production, you'll want to:

1. Set up a custom SMTP service or use Supabase's SendGrid integration
2. Configure proper email templates for confirmation
3. Use secure password requirements
4. Enable MFA (Multi-Factor Authentication)

## Quick Checklist

- [ ] Email confirmation disabled (or properly configured)
- [ ] Anonymous sign-ins disabled
- [ ] `VITE_SUPABASE_URL` set correctly
- [ ] `VITE_SUPABASE_ANON_KEY` set correctly
- [ ] Browser cache cleared
- [ ] Profiles table has all required columns (see DATABASE_SCHEMA_UPDATE.md)
- [ ] Test registration works
- [ ] New accounts appear in admin pending section

## Need Help?

If the error persists:

1. Check your Supabase project status
2. Verify authentication settings in Supabase dashboard
3. Check browser console for detailed error messages
4. Check Supabase authentication logs
5. Try registering in an incognito/private browser window
