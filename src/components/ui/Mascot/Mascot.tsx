import React, { useState } from 'react';
import bearLoveUrl from '../../../assets/mascots/bear-love.png';
import bearSleepyUrl from '../../../assets/mascots/bear-sleepy.png';
import bearPeekUrl from '../../../assets/mascots/bear-peek.png';
import './Mascot.css';

export type MascotVariant = 'love' | 'sleepy' | 'peek';

export interface MascotProps {
  variant: MascotVariant;
  size?: number | string;
  width?: number | string;
  height?: number | string;
  animated?: boolean;
  interactive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
  onClick?: () => void;
}

const MASCOT_IMAGES: Record<MascotVariant, string> = {
  love: bearLoveUrl,
  sleepy: bearSleepyUrl,
  peek: bearPeekUrl,
};

const DEFAULT_ALTS: Record<MascotVariant, string> = {
  love: 'Мишка Lovia с сердечком',
  sleepy: 'Сонный мишка Lovia отдыхает',
  peek: 'Любопытный мишка Lovia',
};

export const Mascot: React.FC<MascotProps> = ({
  variant,
  size,
  width,
  height,
  animated = true,
  interactive = false,
  className = '',
  style,
  alt,
  onClick,
}) => {
  const [isTapped, setIsTapped] = useState(false);

  const src = MASCOT_IMAGES[variant] || bearLoveUrl;
  const resolvedAlt = alt || DEFAULT_ALTS[variant] || 'Маскот Lovia';

  const w = width ?? size;
  const h = height ?? size;

  const handleClick = () => {
    if (interactive) {
      setIsTapped(true);
      setTimeout(() => setIsTapped(false), 600);
    }
    if (onClick) {
      onClick();
    }
  };

  const styleObj: React.CSSProperties = {
    ...style,
    ...(w !== undefined ? { width: typeof w === 'number' ? `${w}px` : w } : {}),
    ...(h !== undefined ? { height: typeof h === 'number' ? `${h}px` : h } : {}),
  };

  return (
    <div
      className={`lovia-mascot lovia-mascot--${variant} ${animated ? 'lovia-mascot--animated' : ''} ${
        interactive ? 'lovia-mascot--interactive' : ''
      } ${isTapped ? 'lovia-mascot--tapped' : ''} ${className}`}
      style={styleObj}
      onClick={handleClick}
      role={interactive || onClick ? 'button' : undefined}
      tabIndex={interactive || onClick ? 0 : undefined}
      aria-label={interactive || onClick ? resolvedAlt : undefined}
    >
      <img
        src={src}
        alt={resolvedAlt}
        className="lovia-mascot__img"
        loading="lazy"
        draggable={false}
      />
    </div>
  );
};
