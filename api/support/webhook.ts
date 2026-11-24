import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Экранирование HTML-символов для безопасной отправки в Telegram с parse_mode='HTML'
 */
function escapeHtml(text?: string | null): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Инициализация прямого подключения к Supabase через Service Role
 */
function getSupabaseClient() {
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
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Отправка сообщения в Telegram с таймаутом
 */
async function sendTelegramMessage(
  token: string,
  chatId: number | string,
  text: string,
  options: {
    parse_mode?: string;
    reply_to_message_id?: number;
  } = {}
): Promise<{ ok: boolean; result?: any; description?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options.parse_mode ?? 'HTML',
        reply_to_message_id: options.reply_to_message_id,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return await res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error('[support/webhook] sendTelegramMessage error:', err?.message || err);
    return { ok: false, description: err?.message };
  }
}

/**
 * Копирование сообщения в Telegram (текст, фото, видео, документы, голосовые и др.)
 */
async function copyTelegramMessage(
  token: string,
  chatId: number | string,
  fromChatId: number | string,
  messageId: number,
  options: {
    caption?: string;
    parse_mode?: string;
  } = {}
): Promise<{ ok: boolean; result?: any; description?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const body: any = {
      chat_id: chatId,
      from_chat_id: fromChatId,
      message_id: messageId,
    };
    if (options.caption !== undefined) {
      body.caption = options.caption;
      body.parse_mode = options.parse_mode ?? 'HTML';
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/copyMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return await res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error('[support/webhook] copyTelegramMessage error:', err?.message || err);
    return { ok: false, description: err?.message };
  }
}

/**
 * Установка эмодзи-реакции на сообщение
 */
