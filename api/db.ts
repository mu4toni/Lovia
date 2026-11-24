import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

async function trackEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, any>
): Promise<void> {
  const apiKey = (process.env.POSTHOG_API_KEY || '').trim();
  if (!apiKey || !distinctId || !event) return;
  const host = (process.env.POSTHOG_HOST || 'https://eu.i.posthog.com').trim().replace(/\/+$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1000);
  try {
    await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        event,
        distinct_id: distinctId,
        properties: { ...(properties || {}), env: 'production' },
        timestamp: new Date().toISOString(),
      }),
      signal: controller.signal,
    });
  } catch {
    // Ignore analytics errors/timeouts
  } finally {
    clearTimeout(timer);
  }
}

async function trackEventsBatch(
  events: Array<{ distinctId: string; event: string; properties?: Record<string, any> }>
): Promise<void> {
  const apiKey = (process.env.POSTHOG_API_KEY || '').trim();
  if (!apiKey || events.length === 0) return;
  const host = (process.env.POSTHOG_HOST || 'https://eu.i.posthog.com').trim().replace(/\/+$/, '');
  const nowIso = new Date().toISOString();
  const batch = events
    .filter((item) => Boolean(item.distinctId && item.event))
    .map((item) => ({
      event: item.event,
      distinct_id: item.distinctId,
      properties: { ...(item.properties || {}), env: 'production' },
      timestamp: nowIso,
    }));
  if (batch.length === 0) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1000);
  try {
    await fetch(`${host}/batch/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, batch }),
      signal: controller.signal,
    });
  } catch {
    // Ignore analytics errors/timeouts
  } finally {
    clearTimeout(timer);
  }
}

// Переиспользуемый синглтон Supabase-клиента между вызовами в тёплом serverless-контейнере
let cachedAdminClient: { url: string; key: string; client: SupabaseClient } | null = null;

function getAdminSupabaseClient(url: string, key: string): SupabaseClient {
  if (cachedAdminClient && cachedAdminClient.url === url && cachedAdminClient.key === key) {
    return cachedAdminClient.client;
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  cachedAdminClient = { url, key, client };
  return client;
}

// Явные проекции колонок (без лишних и служебных полей вроде delete_code)
const USER_PUBLIC_COLUMNS =
  'id, telegram_id, name, gender, avatar_url, couple_id, joined_date, timezone_offset, notifications_enabled, created_at, updated_at';
const COUPLE_COLUMNS =
  'id, invite_code, code_expires_at, code_status, space_type, user1_id, user2_id, status, start_date, couple_photo_url, streak_count, streak_last_date, streak_ping_date, streak_ping_users, created_at, dissolved_at';
const WISHLIST_COLUMNS =
  'id, couple_id, user_id, title, description, image_url, link_url, price, category_id, is_booked, booked_by_user_id, created_at';
const MEMORABLE_DATE_COLUMNS = 'id, couple_id, title, date, description, is_annual, photos, created_at';
const DATE_MEMORY_COLUMNS =
  'id, couple_id, title, date, place, location_data, story, photos, created_at';
const CHECKLIST_COLUMNS = 'id, couple_id, text, created_by_id, created_at';

interface TelegramAuthUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

// In-memory fallback на случай задержки применения миграции delete_code в PostgreSQL
const memoryDeletionCodes = new Map<string, { code: string; expiresAt: string }>();

/**
 * Валидация цифровой подписи Telegram WebApp initData:
 * 1. Извлекается hash
 * 2. Параметры сортируются по алфавиту: "key=value\nkey2=value2..."
 * 3. Secret key = HMAC_SHA256("WebAppData", botToken)
 * 4. Hex HMAC_SHA256(secret_key, data_check_string) сравнивается с hash
 */
export function verifyTelegramInitData(
  initData: string,
  botToken: string
): { isValid: boolean; user?: TelegramAuthUser; error?: string } {
  if (!initData || !botToken) {
    return { isValid: false, error: 'initData и botToken обязательны' };
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
      return { isValid: false, error: 'Хэш подписи отсутствует в initData' };
    }

    params.delete('hash');

    const sortedKeys = Array.from(params.keys()).sort();
    const dataCheckString = sortedKeys
      .map((key) => `${key}=${params.get(key)}`)
      .join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    const hashBuffer = Buffer.from(hash, 'hex');
    const calculatedBuffer = Buffer.from(calculatedHash, 'hex');

    if (
      hashBuffer.length !== calculatedBuffer.length ||
      !crypto.timingSafeEqual(hashBuffer, calculatedBuffer)
    ) {
      return { isValid: false, error: 'Неверная цифровая подпись Telegram' };
    }

    const authDateStr = params.get('auth_date');
    if (authDateStr) {
      const authTimestamp = parseInt(authDateStr, 10);
      const nowTimestamp = Math.floor(Date.now() / 1000);
      // Допускаем 48 часов
      if (nowTimestamp - authTimestamp > 172800) {
        return { isValid: false, error: 'Срок действия initData истёк' };
      }
    }

    const userJson = params.get('user');
    let user: TelegramAuthUser | undefined;
    if (userJson) {
      user = JSON.parse(userJson);
    }

    if (!user || !user.id) {
      return { isValid: false, error: 'Данные пользователя отсутствуют в initData' };
    }

    return { isValid: true, user };
  } catch (err: any) {
    return { isValid: false, error: err.message || 'Ошибка валидации initData' };
  }
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part1 = Array.from({ length: 4 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
  const part2 = Array.from({ length: 4 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
  return `LOVIA-${part1}-${part2}`;
}

function isValidDateStr(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeDateOnly(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const candidate = value.trim().slice(0, 10);
  return isValidDateStr(candidate) ? candidate : null;
}

function getLocalDateByOffset(offsetMin: number, nowMs = Date.now()): string {
  const shifted = new Date(nowMs + offsetMin * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function diffDateDays(fromDate: string, toDate: string): number {
  const [fy, fm, fd] = fromDate.split('-').map(Number);
  const [ty, tm, td] = toDate.split('-').map(Number);
  if (!fy || !fm || !fd || !ty || !tm || !td) return Number.POSITIVE_INFINITY;
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / (24 * 60 * 60 * 1000));
}

/**
 * Извлечение чистого username/chat_id канала
 * Поддерживает форматы: @channel, channel, -1001234567890, https://t.me/channel, t.me/channel
 */
function normalizeChannelChatId(raw: string): string {
  let clean = raw.trim();
  if (!clean) return '';
  clean = clean.replace(/^(?:https?:\/\/)?t\.me\//i, '');
  clean = clean.replace(/^\/+|\/+$/g, '');
  if (clean.startsWith('@') || clean.startsWith('-')) {
    return clean;
  }
  if (/^\d+$/.test(clean)) {
    return `-100${clean}`;
  }
  return `@${clean}`;
}

/**
 * Получение ссылки на канал для открытия пользователем
 */
function getChannelUrl(): string {
  if (process.env.REQUIRED_CHANNEL_URL) {
    return process.env.REQUIRED_CHANNEL_URL.trim();
  }
  const channelId = process.env.REQUIRED_CHANNEL_ID?.trim() || '';
  if (!channelId) return 'https://t.me';
  if (channelId.startsWith('http://') || channelId.startsWith('https://')) {
    return channelId;
  }
  let clean = channelId.replace(/^(?:https?:\/\/)?t\.me\//i, '').replace(/^@/, '');
  if (!clean.startsWith('-') && clean.length > 0) {
    return `https://t.me/${clean}`;
  }
  return 'https://t.me';
}

/**
 * Проверка членства пользователя в обязательном Telegram-канале.
 * Если REQUIRED_CHANNEL_ID не задан — возвращает { subscribed: true }.
 */
