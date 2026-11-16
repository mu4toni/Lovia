import React, { useState, useEffect } from 'react';
import { MemorableDate } from '../../../types/relationship';
import { Icon, IconName } from '../../../components/ui/Icon/Icon';
import {
  formatRussianDate,
  getMemorableDateStatus,
  pluralizeRu,
} from '../../../utils/dateCalculations';
import './MemorableDatesList.css';

export interface MemorableDatesListProps {
  dates: MemorableDate[];
  onEdit: (date: MemorableDate) => void;
  onDelete: (date: MemorableDate) => void;
}

// Helper to choose a milestone icon based on title keywords
function getMilestoneIcon(title: string): IconName {
  const t = title.toLowerCase();
  if (t.includes('поцелуй') || t.includes('отношен') || t.includes('любовь')) return 'heart-filled';
  if (t.includes('знакомств') || t.includes('встреч')) return 'sparkles';
  if (t.includes('рождени') || t.includes('подарок')) return 'gift';
  if (t.includes('поездк') || t.includes('путешеств') || t.includes('маяк')) return 'pin';
  return 'calendar';
}

export const MemorableDatesList: React.FC<MemorableDatesListProps> = ({
  dates,
  onEdit,
  onDelete,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeMenuId) return;
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.timeline-node__actions-wrap')) {
        setActiveMenuId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveMenuId(null);
    };
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenuId]);

  if (dates.length === 0) {
    return (
      <div className="memorable-timeline-empty">
        <div className="memorable-timeline-empty__icon" aria-hidden="true">
          <Icon name="calendar" size={28} />
        </div>
        <p className="memorable-timeline-empty__title">Пока нет сохранённых дат</p>
        <p className="memorable-timeline-empty__desc">
          Добавьте первый поцелуй, знакомство или любое важное событие вашей пары
        </p>
      </div>
    );
  }

  // Sort chronologically for the timeline story: from oldest to newest or keep user order
  const timelineDates = [...dates].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="memorable-timeline" aria-label="Хронология памятных дат">
      <div className="memorable-timeline__track" aria-hidden="true" />

      {timelineDates.map((item) => {
        const status = getMemorableDateStatus(item.date, item.isAnnual);
        const daysLabel = pluralizeRu(status.daysUntil, 'день', 'дня', 'дней');
        const daysAgoLabel =
          status.daysAgo !== undefined ? pluralizeRu(status.daysAgo, 'день', 'дня', 'дней') : '';
        const iconName = getMilestoneIcon(item.title);
        const isMenuOpen = activeMenuId === item.id;

        return (
          <article key={item.id} className="timeline-node">
            {/* Timeline Marker Dot */}
            <div className="timeline-node__marker-wrap" aria-hidden="true">
              <div
                className={`timeline-node__marker ${
                  status.isToday ? 'timeline-node__marker--today' : ''
                }`}
              >
                <Icon name={iconName} size={14} />
              </div>
            </div>

            {/* Timeline Content Card */}
            <div className="timeline-node__card">
              <div className="timeline-node__header">
                <div className="timeline-node__title-row">
                  <h4 className="timeline-node__title">{item.title}</h4>
                  {item.isAnnual && (
                    <span className="timeline-node__annual-badge">Ежегодно</span>
                  )}
                </div>

                {/* Actions Dropdown Toggle */}
                <div className="timeline-node__actions-wrap">
                  <button
                    type="button"
                    className="timeline-node__menu-btn"
                    onClick={() => setActiveMenuId(isMenuOpen ? null : item.id)}
                    title="Действия с датой"
                    aria-label={`Действия для «${item.title}»`}
                    aria-haspopup="true"
                    aria-expanded={isMenuOpen}
                  >
                    <Icon name="more-vertical" size={16} />
                  </button>

                  {isMenuOpen && (
                    <div className="timeline-node__popover" role="menu">
                      <button
                        type="button"
                        className="timeline-node__popover-item"
                        onClick={() => {
                          setActiveMenuId(null);
                          onEdit(item);
                        }}
                      >
                        <Icon name="edit" size={14} />
                        <span>Редактировать</span>
                      </button>
                      <button
                        type="button"
                        className="timeline-node__popover-item timeline-node__popover-item--delete"
                        onClick={() => {
                          setActiveMenuId(null);
                          onDelete(item);
                        }}
                      >
                        <Icon name="trash" size={14} />
                        <span>Удалить</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Original Date */}
              <div className="timeline-node__date-row">
                <Icon name="calendar" size={12} className="timeline-date-icon" />
                <span>{formatRussianDate(item.date)}</span>
              </div>

              {/* Story / Description */}
              {item.description && (
                <p className="timeline-node__desc">{item.description}</p>
              )}

              {/* Annual countdown pill or days ago */}
              <div className="timeline-node__footer-pill">
                {item.isAnnual ? (
                  status.isToday ? (
                    <span className="timeline-countdown--today">
                      <Icon name="sparkles" size={12} />
                      Сегодня годовщина!
                    </span>
                  ) : (
                    <span className="timeline-countdown">
                      До следующей годовщины — <strong>{status.daysUntil}</strong> {daysLabel}
                    </span>
                  )
                ) : (
                  status.daysAgo !== undefined &&
                  status.daysAgo > 0 && (
                    <span className="timeline-past-info">
                      Состоялось {status.daysAgo} {daysAgoLabel} назад
                    </span>
                  )
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};
