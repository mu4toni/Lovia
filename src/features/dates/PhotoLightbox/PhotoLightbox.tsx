import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../../components/ui/Icon/Icon';
import { normalizeMediaUrl } from '../../../utils/media';
import './PhotoLightbox.css';

export interface PhotoLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  photos: string[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  isOpen,
  onClose,
  photos,
  currentIndex,
  onIndexChange,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && photos.length > 1) {
        onIndexChange((currentIndex - 1 + photos.length) % photos.length);
      } else if (e.key === 'ArrowRight' && photos.length > 1) {
        onIndexChange((currentIndex + 1) % photos.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, photos.length, currentIndex, onClose, onIndexChange]);

  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex] || photos[0];

  const lightboxContent = (
    <div
      className="photo-lightbox-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр фотографии"
      onClick={onClose}
    >
      <div className="photo-lightbox-content" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="photo-lightbox-close"
          onClick={onClose}
          aria-label="Закрыть просмотр"
        >
          <Icon name="close" size={22} />
        </button>

        {photos.length > 1 && (
          <>
            <button
              type="button"
              className="photo-lightbox-nav photo-lightbox-nav--prev"
              onClick={() => onIndexChange((currentIndex - 1 + photos.length) % photos.length)}
              aria-label="Предыдущее фото"
            >
              <Icon name="chevron-left" size={24} />
            </button>
            <button
              type="button"
              className="photo-lightbox-nav photo-lightbox-nav--next"
              onClick={() => onIndexChange((currentIndex + 1) % photos.length)}
              aria-label="Следующее фото"
            >
              <Icon name="chevron-right" size={24} />
            </button>
          </>
        )}

        <img
          src={normalizeMediaUrl(currentPhoto)}
          alt={`Фотография ${currentIndex + 1} из ${photos.length}`}
          className="photo-lightbox-image"
        />

        {photos.length > 1 && (
          <div className="photo-lightbox-counter">
            {currentIndex + 1} / {photos.length}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(lightboxContent, document.body)
    : lightboxContent;
};
