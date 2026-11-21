import React, { useState, useEffect } from 'react';
import bearLoveUrl from '../../../assets/mascots/bear-love.png';
import bearSleepyUrl from '../../../assets/mascots/bear-sleepy.png';
import bearPeekUrl from '../../../assets/mascots/bear-peek.png';
import { telegramService } from '../../../services/telegramService';
import './Mascot.css';

export type MascotMood =
  | 'happy'
  | 'love'
  | 'support'
  | 'sleepy'
  | 'camera'
  | 'peek'
  | 'thinking'
  | 'sad';

export type MascotVariant = 'love' | 'sleepy' | 'peek';

export interface MascotProps {
  mood?: MascotMood;
  variant?: MascotVariant;
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

const FALLBACK_BUNDLED_IMAGES: Record<MascotMood, string> = {
  happy: bearLoveUrl,
  love: bearLoveUrl,
  support: bearLoveUrl,
  sleepy: bearSleepyUrl,
  camera: bearPeekUrl,
  peek: bearPeekUrl,
  thinking: bearPeekUrl,
  sad: bearSleepyUrl,
};

const DEFAULT_ALTS: Record<MascotMood, string> = {
  happy: 'Радостный медвежонок Бин',
  love: 'Медвежонок Бин с сердечком',
  support: 'Медвежонок Бин советует',
  sleepy: 'Сонный медвежонок Бин отдыхает',
  camera: 'Медвежонок Бин с фотоаппаратом',
  peek: 'Любопытный медвежонок Бин выглядывает',
  thinking: 'Задумчивый медвежонок Бин',
  sad: 'Медвежонок Бин скучает',
};

/**
 * Cozy hand-drawn SVG fallback of Bear Bean if neither /mascot/<mood>.png nor bundled PNG loads.
 */
const FallbackBearSvg: React.FC<{ mood: MascotMood }> = ({ mood }) => (
  <svg
    viewBox="0 0 80 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="lovia-mascot__svg-fallback"
    aria-hidden="true"
  >
    {/* Ears */}
    <circle cx="22" cy="23" r="10" fill="#A87554" stroke="#49372F" strokeWidth="2.4" />
    <circle cx="22" cy="23" r="4.5" fill="#E8B9B5" />
    <circle cx="58" cy="23" r="10" fill="#A87554" stroke="#49372F" strokeWidth="2.4" />
    <circle cx="58" cy="23" r="4.5" fill="#E8B9B5" />
    {/* Head */}
    <ellipse cx="40" cy="43" rx="25" ry="22" fill="#C2916F" stroke="#49372F" strokeWidth="2.4" />
    {/* Snout */}
    <ellipse cx="40" cy="48" rx="10" ry="7.5" fill="#FFFBF6" />
    {/* Cheeks */}
    <ellipse cx="24" cy="48" rx="4.5" ry="2.8" fill="#E8B9B5" opacity="0.85" />
    <ellipse cx="56" cy="48" rx="4.5" ry="2.8" fill="#E8B9B5" opacity="0.85" />
    {/* Eyes */}
    {mood === 'sleepy' ? (
      <>
        <path d="M27 40C29 42.5 32 42.5 34 40" stroke="#49372F" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M46 40C48 42.5 51 42.5 53 40" stroke="#49372F" strokeWidth="2.2" strokeLinecap="round" />
      </>
    ) : (
      <>
        <circle cx="30" cy="39" r="2.7" fill="#49372F" />
        <circle cx="50" cy="39" r="2.7" fill="#49372F" />
      </>
    )}
    {/* Nose & Smile */}
    <ellipse cx="40" cy="45.5" rx="3.4" ry="2.4" fill="#49372F" />
    <path d="M36.5 50.5C38 52.5 42 52.5 43.5 50.5" stroke="#49372F" strokeWidth="2" strokeLinecap="round" />
    {/* Mini heart for love / happy / support */}
    {(mood === 'love' || mood === 'happy' || mood === 'support') && (
      <path
        d="M40 72s-6-3.8-7.8-7.2c-1.2-2.4 0-5.2 2.6-6 1.9-.6 4 .3 5.2 1.8 1.2-1.5 3.3-2.4 5.2-1.8 2.6.8 3.8 3.6 2.6 6C46 68.2 40 72 40 72z"
        fill="var(--accent-primary)"
        stroke="#49372F"
        strokeWidth="1.6"
      />
    )}
  </svg>
);

export const Mascot: React.FC<MascotProps> = ({
  mood,
  variant,
  size,
  width,
  height,
  animated = false,
  interactive = false,
  className = '',
  style,
  alt,
  onClick,
}) => {
  const resolvedMood: MascotMood = mood || variant || 'love';
  const [fallbackLevel, setFallbackLevel] = useState<0 | 1 | 2>(0);
  const [isTapped, setIsTapped] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; symbol: string; left: string; size: number }[]>([]);

  useEffect(() => {
    setFallbackLevel(0);
  }, [resolvedMood]);

  const resolvedAlt = alt || DEFAULT_ALTS[resolvedMood] || 'Медвежонок Бин Lovia';
  const primarySrc = `/mascot/${resolvedMood}.png`;
  const bundledFallbackSrc = FALLBACK_BUNDLED_IMAGES[resolvedMood] || bearLoveUrl;

  const currentSrc = fallbackLevel === 0 ? primarySrc : bundledFallbackSrc;

  const w = width ?? size;
  const h = height ?? size;

  const isClickable = interactive || Boolean(onClick);

  const handleClick = () => {
    if (interactive) {
      setIsTapped(true);
      telegramService.hapticImpact('light');

      const now = Date.now();
      const newHearts = [
        { id: now + 1, symbol: '♥', left: '22%', size: 15 },
        { id: now + 2, symbol: '✦', left: '52%', size: 13 },
        { id: now + 3, symbol: '♡', left: '76%', size: 16 },
      ];
      setHearts((prev) => [...prev, ...newHearts]);

      setTimeout(() => {
        setHearts((prev) => prev.filter((item) => !newHearts.some((nh) => nh.id === item.id)));
      }, 850);

      setTimeout(() => setIsTapped(false), 500);
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
      className={`lovia-mascot lovia-mascot--${resolvedMood} ${
        animated ? 'lovia-mascot--animated' : ''
      } ${isClickable ? 'lovia-mascot--interactive' : 'lovia-mascot--decorative'} ${
        isTapped ? 'lovia-mascot--tapped' : ''
      } ${className}`}
      style={styleObj}
      onClick={isClickable ? handleClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? resolvedAlt : undefined}
    >
      {fallbackLevel < 2 ? (
        <img
          src={currentSrc}
          alt={resolvedAlt}
          className="lovia-mascot__img"
          loading="lazy"
          draggable={false}
          onError={() => {
            setFallbackLevel((prev) => (prev === 0 ? 1 : 2));
          }}
        />
      ) : (
        <FallbackBearSvg mood={resolvedMood} />
      )}
      {hearts.map((item) => (
        <span
          key={item.id}
          className="lovia-mascot__float-heart"
          style={{ left: item.left, fontSize: `${item.size}px` }}
          aria-hidden="true"
        >
          {item.symbol}
        </span>
      ))}
    </div>
  );
};
