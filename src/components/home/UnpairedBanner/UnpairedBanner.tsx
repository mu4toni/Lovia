import React from 'react';
import { Card } from '../../ui/Card/Card';
import { Button } from '../../ui/Button/Button';
import { Icon } from '../../ui/Icon/Icon';
import { useToast } from '../../ui/Toast/ToastContext';
import './UnpairedBanner.css';

export interface UnpairedBannerProps {
  inviteCode: string;
  onConnectPartnerSim: () => void;
  className?: string;
}

export const UnpairedBanner: React.FC<UnpairedBannerProps> = ({
  inviteCode,
  onConnectPartnerSim,
  className = '',
}) => {
  const { showToast } = useToast();

  const handleCopyLink = () => {
    const link = `https://t.me/lovia_bot?start=${inviteCode}`;
    navigator.clipboard?.writeText(link);
    showToast({
      title: 'Ссылка скопирована',
      message: 'Отправьте её вашему партнёру в Telegram',
      type: 'love',
    });
  };

  return (
    <Card variant="solid" className={`unpaired-banner ${className}`}>
      <div className="unpaired-banner__icon-wrap" aria-hidden="true">
        <Icon name="heart" size={28} className="unpaired-banner__icon" />
      </div>
      <h2 className="unpaired-banner__title">Пригласите партнёра</h2>
      <p className="unpaired-banner__desc">
        Lovia создано для двоих. Отправьте приглашение, чтобы синхронизировать
        общие напоминания, отмечать памятные даты и планировать свидания.
      </p>

      <div className="unpaired-banner__code-box">
        <span className="unpaired-banner__code-label">Код пары:</span>
        <code className="unpaired-banner__code">{inviteCode}</code>
      </div>

      <div className="unpaired-banner__actions">
        <Button
          variant="primary"
          size="md"
          leftIcon={<Icon name="copy" size={16} />}
          onClick={handleCopyLink}
        >
          Скопировать ссылку для пары
        </Button>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Icon name="sparkles" size={14} />}
          onClick={onConnectPartnerSim}
          className="unpaired-banner__sim-btn"
        >
          Симулировать подключение Алисы
        </Button>
      </div>
    </Card>
  );
};
