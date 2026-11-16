import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CoupleProfile } from '../../../types';
import { Avatar } from '../../ui/Avatar/Avatar';
import { Icon } from '../../ui/Icon/Icon';
import { formatDateRu } from '../../../utils/helpers';
import {
  calculateDaysTogether,
  getAnniversaryInfo,
  pluralizeRu,
  parseDateComponents,
  getTodayUtcMidnight,
  getUtcMidnight,
} from '../../../utils/dateCalculations';
import { relationshipService } from '../../../services/relationshipService';
import { AnniversaryProgressBar } from '../../ui/AnniversaryProgress/AnniversaryProgressBar';
import { PartnerQuickModal } from '../../partner/PartnerQuickModal';
import { telegramService } from '../../../services/telegramService';
import { Mascot } from '../../ui/Mascot/Mascot';
import { useSpaceMode } from '../../../hooks/useSpaceMode';
import './HomeHeader.css';

interface HomeHeaderProps {
  profile: CoupleProfile;
  className?: string;
  onInvitePartner?: () => void;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  profile,
  className = '',
  onInvitePartner,
}) => {
  const navigate = useNavigate();
  const { isFriendship } = useSpaceMode();
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);

  const today = new Date();
  const formattedDate = formatDateRu(today);
  const weekday = today.toLocaleDateString('ru-RU', { weekday: 'long' });
  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

  const hasPartner = profile.isPartnerConnected && Boolean(profile.partner);

  // Dynamic calculations from startDate
  const { daysTogether, anniversary, currentYearsLabel, nextYearsLabel } = useMemo(() => {
    const sDate = profile.startDate || relationshipService.getStartDate();
    const days = calculateDaysTogether(sDate);
    const anniv = getAnniversaryInfo(sDate);

    // Calculate completed full years for the left label, and next anniversary year for the right label
    let completedYears = 0;
    if (sDate) {
      const { year: startYear, month: startMonth, day: startDay } = parseDateComponents(sDate);
      const todayUtc = getTodayUtcMidnight();
      const thisYearAnnivUtc = getUtcMidnight(todayUtc.year, startMonth, startDay);
      completedYears = todayUtc.year - startYear;
      if (todayUtc.timestamp < thisYearAnnivUtc) {
        completedYears -= 1;
      }
      completedYears = Math.max(0, completedYears);
    }
    const nextYears = completedYears + 1;

    const currentLabel = `${completedYears} ${pluralizeRu(completedYears, 'год', 'года', 'лет')}`;
    const nextLabel = `${nextYears} ${pluralizeRu(nextYears, 'год', 'года', 'лет')}`;

    return {
      daysTogether: days,
      anniversary: anniv,
      currentYearsLabel: currentLabel,
      nextYearsLabel: nextLabel,
    };
  }, [profile.startDate]);

  const handleCardClick = () => {
    telegramService.hapticImpact('light');
    navigate('/relationship');
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };

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
    } else if (onInvitePartner) {
      onInvitePartner();
    } else {
      navigate('/connect');
    }
  };

  return (
    <>
      {/*
        HomeHeader: разгруженная 3-колоночная плашка пары:
        - МЫ ВМЕСТЕ и daysLabel счётчик убраны из DOM
        - home-header__avatar-label подписи под аватарами убраны
        - Стрелка chevron справа убрана
        - Дублирующая точка онлайна у имени партнёра убрана (сохранена на самом круглом аватаре)
      */}
      <header className={`home-header ${className}`} aria-label="Пространство пары">
        {/* 1. Date Row: Pure Typography */}
        <div className="home-header__date-row">
          <Icon name="calendar" size={14} className="home-header__date-icon" />
          <span className="home-header__date-text">
            {capitalizedWeekday}, {formattedDate}
          </span>
        </div>

        {/* 2. Expressive Clean 3-Column Interactive Couple Card with Peeking Mascot */}
        <div className="home-header__card-wrapper">
          <div
            className="home-header__peeking-mascot"
            onClick={(e) => {
              e.stopPropagation();
              telegramService.hapticImpact('medium');
            }}
            aria-hidden="true"
          >
            <Mascot variant="peek" size={64} animated interactive />
          </div>

          <div
            className={`home-header__couple-card ${
              anniversary.isToday ? 'home-header__couple-card--celebrate' : ''
            } ${anniversary.isUpcoming ? 'home-header__couple-card--upcoming' : ''}`}
            role="button"
            tabIndex={0}
            onClick={handleCardClick}
            onKeyDown={handleCardKeyDown}
            aria-label={
              isFriendship
                ? 'Перейти в раздел Дружба и памятные даты'
                : 'Перейти в раздел Отношения и памятные даты'
            }
            title={
              isFriendship
                ? 'Нажмите, чтобы открыть историю дружбы'
                : 'Нажмите, чтобы открыть историю отношений'
            }
          >
          <div className="home-header__card-glow" aria-hidden="true" />

          {anniversary.isToday && (
            <div className="home-header__card-confetti" aria-hidden="true">
              <Icon name="sparkles" size={13} className="home-header__sparkle s1" />
              <Icon name={isFriendship ? 'sparkles' : 'heart-filled'} size={11} className="home-header__sparkle s2" />
              <Icon name="sparkles" size={13} className="home-header__sparkle s3" />
            </div>
          )}

          {/* Left Column: User Round Avatar (Clickable to /profile) */}
          <div
            className="home-header__avatar-side home-header__avatar-side--user"
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
            aria-label={`Мой профиль: ${profile.user.name}`}
          >
            <div className="home-header__avatar-frame home-header__avatar-frame--user">
              <Avatar
                name={profile.user.name}
                src={profile.user.avatarUrl}
                size="lg"
                className="home-header__flank-avatar"
              />
            </div>
          </div>

          {/* Center Column: Couple Names & Progress */}
          <div className="home-header__center-zone">
            {/* Names: Имя1 ❤️ Имя2 */}
            <div className="home-header__names-row">
              <span className="home-header__name-text">{profile.user.name}</span>
              <span className="home-header__heart-badge" aria-hidden="true">
                <Icon name={isFriendship ? 'sparkles' : 'heart-filled'} size={14} />
              </span>
              <span className="home-header__name-text">
                {hasPartner ? profile.partner?.name : (isFriendship ? 'Друг' : 'Партнёр')}
              </span>
            </div>

            {/* Anniversary Progress Bar & Year Labels */}
            {hasPartner ? (
              <div className="home-header__progress-container">
                <AnniversaryProgressBar
                  progressPercent={anniversary.progressPercent}
                  daysUntil={anniversary.daysUntil}
                  isToday={anniversary.isToday}
                  yearsTogether={anniversary.yearsTogether}
                  hideCaption
                />
                <div className="home-header__progress-labels">
                  <span className="home-header__progress-year">{currentYearsLabel}</span>
                  <span className="home-header__progress-year">{nextYearsLabel}</span>
                </div>
              </div>
            ) : (
              <div className="home-header__unpaired-block">
                <span className="home-header__unpaired-desc">
                  {isFriendship
                    ? 'Пригласите друга для общего прогресса'
                    : 'Пригласите партнёра для общего прогресса'}
                </span>
                {onInvitePartner && (
                  <button
                    type="button"
                    className="home-header__invite-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInvitePartner();
                    }}
                  >
                    Пригласить
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Partner Round Avatar (Clickable to PartnerQuickModal) */}
          <div
            className="home-header__avatar-side home-header__avatar-side--partner"
            role="button"
            tabIndex={0}
            onClick={handlePartnerClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handlePartnerClick(e);
              }
            }}
            title={
              hasPartner
                ? `${isFriendship ? 'О друге' : 'О партнёре'}: ${profile.partner?.name}`
                : isFriendship
                ? 'Пригласить друга'
                : 'Пригласить партнёра'
            }
            aria-label={
              hasPartner
                ? `${isFriendship ? 'Друг' : 'Партнёр'}: ${profile.partner?.name}`
                : isFriendship
                ? 'Пригласить друга'
                : 'Пригласить партнёра'
            }
          >
            {hasPartner ? (
              <div className="home-header__avatar-frame home-header__avatar-frame--partner">
                <Avatar
                  name={profile.partner!.name}
                  src={profile.partner!.avatarUrl}
                  size="lg"
                  className="home-header__flank-avatar"
                />
              </div>
            ) : (
              <button
                type="button"
                className="home-header__add-partner-avatar"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePartnerClick(e);
                }}
                title={isFriendship ? 'Пригласить друга' : 'Пригласить партнёра'}
                aria-label={isFriendship ? 'Пригласить друга' : 'Пригласить партнёра'}
              >
                <Icon name="plus" size={20} />
              </button>
            )}
          </div>
        </div>
      </div>
      </header>

      {/* Partner Quick Info Modal */}
      {hasPartner && profile.partner && (
        <PartnerQuickModal
          isOpen={isPartnerModalOpen}
          onClose={() => setIsPartnerModalOpen(false)}
          partnerName={profile.partner.name}
          avatarUrl={profile.partner.avatarUrl}
          daysTogether={daysTogether}
        />
      )}
    </>
  );
};
