import React, { useState } from 'react';
import { Mascot } from '../Mascot/Mascot';
import { Button } from '../Button/Button';
import { telegramService } from '../../../services/telegramService';
import { coupleService } from '../../../services/coupleService';
import './SubscriptionGate.css';

export interface SubscriptionGateProps {
  channelUrl?: string;
  onVerified?: () => void;
}

export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({
  channelUrl,
  onVerified,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveChannelUrl =
    channelUrl || coupleService.getRequiredChannelUrl() || 'https://t.me';

  const handleOpenChannel = () => {
    telegramService.hapticImpact('light');
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(effectiveChannelUrl);
    } else {
      telegramService.openTelegramLink(effectiveChannelUrl);
    }
  };

  const handleVerify = async () => {
    telegramService.hapticImpact('medium');
    setIsChecking(true);
    setErrorMsg(null);

    try {
      const verified = await coupleService.verifyChannelSubscription();
      if (verified) {
        telegramService.hapticNotification('success');
        onVerified?.();
      } else {
        telegramService.hapticNotification('error');
        setErrorMsg('Вы ещё не подписались на канал. Пожалуйста, подпишитесь и нажмите «Проверить» ещё раз!');
      }
    } catch (err: any) {
      telegramService.hapticNotification('error');
      const msg =
        err?.message ||
        'Не удалось проверить подписку. Пожалуйста, попробуйте снова через несколько секунд.';
      setErrorMsg(msg);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="subscription-gate-root" role="dialog" aria-modal="true" aria-labelledby="sub-gate-title">
      <div className="subscription-gate-backdrop" />
      <div className="subscription-gate-card">
        <div className="subscription-gate-mascot-wrap">
          <Mascot variant="peek" size={136} animated interactive alt="Маскот Lovia" />
        </div>

        <h1 id="sub-gate-title" className="subscription-gate-title">
          Подписка на канал
        </h1>

        <p className="subscription-gate-description">
          Чтобы пользоваться <b>Lovia</b>, подпишитесь на наш официальный канал — там публикуются идеи для свиданий, полезные обновления и новости приложения ❤️
        </p>

        {errorMsg && (
          <div className="subscription-gate-error" role="alert">
            <span className="subscription-gate-error-icon">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="subscription-gate-actions">
          <Button
            variant="primary"
            size="lg"
            className="subscription-gate-btn-sub"
            onClick={handleOpenChannel}
          >
            📢 Подписаться на канал
          </Button>

          <Button
            variant="secondary"
            size="lg"
            className="subscription-gate-btn-verify"
            onClick={handleVerify}
            disabled={isChecking}
          >
            {isChecking ? '⏳ Проверяем подписку...' : '✅ Я подписался — проверить'}
          </Button>
        </div>
      </div>
    </div>
  );
};
