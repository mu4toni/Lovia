import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CoupleProfile } from '../../../types';
import { Avatar } from '../../ui/Avatar/Avatar';
import { Icon } from '../../ui/Icon/Icon';
import { PolaroidFrame } from '../../ui/PolaroidFrame/PolaroidFrame';
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
import { SketchUnderline } from '../../ui/SketchDecor/SketchDecor';
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
  const userName = profile.user.name;
  const partnerName = profile.partner?.name || (isFriendship ? 'Друг' : 'Партнёр');

  const { daysTogether, daysLabel, anniversary, currentYearsLabel, nextYearsLabel } = useMemo(() => {
    const sDate = profile.startDate || relationshipService.getStartDate();
    const days = calculateDaysTogether(sDate);
    const anniv = getAnniversaryInfo(sDate);

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

    return {
      daysTogether: days,
      daysLabel: pluralizeRu(days, 'день', 'дня', 'дней'),
      anniversary: anniv,
      currentYearsLabel: `${completedYears} ${pluralizeRu(completedYears, 'год', 'года', 'лет')}`,
      nextYearsLabel: `${nextYears} ${pluralizeRu(nextYears, 'год', 'года', 'лет')}`,
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
      <header className={`home-header ${className}`} aria-label="Пространство пары">
        {/* 1. Handwritten Scrapbook Greeting Row + Peeking Bean on Top-Right */}
        <div className="home-header__greeting-row">
          <div className="home-header__greeting-text">
            <span className="home-header__date-chip">
              <Icon name="calendar" size={12} className="home-header__date-icon" />
              <span>
                {capitalizedWeekday}, {formattedDate}
              </span>
            </span>

            <h1 className="home-header__greeting-title">
              {hasPartner
                ? `Привет, ${userName} и ${partnerName} `
                : `Привет, ${userName} `}
              <span className="home-header__greeting-mark" aria-hidden="true">
                {isFriendship ? '✦' : '♥'}
              </span>
            </h1>

            <p className="home-header__greeting-subtitle">
              {hasPartner
                ? isFriendship
                  ? 'Хорошо, что вы дружите ✦'
                  : 'Хорошо, что вы есть ♡'
                : isFriendship
                ? 'Пригласите друга в ваш дневник ✦'
                : 'Пригласите партнёра в ваш дневник ♡'}
            </p>
          </div>

          {/* Bean gently peeking from top-right — strictly pointer-events: none */}
          <div className="home-header__peeking-mascot" aria-hidden="true">
            <Mascot mood="peek" size={68} />
          </div>
        </div>

        {/* 2. Scrapbook Note Card: «Вместе N дней» with Polaroid on Left & Handwritten Counter on Right */}
        <div
          className={`home-header__together-card ${
            anniversary.isToday ? 'home-header__together-card--celebrate' : ''
          }`}
          role="button"
          tabIndex={0}
          onClick={handleCardClick}
          onKeyDown={handleCardKeyDown}
          aria-label={
            isFriendship
              ? `Дружим ${daysTogether} ${daysLabel}. Перейти в раздел Дружба.`
              : `Вместе ${daysTogether} ${daysLabel}. Перейти в раздел Отношения.`
          }
        >
          {/* Left: Tilted Polaroid with Couple Mini-Avatars */}
          <PolaroidFrame
            tilt="left"
            sticker={isFriendship ? 'star' : 'heart'}
            className="home-header__polaroid"
          >
            <div className="home-header__polaroid-avatars">
              <div
                className="home-header__polaroid-avatar-btn home-header__polaroid-avatar-btn--user"
                role="button"
                tabIndex={0}
                onClick={handleUserClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleUserClick(e);
                  }
                }}
                title="Мой профиль"
                aria-label={`Мой профиль: ${userName}`}
              >
                <Avatar
                  name={userName}
                  src={profile.user.avatarUrl}
                  size="md"
                  className="home-header__mini-avatar"
                />
              </div>

              <div
                className="home-header__polaroid-avatar-btn home-header__polaroid-avatar-btn--partner"
                role="button"
                tabIndex={0}
                onClick={handlePartnerClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handlePartnerClick(e);
                  }
                }}
                title={hasPartner ? partnerName : isFriendship ? 'Пригласить друга' : 'Пригласить партнёра'}
                aria-label={hasPartner ? partnerName : isFriendship ? 'Пригласить друга' : 'Пригласить партнёра'}
              >
                {hasPartner ? (
                  <Avatar
                    name={partnerName}
                    src={profile.partner!.avatarUrl}
                    size="md"
                    className="home-header__mini-avatar"
                  />
                ) : (
                  <span className="home-header__polaroid-plus" aria-hidden="true">
                    <Icon name="plus" size={16} />
                  </span>
                )}
              </div>
            </div>
          </PolaroidFrame>

          {/* Right: Handwritten Days Counter & Warm Caption */}
          <div className="home-header__together-info">
            <span className="home-header__together-kicker">
              {isFriendship ? 'Дружим уже' : 'Вместе уже'}
            </span>

            <div className="home-header__days-row">
              <span className="home-header__days-num">{daysTogether}</span>
              <span className="home-header__days-unit">{daysLabel}</span>
            </div>

            <SketchUnderline width={86} variant="wave" className="home-header__days-underline" />

            {hasPartner ? (
              <>
                <p className="home-header__together-note">
                  {anniversary.isToday
                    ? 'С праздником вас сегодня! ♥'
                    : isFriendship
                    ? 'Столько тёплых встреч вместе ✦'
                    : 'Каждый день с тобой особенный ♡'}
                </p>

                <div className="home-header__progress-wrap">
                  <AnniversaryProgressBar
                    progressPercent={anniversary.progressPercent}
                    daysUntil={anniversary.daysUntil}
                    isToday={anniversary.isToday}
                    yearsTogether={anniversary.yearsTogether}
                    hideCaption
                  />
                  <div className="home-header__progress-labels">
                    <span>{currentYearsLabel}</span>
                    <span>{nextYearsLabel}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="home-header__unpaired-block">
                <p className="home-header__together-note">
                  {isFriendship
                    ? 'Подключите друга по коду, чтобы вести дневник вместе'
                    : 'Подключите партнёра по коду, чтобы вести дневник вместе'}
                </p>
                <button
                  type="button"
                  className="home-header__invite-pill"
                  onClick={handlePartnerClick}
                >
                  {isFriendship ? 'Пригласить друга' : 'Пригласить партнёра'}
                </button>
              </div>
            )}
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
