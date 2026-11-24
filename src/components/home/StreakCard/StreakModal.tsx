import React from 'react';
import { Modal } from '../../ui/Modal/Modal';
import { Avatar } from '../../ui/Avatar/Avatar';
import { Icon } from '../../ui/Icon/Icon';
import { FlameVisualState, StreakFlameIcon } from './StreakFlameIcon';
import { StreakHeroFlame } from './StreakHeroFlame';
import './StreakModal.css';

export interface StreakParticipant {
  id: string;
  name: string;
  avatarUrl?: string;
  gender?: 'male' | 'female';
  checkedIn: boolean;
  isPlaceholder?: boolean;
}

export interface StreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFriendship: boolean;
  isConnected: boolean;
  isLitToday: boolean;
  isBlackRisk: boolean;
  hasCurrentUserPingedToday: boolean;
  hasPartnerPingedToday: boolean;
  isSubmitting: boolean;
  displayCount: number;
  daysLabel: string;
  flameState: FlameVisualState;
  partnerName: string;
  participants: [StreakParticipant, StreakParticipant];
  onPing: () => void;
}

export const StreakModal: React.FC<StreakModalProps> = ({
  isOpen,
  onClose,
  isFriendship,
  isConnected,
  isLitToday,
  isBlackRisk,
  hasCurrentUserPingedToday,
  hasPartnerPingedToday,
  isSubmitting,
  displayCount,
  daysLabel,
  flameState,
  partnerName,
  participants,
  onPing,
}) => {
  const mark = isFriendship ? '✦' : '♡';
  const title = isFriendship ? 'Ваш огонёк дружбы' : 'Ваш огонёк отношений';
  const subtitle = `Маленькие действия, которые делают вас ближе\u00A0${mark}`;

  const statusCaption = !isConnected
    ? isFriendship
      ? 'Подключите друга, чтобы вести серию'
      : 'Подключите партнёра, чтобы вести серию'
    : isBlackRisk
    ? 'Успейте спасти до полуночи!'
    : isLitToday
    ? 'Вы вместе поддерживаете ваш огонёк'
    : hasCurrentUserPingedToday
    ? `Ждём отметку от ${partnerName}`
    : hasPartnerPingedToday
    ? `${partnerName} уже ждёт тебя!`
    : 'Начните серию сегодня';

  const stickyNoteText = !isConnected
    ? 'Скоро старт'
    : isBlackRisk
    ? 'До полуночи!'
    : isLitToday
    ? `Вы молодцы! ${mark}`
    : hasCurrentUserPingedToday || hasPartnerPingedToday
    ? 'Ещё 1 шаг!'
    : 'День первый?';

  const stickyNoteTone = isLitToday
    ? 'streak-modal__note--lit'
    : isBlackRisk
    ? 'streak-modal__note--urgent'
    : hasCurrentUserPingedToday || hasPartnerPingedToday
    ? 'streak-modal__note--warm'
    : 'streak-modal__note--idle';

  const isBlushCard = isLitToday || hasCurrentUserPingedToday || hasPartnerPingedToday;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="streak-modal">
      <div className="streak-modal__content">
        {/* Subtitle under modal header */}
        <p className="streak-modal__subtitle">{subtitle}</p>

        {/* Central illustrated SVG Flame showcase */}
        <div
          className={`streak-modal__hero streak-modal__hero--${flameState}`}
          aria-hidden="true"
        >
          <div className="streak-modal__hero-halo">
            <StreakHeroFlame state={flameState} />
          </div>
        </div>

        {/* Inner scrapbook status card */}
        <section
          className={`streak-modal__status-card sketch-card ${
            isBlushCard ? 'streak-modal__status-card--blush' : ''
          } ${isBlackRisk ? 'streak-modal__status-card--black' : ''}`}
          aria-label={`Статус огонька: ${displayCount} ${daysLabel}`}
        >
          {/* Top part: Flame + large handwritten count + caption + tilted sticky note */}
          <div className="streak-modal__status-top">
            <div className="streak-modal__status-main">
              <div className="streak-modal__count-row">
                <StreakFlameIcon state={flameState} size="lg" />
                <div className="streak-modal__counter">
                  <span className="streak-modal__count-num">{displayCount}</span>
                  <span className="streak-modal__count-unit">{daysLabel}</span>
                </div>
              </div>
              <p
                className={`streak-modal__caption ${
                  isBlackRisk ? 'streak-modal__caption--urgent' : ''
                }`}
              >
                {statusCaption}
              </p>
            </div>

            <div className={`streak-modal__note ${stickyNoteTone}`} aria-hidden="true">
              <span className="streak-modal__note-text">{stickyNoteText}</span>
            </div>
          </div>

          {/* Dashed scrapbook divider */}
          <div className="streak-modal__divider" aria-hidden="true" />

          {/* Two-column participants check-in status */}
          <div className="streak-modal__participants">
            {participants.map((person) => {
              const checkedLabel =
                person.gender === 'female' ? 'Отметилась ✓' : 'Отметился ✓';
              const pillLabel = person.isPlaceholder
                ? 'Не подключён'
                : person.checkedIn
                ? checkedLabel
                : 'Ожидает';

              return (
                <div key={person.id} className="streak-modal__person">
                  <div
                    className={`streak-modal__avatar-wrap ${
                      person.checkedIn ? 'streak-modal__avatar-wrap--checked' : ''
                    }`}
                  >
                    {person.isPlaceholder ? (
                      <div className="streak-modal__avatar-placeholder" aria-hidden="true">
                        <Icon name={isFriendship ? 'star' : 'heart'} size={18} />
                      </div>
                    ) : (
                      <Avatar src={person.avatarUrl} name={person.name} size="md" />
                    )}
                    {person.checkedIn && (
                      <span className="streak-modal__avatar-check" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </div>

                  <span className="streak-modal__person-name" title={person.name}>
                    {person.name}
                  </span>

                  <span
                    className={`streak-modal__status-pill ${
                      person.checkedIn
                        ? 'streak-modal__status-pill--checked'
                        : 'streak-modal__status-pill--waiting'
                    }`}
                  >
                    {pillLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom Primary CTA & Footnote */}
        <div className="streak-modal__actions">
          {!isConnected ? (
            <button
              type="button"
              className="streak-modal__cta streak-modal__cta--waiting sketch-pill"
              disabled
            >
              <Icon name="clock" size={16} />
              <span className="streak-modal__cta-label">
                {isFriendship ? 'Сначала подключите друга' : 'Сначала подключите партнёра'}
              </span>
            </button>
          ) : isLitToday ? (
            <div
              className="streak-modal__cta streak-modal__cta--lit sketch-pill"
              role="status"
              aria-live="polite"
            >
              <StreakFlameIcon state="lit" size="pill" />
              <span className="streak-modal__cta-label">Огонёк горит ✓</span>
            </div>
          ) : hasCurrentUserPingedToday ? (
            <button
              type="button"
              className="streak-modal__cta streak-modal__cta--waiting sketch-pill"
              disabled
            >
              <Icon name="clock" size={16} />
              <span className="streak-modal__cta-label">Ждём {partnerName}...</span>
            </button>
          ) : (
            <button
              type="button"
              className="streak-modal__cta streak-modal__cta--ignite sketch-pill"
              onClick={onPing}
              disabled={isSubmitting}
            >
              <span className="streak-modal__cta-label">
                {isSubmitting ? 'Зажигаем…' : '🔥 Зажечь огонёк'}
              </span>
            </button>
          )}

          <p className="streak-modal__footnote">
            Огонёк будет гореть, когда отметитесь оба{'\u00A0'}
            {mark}
          </p>
        </div>
      </div>
    </Modal>
  );
};
