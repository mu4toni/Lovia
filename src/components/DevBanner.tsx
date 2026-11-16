import { telegramService } from '../services/telegramService';
import './DevBanner.css';

/**
 * Баннер режима разработки. Скрыт в продакшене и внутри Telegram Mini App.
 */
export function DevBanner() {
  if (import.meta.env.PROD || telegramService.isTelegramEnv()) return null;

  return (
    <div className="dev-banner">
      <span className="dev-banner__dot" />
      <span>Lovia • Режим предварительного просмотра</span>
    </div>
  );
}
