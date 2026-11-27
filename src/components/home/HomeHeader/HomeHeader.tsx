import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CoupleProfile } from '../../../types';
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
import { Mascot, MascotName } from '../../ui/Mascot/Mascot';
import { SketchUnderline } from '../../ui/SketchDecor/SketchDecor';
import { useSpaceMode } from '../../../hooks/useSpaceMode';
import { useCouplePhotoUrl, useCouplePhotoPicker } from '../../../features/couple/useCouplePhoto';
import './HomeHeader.css';

interface BeanMood {
  id: string;
  sticker: MascotName;
  relationshipGreeting: string;
  friendshipGreeting: string;
}

const BEAN_MOODS: BeanMood[] = [
  {
    id: 'calm',
    sticker: '29_mood_calm',
    relationshipGreeting: 'Хорошо, что вы есть ♡',
    friendshipGreeting: 'Рад видеть вас вместе ✦',
  },
  {
    id: 'happy',
    sticker: '21_mood_happy',
    relationshipGreeting: 'У Бина отличное настроение — пусть ваш день будет таким же ярким!',
    friendshipGreeting: 'У Бина отличное настроение — пусть ваш день будет таким же ярким ✦',
  },
  {
    id: 'sleepy',
    sticker: '22_mood_sleepy',
    relationshipGreeting: 'Бин ещё сонный… не забудьте пожелать друг другу доброго утра или сладких снов',
    friendshipGreeting: 'Бин ещё сонный… не забудьте пожелать друг другу доброго утра или хорошего отдыха',
  },
  {
    id: 'sad',
    sticker: '23_mood_sad',
    relationshipGreeting: 'Бин немного загрустил — обнимите или поддержите друг друга сегодня',
    friendshipGreeting: 'Бин немного загрустил — поддержите друг друга и поднимите настроение',
  },
  {
    id: 'angry',
    sticker: '24_mood_angry',
    relationshipGreeting: 'Бин сегодня ворчит — порадуйте друг друга чем-нибудь приятным!',
    friendshipGreeting: 'Бин сегодня ворчит — порадуйте друг друга чем-нибудь приятным!',
  },
  {
    id: 'miss_you',
    sticker: '25_mood_miss_you',
    relationshipGreeting: 'Бин очень скучает — самое время написать пару тёплых слов',
    friendshipGreeting: 'Бин соскучился — самое время написать друг другу пару тёплых слов',
  },
  {
    id: 'hungry',
    sticker: '26_mood_hungry',
    relationshipGreeting: 'Бин проголодался — может, закажете что-нибудь вкусное или сходите в кафе?',
    friendshipGreeting: 'Бин проголодался — может, закажете что-нибудь вкусное или выберетесь в кафе?',
  },
  {
    id: 'working',
    sticker: '27_mood_working',
    relationshipGreeting: 'Бин в делах, но всегда находит минутку для вас двоих',
    friendshipGreeting: 'Бин в делах, но всегда находит минутку для вашей дружбы',
  },
  {
    id: 'sick',
    sticker: '28_mood_sick',
    relationshipGreeting: 'Бин бережёт себя — не забывайте заботиться друг о друге',
    friendshipGreeting: 'Бин бережёт себя — не забывайте заботиться друг о друге',
  },
  {
    id: 'kiss_goodnight',
    sticker: '30_kiss_goodnight',
    relationshipGreeting: 'Передайте друг другу немного нежности и тепла сегодня ♡',
    friendshipGreeting: 'Передайте друг другу немного тепла и дружеской поддержки сегодня ✦',
  },
];

const BEAN_SESSION_MOOD_KEY = 'lovia_bean_session_mood_v1';

function getSessionBeanMood(): BeanMood {
  try {
    const savedId = sessionStorage.getItem(BEAN_SESSION_MOOD_KEY);
    if (savedId) {
      const found = BEAN_MOODS.find((m) => m.id === savedId);
      if (found) return found;
    }
  } catch {
    // ignore storage errors
  }

  const randomMood = BEAN_MOODS[Math.floor(Math.random() * BEAN_MOODS.length)];
  try {
    sessionStorage.setItem(BEAN_SESSION_MOOD_KEY, randomMood.id);
  } catch {
    // ignore storage errors
  }
  return randomMood;
}

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
  const [sessionMood] = useState<BeanMood>(getSessionBeanMood);

  const couplePhotoUrl = useCouplePhotoUrl();
  const { openPicker, picker: couplePhotoPicker } = useCouplePhotoPicker();

  const today = new Date();
  const formattedDate = formatDateRu(today);
  const weekday = today.toLocaleDateString('ru-RU', { weekday: 'long' });
  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

  const hasPartner = profile.isPartnerConnected && Boolean(profile.partner);
  const userName = profile.user.name;
  const partnerName = profile.partner?.name || (isFriendship ? 'Друг' : 'Партнёр');

  const greetingMascotName: MascotName = sessionMood.sticker;
  const dynamicGreetingText = isFriendship
    ? sessionMood.friendshipGreeting
    : sessionMood.relationshipGreeting;

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

  const handlePolaroidClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    telegramService.hapticImpact('light');
    openPicker();
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
        {/* 1. Handwritten Scrapbook Greeting Row + Automatic Session Bean Mood */}
        <div className="home-header__greeting-row">
          <div className="home-header__greeting-text">
            <div className="home-header__meta-bar">
              <span className="home-header__date-chip">
                <Icon name="calendar" size={12} className="home-header__date-icon" />
                <span>
                  {capitalizedWeekday}, {formattedDate}
                </span>
              </span>
            </div>

            <h1 className="home-header__greeting-title">
              {hasPartner
                ? `Привет, ${userName} и ${partnerName} `
                : `Привет, ${userName} `}
              <span className="home-header__greeting-mark" aria-hidden="true">
                {isFriendship ? '✦' : '♥'}
              </span>
            </h1>

            <p className="home-header__greeting-subtitle">{dynamicGreetingText}</p>
          </div>

          {/* Bean gently peeking / reflecting selected mood — strictly pointer-events: none */}
          <div className="home-header__peeking-mascot" aria-hidden="true">
            <Mascot name={greetingMascotName} size={68} eager />
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
          {/* Left: Tilted Polaroid with ONE shared couple/friends photo */}
          <PolaroidFrame
            tilt="left"
            sticker={isFriendship ? 'star' : 'heart'}
            className="home-header__polaroid"
            src={couplePhotoUrl}
            alt={isFriendship ? 'Совместное фото друзей' : 'Совместное фото пары'}
            aspectRatio="square"
            onClick={handlePolaroidClick}
            fallback={
              <div className="home-header__polaroid-empty" aria-hidden="true">
                <Icon name="camera" size={22} />
                <span className="home-header__polaroid-empty-text">Добавить фото</span>
              </div>
            }
          />

          {/* Right: Handwritten Days Counter & Warm Caption */}
          <div className="home-header__together-info">
            <span className="home-header__together-kicker">
              {isFriendship ? 'Дружим уже' : 'Вместе уже'}
            </span>

            <div className="home-header__days-row">
              <span className="home-header__days-num">{daysTogether}</span>
              <span className="home-header__days-unit">{daysLabel}</span>
              <span className="home-header__days-heart" aria-hidden="true">
                {isFriendship ? '✦' : '♡'}
              </span>
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

          {/* Subtle side-peeking Bean tucked cleanly at top-right inside card bounds */}
          <div className="home-header__card-side-bean" aria-hidden="true">
            <Mascot name="35_peeking_side" size={38} />
          </div>
        </div>
      </header>

      {couplePhotoPicker}

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
