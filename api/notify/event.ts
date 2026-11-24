import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export type EventType =
  | 'couple_connected'
  | 'couple_dissolved'
  | 'reminder_created'
  | 'reminder_completed'
  | 'wishlist_added'
  | 'memorable_date_added'
  | 'date_memory_added'
  | 'start_date_updated';

interface TelegramAuthUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

let cachedSupabase: { url: string; key: string; client: SupabaseClient } | null = null;

function getSupabaseAdminClient(url: string, key: string): SupabaseClient {
  if (cachedSupabase && cachedSupabase.url === url && cachedSupabase.key === key) {
    return cachedSupabase.client;
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  cachedSupabase = { url, key, client };
  return client;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function verifyTelegramInitData(
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
    // 1. Обязательная проверка цифровой подписи Telegram WebApp initData
    const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    if (!botToken) {
      return res.status(500).json({ ok: false, error: 'TELEGRAM_BOT_TOKEN not configured on server' });
    }

    const initData =
      (req.headers['x-telegram-init-data'] as string) ||
      (req.headers['authorization'] as string) ||
      '';

    const authResult = verifyTelegramInitData(initData, botToken);
    if (!authResult.isValid || !authResult.user) {
      return res.status(401).json({
        ok: false,
        error: authResult.error || 'Unauthorized: Invalid Telegram initData',
      });
    }

    const tgUser = authResult.user;
    const verifiedActorId = `tg_${tgUser.id}`;

    const {
      eventType,
      coupleId,
      actorName,
      payload,
    } = req.body || {};

    if (!eventType) {
      return res.status(400).json({ ok: false, error: 'eventType is required' });
    }

    // Инициализация прямого подключения к Supabase (без прокси)
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

    const supabase = getSupabaseAdminClient(supabaseUrl, supabaseKey);

    // 2. Поиск пары в public.couples и строгая проверка принадлежности verifiedActorId к этой паре
    let couple: any = null;
    if (coupleId && typeof coupleId === 'string') {
      const { data: coupleRow } = await supabase
        .from('couples')
        .select('id, space_type, user1_id, user2_id, status')
        .eq('id', coupleId)
        .maybeSingle();
      couple = coupleRow;
    } else {
      const { data: coupleRow } = await supabase
        .from('couples')
        .select('id, space_type, user1_id, user2_id, status')
        .or(`user1_id.eq.${verifiedActorId},user2_id.eq.${verifiedActorId}`)
        .neq('status', 'dissolved')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      couple = coupleRow;
    }

    if (!couple) {
      return res.status(403).json({
        ok: false,
        error: 'Пара не найдена или нет доступа',
      });
    }

    if (couple.user1_id !== verifiedActorId && couple.user2_id !== verifiedActorId) {
      return res.status(403).json({
        ok: false,
        error: 'Нет доступа к этой паре',
      });
    }

    // 3. Получатель определяется СТРОГО как второй участник подтверждённой пары (игнорируем partnerId из req.body)
    const recipientId =
      couple.user1_id === verifiedActorId ? couple.user2_id : couple.user1_id;

    if (!recipientId || recipientId === verifiedActorId) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: 'Target partner ID not found or partner not connected',
      });
    }

    // 4. Параллельная загрузка данных получателя и отправителя из public.users
    const { data: usersRows, error: usersError } = await supabase
      .from('users')
      .select('id, name, telegram_id, notifications_enabled')
      .in('id', [recipientId, verifiedActorId]);

    const partner = (usersRows || []).find((u: any) => u.id === recipientId);
    const actorRow = (usersRows || []).find((u: any) => u.id === verifiedActorId);

    if (usersError || !partner) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: 'Partner user record not found in Supabase',
      });
    }

    if (!partner.telegram_id) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: 'Partner has no telegram_id configured',
      });
    }

    // Для критических событий подключения и разрыва пары уведомление отправляем всегда
    const isCriticalEvent = eventType === 'couple_connected' || eventType === 'couple_dissolved';
    if (!isCriticalEvent && partner.notifications_enabled === false) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: 'Partner disabled notifications in settings',
      });
    }

    // 5. Определение формулировок с обязательным HTML-экранированием всех пользовательских данных
    const isFriendship = couple?.space_type === 'friendship';
    const rawSender =
      (actorRow?.name || '').trim() ||
      (typeof actorName === 'string' ? actorName.trim() : '') ||
      [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ').trim() ||
      (isFriendship ? 'Ваш друг' : 'Ваш партнёр');
    const sender = escapeHtml(rawSender);

    let messageText = '';
    let attachButton = true;

    switch (eventType as EventType) {
      case 'couple_connected': {
        messageText = `🎉 <b>${sender}</b> подключился к вашему пространству Lovia!`;
        break;
      }

      case 'couple_dissolved': {
        messageText = `💔 <b>${sender}</b> расформировал(а) совместное пространство в Lovia.`;
        attachButton = false; // Без кнопки перехода обратно в Lovia
        break;
      }

      case 'reminder_created': {
        const title = escapeHtml(
          (typeof payload?.title === 'string' ? payload.title.trim() : '') || 'Напоминание'
        );
        const dueLabel = typeof payload?.dueLabel === 'string' ? payload.dueLabel.trim() : '';
        const dueTime = typeof payload?.dueTime === 'string' ? payload.dueTime.trim() : '';
        let dueInfo = '';
        if (dueLabel && dueLabel !== 'Без срока' && dueLabel !== 'Несрочно') {
          dueInfo = ` (${escapeHtml(dueLabel)}${dueTime ? ` в ${escapeHtml(dueTime)}` : ''})`;
        }
        messageText = `💌 Новое напоминание от <b>${sender}</b>: «<b>${title}</b>»${dueInfo}`;
        break;
      }

      case 'reminder_completed': {
        const title = escapeHtml(
          (typeof payload?.title === 'string' ? payload.title.trim() : '') || 'Напоминание'
        );
        messageText = `✅ <b>${sender}</b> выполнил(а) напоминание: «<b>${title}</b>»!`;
        break;
      }

      case 'wishlist_added': {
        const title = escapeHtml(
          (typeof payload?.title === 'string' ? payload.title.trim() : '') || 'Желание'
        );
        const priceInfo =
          payload?.price !== undefined && payload?.price !== null && String(payload.price).trim() !== ''
            ? ` — ${escapeHtml(String(payload.price).trim())} ₽`
            : '';
        messageText = `🎁 <b>${sender}</b> добавил(а) новое желание в вишлист: «<b>${title}</b>»${priceInfo}`;
        break;
      }

      case 'memorable_date_added': {
        const title = escapeHtml(
          (typeof payload?.title === 'string' ? payload.title.trim() : '') || 'Важная дата'
        );
        const dateStr =
          typeof payload?.date === 'string' && payload.date.trim()
            ? ` (${escapeHtml(payload.date.trim())})`
            : '';
        messageText = `✨ <b>${sender}</b> добавил(а) важную дату: «<b>${title}</b>»${dateStr}`;
        break;
      }

      case 'date_memory_added': {
        const title = escapeHtml(
          (typeof payload?.title === 'string' ? payload.title.trim() : '') || 'Воспоминание'
        );
        const memoryLabel = isFriendship ? 'встреча' : 'свидание';
        messageText = `📸 <b>${sender}</b> добавил(а) новое воспоминание (${memoryLabel}): «<b>${title}</b>»!`;
        break;
      }

      case 'start_date_updated': {
        const date = escapeHtml(typeof payload?.date === 'string' ? payload.date.trim() : '');
        messageText = `🗓 <b>${sender}</b> обновил(а) дату начала: ${date}`;
        break;
      }

      default: {
        return res.status(400).json({ ok: false, error: `Unsupported eventType: ${eventType}` });
      }
    }

    // 6. Отправка сообщения в Telegram
    const host = req.headers.host || '';
    const appUrl = process.env.APP_URL || (host ? `https://${host}` : 'https://lovia.app');

    const tgBody: Record<string, any> = {
      chat_id: partner.telegram_id,
      text: messageText,
      parse_mode: 'HTML',
    };

    if (attachButton) {
      tgBody.reply_markup = {
        inline_keyboard: [
          [
            {
              text: 'Открыть Lovia',
              web_app: { url: appUrl },
            },
          ],
        ],
      };
    }

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tgBody),
    });

    const tgData = (await tgRes.json()) as { ok: boolean; description?: string };
    if (!tgData.ok) {
      console.warn(
        `[notify/event] Telegram API error for chat_id ${partner.telegram_id} (${eventType}):`,
        tgData.description
      );
      return res.status(200).json({ ok: false, error: tgData.description });
    }

    return res.status(200).json({ ok: true, sent: true });
  } catch (err: any) {
    console.error('[notify/event] Unhandled error:', err);
    return res.status(200).json({ ok: false, error: err.message || 'Internal server error' });
  }
}
