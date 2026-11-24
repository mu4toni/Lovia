import React, { useEffect, useMemo, useState } from 'react';
import { CoupleProfile } from '../../../types';
import { coupleService } from '../../../services/coupleService';
import { telegramService } from '../../../services/telegramService';
import { pluralizeRu } from '../../../utils/dateCalculations';
import { useSpaceMode } from '../../../hooks/useSpaceMode';
import { useToast } from '../../ui/Toast/ToastContext';
import { Mascot, MascotName } from '../../ui/Mascot/Mascot';
import { Icon } from '../../ui/Icon/Icon';
import {
  DevStreakPreviewMode,
  getDevStreakPreview,
  subscribeDevStreakPreview,
} from '../../../utils/devTools';
import { FlameVisualState, StreakFlameIcon } from './StreakFlameIcon';
import { StreakModal, StreakParticipant } from './StreakModal';
import './StreakCard.css';

export interface StreakCardProps {
  profile: CoupleProfile;
}

function getLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function diffDateDays(fromDate: string, toDate: string): number {
  const [fy, fm, fd] = fromDate.split('-').map(Number);
  const [ty, tm, td] = toDate.split('-').map(Number);
  if (!fy || !fm || !fd || !ty || !tm || !td) return Number.POSITIVE_INFINITY;
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / (24 * 60 * 60 * 1000));
}

