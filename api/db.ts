import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

interface TelegramAuthUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

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

  try {
    const url = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${telegramUserId}`;
    const response = await fetch(url);
    const data: any = await response.json();

    if (!data || !data.ok) {
      console.error(
        `[checkChannelSubscription] Telegram getChatMember error for user ${telegramUserId} in chat ${chatId}:`,
        data?.description || data
      );
      return { subscribed: false, error: data?.description || 'Telegram API error' };
    }

    const status = data.result?.status;
    const isMember = status === 'restricted' ? Boolean(data.result?.is_member) : false;

    if (['member', 'administrator', 'creator'].includes(status) || isMember) {
      return { subscribed: true };
    }

    return { subscribed: false };
  } catch (err: any) {
    console.error('[checkChannelSubscription] Network or runtime exception:', err?.message || err);
    return { subscribed: false, error: err?.message };
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

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Гарантируем актуальность пользователя в public.users
    const userFullName =
      [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ').trim() ||
      tgUser.first_name ||
      'Пользователь';

    await supabase.from('users').upsert(
      {
        id: actorId,
        telegram_id: Number(tgUser.id),
        name: userFullName,
        avatar_url: tgUser.photo_url || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

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
      const { subscribed } = await checkChannelSubscription(tgUser.id);
      return res.status(200).json({
        ok: true,
        data: {
          subscribed,
          subscriptionRequired: !subscribed,
          channelUrl: getChannelUrl(),
        },
      });
    }

    // -------------------------------------------------------------
    // ДЕЙСТВИЕ 1: get_bundle
    // -------------------------------------------------------------
    if (action === 'get_bundle') {
      // Жёсткая проверка подписки на обязательный канал:
      // если пользователь не подписан, данные пары не возвращаются!
      const { subscribed } = await checkChannelSubscription(tgUser.id);
      if (!subscribed) {
        return res.status(200).json({
          ok: true,
          data: {
            subscriptionRequired: true,
            channelUrl: getChannelUrl(),
          },
        });
      }

      const { data: coupleRow } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${actorId},user2_id.eq.${actorId}`)
        .neq('status', 'dissolved')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: userRow } = await supabase
        .from('users')
        .select('*')
        .eq('id', actorId)
        .maybeSingle();

      if (!coupleRow) {
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
          },
        });
      }

      const partnerId =
        coupleRow.user1_id === actorId ? coupleRow.user2_id : coupleRow.user1_id;

      const [
        partnerRes,
        remindersRes,
        wishlistRes,
        memorableDatesRes,
        dateMemoriesRes,
      ] = await Promise.all([
        partnerId
          ? supabase.from('users').select('*').eq('id', partnerId).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from('reminders')
          .select('*')
          .eq('couple_id', coupleRow.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('wishlist_items')
          .select('*')
          .eq('couple_id', coupleRow.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('memorable_dates')
          .select('*')
          .eq('couple_id', coupleRow.id)
          .order('date', { ascending: true }),
        supabase
          .from('date_memories')
          .select('*')
          .eq('couple_id', coupleRow.id)
          .order('date', { ascending: false }),
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

      return res.status(200).json({
        ok: true,
        data: {
          user: userRow || null,
          couple: coupleRow,
          partner: partnerRes.data || null,
          reminders: remindersRes.data || [],
          wishlist: sanitizedWishlist,
          memorableDates: memorableDatesRes.data || [],
          dateMemories: dateMemoriesRes.data || [],
        },
      });
    }

    // -------------------------------------------------------------
    // ДЕЙСТВИЕ 2: update_profile
    // -------------------------------------------------------------
    if (action === 'update_profile') {
      const patch: any = { updated_at: new Date().toISOString() };
      if (payload?.name !== undefined) patch.name = payload.name.trim();
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
        .select()
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

      const { data: newCouple, error } = await supabase
        .from('couples')
        .insert({
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

      await supabase.from('users').update({ couple_id: newCouple.id }).eq('id', actorId);

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

      if (couple.user1_id === actorId) {
        return res.status(400).json({ ok: false, error: 'Нельзя подключиться к собственной паре' });
      }

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

      await supabase.from('users').update({ couple_id: couple.id }).eq('id', actorId);

      const { data: partnerUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', couple.user1_id)
        .maybeSingle();

      return res.status(200).json({
        ok: true,
        data: {
          couple: updatedCouple,
          partner: partnerUser,
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
        .select('user1_id, user2_id')
        .eq('id', coupleId)
        .maybeSingle();

      await Promise.all([
        supabase.from('reminders').delete().eq('couple_id', coupleId),
        supabase.from('wishlist_items').delete().eq('couple_id', coupleId),
        supabase.from('memorable_dates').delete().eq('couple_id', coupleId),
        supabase.from('date_memories').delete().eq('couple_id', coupleId),
        supabase
          .from('couples')
          .update({ status: 'dissolved', dissolved_at: new Date().toISOString() })
          .eq('id', coupleId),
        couple
          ? supabase
              .from('users')
              .update({ couple_id: null })
              .in('id', [couple.user1_id, couple.user2_id].filter(Boolean) as string[])
          : Promise.resolve(),
      ]);

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
    // ДЕЙСТВИЕ 7: reminders_create, reminders_toggle, reminders_update, reminders_delete
    // -------------------------------------------------------------
    if (action === 'reminders_create') {
      const isAllowed = await verifyUserCouple(payload?.couple_id);
      if (!isAllowed) {
        return res.status(403).json({ ok: false, error: 'Нет доступа к паре' });
      }

      const row = {
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
        reward_note: payload.reward_note || null,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('reminders')
        .insert(row as any)
        .select()
        .single();

      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true, data });
    }

    if (action === 'reminders_toggle') {
      const { id, status } = payload || {};
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
      return res.status(200).json({ ok: true, data });
    }

    if (action === 'reminders_update') {
      const { id, patch } = payload || {};
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

      // Всегда создаём желание от имени actorId
      const row = {
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
      return res.status(200).json({ ok: true, data });
    }

    if (action === 'wishlist_update') {
      const { id, patch } = payload || {};
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
        .select()
        .single();

      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true, data });
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

      const row = {
        couple_id: payload.couple_id,
        title: payload.title,
        date: payload.date,
        description: payload.description || null,
        is_annual: Boolean(payload.isAnnual ?? payload.is_annual),
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('memorable_dates')
        .insert(row as any)
        .select()
        .single();

      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true, data });
    }

    if (action === 'memorable_dates_update') {
      const { id, patch } = payload || {};
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

      const row = {
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
      return res.status(200).json({ ok: true, data });
    }

    if (action === 'date_memories_update') {
      const { id, patch } = payload || {};
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

      const mime = match[1];
      const buffer = Buffer.from(match[2], 'base64');

      // Лимит 4 МБ
      if (buffer.length > 4 * 1024 * 1024) {
        return res.status(400).json({ ok: false, error: 'File size exceeds 4MB limit' });
      }

      const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
      const fileType = type === 'avatar' ? 'avatar' : 'date';
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
      return res.status(200).json({
        ok: true,
        data: {
          publicUrl: urlData?.publicUrl || '',
        },
      });
    }

    return res.status(400).json({ ok: false, error: `Unknown action: ${action}` });
  } catch (err: any) {
    console.error('[api/db] Unhandled exception:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Internal server error' });
  }
}
