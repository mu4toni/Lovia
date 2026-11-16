import React, { useMemo } from 'react';
import { Modal } from '../ui/Modal/Modal';
import { Icon } from '../ui/Icon/Icon';
import { calculateDaysTogether, getAnniversaryInfo, pluralizeRu } from '../../utils/dateCalculations';
import { telegramService } from '../../services/telegramService';
import './RelationshipMilestonesModal.css';

export interface RelationshipMilestonesModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string;
  onAddMemorableDate?: () => void;
}

const MILESTONES_DAYS = [100, 200, 300, 365, 500, 777, 1000, 1500, 2000, 3000];

export const RelationshipMilestonesModal: React.FC<RelationshipMilestonesModalProps> = ({
  isOpen,
  onClose,
  startDate,
  onAddMemorableDate,
}) => {
  const { daysTogether, weeksTogether, monthsTogether, hoursTogether, milestoneItems } =
    useMemo(() => {
      const days = calculateDaysTogether(startDate);
      const weeks = Math.floor(days / 7);
      const months = Math.floor(days / 30.4375);
      const hours = days * 24;

      const anniv = getAnniversaryInfo(startDate);

      // Assemble milestones list
      const items = MILESTONES_DAYS.map((targetDays) => {
        const isPassed = days >= targetDays;
        const diff = targetDays - days;
        let label = '';
        if (targetDays === 365) {
          label = '1 год отношений';
        } else {
          label = `${targetDays} ${pluralizeRu(targetDays, 'день', 'дня', 'дней')}`;
        }

        return {
          targetDays,
          label,
          isPassed,
          diff,
        };
      });

      // Insert next yearly anniversary if >= 1 year
      if (anniv.yearsTogether >= 1) {
        const nextYears = anniv.isToday ? anniv.yearsTogether : anniv.yearsTogether + 1;
        items.push({
          targetDays: days + anniv.daysUntil,
          label: `${nextYears} ${pluralizeRu(nextYears, 'год', 'года', 'лет')} вместе`,
          isPassed: anniv.isToday,
          diff: anniv.daysUntil,
        });
      }

      // Sort items by targetDays
      items.sort((a, b) => a.targetDays - b.targetDays);

      return {
        daysTogether: days,
        weeksTogether: weeks,
        monthsTogether: months,
        hoursTogether: hours,
        milestoneItems: items,
      };
    }, [startDate]);

  const daysLabel = pluralizeRu(daysTogether, 'день', 'дня', 'дней');
  const weeksLabel = pluralizeRu(weeksTogether, 'неделя', 'недели', 'недель');
  const monthsLabel = pluralizeRu(monthsTogether, 'месяц', 'месяца', 'месяцев');
  const hoursLabel = pluralizeRu(hoursTogether, 'час', 'часа', 'часов');

  // Find the closest upcoming milestone
  const nextMilestone = milestoneItems.find((m) => !m.isPassed);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Вехи отношений">
      <div className="milestones-modal" role="region" aria-label="Статистика и вехи отношений">
        {/* 1. Hero Summary */}
        <div className="milestones-modal__hero">
          <div className="milestones-modal__hero-title">История любви в цифрах</div>
          <div className="milestones-modal__hero-days">
            {daysTogether} {daysLabel}
          </div>
          <div className="milestones-modal__hero-sub">непрерывной заботы и тепла</div>
        </div>

        {/* 2. Grid of 4 Units */}
        <div className="milestones-modal__grid">
          <div className="milestones-modal__grid-item">
            <span className="milestones-modal__grid-val">{daysTogether}</span>
            <span className="milestones-modal__grid-lbl">{daysLabel}</span>
          </div>
          <div className="milestones-modal__grid-item">
            <span className="milestones-modal__grid-val">{weeksTogether}</span>
            <span className="milestones-modal__grid-lbl">{weeksLabel}</span>
          </div>
          <div className="milestones-modal__grid-item">
            <span className="milestones-modal__grid-val">{monthsTogether}</span>
            <span className="milestones-modal__grid-lbl">{monthsLabel}</span>
          </div>
          <div className="milestones-modal__grid-item">
            <span className="milestones-modal__grid-val">{hoursTogether.toLocaleString('ru-RU')}</span>
            <span className="milestones-modal__grid-lbl">{hoursLabel}</span>
          </div>
        </div>

        {/* 3. Milestones Timeline */}
        <div className="milestones-modal__section">
          <div className="milestones-modal__section-title">
            <Icon name="sparkles" size={15} />
            <span>Круглые вехи совместного пути</span>
          </div>

          <div className="milestones-modal__list">
            {milestoneItems.map((m) => {
              const isNext = nextMilestone && nextMilestone.targetDays === m.targetDays;

              return (
                <div
                  key={m.targetDays}
                  className={`milestones-modal__item ${
                    m.isPassed
                      ? 'milestones-modal__item--passed'
                      : isNext
                      ? 'milestones-modal__item--next'
                      : ''
                  }`}
                >
                  <div className="milestones-modal__item-left">
                    <span className="milestones-modal__item-icon-wrap" aria-hidden="true">
                      {m.isPassed ? (
                        <Icon name="check" size={14} strokeWidth={2.6} />
                      ) : isNext ? (
                        <Icon name="sparkles" size={14} />
                      ) : (
                        <Icon name="clock" size={13} />
                      )}
                    </span>
                    <span className="milestones-modal__item-name">{m.label}</span>
                  </div>

                  <span
                    className={`milestones-modal__item-badge ${
                      m.isPassed
                        ? 'milestones-modal__item-badge--passed'
                        : isNext
                        ? 'milestones-modal__item-badge--next'
                        : 'milestones-modal__item-badge--upcoming'
                    }`}
                  >
                    {m.isPassed
                      ? 'Пройдено'
                      : isNext
                      ? `Через ${m.diff} ${pluralizeRu(m.diff, 'день', 'дня', 'дней')}`
                      : `${m.diff} ${pluralizeRu(m.diff, 'дн.', 'дн.', 'дн.')}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Action Button */}
        {onAddMemorableDate && (
          <button
            type="button"
            className="milestones-modal__action-btn"
            onClick={() => {
              telegramService.hapticImpact('light');
              onClose();
              onAddMemorableDate();
            }}
          >
            <Icon name="plus" size={16} />
            <span>Добавить памятную дату</span>
          </button>
        )}
      </div>
    </Modal>
  );
};
