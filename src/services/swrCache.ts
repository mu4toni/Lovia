/**
 * Stale-While-Revalidate (SWR) Local Storage Cache for Lovia.
 *
 * Кэширует данные активной пары в localStorage под ключом с coupleId (`lovia_swr_cache_<coupleId>`).
 * Позволяет приложению открываться МГНОВЕННО (0 мс) с данными предыдущей сессии,
 * пока в фоне происходит тихая синхронизация с Supabase.
 */

export interface SwrCoupleData {
  couple?: any;
  reminders?: any[];
  wishlist?: any[];
  dates?: any[];
  memories?: any[];
  updatedAt?: string;
}

const CACHE_PREFIX = 'lovia_swr_cache_';

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
    current[section] = data;
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
