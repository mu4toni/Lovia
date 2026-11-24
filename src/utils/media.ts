/**
 * Normalizes Supabase storage URLs to proxied /supabase-proxy/storage/
 * to ensure images load reliably in regions where direct *.supabase.co is restricted.
 */
export function normalizeMediaUrl(url?: string | null): string {
  if (!url) return '';
  return url.replace(/https:\/\/[^/]+\.supabase\.co\/storage\//i, '/supabase-proxy/storage/');
}

/**
 * Returns a server-proxied image URL (/api/scrape-product?proxyImage=...) for
 * external http(s) product photos that may block direct hotlinking or Referer.
 * Returns null for already-proxied, relative, data:, or blob: URLs.
 */
export function getProxyImageUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith('/api/scrape-product') ||
    trimmed.startsWith('/supabase-proxy/') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return null;
  }
  const normalized = normalizeMediaUrl(trimmed);
  if (!/^https?:\/\//i.test(normalized)) {
    return null;
  }
  return `/api/scrape-product?proxyImage=${encodeURIComponent(normalized)}`;
}
