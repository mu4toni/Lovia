import React, { useState } from 'react';
import { AnniversaryInfo } from '../../../types/relationship';
import { Icon } from '../../../components/ui/Icon/Icon';
import { pluralizeRu } from '../../../utils/dateCalculations';
import { AnniversaryProgressBar } from '../../../components/ui/AnniversaryProgress/AnniversaryProgressBar';
import { RelationshipMilestonesModal } from '../../../components/relationship/RelationshipMilestonesModal';
import { telegramService } from '../../../services/telegramService';
import { Mascot } from '../../../components/ui/Mascot/Mascot';
import { useSpaceMode } from '../../../hooks/useSpaceMode';
import './AnniversaryCard.css';

export interface AnniversaryCardProps {
  anniversary: AnniversaryInfo;
  startDate?: string;
  onClick?: () => void;
  onAddMemorableDate?: () => void;
}

export const AnniversaryCard: React.FC<AnniversaryCardProps> = ({
  anniversary,
  startDate,
  onClick,
  onAddMemorableDate,
}) => {
  const { isFriendship } = useSpaceMode();
  const [isMilestonesModalOpen, setIsMilestonesModalOpen] = useState(false);

  const {
    formattedAnniversaryDate,
    daysUntil,
    yearsTogether,
    isToday,
    isUpcoming,
    progressPercent,
  } = anniversary;

  const yearsLabel = pluralizeRu(yearsTogether, 'год', 'года', 'лет');
  const daysLabel = pluralizeRu(daysUntil, 'день', 'дня', 'дней');

  const handleClick = () => {
    telegramService.hapticImpact('light');
    if (onClick) {
      onClick();
    } else if (startDate) {
      setIsMilestonesModalOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <>
      <article
        className={`anniversary-showcase ${
          isToday ? 'anniversary-showcase--celebrate' : ''
        } ${isUpcoming ? 'anniversary-showcase--upcoming' : ''}`}
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={
          isFriendship
            ? 'Блок годовщины дружбы. Нажмите, чтобы открыть подробные вехи.'
            : 'Блок годовщины отношений. Нажмите, чтобы открыть подробные вехи.'
        }
        title={
          isFriendship
            ? 'Нажмите, чтобы посмотреть все вехи дружбы'
            : 'Нажмите, чтобы посмотреть все вехи отношений'
        }
      >
        {isToday && (
          <div className="anniversary-showcase__confetti" aria-hidden="true">
            <Icon name="sparkles" size={13} className="confetti-sparkle c1" />
            <Icon name={isFriendship ? 'sparkles' : 'heart-filled'} size={11} className="confetti-sparkle c2" />
            <Icon name="sparkles" size={13} className="confetti-sparkle c3" />
          </div>
        )}

        {/* Top Banner Row */}
        <div className="anniversary-showcase__header">
          <div className="anniversary-showcase__title-wrap">
            <span className="anniversary-showcase__kicker paper-tag">
              <span aria-hidden="true">{isFriendship ? '✦' : '♥'}</span>
              {isToday
                ? 'Праздник сегодня!'
                : isUpcoming
                ? isFriendship
                  ? 'Годовщина дружбы скоро'
                  : 'Годовщина совсем скоро'
                : 'Следующая веха'}
            </span>
            <h3 className="anniversary-showcase__title">
              {isToday
                ? isFriendship
                  ? 'Поздравляем с годовщиной дружбы!'
                  : 'Поздравляем с годовщиной!'
                : isFriendship
                ? `${yearsTogether} ${yearsLabel} крепкой дружбы`
                : `${yearsTogether} ${yearsLabel} вместе`}
            </h3>
          </div>

          {/* Tear-off calendar sticker with Bean peeking over its corner */}
          <div className="anniversary-showcase__hero-badge">
            <span className="anniversary-showcase__hero-cap" aria-hidden="true" />
            <div className="anniversary-showcase__mascot" aria-hidden="true">
              <Mascot
                name={isToday ? '37_heart_balloon' : '09_calendar_anniversary'}
                size={48}
                animated
              />
            </div>
            {isToday ? (
              <span className="anniversary-hero-today">
                <Icon name="sparkles" size={20} />
              </span>
            ) : (
              <>
                <span className="anniversary-hero-num">{daysUntil}</span>
                <span className="anniversary-hero-unit">{daysLabel}</span>
              </>
            )}
          </div>
        </div>

        {/* Progress Bar (single caption row: text left, percent right) */}
        <div className="anniversary-showcase__progress-wrap">
          <AnniversaryProgressBar
            progressPercent={progressPercent}
            daysUntil={daysUntil}
            isToday={isToday}
            yearsTogether={yearsTogether}
          />
        </div>

        {/* Footer Meta Row */}
        <div className="anniversary-showcase__footer">
          <div className="anniversary-showcase__date-chip paper-tag">
            <span className="anniversary-showcase__date-mark" aria-hidden="true">
              {isFriendship ? '✦' : '♥'}
            </span>
            <span>{formattedAnniversaryDate}</span>
          </div>
          <div className="anniversary-showcase__footer-right sketch-pill">
            <span className="anniversary-showcase__hint">
              {isToday ? `${yearsTogether} ${yearsLabel} любви` : 'Годовой цикл'}
            </span>
            <Icon name="chevron-right" size={14} className="anniversary-showcase__chevron" />
          </div>
        </div>      </article>

      {/* Relationship Milestones Modal */}
      {startDate && (
        <RelationshipMilestonesModal
          isOpen={isMilestonesModalOpen}
          onClose={() => setIsMilestonesModalOpen(false)}
          startDate={startDate}
          onAddMemorableDate={onAddMemorableDate}
        />
      )}
    </>
  );
};

