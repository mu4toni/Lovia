import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { normalizeMediaUrl } from '../../../utils/media';
import './SwipeablePhotoGallery.css';

export interface SwipeablePhotoGalleryProps {
  photos: string[];
  altPrefix: string;
  className?: string;
  onActiveIndexChange?: (index: number) => void;
}

export const SwipeablePhotoGallery: React.FC<SwipeablePhotoGalleryProps> = memo(({
  photos,
  altPrefix,
  className = '',
  onActiveIndexChange,
}) => {
  const photoCount = photos.length;
  const isMultiPhoto = photoCount > 1;
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveIndex(0);
    onActiveIndexChange?.(0);
    if (trackRef.current) {
      trackRef.current.scrollLeft = 0;
    }
  }, [photoCount, photos[0], onActiveIndexChange]);

  const scrollToIndex = useCallback(
    (targetIndex: number) => {
      if (photoCount <= 1) return;
      const wrapped = ((targetIndex % photoCount) + photoCount) % photoCount;
      setActiveIndex(wrapped);
      onActiveIndexChange?.(wrapped);
      const el = trackRef.current;
      if (el && el.clientWidth > 0) {
        el.scrollTo({
          left: wrapped * el.clientWidth,
          behavior: 'smooth',
        });
      }
    },
    [photoCount, onActiveIndexChange]
  );

  const handleScroll = () => {
    const el = trackRef.current;
    if (!el || el.clientWidth <= 0 || photoCount <= 1) return;
    const nextIdx = Math.max(0, Math.min(photoCount - 1, Math.round(el.scrollLeft / el.clientWidth)));
    if (nextIdx !== activeIndex) {
      setActiveIndex(nextIdx);
      onActiveIndexChange?.(nextIdx);
    }
  };

  if (photoCount === 0) return null;

  return (
    <div
      className={`swipe-gallery ${className}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div
        ref={trackRef}
        className="swipe-gallery__track"
        onScroll={handleScroll}
        aria-label={`Галерея фотографий: ${altPrefix}`}
      >
        {photos.map((photoUrl, idx) => (
          <div key={`${idx}-${photoUrl.slice(-16)}`} className="swipe-gallery__slide">
            <img
              src={normalizeMediaUrl(photoUrl)}
              alt={`${altPrefix} — фото ${idx + 1} из ${photoCount}`}
              className="swipe-gallery__img"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {isMultiPhoto && (
        <div
          className="swipe-gallery__dots"
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
              aria-selected={idx === activeIndex}
              aria-label={`Фото ${idx + 1}`}
              className={`swipe-gallery__dot ${
                idx === activeIndex ? 'swipe-gallery__dot--active' : ''
              }`}
              onClick={(e) => {
                e.stopPropagation();
                scrollToIndex(idx);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
});
