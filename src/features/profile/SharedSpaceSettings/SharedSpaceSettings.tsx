import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../../components/ui/Icon/Icon';
import { Button } from '../../../components/ui/Button/Button';
import { Modal } from '../../../components/ui/Modal/Modal';
import { EditStartDateModal } from '../../relationships/EditStartDateModal/EditStartDateModal';
import { formatRussianDate } from '../../../utils/dateCalculations';
import { relationshipService } from '../../../services/relationshipService';
import { profileService, PartnerProfileData } from '../../../services/profileService';
import { coupleService } from '../../../services/coupleService';
import { telegramService } from '../../../services/telegramService';
import { useToast } from '../../../components/ui/Toast/ToastContext';
import { copyTextToClipboard } from '../../../utils/clipboard';
import { getTelegramInviteLink } from '../../../utils/env';
import { useSpaceMode } from '../../../hooks/useSpaceMode';
import './SharedSpaceSettings.css';

export interface SharedSpaceSettingsProps {
  partner: PartnerProfileData;
  startDate: string;
  onStartDateChanged: (newDate: string) => void;
  onPartnerStatusChanged: () => void;
}

export const SharedSpaceSettings: React.FC<SharedSpaceSettingsProps> = ({
  partner,
  startDate,
  onStartDateChanged,
  onPartnerStatusChanged,
}) => {
  const navigate = useNavigate();
  const { isFriendship } = useSpaceMode();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isEditDateOpen, setIsEditDateOpen] = useState(false);
  const [isUnpairWarningOpen, setIsUnpairWarningOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleCopyCode = async () => {
    if (!partner.inviteCode) return;
    const link = getTelegramInviteLink(partner.inviteCode);
    const ok = await copyTextToClipboard(link);
    if (ok) {
      telegramService.hapticNotification('success');
      setCopied(true);
      showToast({
        title: 'Ссылка скопирована!',
        message: 'Прямая ссылка для подключения в Telegram скопирована',
        type: 'love',
      });
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSaveStartDate = (newDate: string) => {
    coupleService.updateStartDate(newDate);
    relationshipService.setStartDate(newDate);
    onStartDateChanged(newDate);
    setIsEditDateOpen(false);
  };

  const handleConfirmUnpair = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await coupleService.dissolveCouple();
      if (!res.success) {
        setDeleteError(res.error || 'Не удалось разорвать связь. Попробуйте снова.');
        setIsDeleting(false);
        return;
      }

      setIsDeleting(false);
      setIsUnpairWarningOpen(false);
      onPartnerStatusChanged();
      // Redirect to onboarding / couple connect
      navigate('/connect');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Произошла непредвиденная ошибка при разрыве связи.';
      setDeleteError(msg);
      setIsDeleting(false);
    }
  };

  const handleReconnect = () => {
    profileService.reconnectPartner();
    onPartnerStatusChanged();
  };

  return (
    <section
      className="shared-space-settings"
      aria-label={isFriendship ? 'Управление пространством дружбы' : 'Управление совместным пространством'}
    >
      <div className="shared-space-settings__header">
        <div className="shared-space-settings__title-row">
          <Icon
            name={isFriendship ? 'sparkles' : 'heart'}
            size={17}
            className="shared-space-settings__icon"
          />
          <h3 className="shared-space-settings__title">
            {isFriendship ? 'Пространство дружбы' : 'Наше пространство'}
          </h3>
        </div>
      </div>

      <div className="shared-space-settings__card">
        {/* Row 1: Start Date */}
        <div className="shared-space-row">
          <div className="shared-space-row__info">
            <span className="shared-space-row__label">
              {isFriendship ? 'Дата начала дружбы' : 'Дата начала отношений'}
            </span>
            <span className="shared-space-row__value">{formatRussianDate(startDate)}</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setIsEditDateOpen(true);
            }}
            className="shared-space-row__btn"
          >
            Изменить
          </Button>
        </div>

        <div className="shared-space-divider" aria-hidden="true" />

        {/* Row 2: Invite Code */}
        <div className="shared-space-row">
          <div className="shared-space-row__info">
            <span className="shared-space-row__label">
              {isFriendship ? 'Код дружбы' : 'Код совместного доступа'}
            </span>
            <code className="shared-space-code">{partner.inviteCode || 'Не создан'}</code>
          </div>
          {partner.inviteCode && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyCode}
              className="shared-space-row__btn"
              aria-label={isFriendship ? 'Скопировать ссылку для дружбы' : 'Скопировать ссылку для пары'}
            >
              {copied ? 'Скопировано' : 'Скопировать ссылку'}
            </Button>
          )}
        </div>

        <div className="shared-space-divider" aria-hidden="true" />

        {/* Row 3: Connection Status & Unpair / Reconnect */}
        <div className="shared-space-row">
          <div className="shared-space-row__info">
            <span className="shared-space-row__label">Статус подключения</span>
            <span className="shared-space-row__value">
              {partner.isPartnerConnected
                ? `Подключено к ${partner.name}`
                : isFriendship
                ? 'Связь с другом не подключена'
                : 'Связь с партнёром не подключена'}
            </span>
          </div>

          {partner.isPartnerConnected ? (
            <button
              type="button"
              className="shared-space-unpair-btn"
              onClick={() => {
                setDeleteError(null);
                setIsUnpairWarningOpen(true);
              }}
            >
              Разорвать связь
            </button>
          ) : (
            <Button variant="primary" size="sm" onClick={handleReconnect}>
              Восстановить связь
            </Button>
          )}
        </div>
      </div>

      {/* Edit Start Date Modal */}
      <EditStartDateModal
        isOpen={isEditDateOpen}
        onClose={() => setIsEditDateOpen(false)}
        currentStartDate={startDate}
        onSave={handleSaveStartDate}
      />

      {/* Warning Unpair Dialog per Part 1.2 & 1.3 */}
      <Modal
        isOpen={isUnpairWarningOpen}
        onClose={() => !isDeleting && setIsUnpairWarningOpen(false)}
        title="Вы уверены, что хотите разорвать связь?"
      >
        <div className="shared-space-warning-modal">
          <div className="shared-space-warning-box">
            <Icon name="alert" size={24} className="shared-warning-icon" />
            <div className="shared-space-warning-text">
              <p className="shared-warning-lead">
                Это действие завершит ваше совместное пространство. Все общие данные, воспоминания, напоминания, желания, категории и история {isFriendship ? 'встреч' : 'свиданий'} будут безвозвратно удалены.
              </p>
              <p className="shared-warning-highlight">
                Восстановить их после разрыва связи будет невозможно.
              </p>
              <p className="shared-warning-partner">
                Ваш {isFriendship ? 'друг' : 'партнёр'} также потеряет доступ к совместному пространству.
              </p>
            </div>
          </div>

          {deleteError && (
            <div className="shared-space-warning-error" role="alert">
              <Icon name="alert" size={16} />
              <span>{deleteError}</span>
            </div>
          )}

          <div className="shared-space-warning-divider" aria-hidden="true" />

          <div className="shared-space-warning-actions">
            <Button
              variant="ghost"
              type="button"
              disabled={isDeleting}
              onClick={() => setIsUnpairWarningOpen(false)}
            >
              Отмена
            </Button>
            <Button
              variant="primary"
              type="button"
              disabled={isDeleting}
              onClick={handleConfirmUnpair}
              className="shared-space-confirm-unpair-btn"
            >
              {isDeleting ? (
                <>
                  <span className="shared-space-spinner" aria-hidden="true" />
                  <span>Разрыв связи...</span>
                </>
              ) : (
                'Да, разорвать связь'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
};
