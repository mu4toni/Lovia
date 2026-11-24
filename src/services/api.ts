import { supabase, isSupabaseConfigured, Database } from '../lib/supabase';
import { telegramService } from './telegramService';
import { isLocalDevHost } from '../utils/env';

export { supabase, isSupabaseConfigured };
export type { Database };

/**
 * Проверка, следует ли перенаправлять запросы к базе данных через серверный защищённый шлюз /api/db.
 * В продакшене внутри Telegram Mini App все операции работают исключительно через сервер.
 */
export function shouldUseServerDb(): boolean {
  return telegramService.isTelegramEnv();
}

const NETWORK_ERROR_MSG = 'Нет соединения с сервером. Проверьте интернет и попробуйте ещё раз.';

function isNetworkError(err: any): boolean {
  if (!err) return false;
  if (err.name === 'AbortError') return true;
  const msg = String(err.message || err).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('abort') ||
    msg.includes('timeout')
  );
}

async function doFetchAttempt(headers: Record<string, string>, body: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch('/api/db', {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Единый защищённый клиентский метод вызова серверного шлюза /api/db с авторизацией через Telegram initData.
 * Включает таймаут AbortController на 12 секунд, автоповтор (1 retry через 600 мс) при сетевых сбоях
 * и понятное сообщение при обрыве связи.
 */
export async function callServerDb<T>(action: string, payload?: any): Promise<T> {
  const initData = telegramService.getInitData();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (initData) {
    headers['x-telegram-init-data'] = initData;
  }
  const body = JSON.stringify({ action, payload });

  let response: Response;
  try {
    response = await doFetchAttempt(headers, body);
  } catch (err: any) {
    if (isNetworkError(err)) {
      // 1 автоматический повтор через 600 мс при сетевой ошибке / таймауте
      await new Promise((resolve) => setTimeout(resolve, 600));
      try {
        response = await doFetchAttempt(headers, body);
      } catch (retryErr: any) {
        console.warn('[callServerDb] Network error after retry:', retryErr?.message || retryErr);
        throw new Error(NETWORK_ERROR_MSG);
      }
    } else {
      throw err;
    }
  }

  if (!response.ok) {
    let errMsg = `Ошибка сервера (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson.error) errMsg = errJson.error;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  let result: any;
  try {
    result = await response.json();
  } catch {
    throw new Error('Некорректный ответ от сервера');
  }

  if (!result || !result.ok) {
    throw new Error(result?.error || 'Запрос к серверу завершился с ошибкой');
  }

  return result.data as T;
}

export interface UserRecord {
  id: string;
  name: string;
  gender?: 'male' | 'female';
  avatarUrl?: string;
  joinedDate?: string;
  coupleId?: string | null;
  timezoneOffset?: number;
  notificationsEnabled?: boolean;
}

/**
 * Гарантирует наличие записи пользователя в public.users перед любыми операциями с public.couples.
 * Выполняет upsert по первичному ключу id.
 * Автоматически сохраняет часовой пояс браузера (в минутах, например 180 для UTC+3)
 * и статус разрешения уведомлений.
 */
export async function ensureUserInSupabase(user: UserRecord): Promise<void> {
  if (shouldUseServerDb()) {
    return;
  }
  if (!isSupabaseConfigured()) {
    if (!isLocalDevHost()) {
      throw new Error('Не настроены ключи Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
    }
    return;
  }

  const tgUser = telegramService.getTelegramUser();
  let telegramId = tgUser?.id ? Number(tgUser.id) : null;
  if (!telegramId && user.id && user.id.startsWith('tg_')) {
    const parsedTg = Number(user.id.replace('tg_', ''));
    if (!isNaN(parsedTg) && parsedTg > 0) {
      telegramId = parsedTg;
    }
  }
  const timezoneOffset =
    typeof user.timezoneOffset === 'number'
      ? user.timezoneOffset
      : -new Date().getTimezoneOffset();

  let notificationsEnabled = true;
  if (typeof user.notificationsEnabled === 'boolean') {
    notificationsEnabled = user.notificationsEnabled;
  } else {
    try {
      const stored = localStorage.getItem('lovia_notifications_enabled');
      if (stored !== null) notificationsEnabled = stored === 'true';
    } catch {
      // ignore localstorage failure
    }
  }

  const row = {
    id: user.id,
    telegram_id: telegramId,
    name: user.name || (tgUser?.first_name || 'Пользователь'),
    gender: (user.gender as 'male' | 'female') || null,
    avatar_url: user.avatarUrl || tgUser?.photo_url || null,
    joined_date: user.joinedDate || new Date().toISOString().split('T')[0],
    timezone_offset: timezoneOffset,
    notifications_enabled: notificationsEnabled,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('users')
    .upsert(row as any, { onConflict: 'id' });

  if (error) {
    console.error('[Supabase API] Failed to upsert user in public.users:', error);
    throw new Error('Ошибка БД: ' + error.message);
  }
}

/**
 * Прямой поиск пары по коду приглашения в базе Supabase без учёта регистра (ilike).
 */
export async function findCoupleByInviteCode(cleanCode: string) {
  if (shouldUseServerDb() || !isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from('couples')
    .select('*')
    .ilike('invite_code', cleanCode)
    .maybeSingle();

  if (error) {
    console.error('[Supabase API] Error querying couple by invite_code:', error);
    throw new Error('Ошибка БД: ' + error.message);
  }

  return data;
}

/**
 * Получить данные пары по ID вместе с информацией об обоих участниках.
 */
export async function fetchCoupleById(coupleId: string) {
  if (shouldUseServerDb() || !isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from('couples')
    .select('*')
    .eq('id', coupleId)
    .maybeSingle();

  if (error) {
    console.error('[Supabase API] Error fetching couple by id:', error);
    throw new Error('Ошибка БД: ' + error.message);
  }

  return data;
}

/**
 * Получить данные пользователя по ID.
 */
export async function fetchUserById(userId: string) {
  if (shouldUseServerDb() || !isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[Supabase API] Warning fetching user by id:', error);
    return null;
  }

  return data;
}

/**
 * Обновление привязки couple_id у пользователя в public.users.
 */
export async function updateUserCoupleId(userId: string, coupleId: string | null): Promise<void> {
  if (shouldUseServerDb() || !isSupabaseConfigured()) return;

  const { error } = await supabase
    .from('users')
    .update({ couple_id: coupleId } as any)
    .eq('id', userId);

  if (error) {
    console.warn('[Supabase API] Failed to update user couple_id:', error);
  }
}
