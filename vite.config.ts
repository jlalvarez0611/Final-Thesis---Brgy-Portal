import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '')
  // Vercel sets VERCEL_URL (no protocol). If VITE_SITE_URL is missing in env files, use it so Supabase
  // redirect_to matches your deployment and is not replaced by localhost Site URL.
  const viteSiteUrlFromHost =
    fileEnv.VITE_SITE_URL?.trim() ||
    process.env.VITE_SITE_URL?.trim() ||
    (process.env.VERCEL === '1' && process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : '') ||
    ''

  return {
    plugins: [react()],
    define: viteSiteUrlFromHost
      ? { 'import.meta.env.VITE_SITE_URL': JSON.stringify(viteSiteUrlFromHost) }
      : {},
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    base: './',
    server: {
      headers: {
        'X-Frame-Options': 'DENY',
        'Content-Security-Policy': "frame-ancestors 'none'",
      },
    },
  }
})