async function setTelegramMessageReaction(
  token: string,
  chatId: number | string,
  messageId: number,
  emoji: string = '👍'
): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setMessageReaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reaction: [{ type: 'emoji', emoji }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data: any = await res.json();
    return Boolean(data?.ok);
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

/**
 * Получение текущей цели пересылки сообщений из public.support_settings
 */
async function getTargetRecipient(
  supabase: any,
  adminTelegramId: number
): Promise<{ chatId: number | string; username: string | null }> {
  if (!supabase) {
    return { chatId: adminTelegramId, username: null };
  }

  try {
    const { data: settings } = await supabase
      .from('support_settings')
      .select('key, value')
      .in('key', ['target_chat_id', 'target_username']);

    let targetChatId: string | number = adminTelegramId;
    let targetUsername: string | null = null;

    if (Array.isArray(settings)) {
      for (const item of settings) {
        if (item.key === 'target_chat_id' && item.value) {
          const parsed = Number(item.value);
          targetChatId = Number.isNaN(parsed) ? item.value : parsed;
        }
        if (item.key === 'target_username' && item.value) {
          targetUsername = item.value;
        }
      }
    }

    return { chatId: targetChatId, username: targetUsername };
  } catch (err) {
    console.warn('[support/webhook] Error fetching target recipient from support_settings:', err);
    return { chatId: adminTelegramId, username: null };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health-check
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, status: 'Support bot webhook active' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const botToken = process.env.SUPPORT_BOT_TOKEN || process.env.TELEGRAM_SUPPORT_BOT_TOKEN;
  if (!botToken) {
    console.error('[support/webhook] SUPPORT_BOT_TOKEN is not configured');
    return res.status(500).json({ ok: false, error: 'SUPPORT_BOT_TOKEN not configured' });
  }

  const adminTelegramId = process.env.ADMIN_TELEGRAM_ID
    ? Number(process.env.ADMIN_TELEGRAM_ID)
    : 0;

  const update = req.body;
  const message = update?.message;

  // Если нет сообщения (например, отредактированное сообщение или событие канала) — завершаем 200
  if (!message || !message.from || !message.chat) {
    return res.status(200).json({ ok: true, ignored: true });
  }

  const from = message.from;
  const chat = message.chat;
  const rawText = typeof message.text === 'string' ? message.text.trim() : '';
  const senderId = from.id;
  const isAdmin = Boolean(adminTelegramId && senderId === adminTelegramId);

  const supabase = getSupabaseClient();

  // =========================================================================
  // 1. Фиксация пользователей в public.support_bot_users
  // =========================================================================
  if (supabase && from.id) {
    try {
      const cleanUsername = from.username
        ? from.username.toLowerCase().replace(/^@/, '')
        : null;

      await supabase.from('support_bot_users').upsert(
        {
          telegram_id: from.id,
          username: cleanUsername,
          first_name: from.first_name || '',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'telegram_id' }
      );
    } catch (dbErr) {
      console.warn('[support/webhook] Failed to upsert user into support_bot_users:', dbErr);
    }
  }

  // Получаем текущего адресата обращений
  const target = await getTargetRecipient(supabase, adminTelegramId);
  const targetChatId = target.chatId || adminTelegramId;
  const isAuthorizedRecipient =
    senderId === targetChatId || (adminTelegramId && senderId === adminTelegramId);

  // =========================================================================
  // 2. Обработка команды /start
  // =========================================================================
  if (rawText.startsWith('/start')) {
    if (isAdmin) {
      const targetDisplay = target.username
        ? `@${escapeHtml(target.username)} (ID: ${escapeHtml(String(target.chatId))})`
        : `Администратор (по умолчанию, ID: ${adminTelegramId || 'не задан'})`;

      const adminWelcome =
        `👑 <b>Панель администратора бота поддержки</b>\n\n` +
        `Текущий получатель обращений: <b>${targetDisplay}</b>\n\n` +
        `<b>Доступные команды:</b>\n` +
        `• <code>/settarget @username</code> — назначить, кому пересылать сообщения пользователей\n` +
        `• <code>/target</code> — посмотреть текущего получателя\n\n` +
        `<i>Чтобы ответить пользователю на обращение, просто используйте функцию «Ответить» (Reply) на сообщение бота.</i>`;

      await sendTelegramMessage(botToken, chat.id, adminWelcome);
      return res.status(200).json({ ok: true });
    }

    // Для обычного пользователя
    const userGreeting =
      `👋 Привет! Напишите сюда ваш вопрос, сообщение о баге (можно со скриншотом) или предложение по рекламе — мы скоро ответим!`;
    await sendTelegramMessage(botToken, chat.id, userGreeting);
    return res.status(200).json({ ok: true });
  }

  // =========================================================================
  // 3. Команды владельца (/settarget, /target)
  // =========================================================================
  if (isAdmin && (rawText.startsWith('/settarget') || rawText.startsWith('/target'))) {
    // Команда /target: просмотр текущей цели
    if (rawText.startsWith('/target')) {
      const targetDisplay = target.username
        ? `@${escapeHtml(target.username)} (ID: ${escapeHtml(String(target.chatId))})`
        : `Администратор (по умолчанию, ID: ${adminTelegramId || 'не задан'})`;

      await sendTelegramMessage(
        botToken,
        chat.id,
        `🎯 Текущий получатель обращений: <b>${targetDisplay}</b>`
      );
      return res.status(200).json({ ok: true });
    }

    // Команда /settarget @username
    if (rawText.startsWith('/settarget')) {
      const match = rawText.match(/^\/settarget(?:@\w+)?\s*(.*)$/i);
      const targetArg = (match ? match[1] : '').trim().toLowerCase().replace(/^@/, '');

      if (!targetArg) {
        await sendTelegramMessage(
          botToken,
          chat.id,
          `⚠️ Укажите username пользователя:\nПример: <code>/settarget @username</code>`
        );
        return res.status(200).json({ ok: true });
      }

      if (!supabase) {
        await sendTelegramMessage(
          botToken,
          chat.id,
          `❌ Ошибка: база данных Supabase не настроена на сервере.`
        );
        return res.status(200).json({ ok: true });
      }

      // Ищем пользователя в public.support_bot_users
      const { data: foundUser, error: findErr } = await supabase
        .from('support_bot_users')
        .select('*')
        .eq('username', targetArg)
        .maybeSingle();

      if (findErr) {
        console.error('[support/webhook] Error searching user in support_bot_users:', findErr);
      }

      if (!foundUser) {
        await sendTelegramMessage(
          botToken,
          chat.id,
          `Пользователь @${escapeHtml(targetArg)} ещё не запускал этого бота. Попросите его нажать /start в боте и повторите команду.`
        );
        return res.status(200).json({ ok: true });
      }

      // Сохраняем в public.support_settings
      const nowIso = new Date().toISOString();
      const { error: saveErr } = await supabase.from('support_settings').upsert([
        { key: 'target_chat_id', value: String(foundUser.telegram_id), updated_at: nowIso },
        { key: 'target_username', value: targetArg, updated_at: nowIso },
      ]);

      if (saveErr) {
        console.error('[support/webhook] Failed to save support_settings:', saveErr);
        await sendTelegramMessage(
          botToken,
          chat.id,
          `❌ Ошибка сохранения настройки в БД: ${escapeHtml(saveErr.message)}`
        );
        return res.status(200).json({ ok: true });
      }

      await sendTelegramMessage(
        botToken,
        chat.id,
        `✅ Все сообщения теперь пересылаются @${escapeHtml(targetArg)}`
      );
      return res.status(200).json({ ok: true });
    }
  }

  // =========================================================================
  // 4. Ответ пользователю через Reply (Ответить)
  // =========================================================================
  const replyTo = message.reply_to_message;
  if (replyTo && isAuthorizedRecipient) {
    const sourceText = replyTo.text || replyTo.caption || '';
    const match = sourceText.match(/#from_(\d+)/);

    if (match && match[1]) {
      const recipientUserId = match[1];

      // Если ответ текстовый — отправляем форматированное сообщение
      if (message.text) {
        await sendTelegramMessage(
          botToken,
          recipientUserId,
          `💬 <b>Ответ службы поддержки:</b>\n\n${escapeHtml(message.text)}`
        );
      } else {
        // Если ответ содержит медиафайл (фото, документ, голосовое и т.д.)
        const customCaption = message.caption
          ? `💬 <b>Ответ службы поддержки:</b>\n\n${escapeHtml(message.caption)}`
          : `💬 <b>Ответ службы поддержки</b>`;

        await copyTelegramMessage(
          botToken,
          recipientUserId,
          chat.id,
          message.message_id,
          { caption: customCaption, parse_mode: 'HTML' }
        );
      }

      // Подтверждение администратору / саппорту
      const reacted = await setTelegramMessageReaction(
        botToken,
        chat.id,
        message.message_id,
        '👍'
      );

      await sendTelegramMessage(
        botToken,
        chat.id,
        `✅ Ответ отправлен`,
        { reply_to_message_id: message.message_id }
      );

      return res.status(200).json({ ok: true, answered: true, to: recipientUserId });
    }
  }

  // =========================================================================
  // 5. Сообщение от текущего получателя саппорта без Reply
  // =========================================================================
  if (isAuthorizedRecipient) {
    await sendTelegramMessage(
      botToken,
      chat.id,
      `ℹ️ Чтобы ответить пользователю, используйте функцию <b>Reply (Ответить)</b> на сообщение бота с тегом <code>#from_...</code>`
    );
    return res.status(200).json({ ok: true, hintSent: true });
  }

  // =========================================================================
  // 6. Пересылка обращений от пользователей к текущему получателю
  // =========================================================================
  if (!targetChatId) {
    console.warn('[support/webhook] Neither target_chat_id nor ADMIN_TELEGRAM_ID is set');
    return res.status(200).json({ ok: true, noTarget: true });
  }

  const senderName = escapeHtml(
    [from.first_name, from.last_name].filter(Boolean).join(' ').trim() ||
    from.first_name ||
    'Пользователь'
  );
  const senderTag = from.username ? `@${escapeHtml(from.username)}` : '';
  const headerText =
    `📩 <b>Новое обращение в поддержку</b>\n` +
    `От: <b>${senderName}</b> ${senderTag}\n` +
    `ID: <code>${from.id}</code>\n` +
    `#from_${from.id}`;

  // А) Если чисто текстовое сообщение — отправляем единым красивым сообщением
  if (message.text) {
    const fullForwardText = `${headerText}\n\n💬 <b>Сообщение:</b>\n${escapeHtml(message.text)}`;
    await sendTelegramMessage(botToken, targetChatId, fullForwardText);
  } else {
    // Б) Если медиасообщение (фото, видео, документ, голосовое, стикер и т.д.)
    await sendTelegramMessage(botToken, targetChatId, headerText);
    const mediaCaption = message.caption
      ? `${escapeHtml(message.caption)}\n\n#from_${from.id}`
      : `#from_${from.id}`;

    await copyTelegramMessage(
      botToken,
      targetChatId,
      chat.id,
      message.message_id,
      { caption: mediaCaption, parse_mode: 'HTML' }
    );
  }

  // Подтверждение пользователю о получении обращения
  await sendTelegramMessage(
    botToken,
    chat.id,
    `✅ Ваше сообщение передано в службу поддержки! Мы ответим вам в этом диалоге.`,
    { reply_to_message_id: message.message_id }
  );

  return res.status(200).json({ ok: true, forwarded: true });
}
