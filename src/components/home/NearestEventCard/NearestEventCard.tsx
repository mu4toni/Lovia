import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CoupleEvent, CoupleReminder } from '../../../types';
import { Icon } from '../../ui/Icon/Icon';
import { Mascot } from '../../ui/Mascot/Mascot';
import { getAnniversaryInfo, formatRussianDate, pluralizeRu } from '../../../utils/dateCalculations';
import { relationshipService } from '../../../services/relationshipService';
import { telegramService } from '../../../services/telegramService';
import { useSpaceMode } from '../../../hooks/useSpaceMode';
import './NearestEventCard.css';

export interface NearestEventCardProps {
  events: CoupleEvent[];
  requests: CoupleReminder[];
  startDate?: string;
}

export const NearestEventCard: React.FC<NearestEventCardProps> = ({
  events,
  requests,
  startDate,
}) => {
  const navigate = useNavigate();
  const { isFriendship } = useSpaceMode();

  const nearest = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;

    const candidates: Array<{
      title: string;
      dateStr: string;
      subtitle: string;
      targetRoute: string;
    }> = [];

    // 1. Active upcoming reminders with a dueDate
    for (const r of requests) {
      if (r.status === 'completed' || !r.dueDate) continue;
      const dPart = r.dueDate.slice(0, 10);
      if (dPart >= todayStr) {
        candidates.push({
          title: r.title,
          dateStr: dPart,
          subtitle: r.dueTime ? `${formatRussianDate(dPart)} · ${r.dueTime}` : formatRussianDate(dPart),
          targetRoute: '/dates',
        });
      }
    }

    // 2. Scheduled calendar events
    for (const ev of events) {
      if (!ev.date) continue;
      const dPart = ev.date.slice(0, 10);
      if (dPart >= todayStr) {
        candidates.push({
          title: ev.title,
          dateStr: dPart,
          subtitle: ev.time ? `${formatRussianDate(dPart)} · ${ev.time}` : formatRussianDate(dPart),
          targetRoute: '/dates',
        });
      }
    }

    candidates.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    if (candidates.length > 0) {
      return candidates[0];
    }

    // 3. Fallback: Next anniversary
    const sDate = startDate || relationshipService.getStartDate();
    const anniv = getAnniversaryInfo(sDate);
    const yearsLabel = pluralizeRu(anniv.yearsTogether, 'год', 'года', 'лет');
    const daysLabel = pluralizeRu(anniv.daysUntil, 'день', 'дня', 'дней');

    return {
      title: anniv.isToday
        ? isFriendship
          ? 'Годовщина дружбы сегодня!'
          : 'Годовщина сегодня!'
        : isFriendship
        ? `${anniv.yearsTogether} ${yearsLabel} дружбы`
        : `Годовщина: ${anniv.yearsTogether} ${yearsLabel} вместе`,
      dateStr: '',
      subtitle: anniv.isToday
        ? anniv.formattedAnniversaryDate
        : `${anniv.formattedAnniversaryDate} · через ${anniv.daysUntil} ${daysLabel}`,
      targetRoute: '/relationship',
    };
  }, [events, requests, startDate, isFriendship]);

  const handleClick = () => {
    telegramService.hapticImpact('light');
    navigate(nearest.targetRoute);
  };

  return (
    <article
      className="nearest-event-card"
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`Ближайшее событие: ${nearest.title}`}
    >
      <div className="nearest-event-card__icon-box" aria-hidden="true">
        <Icon name="calendar" size={20} strokeWidth={1.75} />
      </div>

      <div className="nearest-event-card__content">
        <span className="nearest-event-card__kicker">Ближайшее событие</span>
        <h3 className="nearest-event-card__title">{nearest.title}</h3>
        <span className="nearest-event-card__date">{nearest.subtitle}</span>
      </div>

      <div className="nearest-event-card__right">
        <div className="nearest-event-card__mascot" aria-hidden="true">
          <Mascot mood="love" size={54} />
        </div>
        <span className="nearest-event-card__arrow" aria-hidden="true">
          <Icon name="chevron-right" size={18} strokeWidth={1.9} />
        </span>
      </div>
    </article>
  );
};
