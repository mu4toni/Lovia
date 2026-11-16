import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal/Modal';
import { Avatar } from '../ui/Avatar/Avatar';
import { Icon } from '../ui/Icon/Icon';
import { pluralizeRu } from '../../utils/dateCalculations';
import { telegramService } from '../../services/telegramService';
import { useSpaceMode } from '../../hooks/useSpaceMode';
import './PartnerQuickModal.css';

export interface PartnerQuickModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerName: string;
  avatarUrl?: string;
  partnerAvatar?: string;
  daysTogether: number;
}

export const PartnerQuickModal: React.FC<PartnerQuickModalProps> = ({
  isOpen,
  onClose,
  partnerName,
  avatarUrl,
  partnerAvatar,
  daysTogether,
}) => {
  const navigate = useNavigate();
  const { isFriendship } = useSpaceMode();
  const effectiveAvatar = avatarUrl || partnerAvatar;
  const daysLabel = pluralizeRu(daysTogether, 'день', 'дня', 'дней');

  const handleOpenWishlist = () => {
    telegramService.hapticImpact('light');
    onClose();
    navigate('/wishlist?tab=partner', { state: { tab: 'partner' } });
  };

  const handleOpenHistory = () => {
    telegramService.hapticImpact('light');
    onClose();
    navigate('/relationship');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isFriendship ? 'О друге' : 'О партнёре'}
    >
      <div className="partner-quick-modal" role="region" aria-label={`Профиль ${partnerName}`}>
        {/* Avatar */}
        <div className="partner-quick-modal__avatar-wrap">
          <div className="partner-quick-modal__avatar-frame">
            <Avatar name={partnerName} src={effectiveAvatar} size="xl" />
          </div>
        </div>

        <h3 className="partner-quick-modal__name">{partnerName}</h3>

        {/* Days Box */}
        <div className="partner-quick-modal__days-box">
          <Icon name={isFriendship ? 'sparkles' : 'heart-filled'} size={15} />
          <span>
            {isFriendship ? 'Дружим уже ' : 'Вместе уже '}<strong>{daysTogether}</strong> {daysLabel}
          </span>
        </div>

        {/* Quick Action Buttons */}
        <div className="partner-quick-modal__actions">
          <button
            type="button"
            className="partner-quick-modal__btn partner-quick-modal__btn--primary"
            onClick={handleOpenWishlist}
            aria-label={`Открыть вишлист ${partnerName}`}
          >
            <div className="partner-quick-modal__btn-content">
              <span className="partner-quick-modal__btn-icon">
                <Icon name="gift" size={17} />
              </span>
              <span>{isFriendship ? 'Вишлист друга' : 'Вишлист партнёра'}</span>
            </div>
            <Icon name="chevron-right" size={16} className="partner-quick-modal__chevron" />
          </button>

          <button
            type="button"
            className="partner-quick-modal__btn"
            onClick={handleOpenHistory}
            aria-label={isFriendship ? 'Перейти в хронологию дружбы' : 'Перейти в хронологию отношений'}
          >
            <div className="partner-quick-modal__btn-content">
              <span className="partner-quick-modal__btn-icon">
                <Icon name="calendar" size={17} />
              </span>
              <span>{isFriendship ? 'Наша дружба и встречи' : 'Наша история и даты'}</span>
            </div>
            <Icon name="chevron-right" size={16} className="partner-quick-modal__chevron" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
