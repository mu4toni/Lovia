import React, { useId } from 'react';
import { FlameVisualState } from './StreakFlameIcon';

export interface StreakHeroFlameProps {
  state: FlameVisualState;
}

export const StreakHeroFlame: React.FC<StreakHeroFlameProps> = ({ state }) => {
  const uid = useId().replace(/:/g, '');
  const outerGradId = `hero-flame-outer-${uid}`;
  const innerGradId = `hero-flame-inner-${uid}`;
  const grayOuterId = `hero-flame-gray-outer-${uid}`;
  const grayInnerId = `hero-flame-gray-inner-${uid}`;
  const blackOuterId = `hero-flame-black-outer-${uid}`;

  const isLit = state === 'lit';
  const isWarm = state === 'warm';
  const isBlack = state === 'black';
  const isMuted = state === 'unlit' || isWarm;

  return (
    <div className={`streak-hero-flame streak-hero-flame--${state}`} aria-hidden="true">
      {isLit && <span className="streak-hero-flame__pulse" />}

      <svg
        viewBox="0 0 100 100"
        width="92"
        height="92"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="streak-hero-flame__svg"
      >
        <defs>
          {/* Warm lit strawberry-orange gradient */}
          <linearGradient id={outerGradId} x1="50" y1="12" x2="50" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFC15E" />
            <stop offset="48%" stopColor="#F25D49" />
            <stop offset="100%" stopColor="var(--accent-primary)" />
          </linearGradient>

          {/* Warm golden-peach inner core */}
          <linearGradient id={innerGradId} x1="50" y1="42" x2="50" y2="85" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFF7CC" />
            <stop offset="58%" stopColor="#FFCE6E" />
            <stop offset="100%" stopColor="#FF974D" />
          </linearGradient>

          {/* Calm muted gray for unlit / waiting */}
          <linearGradient id={grayOuterId} x1="50" y1="14" x2="50" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--streak-muted-top)" />
            <stop offset="100%" stopColor="var(--streak-muted-bottom)" />
          </linearGradient>

          <linearGradient id={grayInnerId} x1="50" y1="44" x2="50" y2="85" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--streak-muted-core-top)" />
            <stop offset="100%" stopColor="var(--streak-muted-core-bottom)" />
          </linearGradient>

          {/* Dark charcoal flame for burn-out risk */}
          <linearGradient id={blackOuterId} x1="50" y1="14" x2="50" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--streak-black-top)" />
            <stop offset="100%" stopColor="var(--streak-black-bottom)" />
          </linearGradient>
        </defs>

        {/* Rising sparks (lit state only, GPU transform + opacity) */}
        {isLit && (
          <g className="streak-hero-flame__sparks">
            <circle
              cx="27"
              cy="37"
              r="3"
              fill="#FFBD59"
              className="streak-hero-flame__spark streak-hero-flame__spark--1"
            />
            <circle
              cx="74"
              cy="33"
              r="2.5"
              fill="var(--accent-primary)"
              className="streak-hero-flame__spark streak-hero-flame__spark--2"
            />
            <circle
              cx="57"
              cy="19"
              r="2.2"
              fill="#FFD479"
              className="streak-hero-flame__spark streak-hero-flame__spark--3"
            />
          </g>
        )}

        {/* Layer 1: Hand-drawn outer flame contour */}
        <g className="streak-hero-flame__outer-layer">
          <path
            d="M52.5 13C53.6 25.4 66.2 33 72.4 44.8C76.7 52.8 78.6 60.4 77.2 69.2C74.8 82.4 63.6 90.5 50 90.5C35.8 90.5 24.6 82.2 23.2 69.2C22 57.6 27.6 48.2 33.4 41.2C34.2 46.2 37.2 49.4 40.4 50.6C37.8 38.4 42.6 23.6 52.5 13Z"
            fill={
              isLit
                ? `url(#${outerGradId})`
                : isBlack
                ? `url(#${blackOuterId})`
                : `url(#${grayOuterId})`
            }
            stroke={
              isLit
                ? 'var(--accent-primary)'
                : isBlack
                ? 'var(--streak-black-stroke)'
                : 'var(--streak-muted-stroke)'
            }
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Layer 2: Warm inner flame core (independent smoother rhythm) */}
        <g className="streak-hero-flame__inner-layer">
          <path
            d="M50.6 46C55.2 52.6 61.8 58.6 61.4 68.4C61 77 56.1 83.2 50 83.2C43.6 83.2 38.8 77.2 38.8 69C38.8 62.6 42.2 57.6 45.2 54C46 56.6 47.4 58.2 48.8 58.8C48 54.4 48.6 49.8 50.6 46Z"
            fill={
              isLit
                ? `url(#${innerGradId})`
                : isBlack
                ? 'var(--streak-black-core)'
                : isMuted
                ? `url(#${grayInnerId})`
                : 'none'
            }
          />
          {isLit && (
            <path
              d="M46.4 65.5C45.6 68.4 46.2 72.2 48.4 74.5"
              stroke="#FFFDF0"
              strokeWidth="2.4"
              strokeLinecap="round"
              opacity="0.72"
            />
          )}
        </g>
      </svg>
    </div>
  );
};
