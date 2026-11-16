import { supabase, isSupabaseConfigured, Database } from '../lib/supabase';
import { telegramService } from './telegramService';
import { isLocalDevHost } from '../utils/env';

export { supabase, isSupabaseConfigured };
export type { Database };

export interface UserRecord {
  id: string;
  name: string;
  gender?: 'male' | 'female';
  avatarUrl?: string;
  joinedDate?: string;
  coupleId?: string | null;
}

/**
 * Гарантирует наличие записи пользователя в public.users перед любыми операциями с public.couples.
 * Выполняет upsert по первичному ключу id.
 */
export async function ensureUserInSupabase(user: UserRecord): Promise<void> {
  if (!isSupabaseConfigured()) {
    if (!isLocalDevHost()) {
      throw new Error('Не настроены ключи Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
    }
    return;
  }

  const tgUser = telegramService.getTelegramUser();
  const telegramId = tgUser?.id ? Number(tgUser.id) : null;

  const row = {
    id: user.id,
    telegram_id: telegramId,
    name: user.name || (tgUser?.first_name || 'Пользователь'),
    gender: (user.gender as 'male' | 'female') || null,
    avatar_url: user.avatarUrl || tgUser?.photo_url || null,
    joined_date: user.joinedDate || new Date().toISOString().split('T')[0],
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
  if (!isSupabaseConfigured()) return null;

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
  if (!isSupabaseConfigured()) return null;

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
  if (!isSupabaseConfigured()) return null;

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
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase
    .from('users')
    .update({ couple_id: coupleId } as any)
    .eq('id', userId);

  if (error) {
    console.warn('[Supabase API] Failed to update user couple_id:', error);
  }
}
