import React, { useState, useEffect } from 'react';
import { DateMemory } from '../../../types/dates';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Button } from '../../../components/ui/Button/Button';
import { Icon } from '../../../components/ui/Icon/Icon';
import { PlaceCard } from '../PlaceCard/PlaceCard';
import { formatRussianDate } from '../../../utils/dateCalculations';
import './DateMemoryDetailModal.css';

export interface DateMemoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  memory: DateMemory | null;
  onEdit: (memory: DateMemory) => void;
  onDelete: (memory: DateMemory) => void;
  onOpenPhotoLightbox: (photos: string[], index: number) => void;
}

export const DateMemoryDetailModal: React.FC<DateMemoryDetailModalProps> = ({
  isOpen,
  onClose,
  memory,
  onEdit,
  onDelete,
  onOpenPhotoLightbox,
}) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    setCurrentPhotoIndex(0);
  }, [memory?.id]);

  if (!memory) return null;

  const { title, date, place, location, story, photos } = memory;
  const hasPhotos = Boolean(photos && photos.length > 0);

  const effectivePlace = location || (place ? { placeName: place, latitude: 55.7522, longitude: 37.6156 } : null);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Воспоминание о свидании">
      <article className="date-memory-detail">
        {/* 1. Large Hero Photo Gallery / Slider at the top (260px–340px) */}
        {hasPhotos && photos && (
          <section className="date-memory-detail__hero-slider" aria-label="Галерея фотографий свидания">
            <div
              className="date-memory-detail__hero-photo-wrap"
              onClick={() => onOpenPhotoLightbox(photos, currentPhotoIndex)}
              role="button"
              tabIndex={0}
              title="Нажмите, чтобы открыть фото на весь экран"
              aria-label={`Фотография ${currentPhotoIndex + 1} из ${photos.length}. Нажмите для полноэкранного просмотра`}
            >
              <img
                src={photos[currentPhotoIndex]}
                alt={`${title} - фото ${currentPhotoIndex + 1}`}
                className="date-memory-detail__hero-photo"
                loading="eager"
              />
              <div className="date-memory-detail__zoom-overlay" aria-hidden="true">
                <Icon name="eye" size={16} />
                <span>На весь экран</span>
              </div>
            </div>

            {/* Slider Navigation (if multiple photos) */}
            {photos.length > 1 && (
              <div className="date-memory-detail__slider-controls">
                <button
                  type="button"
                  className="date-memory-detail__slider-btn date-memory-detail__slider-btn--prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
                  }}
                  aria-label="Предыдущее фото"
                >
                  <Icon name="chevron-left" size={18} />
                </button>

                <div className="date-memory-detail__slider-counter" aria-hidden="true">
                  {currentPhotoIndex + 1} / {photos.length}
                </div>

                <button
                  type="button"
                  className="date-memory-detail__slider-btn date-memory-detail__slider-btn--next"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
                  }}
                  aria-label="Следующее фото"
                >
                  <Icon name="chevron-right" size={18} />
                </button>
              </div>
            )}

            {/* Thumbnail Strip / Quick Jump */}
            {photos.length > 1 && (
              <div className="date-memory-detail__gallery-grid" role="tablist" aria-label="Миниатюры фото">
                {photos.map((photoUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`date-memory-detail__gallery-item ${
                      idx === currentPhotoIndex ? 'date-memory-detail__gallery-item--active' : ''
                    }`}
                    onClick={() => setCurrentPhotoIndex(idx)}
                    role="tab"
                    aria-selected={idx === currentPhotoIndex}
                    aria-label={`Выбрать фото ${idx + 1}`}
                  >
                    <img
                      src={photoUrl}
                      alt=""
                      className="date-memory-detail__gallery-img"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 2. Header: Date Badge & Title */}
        <header className="date-memory-detail__header">
          <div className="date-memory-detail__meta-row">
            <span className="date-memory-detail__date-badge">
              <Icon name="calendar" size={14} className="detail-meta-icon" />
              {formatRussianDate(date)}
            </span>
          </div>

          <h2 className="date-memory-detail__title">{title}</h2>
        </header>

        {/* 3. Story Impression Box */}
        {story && (
          <div className="date-memory-detail__story-box">
            <div className="date-memory-detail__story-quote-icon" aria-hidden="true">
              <Icon name="heart-filled" size={16} />
            </div>
            <p className="date-memory-detail__story-text">{story}</p>
          </div>
        )}

        {/* 4. Compact Place Card at the bottom */}
        {effectivePlace && (
          <div className="date-memory-detail__place-section">
            <PlaceCard place={effectivePlace} readonly={true} />
          </div>
        )}

        {/* 5. Footer Actions */}
        <footer className="date-memory-detail__actions">
          <Button
            variant="ghost"
            onClick={() => {
              onClose();
              onDelete(memory);
            }}
            style={{ color: 'var(--color-danger, #e53e3e)', minHeight: '44px' }}
          >
            <Icon name="trash" size={16} style={{ marginRight: '6px' }} />
            Удалить
          </Button>

          <Button
            variant="secondary"
            onClick={() => {
              onClose();
              onEdit(memory);
            }}
            style={{ minHeight: '44px' }}
          >
            <Icon name="edit" size={16} style={{ marginRight: '6px' }} />
            Редактировать
          </Button>
        </footer>
      </article>
    </Modal>
  );
};