async function checkChannelSubscription(
  telegramUserId: number | string
): Promise<{ subscribed: boolean; error?: string }> {
  const channelRaw = process.env.REQUIRED_CHANNEL_ID?.trim();
  if (!channelRaw) {
    return { subscribed: true };
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn('[checkChannelSubscription] TELEGRAM_BOT_TOKEN not configured');
    return { subscribed: true };
  }

  const chatId = normalizeChannelChatId(channelRaw);
  if (!chatId) {
    return { subscribed: true };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const url = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${telegramUserId}`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    const data: any = await response.json();

    if (!data || !data.ok) {
      const errMsg = data?.description || 'Telegram API error';
      console.error(
        `[checkChannelSubscription] Telegram getChatMember error for user ${telegramUserId} in chat ${chatId}:`,
        errMsg
      );
      return { subscribed: false, error: errMsg };
    }

    const status = data.result?.status;
    const isMember = status === 'restricted' ? Boolean(data.result?.is_member) : false;

    if (['member', 'administrator', 'creator'].includes(status) || isMember) {
      return { subscribed: true };
    }

    return { subscribed: false };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === 'AbortError';
    const errMsg = isTimeout
      ? 'Превышено время ожидания ответа от Telegram (таймаут 5 сек)'
      : err?.message || 'Network error';
    console.error('[checkChannelSubscription] Network or runtime exception:', errMsg);
    return { subscribed: false, error: errMsg };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-telegram-init-data');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    // 1. Проверка Telegram initData
    const initData =
      (req.headers['x-telegram-init-data'] as string) ||
      (req.headers['authorization'] as string) ||
      '';

    const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    if (!botToken) {
      return res.status(500).json({ ok: false, error: 'TELEGRAM_BOT_TOKEN not configured on server' });
    }

    const authResult = verifyTelegramInitData(initData, botToken);
    if (!authResult.isValid || !authResult.user) {
      return res.status(401).json({
        ok: false,
        error: authResult.error || 'Unauthorized: Invalid Telegram initData',
      });
    }

    const tgUser = authResult.user;
    const actorId = `tg_${tgUser.id}`;

    // 2. Инициализация подключения к Supabase через SERVICE_ROLE
    let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
      supabaseUrl = 'https://uwbdtisxjzmnzkodiexo.supabase.co';
    }

    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      '';

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ ok: false, error: 'Supabase credentials not configured' });
    }

    const supabase = getAdminSupabaseClient(supabaseUrl, supabaseKey);

    // 3. Helper: создаём запись пользователя в public.users ТОЛЬКО при первом входе,
    // не перезаписывая кастомные name и avatar_url существующего пользователя данными из Telegram.
    async function ensureServerUser(
      client: any,
      targetActorId: string,
      targetTgUser: any,
      overrides?: {
        name?: string;
        gender?: 'male' | 'female' | null;
        avatarUrl?: string | null;
        coupleId?: string | null;
      }
    ) {
      const { data: existingUser } = await client
        .from('users')
        .select(USER_PUBLIC_COLUMNS)
        .eq('id', targetActorId)
        .maybeSingle();

      const nowIso = new Date().toISOString();

      if (existingUser) {
        // Пользователь уже существует — НЕ перезатираем name и avatar_url данными из Telegram
        const updatePatch: any = {};
        if (!existingUser.telegram_id && targetTgUser?.id) {
          updatePatch.telegram_id = Number(targetTgUser.id);
        }
        if (overrides?.coupleId !== undefined && existingUser.couple_id !== overrides.coupleId) {
          updatePatch.couple_id = overrides.coupleId;
        }
        if (overrides?.gender !== undefined && overrides.gender !== null && !existingUser.gender) {
          updatePatch.gender = overrides.gender;
        }

        if (Object.keys(updatePatch).length === 0) {
          return existingUser;
        }

        updatePatch.updated_at = nowIso;
        const { data: updatedUser, error: updateErr } = await client
          .from('users')
          .update(updatePatch)
          .eq('id', targetActorId)
          .select(USER_PUBLIC_COLUMNS)
          .maybeSingle();

        if (updateErr) {
          console.error('[ensureServerUser] Failed to update existing user:', updateErr);
          return existingUser;
        }
        return updatedUser || existingUser;
      }

      // Первый вход: создаём запись с данными из Telegram (ignoreDuplicates защищает от гонки)
      const defaultName =
        [targetTgUser?.first_name, targetTgUser?.last_name].filter(Boolean).join(' ').trim() ||
        targetTgUser?.first_name ||
        'Пользователь';

      const newRow: any = {
        id: targetActorId,
        telegram_id: targetTgUser?.id ? Number(targetTgUser.id) : null,
        name: overrides?.name?.trim() || defaultName,
        avatar_url: overrides?.avatarUrl || targetTgUser?.photo_url || null,
        updated_at: nowIso,
      };

      if (overrides?.gender !== undefined) {
        newRow.gender = overrides.gender;
      }
      if (overrides?.coupleId !== undefined) {
        newRow.couple_id = overrides.coupleId;
      }

      const { data: insertedUser, error: insertErr } = await client
        .from('users')
        .upsert(newRow, { onConflict: 'id', ignoreDuplicates: true })
        .select(USER_PUBLIC_COLUMNS)
        .maybeSingle();

      if (insertErr) {
        console.error('[ensureServerUser] Failed to insert user:', insertErr);
      }

      if (insertedUser) {
        return insertedUser;
      }

      // Если параллельный запрос успел создать запись раньше (ignoreDuplicates вернул null)
      const { data: racedUser } = await client
        .from('users')
        .select(USER_PUBLIC_COLUMNS)
        .eq('id', targetActorId)
        .maybeSingle();
      return racedUser;
    }

    const { action, payload } = req.body || {};
    if (!action) {
      return res.status(400).json({ ok: false, error: 'action is required' });
    }

    // Helper: проверка, что пара принадлежит пользователю
    async function verifyUserCouple(coupleId: string): Promise<boolean> {
      if (!coupleId) return false;
      const { data } = await supabase
        .from('couples')
        .select('id')
        .eq('id', coupleId)
        .or(`user1_id.eq.${actorId},user2_id.eq.${actorId}`)
        .maybeSingle();
      return Boolean(data);
    }

    // -------------------------------------------------------------
    // ДЕЙСТВИЕ 0: check_subscription
    // -------------------------------------------------------------
    if (action === 'check_subscription') {
      const { subscribed, error } = await checkChannelSubscription(tgUser.id);
      return res.status(200).json({
        ok: true,
        data: {
          subscribed,
          subscriptionRequired: !subscribed,
          channelUrl: getChannelUrl(),
          error: error || undefined,
        },
      });
    }

    // -------------------------------------------------------------
    // ДЕЙСТВИЕ 1: get_bundle
    // -------------------------------------------------------------
    if (action === 'get_bundle') {
      const isSilentPoll = Boolean(payload?.silent);
      // Параллельный запуск проверки подписки и основных запросов к БД (только нужные колонки).
      // Для фоновых silent-опросов (каждые 20 сек) не дергаем Telegram getChatMember и не шлём повторный app_opened.
      const [subResult, coupleRes, userRes] = await Promise.all([
        isSilentPoll ? Promise.resolve({ subscribed: true as boolean, error: undefined as string | undefined }) : checkChannelSubscription(tgUser.id),
        supabase
          .from('couples')
          .select(COUPLE_COLUMNS)
          .or(`user1_id.eq.${actorId},user2_id.eq.${actorId}`)
          .neq('status', 'dissolved')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('users')
          .select(USER_PUBLIC_COLUMNS)
          .eq('id', actorId)
          .maybeSingle(),
      ]);

      const { subscribed, error } = subResult;
      if (!subscribed) {
        return res.status(200).json({
          ok: true,
          data: {
            subscriptionRequired: true,
            channelUrl: getChannelUrl(),
            error: error || undefined,
          },
        });
      }

      const coupleRow = coupleRes.data;
      const existingUserRow = userRes.data;

      if (!coupleRow) {
        // Если в public.users ещё нет строки (первый вход) — создаём через ensureServerUser
        const userRow = existingUserRow || (await ensureServerUser(supabase, actorId, tgUser));
        if (!isSilentPoll) {
          await trackEvent(actorId, 'app_opened', {
            space_type: null,
            couple_status: 'none',
            has_couple: false,
            $set: {
              space_type: null,
              couple_status: 'none',
              has_couple: false,
            },
          });
        }
        return res.status(200).json({
          ok: true,
          data: {
            user: userRow || null,
            couple: null,
            partner: null,
            reminders: [],
            wishlist: [],
            memorableDates: [],
            dateMemories: [],
            checklistItems: [],
          },
        });
      }

      const partnerId =
        coupleRow.user1_id === actorId ? coupleRow.user2_id : coupleRow.user1_id;

      // Все независимые запросы к таблицам выполняем параллельно в Promise.all
      const [
        userRow,
        partnerRes,
        remindersRes,
        wishlistRes,
        memorableDatesRes,
        dateMemoriesRes,
        checklistRes,
      ] = await Promise.all([
        existingUserRow
          ? Promise.resolve(existingUserRow)
          : ensureServerUser(supabase, actorId, tgUser),
        partnerId
          ? supabase.from('users').select(USER_PUBLIC_COLUMNS).eq('id', partnerId).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from('reminders')
          .select('*')
          .eq('couple_id', coupleRow.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('wishlist_items')
          .select(WISHLIST_COLUMNS)
          .eq('couple_id', coupleRow.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('memorable_dates')
          .select(MEMORABLE_DATE_COLUMNS)
          .eq('couple_id', coupleRow.id)
          .order('date', { ascending: true }),
        supabase
          .from('date_memories')
          .select(DATE_MEMORY_COLUMNS)
          .eq('couple_id', coupleRow.id)
          .order('date', { ascending: false }),
        supabase
          .from('checklist_items')
          .select(CHECKLIST_COLUMNS)
          .eq('couple_id', coupleRow.id)
          .order('created_at', { ascending: true }),
      ]);

      // Серверная секретность вишлиста: скрываем бронь для собственных желаний!
      const rawWishlist = wishlistRes.data || [];
      const sanitizedWishlist = rawWishlist.map((item: any) => {
        if (item.user_id === actorId) {
          return {
            ...item,
            is_booked: false,
            booked_by_user_id: null,
            is_reserved: false,
            reserved_by_user_id: null,
          };
        }
        return item;
      });

      // Автосброс серии огонька, если пропущено более 1 полного дня (streak_last_date старше позавчера)
      const utcToday = getLocalDateByOffset(0);
      const userOffsetMin = typeof userRow?.timezone_offset === 'number' ? userRow.timezone_offset : 0;
      const todayDate =
        isValidDateStr(payload?.localDate) && Math.abs(diffDateDays(utcToday, payload.localDate)) <= 1
          ? payload.localDate
          : getLocalDateByOffset(userOffsetMin);

      let streakCount = Number(coupleRow.streak_count || 0);
      const streakLastDate = normalizeDateOnly(coupleRow.streak_last_date);
      const streakPingDate = normalizeDateOnly(coupleRow.streak_ping_date);
      const streakPingUsers: string[] = Array.isArray(coupleRow.streak_ping_users)
        ? coupleRow.streak_ping_users
        : [];

      if (
        streakCount > 0 &&
        streakLastDate &&
        streakLastDate !== todayDate &&
        diffDateDays(streakLastDate, todayDate) > 2
      ) {
        streakCount = 0;
        const { error: resetErr } = await supabase
          .from('couples')
          .update({ streak_count: 0 })
          .eq('id', coupleRow.id);
        if (resetErr) {
          console.warn('[get_bundle] Failed to auto-reset expired streak:', resetErr.message);
        }
      }

      const normalizedCouple = {
        ...coupleRow,
        streak_count: streakCount,
        streak_last_date: streakLastDate,
        streak_ping_date: streakPingDate,
        streak_ping_users: streakPingUsers,
      };

      const spaceType = normalizedCouple.space_type || 'relationship';
      const coupleStatus = normalizedCouple.status || 'connected';
      if (!isSilentPoll) {
        await trackEvent(actorId, 'app_opened', {
          space_type: spaceType,
          couple_status: coupleStatus,
          has_couple: true,
          $set: {
            space_type: spaceType,
            couple_status: coupleStatus,
            has_couple: true,
          },
        });
      }

      return res.status(200).json({
        ok: true,
        data: {
          user: userRow || null,
          couple: normalizedCouple,
          partner: partnerRes.data || null,
          reminders: remindersRes.data || [],
          wishlist: sanitizedWishlist,
          memorableDates: memorableDatesRes.data || [],
          dateMemories: dateMemoriesRes.data || [],
          checklistItems: checklistRes.data || [],
        },
      });
    }

    // -------------------------------------------------------------
    // ДЕЙСТВИЕ 2: update_profile (единственное место обновления name / avatar_url)
    // -------------------------------------------------------------
    if (action === 'update_profile') {
      // Гарантируем существование строки, не перезатирая данные существующего пользователя
      await ensureServerUser(supabase, actorId, tgUser);

      const patch: any = { updated_at: new Date().toISOString() };
      if (payload?.name !== undefined && String(payload.name).trim()) {
        patch.name = String(payload.name).trim();
      }
      if (payload?.gender !== undefined) patch.gender = payload.gender;
      if (payload?.avatarUrl !== undefined) patch.avatar_url = payload.avatarUrl;
      if (payload?.notificationsEnabled !== undefined) {
        patch.notifications_enabled = payload.notificationsEnabled;
      }
      if (payload?.timezoneOffset !== undefined) {
        patch.timezone_offset = payload.timezoneOffset;
      }

      const { data: updatedUser, error } = await supabase
        .from('users')
        .update(patch)
        .eq('id', actorId)
        .select(USER_PUBLIC_COLUMNS)
        .maybeSingle();

      if (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }

      return res.status(200).json({ ok: true, data: updatedUser });
    }

    // -------------------------------------------------------------
    // ДЕЙСТВИЕ 3: create_couple
    // -------------------------------------------------------------
    if (action === 'create_couple') {
      const code = generateInviteCode();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const coupleId =
        payload?.id && typeof payload.id === 'string' && payload.id.trim()
          ? payload.id.trim()
          : `couple-${crypto.randomUUID()}`;

      // Гарантируем существование пользователя до вставки пары (FK user1_id -> users.id)
      await ensureServerUser(supabase, actorId, tgUser, {
        name: payload?.name,
        gender: payload?.gender,
        avatarUrl: payload?.avatarUrl,
      });

      const { data: newCouple, error } = await supabase
        .from('couples')
        .insert({
          id: coupleId,
          user1_id: actorId,
          user2_id: null,
          invite_code: code,
          code_expires_at: expiresAt,
          code_status: 'active',
          status: 'waiting_partner',
          space_type: payload?.spaceType || 'relationship',
          start_date: payload?.startDate || new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }

      await supabase
        .from('users')
        .update({ couple_id: newCouple.id, updated_at: new Date().toISOString() })
        .eq('id', actorId);

      await trackEvent(actorId, 'couple_created', {
        space_type: newCouple.space_type || 'relationship',
      });

      return res.status(200).json({ ok: true, data: newCouple });
    }

    // -------------------------------------------------------------
    // ДЕЙСТВИЕ 4: join_couple
    // -------------------------------------------------------------
    if (action === 'join_couple') {
      const cleanCode = (payload?.inviteCode || '').trim().toUpperCase();
      if (!cleanCode) {
        return res.status(400).json({ ok: false, error: 'Код приглашения обязателен' });
      }

      const { data: couple, error: findErr } = await supabase
        .from('couples')
        .select('*')
        .ilike('invite_code', cleanCode)
        .maybeSingle();

      if (findErr || !couple) {
        return res.status(404).json({ ok: false, error: 'Код не найден или недействителен' });
      }

      if (couple.status !== 'waiting_partner') {
        return res.status(400).json({ ok: false, error: 'К этой паре уже подключился партнёр' });
      }

      if (couple.code_expires_at && new Date(couple.code_expires_at).getTime() < Date.now()) {
        return res.status(400).json({ ok: false, error: 'Срок действия кода истёк' });
      }

      if (couple.user1_id === actorId) {
        return res.status(400).json({ ok: false, error: 'Нельзя подключиться к собственной паре' });
      }

      if (couple.user2_id && couple.user2_id !== actorId) {
        return res.status(400).json({ ok: false, error: 'К этой паре уже подключены два участника' });
      }

      await ensureServerUser(supabase, actorId, tgUser, {
        name: payload?.name,
        gender: payload?.gender,
        avatarUrl: payload?.avatarUrl,
      });

      const { data: updatedCouple, error: updateErr } = await supabase
        .from('couples')
        .update({
          user2_id: actorId,
          status: 'connected',
          code_status: 'used',
        })
        .eq('id', couple.id)
        .select()
        .single();

      if (updateErr) {
        return res.status(500).json({ ok: false, error: updateErr.message });
      }

      const [, partnerRes] = await Promise.all([
        supabase
          .from('users')
          .update({ couple_id: couple.id, updated_at: new Date().toISOString() })
          .eq('id', actorId),
        supabase
          .from('users')
          .select(USER_PUBLIC_COLUMNS)
          .eq('id', couple.user1_id)
          .maybeSingle(),
      ]);

      await trackEvent(actorId, 'couple_joined', {
        space_type: updatedCouple.space_type || 'relationship',
      });

      return res.status(200).json({
        ok: true,
        data: {
          couple: updatedCouple,
          partner: partnerRes.data,
        },
      });
    }

    // -------------------------------------------------------------
    // ДЕЙСТВИЕ 5: dissolve_couple
    // -------------------------------------------------------------
    if (action === 'dissolve_couple') {
      let coupleId = payload?.coupleId;
      if (!coupleId) {
        const { data: userRow } = await supabase
          .from('users')
          .select('couple_id')
          .eq('id', actorId)
          .maybeSingle();
        coupleId = userRow?.couple_id;
      }

      if (!coupleId) {
        return res.status(400).json({ ok: false, error: 'coupleId не указан' });
      }

      const isAllowed = await verifyUserCouple(coupleId);
      if (!isAllowed) {
        return res.status(403).json({ ok: false, error: 'Нет доступа к этой паре' });
      }

      const { data: couple } = await supabase
        .from('couples')
        .select('id, user1_id, user2_id')
        .eq('id', coupleId)
        .maybeSingle();

      const userIds = [couple?.user1_id, couple?.user2_id].filter(Boolean) as string[];

      // 1) Удаляем связанные записи
      await Promise.all([
        supabase.from('reminders').delete().eq('couple_id', coupleId),
        supabase.from('wishlist_items').delete().eq('couple_id', coupleId),
        supabase.from('memorable_dates').delete().eq('couple_id', coupleId),
        supabase.from('date_memories').delete().eq('couple_id', coupleId),
        supabase.from('checklist_items').delete().eq('couple_id', coupleId),
        supabase.from('notification_logs').delete().eq('couple_id', coupleId),
      ]);

      // 2) Сбрасываем couple_id для обоих пользователей
      if (userIds.length > 0) {
        await supabase
          .from('users')
          .update({ couple_id: null })
          .in('id', userIds);
      }

      // 3) Удаляем саму запись пары (с fallback на update, если FK блокирует)
      const { error: delError } = await supabase
        .from('couples')
        .delete()
        .eq('id', coupleId);

      if (delError) {
        console.warn('[dissolve_couple] Failed to delete couple row, falling back to update status:', delError.message);
        await supabase
          .from('couples')
          .update({ status: 'dissolved', dissolved_at: new Date().toISOString() })
          .eq('id', coupleId);
      }

      // 4) Уведомление партнёру в Telegram
      const partnerId = userIds.find((id) => id !== actorId);
      if (partnerId) {
        const { data: partnerUser } = await supabase
          .from('users')
          .select('telegram_id')
          .eq('id', partnerId)
          .maybeSingle();

        const partnerTgId =
          partnerUser?.telegram_id ||
          (partnerId.startsWith('tg_')
            ? partnerId.replace('tg_', '')
            : partnerId.startsWith('tg-')
            ? partnerId.replace('tg-', '')
            : null);
        if (partnerTgId) {
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          if (botToken) {
            const botUsername = escapeHtml(process.env.TELEGRAM_BOT_USERNAME || 'LoviaStory_bot');
            const partnerNotice =
              `💔 <b>Ваша пара в Lovia была расформирована партнёром.</b>\n\n` +
              `Вы можете создать новую пару или присоединиться по коду приглашения в @${botUsername}.`;

            try {
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: partnerTgId,
                  text: partnerNotice,
                  parse_mode: 'HTML',
                }),
              });
            } catch (e) {
              console.warn('[dissolve_couple] Failed to notify partner:', e);
            }
          }
        }
      }

      await trackEvent(actorId, 'couple_dissolved');

      return res.status(200).json({ ok: true });
    }

    // -------------------------------------------------------------
    // ДЕЙСТВИЕ 6: update_start_date
    // -------------------------------------------------------------
    if (action === 'update_start_date') {
      const { coupleId, startDate } = payload || {};
      const isAllowed = await verifyUserCouple(coupleId);
      if (!isAllowed) {
        return res.status(403).json({ ok: false, error: 'Нет доступа к этой паре' });
      }

      const { data: updated, error } = await supabase
        .from('couples')
        .update({ start_date: startDate })
        .eq('id', coupleId)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }

      return res.status(200).json({ ok: true, data: updated });
    }

    // -------------------------------------------------------------
    // ДЕЙСТВИЕ 6b: update_couple_photo (общее фото пары / друзей)
    // -------------------------------------------------------------
    if (action === 'update_couple_photo') {
      const { coupleId, photoUrl } = payload || {};
      const isAllowed = await verifyUserCouple(coupleId);
      if (!isAllowed) {
        return res.status(403).json({ ok: false, error: 'Нет доступа к этой паре' });
      }
      if (photoUrl !== null && typeof photoUrl !== 'string') {
        return res.status(400).json({ ok: false, error: 'photoUrl должен быть строкой или null' });
      }

      const { data: updated, error } = await supabase
        .from('couples')
        .update({ couple_photo_url: photoUrl || null })
        .eq('id', coupleId)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }

      return res.status(200).json({ ok: true, data: updated });
    }

    // -------------------------------------------------------------
    // ДЕЙСТВИЕ 6c: streak_ping («Огонёк» — ежедневная серия пары/друзей)
    // -------------------------------------------------------------
    if (action === 'streak_ping') {
      let coupleRow: any = null;
      if (payload?.coupleId) {
        const isAllowed = await verifyUserCouple(payload.coupleId);
        if (!isAllowed) {
          return res.status(403).json({ ok: false, error: 'Нет доступа к этой паре' });
        }
        const { data } = await supabase
          .from('couples')
          .select('*')
          .eq('id', payload.coupleId)
          .maybeSingle();
        coupleRow = data;
      } else {
        const { data } = await supabase
          .from('couples')
          .select('*')
          .or(`user1_id.eq.${actorId},user2_id.eq.${actorId}`)
          .neq('status', 'dissolved')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        coupleRow = data;
      }

      if (!coupleRow) {
        return res.status(404).json({ ok: false, error: 'Пара не найдена' });
      }

      if (coupleRow.user1_id !== actorId && coupleRow.user2_id !== actorId) {
        return res.status(403).json({ ok: false, error: 'Нет доступа к этой паре' });
      }

      if (coupleRow.status !== 'connected' || !coupleRow.user1_id || !coupleRow.user2_id) {
        return res.status(400).json({ ok: false, error: 'Оба участника должны быть подключены' });
      }

      const partnerId = coupleRow.user1_id === actorId ? coupleRow.user2_id : coupleRow.user1_id;

      // Вычисляем локальную дату пользователя (из payload.localDate в пределах ±1 дня от UTC или по timezone_offset)
      const utcToday = getLocalDateByOffset(0);
      let localDate: string;
      if (isValidDateStr(payload?.localDate) && Math.abs(diffDateDays(utcToday, payload.localDate)) <= 1) {
        localDate = payload.localDate;
      } else {
        const { data: actorRow } = await supabase
          .from('users')
          .select('timezone_offset')
          .eq('id', actorId)
          .maybeSingle();
        const offsetMin = typeof actorRow?.timezone_offset === 'number' ? actorRow.timezone_offset : 0;
        localDate = getLocalDateByOffset(offsetMin);
      }

      const currentCount = Number(coupleRow.streak_count || 0);
      const lastDate = normalizeDateOnly(coupleRow.streak_last_date);
      const pingDate = normalizeDateOnly(coupleRow.streak_ping_date);
      const existingPingUsers: string[] = Array.isArray(coupleRow.streak_ping_users)
        ? coupleRow.streak_ping_users
        : [];

      const alreadyPingedToday = pingDate === localDate && existingPingUsers.includes(actorId);

      const nextPingDate = localDate;
      let nextPingUsers: string[];
      if (pingDate !== localDate) {
        nextPingUsers = [actorId];
      } else {
        nextPingUsers = existingPingUsers.includes(actorId)
          ? [...existingPingUsers]
          : [...existingPingUsers, actorId];
      }

      const bothPinged =
        nextPingUsers.includes(coupleRow.user1_id) && nextPingUsers.includes(coupleRow.user2_id);

      let nextCount = currentCount;
      let nextLastDate = lastDate;
      let justLitToday = false;

      if (bothPinged && lastDate !== localDate) {
        const daysSinceLast = lastDate ? diffDateDays(lastDate, localDate) : null;
        if (daysSinceLast !== null && daysSinceLast >= 1 && daysSinceLast <= 2) {
          // Вчера (1) или позавчера (2 — спасение чёрного огонька)
          nextCount = currentCount + 1;
        } else {
          nextCount = 1;
        }
        nextLastDate = localDate;
        justLitToday = true;
      } else if (currentCount > 0 && lastDate && lastDate !== localDate && diffDateDays(lastDate, localDate) > 2) {
        nextCount = 0;
      }

      const { data: updatedCouple, error: updateErr } = await supabase
        .from('couples')
        .update({
          streak_count: nextCount,
          streak_last_date: nextLastDate,
          streak_ping_date: nextPingDate,
          streak_ping_users: nextPingUsers,
        })
        .eq('id', coupleRow.id)
        .select()
        .single();

      if (updateErr) {
        return res.status(500).json({ ok: false, error: updateErr.message });
      }

      // Если нажал первый участник (второй ещё не нажимал сегодня) — отправляем партнёру уведомление (строго 1 раз в день)
      if (!alreadyPingedToday && !bothPinged && partnerId) {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (botToken) {
          const pingLogId = `streak_ping_${coupleRow.id}_${actorId}_${localDate}`;
          const [existingLogRes, usersRes] = await Promise.all([
            supabase
              .from('notification_logs')
              .select('id')
              .eq('id', pingLogId)
              .maybeSingle(),
            supabase
              .from('users')
              .select('id, name, telegram_id, notifications_enabled')
              .in('id', [actorId, partnerId]),
          ]);

          if (!existingLogRes.data) {
            const actorUser = (usersRes.data || []).find((u: any) => u.id === actorId);
            const partnerUser = (usersRes.data || []).find((u: any) => u.id === partnerId);
            const partnerTgId = partnerUser?.telegram_id;

            if (partnerTgId && partnerUser?.notifications_enabled !== false) {
              const actorName =
                (actorUser?.name || '').trim() ||
                [tgUser?.first_name, tgUser?.last_name].filter(Boolean).join(' ').trim() ||
                'Партнёр';
              const host = req.headers.host || '';
              const appUrl = process.env.APP_URL || (host ? `https://${host}` : 'https://lovia.app');
              const text = `🔥 <b>${escapeHtml(actorName)}</b> подначил(а) вас! Нажмите в ответ, чтобы зажечь огонёк дня`;

              try {
                const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: partnerTgId,
                    text,
                    parse_mode: 'HTML',
                    reply_markup: {
                      inline_keyboard: [[{ text: 'Открыть Lovia', web_app: { url: appUrl } }]],
                    },
                  }),
                });
                const tgJson = (await tgRes.json()) as { ok?: boolean };
                if (tgJson?.ok) {
                  await supabase.from('notification_logs').upsert(
                    {
                      id: pingLogId,
                      user_id: partnerId,
                      couple_id: coupleRow.id,
                      notification_type: 'streak_ping',
                      sent_at: new Date().toISOString(),
                      payload: { actor_id: actorId, local_date: localDate },
                    },
                    { onConflict: 'id', ignoreDuplicates: true }
                  );
                }
              } catch (e) {
                console.warn('[streak_ping] Failed to notify partner:', e);
              }
            }
          }
        }
      }

      const finalLastDate = normalizeDateOnly(updatedCouple?.streak_last_date ?? nextLastDate);
      const finalCount = Number(updatedCouple?.streak_count ?? nextCount);
      const streakProps = {
        streak_count: finalCount,
        space_type: coupleRow.space_type || 'relationship',
      };
      if (justLitToday) {
        await trackEventsBatch([
          { distinctId: actorId, event: 'streak_ping', properties: streakProps },
          { distinctId: actorId, event: 'streak_ignited', properties: streakProps },
        ]);
      } else {
        await trackEvent(actorId, 'streak_ping', streakProps);
      }

      return res.status(200).json({
        ok: true,
        data: {
          streak_count: finalCount,
          streak_last_date: finalLastDate,
          streak_ping_date: normalizeDateOnly(updatedCouple?.streak_ping_date ?? nextPingDate),
          streak_ping_users: Array.isArray(updatedCouple?.streak_ping_users)
            ? updatedCouple.streak_ping_users
            : nextPingUsers,
          litToday: finalLastDate === localDate,
          justLitToday,
        },
      });
    }

    // -------------------------------------------------------------
    // ДЕЙСТВИЕ 7: reminders_create, reminders_toggle, reminders_update, reminders_delete
    // -------------------------------------------------------------
    if (action === 'reminders_create') {
      const isAllowed = await verifyUserCouple(payload?.couple_id);
      if (!isAllowed) {
        return res.status(403).json({ ok: false, error: 'Нет доступа к паре' });
      }

      const remindBefore =
        payload.remind_before_minutes ??
        payload.remindBeforeMinutes ??
        60;

      const reminderId =
        payload?.id && typeof payload.id === 'string' && payload.id.trim()
          ? payload.id.trim()
          : `reminder-${crypto.randomUUID()}`;

      const row = {
        id: reminderId,
        couple_id: payload.couple_id,
        title: payload.title,
        description: payload.description || null,
        for_user_id: payload.for_user_id,
        created_by_id: actorId,
        priority: payload.priority || 'medium',
        category_id: payload.category_id || null,
        status: 'pending',
        due_date: payload.due_date || null,
        due_time: payload.due_time || null,
        remind_before_minutes: typeof remindBefore === 'number' ? remindBefore : 60,
        reward_note: payload.reward_note || null,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('reminders')
        .insert(row as any)
        .select()
        .single();

      if (error) return res.status(500).json({ ok: false, error: error.message });
      await trackEvent(actorId, 'reminder_created', {
        priority: data.priority,
        has_due_time: Boolean(data.due_time),
      });
      return res.status(200).json({ ok: true, data });
    }

    if (action === 'reminders_toggle') {
      const { id, status } = payload || {};
      if (status !== 'pending' && status !== 'completed') {
        return res.status(400).json({ ok: false, error: 'Некорректный статус напоминания' });
      }
      const { data: existing } = await supabase
        .from('reminders')
        .select('couple_id')
        .eq('id', id)
        .maybeSingle();

      if (!existing || !(await verifyUserCouple(existing.couple_id))) {
        return res.status(403).json({ ok: false, error: 'Нет доступа к напоминанию' });
      }

      const { data, error } = await supabase
        .from('reminders')
        .update({
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) return res.status(500).json({ ok: false, error: error.message });
      if (status === 'completed') {
        await trackEvent(actorId, 'reminder_completed');
      }
      return res.status(200).json({ ok: true, data });
    }

    if (action === 'reminders_update') {
      const { id, patch } = payload || {};
      if (!patch || typeof patch !== 'object') {
        return res.status(400).json({ ok: false, error: 'patch обязателен' });
      }
      const { data: existing } = await supabase
        .from('reminders')
        .select('couple_id')
        .eq('id', id)
        .maybeSingle();

      if (!existing || !(await verifyUserCouple(existing.couple_id))) {
        return res.status(403).json({ ok: false, error: 'Нет доступа к напоминанию' });
      }

      const updateData: any = {};
      if (patch.title !== undefined) updateData.title = patch.title;
      if (patch.description !== undefined) updateData.description = patch.description || null;
      if (patch.for_user_id !== undefined) updateData.for_user_id = patch.for_user_id;
      if (patch.priority !== undefined) updateData.priority = patch.priority;
      if (patch.category_id !== undefined) updateData.category_id = patch.category_id || null;
      if (patch.due_date !== undefined) updateData.due_date = patch.due_date || null;
      if (patch.due_time !== undefined) updateData.due_time = patch.due_time || null;
      if (patch.remind_before_minutes !== undefined || patch.remindBeforeMinutes !== undefined) {
        const val = patch.remind_before_minutes ?? patch.remindBeforeMinutes;
        updateData.remind_before_minutes = typeof val === 'number' ? val : 60;
      }
      if (patch.reward_note !== undefined) updateData.reward_note = patch.reward_note || null;

      const { data, error } = await supabase
        .from('reminders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true, data });
    }

    if (action === 'reminders_delete') {
      const { id } = payload || {};
      const { data: existing } = await supabase
        .from('reminders')
        .select('couple_id')
        .eq('id', id)
        .maybeSingle();

      if (!existing || !(await verifyUserCouple(existing.couple_id))) {
        return res.status(403).json({ ok: false, error: 'Нет доступа к напоминанию' });
      }

      const { error } = await supabase.from('reminders').delete().eq('id', id);
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true });
    }

    // -------------------------------------------------------------
    // ДЕЙСТВИЕ 8: wishlist_create, wishlist_update, wishlist_delete, wishlist_toggle_reserve
    // -------------------------------------------------------------
    if (action === 'wishlist_create') {
      const isAllowed = await verifyUserCouple(payload?.couple_id);
      if (!isAllowed) {
        return res.status(403).json({ ok: false, error: 'Нет доступа к паре' });
      }

      const wishId =
        payload?.id && typeof payload.id === 'string' && payload.id.trim()
          ? payload.id.trim()
          : `wish-${crypto.randomUUID()}`;

      // Всегда создаём желание от имени actorId
      const row = {
        id: wishId,
        couple_id: payload.couple_id,
        user_id: actorId,
        title: payload.title,
        description: payload.description || null,
        image_url: payload.imageUrl || null,
        link_url: payload.linkUrl || null,
        price: payload.estimatedPrice ? Number(payload.estimatedPrice) : null,
        category_id: payload.categoryId || 'gifts',
        is_booked: false,
        booked_by_user_id: null,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('wishlist_items')
        .insert(row as any)
        .select()
        .single();

      if (error) return res.status(500).json({ ok: false, error: error.message });
      await trackEvent(actorId, 'wishlist_created', {
        category_id: data.category_id,
        has_price: Boolean(data.price),
      });
      return res.status(200).json({ ok: true, data });
    }

    if (action === 'wishlist_update') {
      const { id, patch } = payload || {};
      if (!patch || typeof patch !== 'object') {
        return res.status(400).json({ ok: false, error: 'patch обязателен' });
      }
      const { data: item } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!item || !(await verifyUserCouple(item.couple_id))) {
        return res.status(403).json({ ok: false, error: 'Желание не найдено' });
      }

      // Редактировать может только владелец
      if (item.user_id !== actorId) {
        return res.status(403).json({ ok: false, error: 'Редактировать может только автор желания' });
      }

      const updateData: any = {};
      if (patch.title !== undefined) updateData.title = patch.title;
      if (patch.description !== undefined) updateData.description = patch.description || null;
      if (patch.imageUrl !== undefined) updateData.image_url = patch.imageUrl || null;
      if (patch.linkUrl !== undefined) updateData.link_url = patch.linkUrl || null;
      if (patch.estimatedPrice !== undefined) {
        updateData.price = patch.estimatedPrice ? Number(patch.estimatedPrice) : null;
      }
      if (patch.categoryId !== undefined) updateData.category_id = patch.categoryId;

      const { data, error } = await supabase
        .from('wishlist_items')
        .update(updateData)
        .eq('id', id)
        .select(WISHLIST_COLUMNS)
        .single();

      if (error) return res.status(500).json({ ok: false, error: error.message });
      // Секретность вишлиста: не возвращаем владельцу статус бронирования его собственного желания
      const sanitizedData =
        data && data.user_id === actorId
          ? {
              ...data,
              is_booked: false,
              booked_by_user_id: null,
            }
          : data;
      return res.status(200).json({ ok: true, data: sanitizedData });
    }

    if (action === 'wishlist_delete') {
      const { id } = payload || {};
      const { data: item } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!item || !(await verifyUserCouple(item.couple_id))) {
        return res.status(403).json({ ok: false, error: 'Желание не найдено' });
      }

      // Удалять может только владелец
      if (item.user_id !== actorId) {
        return res.status(403).json({ ok: false, error: 'Удалять может только автор желания' });
      }

      const { error } = await supabase.from('wishlist_items').delete().eq('id', id);
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true });
    }

    if (action === 'wishlist_toggle_reserve') {
      const { id } = payload || {};
      const { data: item } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!item || !(await verifyUserCouple(item.couple_id))) {
        return res.status(403).json({ ok: false, error: 'Желание не найдено' });
      }

      // Бронировать может ТОЛЬКО партнёр (нельзя бронировать своё собственное желание)
      if (item.user_id === actorId) {
        return res.status(403).json({ ok: false, error: 'Нельзя бронировать собственное желание' });
      }

      const nextBooked = !item.is_booked;
      const nextBookedBy = nextBooked ? actorId : null;

      const { data, error } = await supabase
        .from('wishlist_items')
        .update({
          is_booked: nextBooked,
          booked_by_user_id: nextBookedBy,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) return res.status(500).json({ ok: false, error: error.message });
      if (nextBooked) {
        await trackEvent(actorId, 'wishlist_reserved', {
          category_id: data.category_id,
        });
      }
      return res.status(200).json({ ok: true, data });
    }

    // -------------------------------------------------------------
    // ДЕЙСТВИЕ 9: memorable_dates_create, memorable_dates_update, memorable_dates_delete
    // -------------------------------------------------------------
    if (action === 'memorable_dates_create') {
      const isAllowed = await verifyUserCouple(payload?.couple_id);
      if (!isAllowed) {
        return res.status(403).json({ ok: false, error: 'Нет доступа к паре' });
      }

      const memorableDateId =
        payload?.id && typeof payload.id === 'string' && payload.id.trim()
          ? payload.id.trim()
          : `date-${crypto.randomUUID()}`;

      const row = {
        id: memorableDateId,
        couple_id: payload.couple_id,
        title: payload.title,
        date: payload.date,
        description: payload.description || null,
        is_annual: Boolean(payload.isAnnual ?? payload.is_annual),
        photos: Array.isArray(payload.photos)
          ? payload.photos.filter((p: any) => typeof p === 'string' && p.trim()).slice(0, 2)
          : [],
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('memorable_dates')
        .insert(row as any)
        .select()
        .single();

      if (error) return res.status(500).json({ ok: false, error: error.message });
      await trackEvent(actorId, 'memorable_date_created', {
        is_annual: Boolean(data.is_annual),
      });
      return res.status(200).json({ ok: true, data });
    }

    if (action === 'memorable_dates_update') {
      const { id, patch } = payload || {};
      if (!patch || typeof patch !== 'object') {
        return res.status(400).json({ ok: false, error: 'patch обязателен' });
      }
      const { data: item } = await supabase
        .from('memorable_dates')
        .select('couple_id')
        .eq('id', id)
        .maybeSingle();

      if (!item || !(await verifyUserCouple(item.couple_id))) {
        return res.status(403).json({ ok: false, error: 'Дата не найдена' });
      }

      const updateData: any = {};
      if (patch.title !== undefined) updateData.title = patch.title;
      if (patch.date !== undefined) updateData.date = patch.date;
      if (patch.description !== undefined) updateData.description = patch.description || null;
      if (patch.isAnnual !== undefined || patch.is_annual !== undefined) {
        updateData.is_annual = Boolean(patch.isAnnual ?? patch.is_annual);
      }
      if (patch.photos !== undefined) {
        updateData.photos = Array.isArray(patch.photos)
          ? patch.photos.filter((p: any) => typeof p === 'string' && p.trim()).slice(0, 2)
          : [];
      }

      const { data, error } = await supabase
        .from('memorable_dates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true, data });
    }

    if (action === 'memorable_dates_delete') {
      const { id } = payload || {};
      const { data: item } = await supabase
        .from('memorable_dates')
        .select('couple_id')
        .eq('id', id)
        .maybeSingle();

      if (!item || !(await verifyUserCouple(item.couple_id))) {
        return res.status(403).json({ ok: false, error: 'Дата не найдена' });
      }

      const { error } = await supabase.from('memorable_dates').delete().eq('id', id);
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true });
    }

    // -------------------------------------------------------------
    // ДЕЙСТВИЕ 10: date_memories_create, date_memories_update, date_memories_delete
    // -------------------------------------------------------------
    if (action === 'date_memories_create') {
      const isAllowed = await verifyUserCouple(payload?.couple_id);
      if (!isAllowed) {
        return res.status(403).json({ ok: false, error: 'Нет доступа к паре' });
      }

      const memoryId =
        payload?.id && typeof payload.id === 'string' && payload.id.trim()
          ? payload.id.trim()
          : `memory-${crypto.randomUUID()}`;

      const row = {
        id: memoryId,
        couple_id: payload.couple_id,
        title: payload.title,
        date: payload.date,
        place: payload.place || null,
        location_data: payload.location || payload.location_data || null,
        story: payload.story || null,
        photos: Array.isArray(payload.photos) ? payload.photos : [],
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('date_memories')
        .insert(row as any)
        .select()
        .single();

      if (error) return res.status(500).json({ ok: false, error: error.message });
      await trackEvent(actorId, 'date_memory_created', {
        photos_count: Array.isArray(data.photos) ? data.photos.length : 0,
        has_location: Boolean(data.location_data),
      });
      return res.status(200).json({ ok: true, data });
    }

    if (action === 'date_memories_update') {
      const { id, patch } = payload || {};
      if (!patch || typeof patch !== 'object') {
        return res.status(400).json({ ok: false, error: 'patch обязателен' });
      }
      const { data: item } = await supabase
        .from('date_memories')
        .select('couple_id')
        .eq('id', id)
        .maybeSingle();

      if (!item || !(await verifyUserCouple(item.couple_id))) {
        return res.status(403).json({ ok: false, error: 'Воспоминание не найдено' });
      }

      const updateData: any = {};
      if (patch.title !== undefined) updateData.title = patch.title;
      if (patch.date !== undefined) updateData.date = patch.date;
      if (patch.place !== undefined) updateData.place = patch.place || null;
      if (patch.location !== undefined || patch.location_data !== undefined) {
        updateData.location_data = patch.location || patch.location_data || null;
      }
      if (patch.story !== undefined) updateData.story = patch.story || null;
      if (patch.photos !== undefined) updateData.photos = patch.photos;

      const { data, error } = await supabase
        .from('date_memories')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true, data });
    }

    if (action === 'date_memories_delete') {
      const { id } = payload || {};
      const { data: item } = await supabase
        .from('date_memories')
        .select('couple_id')
        .eq('id', id)
        .maybeSingle();

      if (!item || !(await verifyUserCouple(item.couple_id))) {
        return res.status(403).json({ ok: false, error: 'Воспоминание не найдено' });
      }

      const { error } = await supabase.from('date_memories').delete().eq('id', id);
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true });
    }

    // -------------------------------------------------------------
    // ДЕЙСТВИЕ 10.5: checklist_create, checklist_delete (быстрые списки)
    // -------------------------------------------------------------
    if (action === 'checklist_create') {
      const isAllowed = await verifyUserCouple(payload?.couple_id);
      if (!isAllowed) {
        return res.status(403).json({ ok: false, error: 'Нет доступа к паре' });
      }

      const cleanText = typeof payload?.text === 'string' ? payload.text.trim() : '';
      if (!cleanText) {
        return res.status(400).json({ ok: false, error: 'Текст пункта обязателен' });
      }

      const { count } = await supabase
        .from('checklist_items')
        .select('id', { count: 'exact', head: true })
        .eq('couple_id', payload.couple_id);

      if ((count ?? 0) >= 50) {
        return res.status(400).json({ ok: false, error: 'Максимум 50 пунктов' });
      }

      const itemId =
        payload?.id && typeof payload.id === 'string' && payload.id.trim()
          ? payload.id.trim()
          : `chk-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;

      const row = {
        id: itemId,
        couple_id: payload.couple_id,
        text: cleanText,
        created_by_id: actorId,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('checklist_items')
        .insert(row as any)
        .select(CHECKLIST_COLUMNS)
        .single();

      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true, data });
    }

    if (action === 'checklist_delete') {
      const { id } = payload || {};
      if (!id) {
        return res.status(400).json({ ok: false, error: 'id обязателен' });
      }

      const { data: item } = await supabase
        .from('checklist_items')
        .select('couple_id')
        .eq('id', id)
        .maybeSingle();

      if (!item) {
        return res.status(200).json({ ok: true });
      }

      if (!(await verifyUserCouple(item.couple_id))) {
        return res.status(403).json({ ok: false, error: 'Нет доступа к пункту списка' });
      }

      const { error } = await supabase.from('checklist_items').delete().eq('id', id);
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true });
    }

    // -------------------------------------------------------------
    // ДЕЙСТВИЕ 11: upload_media
    // -------------------------------------------------------------
    if (action === 'upload_media') {
      const { base64Data, type } = payload || {};
      if (!base64Data || typeof base64Data !== 'string') {
        return res.status(400).json({ ok: false, error: 'base64Data is required' });
      }

      const match = base64Data.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ ok: false, error: 'Invalid base64 data URL format' });
      }

      const mime = match[1].toLowerCase();
      const ALLOWED_IMAGE_MIMES: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
        'image/avif': 'avif',
      };
      const ext = ALLOWED_IMAGE_MIMES[mime];
      if (!ext) {
        return res.status(415).json({ ok: false, error: 'Unsupported image format' });
      }

      const buffer = Buffer.from(match[2], 'base64');

      // Лимит 4 МБ
      if (buffer.length > 4 * 1024 * 1024) {
        return res.status(400).json({ ok: false, error: 'File size exceeds 4MB limit' });
      }

      const fileType =
        type === 'avatar'
          ? 'avatar'
          : type === 'couple'
          ? 'couple'
          : type === 'wish'
          ? 'wish'
          : 'date';
      const filePath = `${actorId}/${fileType}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

      // Пробуем бакет lovia-media, затем lovia_media
      let targetBucket = 'lovia-media';
      let uploadErr: any = null;

      const { error: err1 } = await supabase.storage.from('lovia-media').upload(filePath, buffer, {
        contentType: mime,
        upsert: true,
      });

      if (err1) {
        targetBucket = 'lovia_media';
        const { error: err2 } = await supabase.storage.from('lovia_media').upload(filePath, buffer, {
          contentType: mime,
          upsert: true,
        });
        uploadErr = err2;
      }

      if (uploadErr) {
        return res.status(500).json({ ok: false, error: 'Storage upload failed: ' + uploadErr.message });
      }

      const { data: urlData } = supabase.storage.from(targetBucket).getPublicUrl(filePath);
      const proxiedUrl = `/supabase-proxy/storage/v1/object/public/${targetBucket}/${filePath}`;
      return res.status(200).json({
        ok: true,
        data: {
          publicUrl: proxiedUrl,
          directUrl: urlData?.publicUrl || '',
        },
      });
    }

    // -------------------------------------------------------------
    // ДЕЙСТВИЕ 12: request_account_deletion
    // -------------------------------------------------------------
    if (action === 'request_account_deletion') {
      const code = String(crypto.randomInt(100000, 1000000));
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // Сохраняем в in-memory fallback
      memoryDeletionCodes.set(actorId, { code, expiresAt });

      // Записываем код и срок в public.users
      const { error: updateError } = await supabase
        .from('users')
        .update({
          delete_code: code,
          delete_code_expires_at: expiresAt,
        })
        .eq('id', actorId);

      if (updateError) {
        console.warn('[request_account_deletion] Note on users.delete_code update:', updateError.message);
      }

      // Отправляем код в Telegram
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        return res.status(500).json({ ok: false, error: 'TELEGRAM_BOT_TOKEN не настроен на сервере' });
      }

      const text =
        `⚠️ <b>Запрос на удаление аккаунта Lovia</b>\n\n` +
        `Ваш код подтверждения: <code>${code}</code>\n` +
        `Код действует 5 минут.\n\n` +
        `Если вы не запрашивали удаление, просто проигнорируйте это сообщение.`;

      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: tgUser.id,
            text,
            parse_mode: 'HTML',
          }),
        });

        const tgData = (await tgRes.json()) as { ok: boolean; error_code?: number; description?: string };

        if (!tgData.ok) {
          console.warn('[request_account_deletion] Telegram error:', tgData);
          if (
            tgRes.status === 403 ||
            tgData.error_code === 403 ||
            (tgData.description &&
              (tgData.description.toLowerCase().includes('blocked') ||
                tgData.description.toLowerCase().includes('chat not found') ||
                tgData.description.toLowerCase().includes('not started') ||
                tgData.description.toLowerCase().includes("can't initiate") ||
                tgData.description.toLowerCase().includes('bot was blocked')))
          ) {
            return res.status(400).json({
              ok: false,
              error: 'Сначала нажмите /start в боте Lovia, чтобы бот мог отправить вам код подтверждения',
            });
          }
          return res.status(500).json({
            ok: false,
            error: tgData.description || 'Не удалось отправить код в Telegram',
          });
        }

        return res.status(200).json({ ok: true, data: { sent: true } });
      } catch (err: any) {
        console.error('[request_account_deletion] Network error:', err);
        return res.status(500).json({ ok: false, error: 'Ошибка отправки сообщения через Telegram API' });
      }
    }

    // -------------------------------------------------------------
    // ДЕЙСТВИЕ 13: confirm_account_deletion
    // -------------------------------------------------------------
    if (action === 'confirm_account_deletion') {
      const codeInput = String(payload?.code || '').trim();
      if (!codeInput || codeInput.length !== 6) {
        return res.status(400).json({ ok: false, error: 'Введите корректный 6-значный код' });
      }

      // Читаем delete_code и delete_code_expires_at из public.users для actorId
      const { data: userRow } = await supabase
        .from('users')
        .select('*')
        .eq('id', actorId)
        .maybeSingle();

      const memoryEntry = memoryDeletionCodes.get(actorId);
      const storedCode = userRow?.delete_code || memoryEntry?.code;
      const expiresAtStr = userRow?.delete_code_expires_at || memoryEntry?.expiresAt;

      const isExpired = !expiresAtStr || new Date(expiresAtStr) <= new Date();
      if (!storedCode || storedCode !== codeInput || isExpired) {
        return res.status(400).json({ ok: false, error: 'Неверный или просроченный код подтверждения' });
      }

      // Код подтверждён — удаляем из memory
      memoryDeletionCodes.delete(actorId);

      // 1) Если пользователь состоит в активной паре (couple_id), аккуратно расформировываем её
      let coupleId = userRow?.couple_id;
      if (!coupleId) {
        const { data: coupleRow } = await supabase
          .from('couples')
          .select('id')
          .or(`user1_id.eq.${actorId},user2_id.eq.${actorId}`)
          .neq('status', 'dissolved')
          .maybeSingle();
        coupleId = coupleRow?.id;
      }

      if (coupleId) {
        const { data: couple } = await supabase
          .from('couples')
          .select('user1_id, user2_id')
          .eq('id', coupleId)
          .maybeSingle();

        if (couple && (couple.user1_id === actorId || couple.user2_id === actorId)) {
          const partnerId =
            couple.user1_id === actorId ? couple.user2_id : couple.user1_id;

          // Удаляем данные пары и растворяем пару
          await Promise.all([
            supabase.from('reminders').delete().eq('couple_id', coupleId),
            supabase.from('wishlist_items').delete().eq('couple_id', coupleId),
            supabase.from('memorable_dates').delete().eq('couple_id', coupleId),
            supabase.from('date_memories').delete().eq('couple_id', coupleId),
            supabase.from('checklist_items').delete().eq('couple_id', coupleId),
            supabase.from('notification_logs').delete().eq('couple_id', coupleId),
            supabase
              .from('couples')
              .update({ status: 'dissolved', dissolved_at: new Date().toISOString() })
              .eq('id', coupleId),
          ]);

          // Обнуляем couple_id у второго участника (партнёра)
          if (partnerId) {
            await supabase.from('users').update({ couple_id: null }).eq('id', partnerId);

            // Отправляем второму участнику уведомление в Telegram
            const { data: partnerUser } = await supabase
              .from('users')
              .select('telegram_id')
              .eq('id', partnerId)
              .maybeSingle();

            if (partnerUser?.telegram_id) {
              const botToken = process.env.TELEGRAM_BOT_TOKEN;
              if (botToken) {
                const partnerNotice =
                  `💔 <b>Совместное пространство Lovia закрыто</b>\n\n` +
                  `Ваш партнёр удалил свой аккаунт. Совместные напоминания, вишлисты и воспоминания были удалены.\n\n` +
                  `Вы можете создать новую пару или подключиться к новому пространству в любой момент.`;

                try {
                  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: partnerUser.telegram_id,
                      text: partnerNotice,
                      parse_mode: 'HTML',
                    }),
                  });
                } catch (e) {
                  console.warn('[confirm_account_deletion] Failed to notify partner:', e);
                }
              }
            }
          }
        }
      }

      // 2) Удаляем строку пользователя из public.users
      const { error: deleteUserError } = await supabase
        .from('users')
        .delete()
        .eq('id', actorId);

      if (deleteUserError) {
        // Если foreign key на couples помешал удалению (например, старые нерастворённые пары)
        await supabase
          .from('couples')
          .delete()
          .or(`user1_id.eq.${actorId},user2_id.eq.${actorId}`);
        await supabase.from('users').delete().eq('id', actorId);
      }

      // 3) Возвращает { ok: true, data: { deleted: true } }
      return res.status(200).json({ ok: true, data: { deleted: true } });
    }

    return res.status(400).json({ ok: false, error: `Unknown action: ${action}` });
  } catch (err: any) {
    console.error('[api/db] Unhandled exception:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Internal server error' });
  }
}
