import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import { MemorableDate } from '../../../types/relationship';
import { Icon } from '../../../components/ui/Icon/Icon';
import { Mascot } from '../../../components/ui/Mascot/Mascot';
import {
  formatRussianDate,
  getMemorableDateStatus,
  pluralizeRu,
} from '../../../utils/dateCalculations';
import { getDateContextIcon } from '../../../utils/dateContextIcon';
import { normalizeMediaUrl } from '../../../utils/media';
import { telegramService } from '../../../services/telegramService';
import { useSpaceMode } from '../../../hooks/useSpaceMode';
import './MemorableDatesList.css';

export interface MemorableDatesListProps {
  dates: MemorableDate[];
  onSelect: (date: MemorableDate) => void;
  onEdit: (date: MemorableDate) => void;
  onDelete: (date: MemorableDate) => void;
}

interface PolaroidStackProps {
  photos: string[];
  title: string;
  compact: boolean;
  isFriendship: boolean;
}

const PolaroidStack: React.FC<PolaroidStackProps> = memo(
  ({ photos, title, compact, isFriendship }) => {
    const [topIdx, setTopIdx] = useState(0);
    const touchStartXRef = useRef<number | null>(null);
    const isMulti = photos.length >= 2;

    useEffect(() => {
      setTopIdx(0);
    }, [photos.length, photos[0]]);

    const flipNext = (e?: React.SyntheticEvent) => {
      if (e) e.stopPropagation();
      if (!isMulti) return;
      telegramService.hapticImpact('light');
      setTopIdx((prev) => (prev + 1) % photos.length);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
      if (!isMulti) return;
      touchStartXRef.current = e.touches[0]?.clientX ?? null;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
      if (!isMulti || touchStartXRef.current === null) return;
      const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
      const dx = endX - touchStartXRef.current;
      touchStartXRef.current = null;
      if (Math.abs(dx) >= 24) {
        e.stopPropagation();
        telegramService.hapticImpact('light');
        setTopIdx((prev) => (dx < 0 ? (prev + 1) % photos.length : (prev - 1 + photos.length) % photos.length));
      }
    };

    const frontPhoto = photos[topIdx % photos.length];
    const backPhoto = isMulti ? photos[(topIdx + 1) % photos.length] : null;

    return (
      <div
        className={`timeline-polaroid ${compact ? 'timeline-polaroid--compact' : ''} ${
          isMulti ? 'timeline-polaroid--stack' : 'timeline-polaroid--single'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          if (isMulti) {
            flipNext();
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        role={isMulti ? 'button' : undefined}
        tabIndex={isMulti ? 0 : undefined}
        aria-label={isMulti ? `Перелистнуть фото (${topIdx + 1} из ${photos.length})` : undefined}
        onKeyDown={
          isMulti
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  flipNext(e);
                }
              }
            : undefined
        }
      >
        {/* Back Polaroid peeking out underneath (only when 2+ photos) */}
        {isMulti && backPhoto && (
          <div className="timeline-polaroid__card timeline-polaroid__card--back" aria-hidden="true">
            <div className="timeline-polaroid__img-wrap">
              <img
                src={normalizeMediaUrl(backPhoto)}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            </div>
          </div>
        )}

        {/* Front Polaroid */}
        <div className="timeline-polaroid__card timeline-polaroid__card--front">
          <span className="timeline-polaroid__corner-mark" aria-hidden="true">
            {isFriendship ? '✦' : '♥'}
          </span>
          <div className="timeline-polaroid__img-wrap">
            <img
              src={normalizeMediaUrl(frontPhoto)}
              alt={`${title} — фото ${topIdx + 1}`}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </div>
          {isMulti && (
            <span className="timeline-polaroid__flip-btn" aria-hidden="true">
              {topIdx + 1} / {photos.length}
            </span>
          )}
        </div>
      </div>
    );
  }
);

interface TimelineNodeItemProps {
  item: MemorableDate;
  isFriendship: boolean;
  isLast: boolean;
  isMenuOpen: boolean;
  onToggleMenu: (id: string) => void;
  onSelect: (date: MemorableDate) => void;
  onEdit: (date: MemorableDate) => void;
  onDelete: (date: MemorableDate) => void;
}

const TimelineNodeItem: React.FC<TimelineNodeItemProps> = memo(
  ({ item, isFriendship, isLast, isMenuOpen, onToggleMenu, onSelect, onEdit, onDelete }) => {
    const status = getMemorableDateStatus(item.date, item.isAnnual);
    const daysLabel = pluralizeRu(status.daysUntil, 'день', 'дня', 'дней');
    const daysAgoLabel =
      status.daysAgo !== undefined ? pluralizeRu(status.daysAgo, 'день', 'дня', 'дней') : '';
    const contextIcon = getDateContextIcon(item.title, item.description);

    const photos = (item.photos || []).slice(0, 2);
    const hasPhotos = photos.length > 0;
    const cleanDesc = item.description?.trim() || '';
    const hasDescription = cleanDesc.length > 0;
    const isLongDescription = cleanDesc.length > 85;

    const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(item);
      }
    };

    return (
      <article className="timeline-node">
        <div className="timeline-node__marker-wrap" aria-hidden="true">
          <div
            className={`timeline-node__marker ${
              status.isToday ? 'timeline-node__marker--today' : ''
            }`}
          >
            <Icon name={contextIcon} size={13} />
          </div>
          {!isLast && <span className="timeline-node__connector" />}
        </div>

        <div
          className={`timeline-node__card sketch-card ${
            !hasDescription ? 'timeline-node__card--compact' : ''
          }`}
          role="button"
          tabIndex={0}
          onClick={() => {
            telegramService.hapticImpact('light');
            onSelect(item);
          }}
          onKeyDown={handleCardKeyDown}
          aria-label={`Открыть памятную дату: ${item.title}`}
        >
          {/* Top Row: Date Pill + Annual Badge + Actions Menu */}
          <div className="timeline-node__top-row">
            <div className="timeline-node__date-sticker">
              <span>{formatRussianDate(item.date)}</span>
              {item.isAnnual && (
                <span className="timeline-node__annual-badge">Ежегодно</span>
              )}
            </div>

            <div
              className="timeline-node__actions-wrap"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="timeline-node__menu-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMenu(item.id);
                }}
                title="Действия с датой"
                aria-label={`Действия для «${item.title}»`}
                aria-haspopup="true"
                aria-expanded={isMenuOpen}
              >
                <Icon name="more-vertical" size={15} />
              </button>

              {isMenuOpen && (
                <div className="timeline-node__popover" role="menu">
                  <button
                    type="button"
                    className="timeline-node__popover-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(item);
                    }}
                  >
                    <Icon name="edit" size={14} />
                    <span>Редактировать</span>
                  </button>
                  <button
                    type="button"
                    className="timeline-node__popover-item timeline-node__popover-item--delete"
                    onClick={(e) => {
                      e.stopPropagation();
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

          {/* 2-Column Body: Text on left, Polaroid / Stack on right */}
          <div
            className={`timeline-node__body ${
              hasPhotos ? 'timeline-node__body--with-photo' : ''
            } ${isLongDescription ? 'timeline-node__body--center-photo' : ''}`}
          >
            <div className="timeline-node__text-col">
              <h4 className="timeline-node__title">
                <span className="timeline-node__title-icon" aria-hidden="true">
                  <Icon name={contextIcon} size={14} />
                </span>
                <span>{item.title}</span>
              </h4>

              {hasDescription && <p className="timeline-node__desc">{cleanDesc}</p>}

              <div className="timeline-node__meta-foot">
                {item.isAnnual ? (
                  status.isToday ? (
                    <span className="timeline-countdown--today">
                      <Icon name="sparkles" size={12} />
                      Сегодня годовщина!
                    </span>
                  ) : (
                    <span className="timeline-countdown">
                      Через <strong>{status.daysUntil}</strong> {daysLabel}
                    </span>
                  )
                ) : (
                  status.daysAgo !== undefined &&
                  status.daysAgo > 0 && (
                    <span className="timeline-past-info">
                      {status.daysAgo} {daysAgoLabel} назад
                    </span>
                  )
                )}
              </div>
            </div>

            {hasPhotos && (
              <div className="timeline-node__photo-col">
                <PolaroidStack
                  photos={photos}
                  title={item.title}
                  compact={!hasDescription}
                  isFriendship={isFriendship}
                />
              </div>
            )}
          </div>
        </div>
      </article>
    );
  }
);

export const MemorableDatesList: React.FC<MemorableDatesListProps> = memo(({
  dates,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const { isFriendship } = useSpaceMode();
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

  const sortedDates = useMemo(() => {
    return [...dates].sort((a, b) => a.date.localeCompare(b.date));
  }, [dates]);

  if (sortedDates.length === 0) {
    return (
      <div className="memorable-timeline-empty sketch-card sketch-card--dashed">
        <div className="memorable-timeline-empty__mascot" aria-hidden="true">
          <Mascot name="09_calendar_anniversary" size={76} />
        </div>
        <h3 className="memorable-timeline-empty__title">Добавьте ваши особенные даты</h3>
        <p className="memorable-timeline-empty__desc">
          {isFriendship
            ? 'Сохраните день знакомства, первую поездку и другие важные моменты дружбы.'
            : 'Сохраните день знакомства, первый поцелуй, поездки и другие важные моменты.'}
        </p>
      </div>
    );
  }

  return (
    <div className="memorable-timeline">
      <div className="memorable-timeline__track" aria-hidden="true" />
      {sortedDates.map((item, idx) => (
        <TimelineNodeItem
          key={item.id}
          item={item}
          isFriendship={isFriendship}
          isLast={idx === sortedDates.length - 1}
          isMenuOpen={activeMenuId === item.id}
          onToggleMenu={(id) => setActiveMenuId((prev) => (prev === id ? null : id))}
          onSelect={onSelect}
          onEdit={(d) => {
            setActiveMenuId(null);
            onEdit(d);
          }}
          onDelete={(d) => {
            setActiveMenuId(null);
            onDelete(d);
          }}
        />
      ))}
    </div>
  );
});
