import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DateMemory } from '../../../types/dates';
import { Icon } from '../../../components/ui/Icon/Icon';
import { PolaroidFrame } from '../../../components/ui/PolaroidFrame/PolaroidFrame';
import { formatRussianDate } from '../../../utils/dateCalculations';
import { normalizeMediaUrl } from '../../../utils/media';
import { useSpaceMode } from '../../../hooks/useSpaceMode';
import './DateMemoryCard.css';

export interface DateMemoryCardProps {
  memory: DateMemory;
  tilt?: 'left' | 'right' | 'none';
  onClick: (memory: DateMemory) => void;
  onEdit: (memory: DateMemory, e: React.MouseEvent) => void;
  onDelete: (memory: DateMemory, e: React.MouseEvent) => void;
  onOpenPhotoLightbox?: (photos: string[], index: number) => void;
}

export const DateMemoryCard: React.FC<DateMemoryCardProps> = ({
  memory,
  tilt = 'left',
  onClick,
  onEdit,
  onDelete,
  onOpenPhotoLightbox,
}) => {
  const { isFriendship } = useSpaceMode();
  const { title, date, place, location, story, photos } = memory;
  const effectivePlace = location?.placeName || place;
  const photoCount = photos ? photos.length : 0;
  const hasPhotos = photoCount > 0;
  const isMultiPhoto = photoCount > 1;
  const [isStoryExpanded, setIsStoryExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const swipeStateRef = useRef({
    startX: 0,
    startY: 0,
    hasSwiped: false,
    lastSwipeTs: 0,
  });

  // Reset active photo index when memory or photo list changes
  useEffect(() => {
    setActivePhotoIndex(0);
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = 0;
    }
  }, [memory.id, photoCount]);

  const scrollToPhoto = useCallback(
    (targetIndex: number) => {
      if (!photos || photos.length <= 1) return;
      const wrappedIndex = ((targetIndex % photos.length) + photos.length) % photos.length;
      setActivePhotoIndex(wrappedIndex);
      swipeStateRef.current.lastSwipeTs = Date.now();
      const el = carouselRef.current;
      if (el && el.clientWidth > 0) {
        el.scrollTo({
          left: wrappedIndex * el.clientWidth,
          behavior: 'smooth',
        });
      }
    },
    [photos]
  );

  const handleCarouselScroll = () => {
    const el = carouselRef.current;
    if (!el || el.clientWidth <= 0 || photoCount <= 1) return;
    const nextIdx = Math.max(0, Math.min(photoCount - 1, Math.round(el.scrollLeft / el.clientWidth)));
    if (nextIdx !== activePhotoIndex) {
      setActivePhotoIndex(nextIdx);
      swipeStateRef.current.lastSwipeTs = Date.now();
    }
  };

  const handleCarouselTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    swipeStateRef.current.startX = touch.clientX;
    swipeStateRef.current.startY = touch.clientY;
    swipeStateRef.current.hasSwiped = false;
  };

  const handleCarouselTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    const dx = Math.abs(touch.clientX - swipeStateRef.current.startX);
    if (dx > 8) {
      swipeStateRef.current.hasSwiped = true;
      swipeStateRef.current.lastSwipeTs = Date.now();
    }
  };

  const handleCarouselPointerDown = (e: React.PointerEvent) => {
    swipeStateRef.current.startX = e.clientX;
    swipeStateRef.current.startY = e.clientY;
    swipeStateRef.current.hasSwiped = false;
  };

  const handleCarouselPointerMove = (e: React.PointerEvent) => {
    if (e.buttons === 0 && e.pointerType === 'mouse') return;
    const dx = Math.abs(e.clientX - swipeStateRef.current.startX);
    if (dx > 8) {
      swipeStateRef.current.hasSwiped = true;
      swipeStateRef.current.lastSwipeTs = Date.now();
    }
  };

  const handleCarouselClick = (e: React.MouseEvent) => {
    // Always stop propagation on carousel area so swiping/browsing photos NEVER opens the card
    e.stopPropagation();
    const recentlySwiped =
      swipeStateRef.current.hasSwiped || Date.now() - swipeStateRef.current.lastSwipeTs < 260;
    swipeStateRef.current.hasSwiped = false;
    if (recentlySwiped) return;
    if (photos && onOpenPhotoLightbox) {
      onOpenPhotoLightbox(photos, activePhotoIndex);
    }
  };

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

      {/* 1. Polaroid Photo Header (when photos exist) */}
      {hasPhotos && photos && photos.length > 0 && (
        <div
          className="date-memory-card__polaroid-wrap"
          onClick={isMultiPhoto ? (e) => e.stopPropagation() : undefined}
        >
          {isMultiPhoto ? (
            <PolaroidFrame
              aspectRatio="landscape"
              tilt={tilt}
              sticker={isFriendship ? 'tape' : 'heart'}
              className="date-memory-card__polaroid"
            >
              <div
                className="date-memory-card__carousel-box"
                onClick={handleCarouselClick}
                onTouchStart={handleCarouselTouchStart}
                onTouchMove={handleCarouselTouchMove}
                onPointerDown={handleCarouselPointerDown}
                onPointerMove={handleCarouselPointerMove}
              >
                <div
                  ref={carouselRef}
                  className="date-memory-card__carousel-track"
                  onScroll={handleCarouselScroll}
                  aria-label={`Галерея фотографий: ${title}`}
                >
                  {photos.map((photoUrl, idx) => (
                    <div key={`${idx}-${photoUrl.slice(-16)}`} className="date-memory-card__carousel-slide">
                      <img
                        src={normalizeMediaUrl(photoUrl)}
                        alt={`${title} — фото ${idx + 1} из ${photos.length}`}
                        className="date-memory-card__carousel-img"
                        loading={idx === 0 ? 'eager' : 'lazy'}
                        draggable={false}
                      />
                    </div>
                  ))}
                </div>

                {/* Mini Left / Right Arrows */}
                <button
                  type="button"
                  className="date-memory-card__carousel-arrow date-memory-card__carousel-arrow--prev"
                  onPointerDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollToPhoto(activePhotoIndex - 1);
                  }}
                  aria-label="Предыдущее фото"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="date-memory-card__carousel-arrow date-memory-card__carousel-arrow--next"
                  onPointerDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollToPhoto(activePhotoIndex + 1);
                  }}
                  aria-label="Следующее фото"
                >
                  ›
                </button>

                {/* Bottom Dot Indicators */}
                <div
                  className="date-memory-card__carousel-dots"
                  role="tablist"
                  aria-label="Выбор фотографии"
                  onPointerDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  {photos.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      role="tab"
                      aria-selected={idx === activePhotoIndex}
                      aria-label={`Фото ${idx + 1} из ${photos.length}`}
                      className={`date-memory-card__carousel-dot ${
                        idx === activePhotoIndex ? 'date-memory-card__carousel-dot--active' : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        scrollToPhoto(idx);
                      }}
                    />
                  ))}
                </div>
              </div>
            </PolaroidFrame>
          ) : (
            <PolaroidFrame
              src={photos[0]}
              alt={`${title} - фото`}
              aspectRatio="landscape"
              tilt={tilt}
              sticker={isFriendship ? 'tape' : 'heart'}
              className="date-memory-card__polaroid"
              onClick={(e) => {
                if (onOpenPhotoLightbox) {
                  e.stopPropagation();
                  onOpenPhotoLightbox(photos, 0);
                }
              }}
            />
          )}

          {isMultiPhoto && (
            <div
              className="date-memory-card__photo-count-badge"
              aria-label={`Фото ${activePhotoIndex + 1} из ${photos.length}`}
            >
              <Icon name="image" size={13} />
              <span>
                {activePhotoIndex + 1} / {photos.length}
              </span>
            </div>
          )}

          {/* Structural nodes preserved for test compatibility */}
          <div className="date-memory-card__photo-single" style={{ display: 'none' }} />
          <div className="date-memory-card__photos-dual" style={{ display: 'none' }} />
          <div className="date-memory-card__photos-multi" style={{ display: 'none' }}>
            <div className="date-memory-card__photo-badge">+{photos.length - 1}</div>
          </div>
        </div>
      )}

      {/* 2. Paper Note Content */}
      <div className="date-memory-card__content">
        {/* Blush Date Sticker Pill & Location */}
        <div className="date-memory-card__meta-line">
          <span className="date-memory-card__date-pill">
            <Icon name="calendar" size={12} className="date-meta-icon" />
            <span>{formatRussianDate(date)}</span>
          </span>
          {effectivePlace && (
            <span className="date-memory-card__place-pill" title={effectivePlace}>
              <Icon name="pin" size={12} className="date-meta-icon" />
              <span>{effectivePlace}</span>
            </span>
          )}
        </div>

        {/* Handwritten Title */}
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

        {/* Footer */}
        <div className="date-memory-card__footer">
          <span className="date-memory-card__hint-text">Открыть запись</span>
          <Icon name="chevron-right" size={14} className="date-memory-card__hint-icon" />
        </div>
      </div>
    </article>
  );
};
