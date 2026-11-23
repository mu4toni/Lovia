import { telegramService } from '../services/telegramService';

/**
 * Единый хелпер определения среды для Lovia.
 *
 * Возвращает true ТОЛЬКО если одновременно:
 * 1) import.meta.env.DEV === true (режим разработки Vite)
 * 2) window.location.hostname — локальный хост (localhost, 127.0.0.1, 192.168.*, 10.*, 172.16.*–172.31.*, *.local)
 * 3) Приложение НЕ запущено внутри Telegram Mini App (!telegramService.isTelegramEnv())
 *
 * Во всех остальных случаях (деплой на Vercel/production, открытие внутри Telegram) возвращает false.
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

  if (telegramService.isTelegramEnv()) {
    return false;
  }

  const hostname = (window.location?.hostname || '').toLowerCase();
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.local') ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname);

  return isLocal;
}
