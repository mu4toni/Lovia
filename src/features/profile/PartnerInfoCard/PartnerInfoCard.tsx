import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PartnerProfileData } from '../../../services/profileService';
import { Avatar } from '../../../components/ui/Avatar/Avatar';
import { Icon } from '../../../components/ui/Icon/Icon';
import { formatRussianDate, calculateDaysTogether } from '../../../utils/dateCalculations';
import { telegramService } from '../../../services/telegramService';
import { PartnerQuickModal } from '../../../components/partner/PartnerQuickModal';
import './PartnerInfoCard.css';

export interface PartnerInfoCardProps {
  partner: PartnerProfileData;
  startDate: string;
}

export const PartnerInfoCard: React.FC<PartnerInfoCardProps> = ({ partner, startDate }) => {
  const navigate = useNavigate();
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  const daysTogether = calculateDaysTogether(startDate);

  const handleOpenPartnerModal = () => {
    telegramService.hapticImpact('light');
    setIsQuickModalOpen(true);
  };

  return (
    <>
      <section className="partner-info-card" aria-label="Совместное пространство">
        <div
          className="partner-info-card__top"
          role="button"
          tabIndex={0}
          onClick={handleOpenPartnerModal}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleOpenPartnerModal();
            }
          }}
          aria-label={`Профиль партнёра: ${partner.name}. Нажмите для подробностей`}
        >
          {/* Partner Avatar */}
          <div className="partner-info-card__avatar-wrap">
            <div className="partner-info-card__avatar-frame">
              <Avatar name={partner.name} src={partner.avatarUrl} size="lg" />
            </div>
          </div>

          <div className="partner-info-card__details">
            <div className="partner-info-card__status-line">
              <span className="partner-info-card__tag">ПАРТНЁР</span>
            </div>

            <h2 className="partner-info-card__name">{partner.name}</h2>

            <div className="partner-info-card__date-pill">
              <Icon name="calendar" size={12} className="partner-date-icon" />
              <span>Вместе с {formatRussianDate(startDate)}</span>
            </div>
          </div>

          <div className="partner-info-card__top-chevron-wrap" aria-hidden="true">
            <Icon name="chevron-right" size={18} className="partner-info-card__top-chevron" />
          </div>
        </div>

        <div className="partner-info-card__bottom">
          <button
            type="button"
            className="partner-info-card__action-btn"
            onClick={(e) => {
              e.stopPropagation();
              telegramService.hapticImpact('light');
              navigate('/relationship');
            }}
            aria-label="Открыть историю отношений"
          >
            <div className="partner-info-card__btn-left">
              <Icon name="heart-filled" size={15} className="partner-action-icon" />
              <span>Наша история и даты</span>
            </div>
            <Icon name="chevron-right" size={15} className="partner-action-chevron" />
          </button>
        </div>
      </section>

      <PartnerQuickModal
        isOpen={isQuickModalOpen}
        onClose={() => setIsQuickModalOpen(false)}
        partnerName={partner.name}
        partnerAvatar={partner.avatarUrl}
        daysTogether={daysTogether}
      />
    </>
  );
};
