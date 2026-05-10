import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const siteUrl = import.meta.env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. See .env.example for reference.'
  );
}

// Validate URL format
if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
  console.warn('Warning: Supabase URL format may be incorrect. Expected format: https://xxxxx.supabase.co');
}

// Validate API key format (anon key is typically a JWT, should be long)
if (supabaseAnonKey.length < 100) {
  console.warn('Warning: Supabase API key seems too short. Make sure you are using the anon/public key, not the service_role key.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const normalizeSiteUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (parsed.protocol !== 'https:' && !isLocalhost) {
      console.warn(
        `VITE_SITE_URL does not use HTTPS. For production, set VITE_SITE_URL to a secure https:// origin.`
      );
    }
    return parsed.origin;
  } catch {
    return url;
  }
};

export const SITE_URL = normalizeSiteUrl(siteUrl);

// Log the resolved site origin so we can verify the password reset redirect target.
if (typeof window !== 'undefined') {
  console.log('Supabase redirect SITE_URL =', SITE_URL);
}

export const getSafeRedirectUrl = (pathname: string) => {
  try {
    return new URL(pathname, SITE_URL).toString();
  } catch {
    return SITE_URL.replace(/\/+$/, '') + '/' + pathname.replace(/^\/+/, '');
  }
};

export interface Profile {
  id: string;
  email: string;
  username: string;
  full_name: string;
  last_name: string;
  first_name: string;
  middle_name: string;
  suffix: string;
  sex: string;
  date_of_birth: string;
  place_of_birth: string;
  civil_status: string;
  nationality: string;
  mobile_number: string;
  id_image_path?: string | null;
  selfie_image_path?: string | null;
  role: 'admin' | 'resident';
  home_no?: string;
  address?: string;
  contact_number?: string;
  /** pending = awaiting admin; approved = active; rejected = registration denied */
  registration_status?: 'pending' | 'approved' | 'rejected' | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string; 
}
