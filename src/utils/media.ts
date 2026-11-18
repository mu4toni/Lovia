/**
 * Normalizes Supabase storage URLs to proxied /supabase-proxy/storage/
 * to ensure images load reliably in regions where direct *.supabase.co is restricted.
 */
export function normalizeMediaUrl(url?: string | null): string {
  if (!url) return '';
  return url.replace(/https:\/\/[^/]+\.supabase\.co\/storage\//i, '/supabase-proxy/storage/');
}
