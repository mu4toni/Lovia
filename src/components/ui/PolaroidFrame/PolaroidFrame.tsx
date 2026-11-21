import React, { useState } from 'react';
import { normalizeMediaUrl } from '../../../utils/media';
import './PolaroidFrame.css';

export interface PolaroidFrameProps {
  src?: string;
  alt?: string;
  caption?: string;
  tilt?: 'left' | 'right' | 'none';
  sticker?: 'heart' | 'star' | 'tape' | 'none';
  aspectRatio?: 'square' | 'landscape' | 'portrait';
  fallback?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  children?: React.ReactNode;
}

export const PolaroidFrame: React.FC<PolaroidFrameProps> = ({
  src,
  alt = '',
  caption,
  tilt = 'left',
  sticker = 'heart',
  aspectRatio = 'square',
  fallback,
  onClick,
  className = '',
  children,
}) => {
  const [imgError, setImgError] = useState(false);
  const resolvedSrc = normalizeMediaUrl(src);

  return (
    <div
      className={`polaroid-frame polaroid-frame--tilt-${tilt} ${
        onClick ? 'polaroid-frame--clickable' : ''
      } ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e as unknown as React.MouseEvent);
              }
            }
          : undefined
      }
    >
      {/* Decorative sticker / craft tape in top corner — strictly pointer-events: none */}
      {sticker === 'heart' && (
        <span className="polaroid-frame__sticker polaroid-frame__sticker--heart" aria-hidden="true">
          <svg viewBox="0 0 20 20" width="16" height="16" fill="var(--accent-primary)">
            <path d="M10 17.5s-6.2-3.9-8-7.4C.8 7.6 2 4.6 4.7 3.8c2-.6 4.2.3 5.3 1.9 1.1-1.6 3.3-2.5 5.3-1.9 2.7.8 3.9 3.8 2.7 6.3-1.8 3.5-8 7.4-8 7.4z" />
          </svg>
        </span>
      )}
      {sticker === 'star' && (
        <span className="polaroid-frame__sticker polaroid-frame__sticker--star" aria-hidden="true">
          <svg viewBox="0 0 20 20" width="16" height="16" fill="var(--accent-primary)">
            <path d="M10 1.5c.6 4.2 3 6.9 8 8.5-5 1.6-7.4 4.3-8 8.5-.6-4.2-3-6.9-8-8.5 5-1.6 7.4-4.3 8-8.5z" />
          </svg>
        </span>
      )}
      {sticker === 'tape' && (
        <span className="polaroid-frame__tape" aria-hidden="true" />
      )}

      <div className={`polaroid-frame__photo-box polaroid-frame__photo-box--${aspectRatio}`}>
        {children ? (
          children
        ) : resolvedSrc && !imgError ? (
          <img
            src={resolvedSrc}
            alt={alt}
            className="polaroid-frame__img"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : fallback ? (
          fallback
        ) : (
          <div className="polaroid-frame__empty" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20.3s-7-4.4-9.2-8.3C1.2 9 2.4 5.5 5.5 4.5c2.4-.8 5 .3 6.5 2.2 1.5-1.9 4.1-3 6.5-2.2 3.1 1 4.3 4.5 2.7 7.5-2.2 3.9-9.2 8.3-9.2 8.3z" />
            </svg>
          </div>
        )}
      </div>

      {caption && <span className="polaroid-frame__caption">{caption}</span>}
    </div>
  );
};
