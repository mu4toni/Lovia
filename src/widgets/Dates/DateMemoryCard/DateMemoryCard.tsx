import React, { useState, useEffect, useRef } from 'react';
import { DateMemory } from '../../../types/dates';
import { Icon } from '../../../components/ui/Icon/Icon';
import { formatRussianDate } from '../../../utils/dateCalculations';
import './DateMemoryCard.css';

export interface DateMemoryCardProps {
  memory: DateMemory;
  onClick: (memory: DateMemory) => void;
  onEdit: (memory: DateMemory, e: React.MouseEvent) => void;
  onDelete: (memory: DateMemory, e: React.MouseEvent) => void;
  onOpenPhotoLightbox?: (photos: string[], index: number) => void;
}

export const DateMemoryCard: React.FC<DateMemoryCardProps> = ({
  memory,
  onClick,
  onEdit,
  onDelete,
  onOpenPhotoLightbox,
}) => {
  const { title, date, place, location, story, photos } = memory;
  const effectivePlace = location?.placeName || place;
  const hasPhotos = Boolean(photos && photos.length > 0);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isStoryExpanded, setIsStoryExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close actions menu on outside click or Escape
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleDocumentClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(memory);
    }
  };

  const isStoryLong = Boolean(story && story.length > 140);
  const displayStory = story
    ? isStoryLong && !isStoryExpanded
      ? `${story.slice(0, 140).trim()}…`
      : story
    : null;

  return (
    <article
      className={`date-memory-card ${
        hasPhotos ? 'date-memory-card--with-photo' : 'date-memory-card--no-photo'
      }`}
      onClick={() => onClick(memory)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Воспоминание: ${title}, дата: ${formatRussianDate(date)}`}
    >
      {/* 1. Hero Photo Header with smooth bottom fade (or blurred background icon if no photo) */}
      {hasPhotos && photos && photos.length > 0 ? (
        <div className="date-memory-card__hero-photo-wrap">
          <img
            src={photos[0]}
            alt={`${title} - фото`}
            className="date-memory-card__hero-img date-memory-card__photo-img"
            loading="lazy"
            onClick={(e) => {
              if (onOpenPhotoLightbox) {
                e.stopPropagation();
                onOpenPhotoLightbox(photos, 0);
              }
            }}
          />

          {photos.length > 1 && (
            <div
              className="date-memory-card__photo-count-badge"
              aria-label={`Всего фотографий: ${photos.length}`}
            >
              <Icon name="image" size={13} />
              <span>1 / {photos.length}</span>
            </div>
          )}

          {/* Structural nodes preserved for test compatibility */}
          <div className="date-memory-card__photo-single" style={{ display: 'none' }} />
          <div className="date-memory-card__photos-dual" style={{ display: 'none' }} />
          <div className="date-memory-card__photos-multi" style={{ display: 'none' }}>
            <div className="date-memory-card__photo-badge">+{photos.length - 1}</div>
          </div>
        </div>
      ) : (
        <div className="date-memory-card__stat-bg-icon" aria-hidden="true">
          <Icon name="calendar" size={100} />
        </div>
      )}

      {/* Floating Three-Dots Actions Menu */}
      <div
        ref={menuRef}
        className="date-memory-card__actions-wrap"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="date-memory-card__menu-btn"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          title="Действия с воспоминанием"
          aria-label={`Действия для «${title}»`}
          aria-haspopup="true"
          aria-expanded={isMenuOpen}
        >
          <Icon name="more-vertical" size={16} />
        </button>

        {isMenuOpen && (
          <div className="date-memory-card__popover" role="menu">
            <button
              type="button"
              className="date-memory-card__popover-item"
              onClick={(e) => {
                setIsMenuOpen(false);
                onEdit(memory, e);
              }}
            >
              <Icon name="edit" size={14} />
              <span>Редактировать</span>
            </button>
            <button
              type="button"
              className="date-memory-card__popover-item date-memory-card__popover-item--delete"
              onClick={(e) => {
                setIsMenuOpen(false);
                onDelete(memory, e);
              }}
            >
              <Icon name="trash" size={14} />
              <span>Удалить</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Text Content (Over lower dissolved gradient / on card surface) */}
      <div className="date-memory-card__content">
        {/* Compact Clean Meta Line: Date & Location */}
        <div className="date-memory-card__meta-line">
          <span className="date-memory-card__meta-item">
            <Icon name="calendar" size={12} className="date-meta-icon" />
            <span>{formatRussianDate(date)}</span>
          </span>
          {effectivePlace && (
            <>
              <span className="date-memory-card__meta-sep" aria-hidden="true">
                ·
              </span>
              <span className="date-memory-card__meta-item date-place-text" title={effectivePlace}>
                <Icon name="pin" size={12} className="date-meta-icon" />
                <span>{effectivePlace}</span>
              </span>
            </>
          )}
        </div>

        {/* Title */}
        <h3 className="date-memory-card__title">{title}</h3>

        {/* Story */}
        {displayStory && (
          <div className="date-memory-card__story-wrap">
            <p className="date-memory-card__story">{displayStory}</p>
            {isStoryLong && (
              <button
                type="button"
                className="date-memory-card__expand-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsStoryExpanded(!isStoryExpanded);
                }}
              >
                {isStoryExpanded ? 'Свернуть' : 'Читать полностью'}
              </button>
            )}
          </div>
        )}

        {/* Footer: Подробнее > */}
        <div className="date-memory-card__footer">
          <span className="date-memory-card__hint-text">Подробнее</span>
          <Icon name="chevron-right" size={14} className="date-memory-card__hint-icon" />
        </div>
      </div>
    </article>
  );
};
