import type { VercelRequest, VercelResponse } from '@vercel/node';
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
 * Валидация подписи Telegram WebApp initData по стандарту Telegram:
 * 1. Извлекается hash
 * 2. Остальные параметры сортируются по алфавиту: "key=value\nkey2=value2..."
 * 3. Secret key = HMAC_SHA256("WebAppData", bot_token)
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

    // Сортировка ключей по алфавиту
    const sortedKeys = Array.from(params.keys()).sort();
    const dataCheckString = sortedKeys
      .map((key) => `${key}=${params.get(key)}`)
      .join('\n');

    // Вычисление секретного ключа: HMAC-SHA-256("WebAppData", botToken)
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Вычисление подписи
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Безопасное сравнение
    const hashBuffer = Buffer.from(hash, 'hex');
    const calculatedBuffer = Buffer.from(calculatedHash, 'hex');

    if (
      hashBuffer.length !== calculatedBuffer.length ||
      !crypto.timingSafeEqual(hashBuffer, calculatedBuffer)
    ) {
      return { isValid: false, error: 'Неверная цифровая подпись Telegram' };
    }

    // Проверка срока давности auth_date (максимум 24 часа)
    const authDateStr = params.get('auth_date');
    if (authDateStr) {
      const authTimestamp = parseInt(authDateStr, 10);
      const nowTimestamp = Math.floor(Date.now() / 1000);
      if (nowTimestamp - authTimestamp > 86400) {
        return { isValid: false, error: 'Срок действия initData истёк (более 24 часов)' };
      }
    }

    // Извлечение данных пользователя
    const userJson = params.get('user');
    let user: TelegramAuthUser | undefined;
    if (userJson) {
      user = JSON.parse(userJson);
    }

    return { isValid: true, user };
  } catch (err: any) {
    return { isValid: false, error: err.message || 'Ошибка валидации initData' };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Метод не поддерживается' });
  }

  const { initData } = req.body || {};
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!initData) {
    return res.status(400).json({ success: false, error: 'Поле initData обязательно' });
  }

  if (!botToken) {
    // В dev-режиме без токена парсим initData без криптографической проверки
    if (process.env.NODE_ENV !== 'production') {
      try {
        const params = new URLSearchParams(initData);
        const userJson = params.get('user');
        const user = userJson ? JSON.parse(userJson) : undefined;
        return res.status(200).json({
          success: true,
          verified: false,
          warning: 'TELEGRAM_BOT_TOKEN не задан, валидация пропущена в dev',
          user,
        });
      } catch {
        return res.status(400).json({ success: false, error: 'Некорректный initData' });
      }
    }

    return res.status(500).json({
      success: false,
      error: 'TELEGRAM_BOT_TOKEN не настроен на сервере',
    });
  }

  const verification = verifyTelegramInitData(initData, botToken);
  if (!verification.isValid) {
    return res.status(401).json({
      success: false,
      error: verification.error || 'Недействительная подпись Telegram',
    });
  }

  return res.status(200).json({
    success: true,
    verified: true,
    user: verification.user,
  });
}
