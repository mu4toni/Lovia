import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CoupleProfile } from '../../../types/couple';
import { Avatar } from '../../../components/ui/Avatar/Avatar';
import { Icon } from '../../../components/ui/Icon/Icon';
import { formatRussianDate, pluralizeRu } from '../../../utils/dateCalculations';
import { PartnerQuickModal } from '../../../components/partner/PartnerQuickModal';
import { RelationshipMilestonesModal } from '../../../components/relationship/RelationshipMilestonesModal';
import { telegramService } from '../../../services/telegramService';
import './CoupleInfoCard.css';

export interface CoupleInfoCardProps {
  profile: CoupleProfile | null;
  startDate: string;
  daysTogether: number;
  heldDatesCount: number;
  onEditStartDate?: () => void;
  onAddMemorableDate?: () => void;
}

export const CoupleInfoCard: React.FC<CoupleInfoCardProps> = ({
  profile,
  startDate,
  daysTogether,
  heldDatesCount,
  onAddMemorableDate,
}) => {
  const navigate = useNavigate();
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [isMilestonesModalOpen, setIsMilestonesModalOpen] = useState(false);

  const userName = profile?.user?.name || 'Марсель';
  const partnerName = profile?.partner?.name || 'Алиса';
  const hasPartner = profile?.isPartnerConnected && Boolean(profile.partner);

  const daysLabel = pluralizeRu(daysTogether, 'день', 'дня', 'дней');
  const datesLabel = pluralizeRu(heldDatesCount, 'свидание', 'свидания', 'свиданий');

  const handleUserClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    telegramService.hapticImpact('light');
    navigate('/profile');
  };

  const handlePartnerClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    telegramService.hapticImpact('light');
    if (hasPartner) {
      setIsPartnerModalOpen(true);
    } else {
      navigate('/connect');
    }
  };

  const handleDaysClick = () => {
    telegramService.hapticImpact('light');
    setIsMilestonesModalOpen(true);
  };

  const handleDatesClick = () => {
    telegramService.hapticImpact('light');
    navigate('/dates');
  };

  return (
    <>
      <section className="relationship-hero-card" aria-label="Карточка пары">
        <div className="relationship-hero-card__glow" aria-hidden="true" />

        {/* 3-Zone Horizontal Top */}
        <div className="relationship-hero-card__top">
          {/* Left: User Avatar */}
          <div
            className="relationship-hero-card__avatar-side relationship-hero-card__avatar-side--user"
            role="button"
            tabIndex={0}
            onClick={handleUserClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleUserClick(e);
              }
            }}
            title="Перейти в мой профиль"
            aria-label={`Мой профиль: ${userName}`}
          >
            <div className="relationship-hero-card__avatar-frame relationship-hero-card__avatar-frame--user">
              <Avatar
                name={userName}
                src={profile?.user?.avatarUrl}
                size="lg"
                className="relationship-hero-card__flank-avatar"
              />
            </div>
            <span className="relationship-hero-card__avatar-name">{userName}</span>
          </div>

          {/* Center: Couple Names & Start Date Pill */}
          <div className="relationship-hero-card__center">
            <div className="relationship-hero-card__names-row">
              <span className="relationship-hero-card__name">{userName}</span>
              <span className="relationship-hero-card__heart" aria-hidden="true">
                <Icon name="heart-filled" size={13} />
              </span>
              <span className="relationship-hero-card__name">{partnerName}</span>
            </div>

            <div
              className="relationship-hero-card__start-date-pill"
              role="button"
              tabIndex={0}
              onClick={() => {
                telegramService.hapticImpact('light');
                setIsMilestonesModalOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  telegramService.hapticImpact('light');
                  setIsMilestonesModalOpen(true);
                }
              }}
              title="Нажмите, чтобы посмотреть вехи отношений"
              aria-label={`Вместе с ${formatRussianDate(startDate)}. Нажмите для просмотра вех.`}
            >
              <Icon name="calendar" size={12} className="start-date-icon" />
              <span>Вместе с {formatRussianDate(startDate)}</span>
            </div>
          </div>

          {/* Right: Partner Avatar */}
          <div
            className="relationship-hero-card__avatar-side relationship-hero-card__avatar-side--partner"
            role="button"
            tabIndex={0}
            onClick={handlePartnerClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handlePartnerClick(e);
              }
            }}
            title={hasPartner ? 'Информация о партнёре' : 'Подключить партнёра'}
            aria-label={hasPartner ? `Информация о партнёре: ${partnerName}` : 'Подключить партнёра'}
          >
            <div className="relationship-hero-card__avatar-frame relationship-hero-card__avatar-frame--partner">
              <Avatar
                name={partnerName}
                src={profile?.partner?.avatarUrl}
                size="lg"
                className="relationship-hero-card__flank-avatar"
              />
            </div>
            <span className="relationship-hero-card__avatar-name">{partnerName}</span>
          </div>
        </div>

        {/* 2 Split Restrained Clickable Stats Cards */}
        <div className="relationship-hero-card__stats" role="group" aria-label="Статистика отношений">
          {/* Left Mini-Card: Days together (Clickable -> Milestones Modal) */}
          <div
            className="relationship-hero-card__stat-item relationship-hero-card__stat-item--days"
            role="button"
            tabIndex={0}
            onClick={handleDaysClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleDaysClick();
              }
            }}
            title="Нажмите, чтобы посмотреть вехи отношений"
            aria-label={`Вместе ${daysTogether} ${daysLabel}. Нажмите для просмотра вех.`}
          >
            {/* Large blurred background icon on right/bottom */}
            <div className="relationship-hero-card__stat-bg-icon" aria-hidden="true">
              <Icon name="heart-filled" size={100} />
            </div>

            <div className="relationship-hero-card__stat-chevron-wrap" aria-hidden="true">
              <Icon name="chevron-right" size={13} className="relationship-hero-card__stat-chevron" />
            </div>

            <div className="relationship-hero-card__stat-content">
              <div className="relationship-hero-card__stat-num-row">
                <span className="relationship-hero-card__stat-num">{daysTogether}</span>
                <span className="relationship-hero-card__stat-unit">{daysLabel}</span>
              </div>
              <span className="relationship-hero-card__stat-sub">непрерывной истории</span>
            </div>
          </div>

          {/* Right Mini-Card: Held Dates (Clickable -> /dates) */}
          <div
            className="relationship-hero-card__stat-item relationship-hero-card__stat-item--dates"
            role="button"
            tabIndex={0}
            onClick={handleDatesClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleDatesClick();
              }
            }}
            title="Нажмите, чтобы открыть дневник свиданий"
            aria-label={`${heldDatesCount} ${datesLabel} в дневнике воспоминаний. Нажмите для перехода.`}
          >
            {/* Large blurred background icon on right/bottom */}
            <div className="relationship-hero-card__stat-bg-icon" aria-hidden="true">
              <Icon name="calendar" size={96} />
            </div>

            <div className="relationship-hero-card__stat-chevron-wrap" aria-hidden="true">
              <Icon name="chevron-right" size={13} className="relationship-hero-card__stat-chevron" />
            </div>

            <div className="relationship-hero-card__stat-content">
              <div className="relationship-hero-card__stat-num-row">
                <span className="relationship-hero-card__stat-num">{heldDatesCount}</span>
                <span className="relationship-hero-card__stat-unit">{datesLabel}</span>
              </div>
              <span className="relationship-hero-card__stat-sub">в дневнике воспоминаний</span>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Quick Modal */}
      {hasPartner && (
        <PartnerQuickModal
          isOpen={isPartnerModalOpen}
          onClose={() => setIsPartnerModalOpen(false)}
          partnerName={partnerName}
          avatarUrl={profile?.partner?.avatarUrl}
          daysTogether={daysTogether}
        />
      )}

      {/* Relationship Milestones Modal */}
      <RelationshipMilestonesModal
        isOpen={isMilestonesModalOpen}
        onClose={() => setIsMilestonesModalOpen(false)}
        startDate={startDate}
        onAddMemorableDate={onAddMemorableDate}
      />
    </>
  );
};
