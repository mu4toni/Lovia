import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Извлечение username канала для ссылки вида https://t.me/username
 */
function getChannelUsername(): string {
  const channelId = process.env.REQUIRED_CHANNEL_ID?.trim() || '';
  if (channelId.startsWith('@')) return channelId.slice(1);
  if (!channelId.startsWith('-')) return channelId;
  return '';
}

/**
 * Получение ссылки на канал для подписки
 */
function getChannelUrl(): string {
  if (process.env.REQUIRED_CHANNEL_URL) {
    return process.env.REQUIRED_CHANNEL_URL.trim();
  }
  const channelUsername = getChannelUsername();
  return channelUsername ? `https://t.me/${channelUsername}` : 'https://t.me';
}

/**
 * Проверка подписки пользователя на обязательный Telegram-канал.
 * Если REQUIRED_CHANNEL_ID не задана — возвращает true (обратная совместимость).
 */
export async function checkUserSubscription(userId: number): Promise<boolean> {
  const channelId = process.env.REQUIRED_CHANNEL_ID?.trim();
  if (!channelId) {
    return true;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn('[telegram/webhook] TELEGRAM_BOT_TOKEN not configured for subscription check');
    return true;
  }

  const formattedChatId =
    channelId.startsWith('@') || channelId.startsWith('-')
      ? channelId
      : `@${channelId}`;

  try {
    const url = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(formattedChatId)}&user_id=${userId}`;
    const response = await fetch(url);
    const data: any = await response.json();

    if (!data || !data.ok) {
      console.warn('[telegram/webhook] getChatMember returned error:', data);
      return false;
    }

    const status = data.result?.status;
    const isMember = status === 'restricted' ? Boolean(data.result?.is_member) : false;

    if (['member', 'administrator', 'creator'].includes(status) || isMember) {
      return true;
    }

    return false;
  } catch (err) {
    console.error('[telegram/webhook] Failed to check user subscription:', err);
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health-check / ping
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, status: 'Telegram webhook endpoint active' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const update = req.body;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const host = req.headers.host || '';
    const baseUrl = process.env.APP_URL || (host ? `https://${host}` : 'https://lovia.app');

    // =========================================================================
    // 1. Обработка нажатия кнопки "✅ Проверить подписку" (callback_query)
    // =========================================================================
    const callbackQuery = update?.callback_query;
    if (callbackQuery) {
      const callbackData: string = callbackQuery.data || '';
      if (callbackData === 'check_subscription' || callbackData.startsWith('check_subscription:')) {
        const userId = callbackQuery.from?.id;
        const chatId = callbackQuery.message?.chat?.id;
        const messageId = callbackQuery.message?.message_id;

        if (botToken && userId) {
          const isSubscribed = await checkUserSubscription(userId);

          if (isSubscribed) {
            // Всплывающее уведомление об успешной проверке
            await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackQuery.id,
                text: 'Спасибо за подписку! ❤️',
              }),
            }).catch((e) => console.warn('[telegram/webhook] answerCallbackQuery error:', e));

            // Восстановление startParam (если был передан при /start)
            const startParam = callbackData.startsWith('check_subscription:')
              ? callbackData.slice('check_subscription:'.length)
              : '';
            const webAppUrl = startParam
              ? `${baseUrl}?startapp=${encodeURIComponent(startParam)}`
              : baseUrl;

            const firstName = callbackQuery.from?.first_name || '';
            const greeting = firstName ? `Привет, ${firstName}! ` : 'Привет! ';

            const welcomeText =
              `✨ <b>${greeting}Добро пожаловать в Lovia!</b>\n\n` +
              `Уютное пространство для двоих: совместные напоминания, список желаний, годовщины, памятные даты и фото-альбом свиданий.\n\n` +
              `Бот будет бережно напоминать вам о важных планах за 1 час, а также поздравлять с годовщинами.\n\n` +
              `Нажмите кнопку ниже, чтобы открыть Lovia ❤️`;

            const openMarkup = {
              inline_keyboard: [
                [
                  {
                    text: '✨ Открыть Lovia',
                    web_app: { url: webAppUrl },
                  },
                ],
              ],
            };

            // Редактируем сообщение с запросом подписки на приветственное
            let edited = false;
            if (chatId && messageId) {
              try {
                const editRes = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: chatId,
                    message_id: messageId,
                    text: welcomeText,
                    parse_mode: 'HTML',
                    reply_markup: openMarkup,
                  }),
                });
                const editJson = await editRes.json();
                edited = editJson?.ok === true;
              } catch (e) {
                console.warn('[telegram/webhook] editMessageText error:', e);
              }
            }

            // Фолбэк: если не удалось отредактировать, отправляем новым сообщением
            if (!edited && chatId) {
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: welcomeText,
                  parse_mode: 'HTML',
                  reply_markup: openMarkup,
                }),
              }).catch((e) => console.warn('[telegram/webhook] sendMessage fallback error:', e));
            }
          } else {
            // Пользователь ещё не подписан — показываем alert
            await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackQuery.id,
                text: 'Вы ещё не подписались на канал. Подпишитесь и нажмите «Проверить подписку» ещё раз!',
                show_alert: true,
              }),
            }).catch((e) => console.warn('[telegram/webhook] answerCallbackQuery alert error:', e));
          }
        }

        return res.status(200).json({ ok: true });
      }
    }

    // =========================================================================
    // 2. Обработка текстовых сообщений (команда /start)
    // =========================================================================
    const message = update?.message;
    const chatId = message?.chat?.id;
    const text: string = message?.text || '';
    const fromUser = message?.from;

    if (chatId && text.startsWith('/start')) {
      const startParam = text.replace('/start', '').trim();
      const webAppUrl = startParam
        ? `${baseUrl}?startapp=${encodeURIComponent(startParam)}`
        : baseUrl;

      const firstName = fromUser?.first_name || '';
      const greeting = firstName ? `Привет, ${firstName}! ` : 'Привет! ';

      if (!botToken) {
        console.warn('[telegram/webhook] TELEGRAM_BOT_TOKEN not configured. Skipped sending message.');
        return res.status(200).json({ ok: true });
      }

      // Проверка обязательной подписки на канал
      const userId = fromUser?.id;
      const isSubscribed = userId ? await checkUserSubscription(userId) : true;

      if (isSubscribed) {
        // Подписан — сразу приветствуем и отдаём кнопку WebApp
        const replyText =
          `✨ <b>${greeting}Добро пожаловать в Lovia!</b>\n\n` +
          `Уютное пространство для двоих: совместные напоминания, список желаний, годовщины, памятные даты и фото-альбом свиданий.\n\n` +
          `Бот будет бережно напоминать вам о важных планах за 1 час, а также поздравлять с годовщинами.\n\n` +
          `Нажмите кнопку ниже, чтобы открыть Lovia ❤️`;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: replyText,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '✨ Открыть Lovia',
                    web_app: { url: webAppUrl },
                  },
                ],
              ],
            },
          }),
        }).catch((e) => console.warn('[telegram/webhook] sendMessage error:', e));
      } else {
        // Не подписан — просим подписаться на канал
        const promptText =
          `✨ <b>${greeting}Добро пожаловать в Lovia!</b>\n\n` +
          `Чтобы открыть Lovia, подпишитесь на наш канал — там публикуются обновления, идеи и новости приложения 👇`;

        const channelUsername = getChannelUsername();
        const channelUrl = process.env.REQUIRED_CHANNEL_URL || (channelUsername ? `https://t.me/${channelUsername}` : 'https://t.me');
        const callbackData =
          startParam && startParam.length <= 40
            ? `check_subscription:${startParam}`
            : 'check_subscription';

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: promptText,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '📢 Подписаться на канал',
                    url: channelUrl,
                  },
                ],
                [
                  {
                    text: '✅ Проверить подписку',
                    callback_data: callbackData,
                  },
                ],
              ],
            },
          }),
        }).catch((e) => console.warn('[telegram/webhook] sendMessage prompt error:', e));
      }
    }

    // Всегда возвращаем 200 OK в Telegram, чтобы вебхук не застревал в повторах
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('[telegram/webhook] Webhook processing error:', err);
    return res.status(200).json({ ok: true, error: err.message });
  }
}
