import { telegramService } from '../services/telegramService';

/**
 * Единый хелпер определения среды для Lovia.
 *
 * Возвращает true ТОЛЬКО если одновременно:
 * 1) import.meta.env.DEV === true (режим разработки Vite)
 * 2) window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
 * 3) Приложение НЕ запущено внутри Telegram Mini App (!telegramService.isTelegramEnv())
 *
 * Во всех остальных случаях (заход с телефона по 192.168.x.x, деплой на Vercel/production,
 * открытие внутри Telegram) возвращает false.
 */
export const TELEGRAM_BOT_USERNAME =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_TELEGRAM_BOT_USERNAME) ||
  'LoviaStory_bot';

export function getTelegramInviteLink(inviteCode: string): string {
  const clean = (inviteCode || '').trim().replace(/_/g, '-').toUpperCase();
  return `https://t.me/${TELEGRAM_BOT_USERNAME}?startapp=${clean}`;
}

export function isLocalDevHost(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const isDev = Boolean(import.meta.env.DEV);
  if (!isDev) {
    return false;
  }

  const hostname = window.location?.hostname || '';
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  if (!isLocal) {
    return false;
  }

  if (telegramService.isTelegramEnv()) {
    return false;
  }

  return true;
}