export const StreakCard: React.FC<StreakCardProps> = ({ profile }) => {
  const { isFriendship } = useSpaceMode();
  const { showToast } = useToast();

  const [now, setNow] = useState<Date>(() => new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const [devPreview, setDevPreview] = useState<DevStreakPreviewMode>(() => getDevStreakPreview());

  // Refresh clock every minute so 23:00 (black flame) and 00:00 (new day) switch automatically
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Stay in sync with couple updates (ping, realtime, background bundle sync, dev gender/space toggles)
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener('lovia_couple_updated', bump);
    window.addEventListener('lovia_couple_connected', bump);
    const unsubDev = subscribeDevStreakPreview((mode) => setDevPreview(mode));
    return () => {
      window.removeEventListener('lovia_couple_updated', bump);
      window.removeEventListener('lovia_couple_connected', bump);
      unsubDev();
    };
  }, []);

  const todayStr = getLocalDateStr(now);
  const currentHour = now.getHours();

  const realStreakState = useMemo(() => {
    const fromService = coupleService.getStreakState(todayStr);
    // Prefer service state (always live after ping), fallback to profile fields
    const lastDate = fromService.lastDate ?? profile.streakLastDate ?? null;
    const pingDate = fromService.pingDate ?? profile.streakPingDate ?? null;
    const rawCount = fromService.count ?? profile.streakCount ?? 0;
    const daysSinceLast = lastDate ? diffDateDays(lastDate, todayStr) : null;
    const effectiveCount =
      daysSinceLast !== null && lastDate !== todayStr && daysSinceLast > 2 ? 0 : rawCount;
    const todayPingUsers =
      pingDate === todayStr
        ? fromService.pingUsers
        : profile.streakPingDate === todayStr && Array.isArray(profile.streakPingUsers)
        ? profile.streakPingUsers
        : [];

    return {
      count: effectiveCount,
      lastDate,
      daysSinceLast,
      todayPingUsers,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    todayStr,
    version,
    profile.streakCount,
    profile.streakLastDate,
    profile.streakPingDate,
    profile.streakPingUsers,
  ]);

  const activeUser = coupleService.getActiveUser();
  const activeUserId = activeUser.id || profile.user.id;
  const isFemale = activeUser.gender === 'female';
  const partnerName = profile.partner?.name || (isFriendship ? 'Друг' : 'Партнёр');
  const isConnected = devPreview !== null ? true : profile.isPartnerConnected && Boolean(profile.partner);

  // Derive visual state (supports strictly local dev UI preview override without touching API/Supabase)
  const isLitToday =
    devPreview !== null ? devPreview === 'lit' : realStreakState.lastDate === todayStr;

  const hasCurrentUserPingedToday =
    devPreview !== null
      ? devPreview === 'waiting' || devPreview === 'lit'
      : realStreakState.todayPingUsers.includes(activeUserId);

  const hasPartnerPingedToday =
    devPreview !== null
      ? devPreview === 'lit'
      : realStreakState.todayPingUsers.some((id) => id !== activeUserId);

  const displayCount =
    devPreview === 'zero'
      ? 0
      : devPreview === 'waiting'
      ? 5
      : devPreview === 'lit'
      ? 12
      : devPreview === 'black'
      ? 7
      : realStreakState.count;

  const missedYesterday = realStreakState.count > 0 && realStreakState.daysSinceLast === 2;
  const isLastHourOfDay = currentHour >= 23;

  const isBlackRisk =
    devPreview !== null
      ? devPreview === 'black'
      : !isLitToday && (isLastHourOfDay || missedYesterday);

  const flameState: FlameVisualState = isLitToday
    ? 'lit'
    : isBlackRisk
    ? 'black'
    : hasCurrentUserPingedToday || hasPartnerPingedToday
    ? 'warm'
    : 'unlit';

  const isBlushBg = isLitToday || hasCurrentUserPingedToday || hasPartnerPingedToday;
  const daysLabel = pluralizeRu(displayCount, 'день', 'дня', 'дней');

  // Heading copy
  const headingText = isLitToday
    ? 'Огонёк горит!'
    : isBlackRisk
    ? 'Огонёк на грани!'
    : isFriendship
    ? 'Ваш огонёк дружбы'
    : 'Ваш огонёк отношений';

  // Subtitle copy
  const subtitleText = !isConnected
    ? isFriendship
      ? 'Подключите друга'
      : 'Подключите партнёра'
    : isBlackRisk
    ? 'Успейте спасти до полуночи!'
    : isLitToday
    ? isFriendship
      ? 'Вы — невероятные ✦'
      : 'Вы — невероятные ♥'
    : hasCurrentUserPingedToday
    ? isFemale
      ? 'Ты уже поддержала огонёк'
      : 'Ты уже поддержал огонёк'
    : hasPartnerPingedToday
    ? `${partnerName} ждёт тебя!`
    : 'Сегодня ещё не зажигали';

  // Exact sticker pack mapping for every streak state
  const mascotName: MascotName = isBlackRisk
    ? '20_error_dizzy'
    : isLitToday
    ? displayCount >= 7
      ? '33_streak_12_glow'
      : '07_streak_fire'
    : hasCurrentUserPingedToday
    ? '06_waiting_partner'
    : hasPartnerPingedToday
    ? '05_nudge_poke'
    : '31_campfire_zero';

  const handlePing = async () => {
    if (isSubmitting || !isConnected || isLitToday || hasCurrentUserPingedToday) return;
    if (devPreview !== null) {
      telegramService.hapticImpact('light');
      showToast({
        title: 'Режим превью огонька',
        message: 'Выключите превью в панели разработчика для реального клика',
        type: 'info',
      });
      return;
    }
    telegramService.hapticImpact('medium');
    setIsSubmitting(true);
    try {
      const res = await coupleService.pingStreak();
      setVersion((v) => v + 1);
      if (res.justLitToday) {
        telegramService.hapticNotification('success');
        showToast({
          title: 'Огонёк зажёгся! 🔥',
          message: `Ваша серия теперь ${res.count} ${pluralizeRu(res.count, 'день', 'дня', 'дней')}`,
          type: 'love',
        });
      } else {
        showToast({
          title: 'Огонёк поддержан!',
          message: `Ждём ответ от ${partnerName}, чтобы зажечь огонёк`,
          type: 'info',
        });
      }
    } catch (err: any) {
      showToast({
        title: 'Не удалось обновить огонёк',
        message: err?.message || 'Проверьте соединение и попробуйте ещё раз',
        type: 'warning',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCardOpen = () => {
    telegramService.hapticImpact('light');
    setIsModalOpen(true);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardOpen();
    }
  };

  const currentCouple = coupleService.getCurrentCouple();
  const currentCoupleSelf =
    currentCouple?.user1.id === activeUserId
      ? currentCouple.user1
      : currentCouple?.user2?.id === activeUserId
      ? currentCouple.user2
      : undefined;
  const currentCouplePartner =
    currentCouple?.user1.id === activeUserId
      ? currentCouple.user2
      : currentCouple?.user2?.id === activeUserId
      ? currentCouple.user1
      : currentCouple?.user2;

  const participants: [StreakParticipant, StreakParticipant] = [
    {
      id: activeUserId || 'self',
      name: profile.user.name || activeUser.name || 'Ты',
      avatarUrl: profile.user.avatarUrl || activeUser.avatarUrl || currentCoupleSelf?.avatarUrl,
      gender: activeUser.gender ?? currentCoupleSelf?.gender,
      checkedIn: isLitToday || hasCurrentUserPingedToday,
    },
    {
      id: profile.partner?.id || currentCouplePartner?.id || 'partner',
      name: isConnected
        ? profile.partner?.name || currentCouplePartner?.name || partnerName
        : isFriendship
        ? 'Нет друга'
        : 'Нет партнёра',
      avatarUrl: profile.partner?.avatarUrl || currentCouplePartner?.avatarUrl,
      gender: currentCouplePartner?.gender,
      checkedIn: isConnected && (isLitToday || hasPartnerPingedToday),
      isPlaceholder: !isConnected,
    },
  ];

  return (
    <>
      <article
        className={`streak-card sketch-card streak-card--${flameState} ${
          isBlushBg ? 'streak-card--blush' : 'streak-card--milky'
        }`}
        role="button"
        tabIndex={0}
        onClick={handleCardOpen}
        onKeyDown={handleCardKeyDown}
        aria-label={`${headingText}: ${displayCount} ${daysLabel}. Открыть подробности`}
      >
        {/* 1. Left Column: Flame + Title, Big Handwritten Count, Status Caption */}
        <div className="streak-card__left">
          <div className="streak-card__heading-row">
            <StreakFlameIcon state={flameState} size="sm" />
            <span className="streak-card__heading">{headingText}</span>
          </div>

          <div className="streak-card__counter">
            <span className="streak-card__num">{displayCount}</span>
            <span className="streak-card__unit">{daysLabel}</span>
          </div>

          <span
            className={`streak-card__subtext ${
              isBlackRisk
                ? 'streak-card__subtext--urgent'
                : hasPartnerPingedToday && !isLitToday
                ? 'streak-card__subtext--nudge'
                : ''
            }`}
          >
            {subtitleText}
          </span>
        </div>

        {/* 2. Center Column: Mascot Bear Bean (pointer-events: none, gentle sway) */}
        <div className="streak-card__center" aria-hidden="true">
          <Mascot
            name={mascotName}
            size={52}
            eager
            className={`streak-card__mascot ${
              isLitToday ? 'streak-card__mascot--celebrate' : 'streak-card__mascot--sway'
            }`}
          />
        </div>

        {/* 3. Right Column: Tactile Sketch Pill Action Button */}
        <div className="streak-card__right">
          {!isConnected ? (
            <button
              type="button"
              className="streak-card__pill streak-card__pill--waiting sketch-pill"
              onClick={(e) => {
                e.stopPropagation();
                handleCardOpen();
              }}
            >
              <Icon name="clock" size={14} className="streak-card__pill-icon" />
              <span className="streak-card__pill-text">Зажечь огонёк</span>
              <Icon name="chevron-right" size={14} className="streak-card__pill-arrow" />
            </button>
          ) : isLitToday ? (
            <button
              type="button"
              className="streak-card__pill streak-card__pill--lit sketch-pill"
              onClick={(e) => {
                e.stopPropagation();
                handleCardOpen();
              }}
            >
              <StreakFlameIcon state="lit" size="pill" onAccent />
              <span className="streak-card__pill-text">Уже вместе</span>
              <Icon name="chevron-right" size={14} className="streak-card__pill-arrow" />
            </button>
          ) : hasCurrentUserPingedToday ? (
            <button
              type="button"
              className="streak-card__pill streak-card__pill--waiting sketch-pill"
              onClick={(e) => {
                e.stopPropagation();
                handleCardOpen();
              }}
            >
              <Icon name="clock" size={14} className="streak-card__pill-icon" />
              <span className="streak-card__pill-text">Ждём второго</span>
              <Icon name="chevron-right" size={14} className="streak-card__pill-arrow" />
            </button>
          ) : (
            <button
              type="button"
              className={`streak-card__pill sketch-pill ${
                hasPartnerPingedToday ? 'streak-card__pill--support' : 'streak-card__pill--ignite'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handlePing();
              }}
              disabled={isSubmitting}
            >
              <StreakFlameIcon
                state={isBlackRisk ? 'black' : hasPartnerPingedToday ? 'warm' : 'unlit'}
                size="pill"
                onAccent
              />
              <span className="streak-card__pill-text">
                {isSubmitting
                  ? 'Минутку…'
                  : hasPartnerPingedToday
                  ? 'Поддержать огонёк'
                  : 'Зажечь огонёк'}
              </span>
              <Icon name="chevron-right" size={14} className="streak-card__pill-arrow" />
            </button>
          )}
        </div>
      </article>

      <StreakModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isFriendship={isFriendship}
        isConnected={isConnected}
        isLitToday={isLitToday}
        isBlackRisk={isBlackRisk}
        hasCurrentUserPingedToday={hasCurrentUserPingedToday}
        hasPartnerPingedToday={hasPartnerPingedToday}
        isSubmitting={isSubmitting}
        displayCount={displayCount}
        daysLabel={daysLabel}
        flameState={flameState}
        partnerName={partnerName}
        participants={participants}
        onPing={handlePing}
      />
    </>
  );
};
