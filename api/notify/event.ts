import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export type EventType =
  | 'couple_connected'
  | 'couple_dissolved'
  | 'reminder_created'
  | 'reminder_completed'
  | 'wishlist_added'
  | 'memorable_date_added'
  | 'date_memory_added'
  | 'start_date_updated';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const {
      eventType,
      coupleId,
      actorId,
      actorName,
      partnerId: directPartnerId,
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
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      '';

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ ok: false, error: 'Supabase credentials not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Поиск пары в public.couples (если coupleId передан)
    let couple: any = null;
    if (coupleId) {
      const { data: coupleRow } = await supabase
        .from('couples')
        .select('id, space_type, user1_id, user2_id, status')
        .eq('id', coupleId)
        .maybeSingle();
      couple = coupleRow;
    }

    // 2. Определение ID получателя (партнёра/друга)
    let recipientId = directPartnerId || payload?.partnerId;
    if (!recipientId && couple) {
      recipientId = couple.user1_id === actorId ? couple.user2_id : couple.user1_id;
    }

    if (!recipientId) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: 'Target partner ID not found or partner not connected',
      });
    }

    // 3. Загрузка данных получателя из public.users
    const { data: partner, error: partnerError } = await supabase
      .from('users')
      .select('id, name, telegram_id, notifications_enabled')
      .eq('id', recipientId)
      .maybeSingle();

    if (partnerError || !partner) {
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

    // 4. Определение формулировок с учётом типа пространства (отношения или дружба)
    const isFriendship = couple?.space_type === 'friendship' || payload?.spaceType === 'friendship';
    const sender = (actorName || '').trim() || (isFriendship ? 'Ваш друг' : 'Ваш партнёр');

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
        const title = (payload?.title || '').trim() || 'Напоминание';
        const dueLabel = payload?.dueLabel;
        const dueTime = payload?.dueTime;
        let dueInfo = '';
        if (dueLabel && dueLabel !== 'Без срока' && dueLabel !== 'Несрочно') {
          dueInfo = ` (${dueLabel}${dueTime ? ` в ${dueTime}` : ''})`;
        }
        messageText = `💌 Новое напоминание от <b>${sender}</b>: «<b>${title}</b>»${dueInfo}`;
        break;
      }

      case 'reminder_completed': {
        const title = (payload?.title || '').trim() || 'Напоминание';
        messageText = `✅ <b>${sender}</b> выполнил(а) напоминание: «<b>${title}</b>»!`;
        break;
      }

      case 'wishlist_added': {
        const title = (payload?.title || '').trim() || 'Желание';
        const priceInfo = payload?.price ? ` — ${payload.price} ₽` : '';
        messageText = `🎁 <b>${sender}</b> добавил(а) новое желание в вишлист: «<b>${title}</b>»${priceInfo}`;
        break;
      }

      case 'memorable_date_added': {
        const title = (payload?.title || '').trim() || 'Важная дата';
        const dateStr = payload?.date ? ` (${payload.date})` : '';
        messageText = `✨ <b>${sender}</b> добавил(а) важную дату: «<b>${title}</b>»${dateStr}`;
        break;
      }

      case 'date_memory_added': {
        const title = (payload?.title || '').trim() || 'Воспоминание';
        const memoryLabel = isFriendship ? 'встреча' : 'свидание';
        messageText = `📸 <b>${sender}</b> добавил(а) новое воспоминание (${memoryLabel}): «<b>${title}</b>»!`;
        break;
      }

      case 'start_date_updated': {
        const date = payload?.date || '';
        messageText = `🗓 <b>${sender}</b> обновил(а) дату начала: ${date}`;
        break;
      }

      default: {
        return res.status(400).json({ ok: false, error: `Unsupported eventType: ${eventType}` });
      }
    }

    // 5. Отправка сообщения в Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const host = req.headers.host || '';
    const appUrl = process.env.APP_URL || (host ? `https://${host}` : 'https://lovia.app');

    if (!botToken) {
      console.warn(`[notify/event] TELEGRAM_BOT_TOKEN not configured. Skipping send (${eventType}).`);
      return res.status(200).json({ ok: true, simulated: true });
    }

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
