import React from 'react';
import { Card } from '../../ui/Card/Card';
import { Button } from '../../ui/Button/Button';
import { Icon } from '../../ui/Icon/Icon';
import { useToast } from '../../ui/Toast/ToastContext';
import { useSpaceMode } from '../../../hooks/useSpaceMode';
import { getTelegramInviteLink, isLocalDevHost } from '../../../utils/env';
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
  const { isFriendship } = useSpaceMode();

  const handleCopyLink = () => {
    const link = getTelegramInviteLink(inviteCode);
    navigator.clipboard?.writeText(link);
    showToast({
      title: 'Ссылка скопирована',
      message: isFriendship
        ? 'Отправьте её вашему другу в Telegram'
        : 'Отправьте её вашему партнёру в Telegram',
      type: 'love',
    });
  };

  return (
    <Card variant="solid" className={`unpaired-banner ${className}`}>
      <div className="unpaired-banner__icon-wrap" aria-hidden="true">
        <Icon
          name={isFriendship ? 'sparkles' : 'heart'}
          size={28}
          className="unpaired-banner__icon"
        />
      </div>
      <h2 className="unpaired-banner__title">
        {isFriendship ? 'Пригласите друга' : 'Пригласите партнёра'}
      </h2>
      <p className="unpaired-banner__desc">
        {isFriendship
          ? 'Lovia создано для двоих. Отправьте приглашение, чтобы синхронизировать совместные списки, важные даты и встречи.'
          : 'Lovia создано для двоих. Отправьте приглашение, чтобы синхронизировать общие напоминания, отмечать памятные даты и планировать свидания.'}
      </p>

      <div className="unpaired-banner__code-box">
        <span className="unpaired-banner__code-label">
          {isFriendship ? 'Код дружбы:' : 'Код пары:'}
        </span>
        <code className="unpaired-banner__code">{inviteCode}</code>
      </div>

      <div className="unpaired-banner__actions">
        <Button
          variant="primary"
          size="md"
          leftIcon={<Icon name="copy" size={16} />}
          onClick={handleCopyLink}
        >
          {isFriendship ? 'Скопировать ссылку для друга' : 'Скопировать ссылку для пары'}
        </Button>
        {isLocalDevHost() && (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Icon name="sparkles" size={14} />}
            onClick={onConnectPartnerSim}
            className="unpaired-banner__sim-btn"
          >
            Симулировать подключение Алисы
          </Button>
        )}
      </div>
    </Card>
  );
};
