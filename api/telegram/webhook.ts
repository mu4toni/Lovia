import type { VercelRequest, VercelResponse } from '@vercel/node';

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
    const message = update?.message;
    const chatId = message?.chat?.id;
    const text: string = message?.text || '';

    // Обработка команды /start
    if (chatId && text.startsWith('/start')) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const host = req.headers.host || '';
      const baseUrl = process.env.APP_URL || (host ? `https://${host}` : 'https://lovia.app');

      // Извлечение опционального параметра запуска (например, код пары: /start LOVIA-7492-MK)
      const startParam = text.replace('/start', '').trim();
      const webAppUrl = startParam
        ? `${baseUrl}?startapp=${encodeURIComponent(startParam)}`
        : baseUrl;

      const firstName = message?.from?.first_name || '';
      const greeting = firstName ? `Привет, ${firstName}! ` : 'Привет! ';

      const replyText =
        `✨ <b>${greeting}Добро пожаловать в Lovia!</b>\n\n` +
        `Уютное пространство для двоих: совместные напоминания, список желаний, годовщины, памятные даты и фото-альбом свиданий.\n\n` +
        `Бот будет бережно напоминать вам о важных планах за 1 час, а также поздравлять с годовщинами.\n\n` +
        `Нажмите кнопку ниже, чтобы открыть Lovia ❤️`;

      if (botToken) {
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
        });
      } else {
        console.warn('[telegram/webhook] TELEGRAM_BOT_TOKEN not configured. Skipped sending message.');
      }
    }

    // Всегда возвращаем 200 OK в Telegram, чтобы вебхук не застревал в повторах
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('[telegram/webhook] Webhook processing error:', err);
    return res.status(200).json({ ok: true, error: err.message });
  }
}
