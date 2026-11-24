import React, { memo } from 'react';
import { Icon } from '../Icon/Icon';
import { normalizeMediaUrl } from '../../../utils/media';
import './Avatar.css';

export interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'heart';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = memo(({
  src,
  name,
  size = 'md',
  status,
  className = '',
}) => {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const effectiveSrc = normalizeMediaUrl(src);

  return (
    <div
      className={`glass-avatar glass-avatar--${size} ${className}`}
      role="img"
      aria-label={`Аватар: ${name}`}
    >
      {effectiveSrc ? (
        <img
          src={effectiveSrc}
          alt={name}
          className="glass-avatar__img"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="glass-avatar__fallback">
          {initials || <Icon name="heart-filled" size={14} />}
        </div>
      )}
      {status === 'heart' && (
        <span
          className="glass-avatar__status glass-avatar__status--heart"
          aria-label="Влюблён"
        >
          <Icon name="heart-filled" size={10} />
        </span>
      )}
    </div>
  );
});
