/**
 * Stale-While-Revalidate (SWR) Local Storage Cache for Lovia.
 *
 * Кэширует данные активной пары в localStorage под ключом с coupleId (`lovia_swr_cache_<coupleId>`).
 * Позволяет приложению открываться МГНОВЕННО (0 мс) с данными предыдущей сессии,
 * пока в фоне происходит тихая синхронизация с Supabase.
 *
 * Защита квоты localStorage: тяжёлые base64 data:image строки (> 2 КБ) никогда не пишутся
 * в SWR-кэш — все фото должны храниться по URL (/supabase-proxy/storage/...).
 */

export interface SwrCoupleData {
  couple?: any;
  reminders?: any[];
  wishlist?: any[];
  dates?: any[];
  memories?: any[];
  checklist?: any[];
  updatedAt?: string;
}

const CACHE_PREFIX = 'lovia_swr_cache_';
const MAX_INLINE_DATA_URL_LEN = 2048;

function stripHeavyBase64<T>(value: T): T {
  if (typeof value === 'string') {
    if (value.startsWith('data:image') && value.length > MAX_INLINE_DATA_URL_LEN) {
      return '' as unknown as T;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => stripHeavyBase64(item))
      .filter((item) => item !== '') as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = stripHeavyBase64(v);
      out[k] = cleaned === '' && typeof v === 'string' && v.startsWith('data:image') ? undefined : cleaned;
    }
    return out as T;
  }
  return value;
}

export function getSwrCacheKey(coupleId: string): string {
  return `${CACHE_PREFIX}${coupleId}`;
}

export function getSwrCache(coupleId: string): SwrCoupleData | null {
  if (!coupleId || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getSwrCacheKey(coupleId));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('[swrCache] Failed to read SWR cache:', e);
    return null;
  }
}

export function getSwrCacheSection<K extends keyof SwrCoupleData>(
  coupleId: string,
  section: K
): SwrCoupleData[K] | undefined {
  const cache = getSwrCache(coupleId);
  return cache?.[section];
}

export function updateSwrCache<K extends keyof SwrCoupleData>(
  coupleId: string,
  section: K,
  data: SwrCoupleData[K]
): void {
  if (!coupleId || typeof window === 'undefined') return;
  try {
    const key = getSwrCacheKey(coupleId);
    const current: SwrCoupleData = getSwrCache(coupleId) || {};
    current[section] = stripHeavyBase64(data);
    current.updatedAt = new Date().toISOString();
    localStorage.setItem(key, JSON.stringify(current));
  } catch (e) {
    console.warn('[swrCache] Failed to write SWR cache:', e);
  }
}

export function clearSwrCache(coupleId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (coupleId) {
      localStorage.removeItem(getSwrCacheKey(coupleId));
    }
    // Очищаем любые ключи с префиксом lovia_swr_cache_
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(k);
      }
    }
  } catch (e) {
    console.warn('[swrCache] Failed to clear SWR cache:', e);
  }
}
