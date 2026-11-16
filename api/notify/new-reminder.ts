import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

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
      coupleId,
      authorId,
      authorName,
      targetId,
      title,
      dueLabel,
      dueTime,
    } = req.body || {};

    if (!coupleId || !title) {
      return res.status(400).json({ ok: false, error: 'coupleId and title are required' });
    }

    // Если задача создана только для самого себя — уведомление не отправляем
    if (targetId === authorId || targetId === 'user-self') {
      return res.status(200).json({ ok: true, skipped: true, reason: 'Self-assigned reminder' });
    }

    // Инициализация Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      '';

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ ok: false, error: 'Supabase credentials not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Поиск пары в public.couples
    const { data: couple, error: coupleError } = await supabase
      .from('couples')
      .select('id, space_type, user1_id, user2_id, status')
      .eq('id', coupleId)
      .maybeSingle();

    if (coupleError || !couple) {
      return res.status(404).json({ ok: false, error: 'Couple not found' });
    }

    // 2. Определение ID второго участника
    const partnerId = couple.user1_id === authorId ? couple.user2_id : couple.user1_id;
    if (!partnerId) {
      return res.status(200).json({ ok: true, skipped: true, reason: 'Partner is not connected' });
    }

    // 3. Загрузка данных партнёра из public.users
    const { data: partner, error: partnerError } = await supabase
      .from('users')
      .select('id, name, telegram_id, notifications_enabled')
      .eq('id', partnerId)
      .maybeSingle();

    if (partnerError || !partner) {
      return res.status(404).json({ ok: false, error: 'Partner user not found' });
    }

    if (!partner.telegram_id) {
      return res.status(200).json({ ok: true, skipped: true, reason: 'Partner has no telegram_id' });
    }

    if (partner.notifications_enabled === false) {
      return res.status(200).json({ ok: true, skipped: true, reason: 'Partner disabled notifications' });
    }

    // 4. Формирование текста сообщения с учётом типа пространства
    const sender = authorName?.trim() || 'Ваш партнёр';
    const isFriendship = couple.space_type === 'friendship';
    const isCommon = targetId === 'all' || targetId === 'both' || targetId === 'common';

    let messageText = '';
    if (isCommon) {
      messageText = isFriendship
        ? `✨ Новое совместное дело от <b>${sender}</b>:\n«<b>${title}</b>»`
        : `💌 Новая совместная задача от <b>${sender}</b>:\n«<b>${title}</b>»`;
    } else {
      messageText = isFriendship
        ? `✨ Новая задача от <b>${sender}</b>:\n«<b>${title}</b>»`
        : `💌 Новая задача от <b>${sender}</b>:\n«<b>${title}</b>»`;
    }

    // Добавляем информацию о сроке выполнения, если она указана
    if (dueLabel && dueLabel !== 'Без срока' && dueLabel !== 'Несрочно') {
      const timeInfo = dueTime ? ` в ${dueTime}` : '';
      messageText += `\n🗓 ${dueLabel}${timeInfo}`;
    }

    // 5. Отправка в Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const host = req.headers.host || '';
    const appUrl = process.env.APP_URL || (host ? `https://${host}` : 'https://lovia.app');

    if (!botToken) {
      console.warn('[notify/new-reminder] TELEGRAM_BOT_TOKEN not configured. Skipping sending.');
      return res.status(200).json({ ok: true, simulated: true });
    }

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: partner.telegram_id,
        text: messageText,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Открыть Lovia',
                web_app: { url: appUrl },
              },
            ],
          ],
        },
      }),
    });

    const tgData = (await tgRes.json()) as { ok: boolean; description?: string };
    if (!tgData.ok) {
      console.warn(`[notify/new-reminder] Telegram API error for chat_id ${partner.telegram_id}:`, tgData.description);
      return res.status(200).json({ ok: false, error: tgData.description });
    }

    return res.status(200).json({ ok: true, sent: true });
  } catch (err: any) {
    console.error('[notify/new-reminder] Error in notification handler:', err);
    return res.status(200).json({ ok: false, error: err.message || 'Internal server error' });
  }
}
