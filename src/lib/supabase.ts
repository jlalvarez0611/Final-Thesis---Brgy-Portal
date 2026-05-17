import { createClient, type Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const envSiteUrl = import.meta.env.VITE_SITE_URL as string | undefined;
const runtimeOrigin = typeof window !== 'undefined' ? window.location.origin : '';

const isLocalhostHost = (host: string) =>
  host === 'localhost' || host === '127.0.0.1' || host === '[::1]';

const siteUrl = (() => {
  if (envSiteUrl) {
    const isEnvLocalhost = envSiteUrl.includes('localhost') || envSiteUrl.includes('127.0.0.1');
    if (isEnvLocalhost && runtimeOrigin && !runtimeOrigin.includes('localhost') && !runtimeOrigin.includes('127.0.0.1')) {
      return runtimeOrigin;
    }
    return envSiteUrl;
  }
  return runtimeOrigin;
})();

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
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const normalizeSiteUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const isLocalhost = isLocalhostHost(parsed.hostname);
    if (parsed.protocol !== 'https:' && !isLocalhost) {
      console.warn(
        `Site URL does not use HTTPS. For production, use a secure https:// URL for auth redirects.`
      );
    }
    return parsed.origin;
  } catch {
    return url;
  }
};

/** Full public app root (origin + path); enforces HTTPS warning for production hosts. */
const normalizeAppBaseUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const isLocalhost = isLocalhostHost(parsed.hostname);
    if (parsed.protocol !== 'https:' && !isLocalhost) {
      console.warn(
        `Site URL does not use HTTPS. For production, use a secure https:// URL for auth redirects.`
      );
    }
    const path = parsed.pathname.replace(/\/+$/, '');
    return path ? `${parsed.origin}${path}` : parsed.origin;
  } catch {
    return url.replace(/\/+$/, '');
  }
};

export const SITE_URL = normalizeSiteUrl(siteUrl);

/** `VITE_SITE_URL` may include a path by mistake; redirect base must be origin (+ optional `base` path only). */
function siteOriginFromEnv(): string | null {
  if (!envSiteUrl?.trim()) return null;
  try {
    return new URL(envSiteUrl.trim()).origin;
  } catch {
    return null;
  }
}

function envOriginIsProduction(origin: string): boolean {
  return Boolean(
    origin &&
      !origin.includes('localhost') &&
      !origin.includes('127.0.0.1')
  );
}

/** App root including GitHub Pages repo path (uses Vite `base` + current page). */
function resolveAppBaseUrl(): string {
  if (typeof window === 'undefined') {
    return SITE_URL.replace(/\/+$/, '');
  }
  const base = import.meta.env.BASE_URL || '/';
  const resolved = new URL(base, window.location.href);
  const path = resolved.pathname.replace(/\/+$/, '');
  return path ? `${resolved.origin}${path}` : resolved.origin;
}

/**
 * Base URL for email confirmation and password reset redirects.
 * In production builds, prefer `VITE_SITE_URL` origin so Vercel always sends the real site to Supabase
 * (avoids Supabase falling back to dashboard "Site URL" when redirect_to mismatches).
 * On the live non-localhost page, also respect subdirectory from Vite `base` when env is only an origin.
 */
function resolveRedirectBaseUrl(): string {
  const envOrigin = siteOriginFromEnv();

  if (import.meta.env.PROD && envOrigin && envOriginIsProduction(envOrigin)) {
    if (typeof window !== 'undefined') {
      try {
        const fromWindow = resolveAppBaseUrl();
        const windowOrigin = window.location.origin;
        const pathSuffix = fromWindow.startsWith(windowOrigin)
          ? fromWindow.slice(windowOrigin.length)
          : '';
        if (pathSuffix && pathSuffix !== '/') {
          return normalizeAppBaseUrl(`${envOrigin}${pathSuffix}`);
        }
      } catch {
        /* use env origin only */
      }
    }
    return normalizeAppBaseUrl(envOrigin);
  }

  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (!isLocalhostHost(hostname)) {
      try {
        return normalizeAppBaseUrl(resolveAppBaseUrl());
      } catch {
        /* fall through */
      }
    }
  }

  if (envOrigin) {
    return normalizeAppBaseUrl(envOrigin);
  }

  return SITE_URL;
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  console.debug('[auth redirects] VITE_SITE_URL =', envSiteUrl ?? '(unset)');
  console.debug('[auth redirects] resolved base =', resolveRedirectBaseUrl());
}

/**
 * Supabase email links (signup confirm, password reset) must match Redirect URLs (e.g. https://YOUR_DOMAIN/**).
 * Use /auth so App routing opens the login shell immediately; PKCE ?code= is still appended by Supabase.
 */
export const getAuthEmailRedirectUrl = () => getSafeRedirectUrl('/auth?mode=login');

export const getSafeRedirectUrl = (pathname: string) => {
  const base = resolveRedirectBaseUrl().replace(/\/+$/, '');
  if (
    import.meta.env.PROD &&
    (base.includes('localhost') || base.includes('127.0.0.1'))
  ) {
    console.error(
      '[Auth] Production build is using localhost for auth redirects. Set VITE_SITE_URL in Vercel (or rely on VERCEL_URL via vite.config). In Supabase set Site URL to your HTTPS app and add Redirect URL: https://YOUR_DOMAIN/**'
    );
  }
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  try {
    return new URL(path.slice(1), `${base}/`).toString();
  } catch {
    return `${base}${path}`;
  }
};

/** Password reset only — adds type=recovery so the app shows the new-password form without relying on auth events alone. */
export const getPasswordResetRedirectUrl = () =>
  getSafeRedirectUrl('/auth?mode=login&type=recovery');

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    const padded = pad ? b64 + '='.repeat(4 - pad) : b64;
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function amrHasRecoveryMethod(amr: unknown): boolean {
  if (!Array.isArray(amr)) return false;
  return amr.some((entry) => {
    if (entry === 'recovery') return true;
    if (entry && typeof entry === 'object' && 'method' in entry) {
      return (entry as { method?: string }).method === 'recovery';
    }
    return false;
  });
}

/** True when this access token was issued for the password-recovery flow (PKCE may skip PASSWORD_RECOVERY event). */
export function isPasswordRecoverySession(session: Session | null): boolean {
  if (!session?.access_token) return false;
  const payload = decodeJwtPayload(session.access_token);
  if (!payload) return false;
  return amrHasRecoveryMethod(payload.amr);
}

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
  pending_selfie_path?: string | null;
  pending_selfie_status?: 'pending' | 'approved' | 'rejected' | null;
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
