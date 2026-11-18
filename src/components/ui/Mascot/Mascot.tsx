import React, { useState } from 'react';
import bearLoveUrl from '../../../assets/mascots/bear-love.png';
import bearSleepyUrl from '../../../assets/mascots/bear-sleepy.png';
import bearPeekUrl from '../../../assets/mascots/bear-peek.png';
import { telegramService } from '../../../services/telegramService';
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
  const [hearts, setHearts] = useState<{ id: number; symbol: string; left: string; size: number }[]>([]);

  const src = MASCOT_IMAGES[variant] || bearLoveUrl;
  const resolvedAlt = alt || DEFAULT_ALTS[variant] || 'Маскот Lovia';

  const w = width ?? size;
  const h = height ?? size;

  const handleClick = () => {
    if (interactive) {
      setIsTapped(true);
      telegramService.hapticImpact('light');

      const now = Date.now();
      const newHearts = [
        { id: now + 1, symbol: '❤️', left: '20%', size: 16 },
        { id: now + 2, symbol: '✨', left: '50%', size: 14 },
        { id: now + 3, symbol: '💖', left: '75%', size: 18 },
      ];
      setHearts((prev) => [...prev, ...newHearts]);

      setTimeout(() => {
        setHearts((prev) => prev.filter((h) => !newHearts.some((nh) => nh.id === h.id)));
      }, 900);

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
      {hearts.map((h) => (
        <span
          key={h.id}
          className="lovia-mascot__float-heart"
          style={{ left: h.left, fontSize: `${h.size}px` }}
          aria-hidden="true"
        >
          {h.symbol}
        </span>
      ))}
    </div>
  );
};
