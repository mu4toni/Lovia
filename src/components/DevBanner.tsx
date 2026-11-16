import { isLocalDevHost } from '../utils/env';
import './DevBanner.css';

/**
 * Баннер режима разработки. Рендерится только на localhost в режиме разработки.
 */
export function DevBanner() {
  if (!isLocalDevHost()) return null;

  return (
    <div className="dev-banner">
      <span className="dev-banner__dot" />
      <span>Lovia • Режим предварительного просмотра</span>
    </div>
  );
}
