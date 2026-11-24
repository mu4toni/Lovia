import React, { useId } from 'react';

export type FlameVisualState = 'unlit' | 'warm' | 'lit' | 'black';

export interface StreakFlameIconProps {
  state: FlameVisualState;
  size?: 'sm' | 'pill' | 'lg';
  onAccent?: boolean;
}

export const StreakFlameIcon: React.FC<StreakFlameIconProps> = ({
  state,
  size = 'sm',
  onAccent = false,
}) => {
  const uid = useId().replace(/:/g, '');
  const outerGradId = `streak-outer-${uid}`;
  const innerGradId = `streak-inner-${uid}`;
  const blackGradId = `streak-black-${uid}`;

  const isPill = size === 'pill';
  const width = isPill ? 16 : size === 'lg' ? 28 : 20;
  const height = isPill ? 18 : size === 'lg' ? 32 : 22;
  const sizeClass =
    size === 'pill'
      ? 'streak-flame--pill'
      : size === 'lg'
      ? 'streak-flame--lg'
      : 'streak-flame--header';

  return (
    <span className={`streak-flame streak-flame--${state} ${sizeClass}`} aria-hidden="true">
      {state === 'lit' && <span className="streak-flame__glow" />}
      <svg
        viewBox="0 0 24 28"
        width={width}
        height={height}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="streak-flame__svg"
      >
        <defs>
          <linearGradient id={outerGradId} x1="12" y1="2" x2="12" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={onAccent ? '#FFF7D6' : '#FFB84D'} />
            <stop offset="55%" stopColor={onAccent ? '#FFE0E5' : '#F05A47'} />
            <stop offset="100%" stopColor={onAccent ? '#FFFFFF' : 'var(--accent-primary)'} />
          </linearGradient>
          <linearGradient id={innerGradId} x1="12" y1="11" x2="12" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={onAccent ? '#FFDF80' : '#FFF4C2'} />
            <stop offset="100%" stopColor={onAccent ? 'var(--accent-primary)' : '#FFB74D'} />
          </linearGradient>
          <linearGradient id={blackGradId} x1="12" y1="3" x2="12" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--streak-black-top)" />
            <stop offset="100%" stopColor="var(--streak-black-bottom)" />
          </linearGradient>
        </defs>

        {/* Tiny floating sparks for warm / lit states */}
        {(state === 'lit' || state === 'warm') && !isPill && (
          <g className="streak-flame__sparks">
            <circle
              cx="5.5"
              cy="7"
              r="1.15"
              fill={state === 'lit' ? '#FFB84D' : 'var(--accent-primary)'}
              className="streak-flame__spark streak-flame__spark--1"
            />
            <circle
              cx="19"
              cy="5.5"
              r="1"
              fill="var(--accent-primary)"
              className="streak-flame__spark streak-flame__spark--2"
            />
          </g>
        )}

        {/* Outer flame body */}
        <path
          className="streak-flame__outer"
          d="M12.6 2.2C12.9 5.8 16.2 7.8 18 11C19.2 13.1 19.8 15.2 19.5 17.7C19 22.1 15.9 25.5 12 25.5C7.9 25.5 4.8 22.2 4.7 18C4.6 14.8 6.2 12.3 7.7 10.4C7.9 11.8 8.7 12.7 9.5 13C8.8 9.6 10 5.3 12.6 2.2Z"
          fill={
            onAccent
              ? state === 'lit'
                ? `url(#${outerGradId})`
                : '#FFFFFF'
              : state === 'lit'
              ? `url(#${outerGradId})`
              : state === 'warm'
              ? 'var(--accent-soft)'
              : state === 'black'
              ? `url(#${blackGradId})`
              : 'none'
          }
          stroke={
            onAccent
              ? '#FFFFFF'
              : state === 'lit'
              ? 'var(--accent-primary)'
              : state === 'warm'
              ? 'var(--accent-primary)'
              : state === 'black'
              ? 'var(--streak-black-stroke)'
              : 'var(--text-cocoa)'
          }
          strokeWidth={onAccent ? '1.3' : '1.7'}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Inner flame core */}
        {(state === 'lit' || state === 'warm' || state === 'black' || onAccent) && (
          <path
            className="streak-flame__inner"
            d="M12.1 12.2C13.3 14.1 15.2 15.7 15.1 18.4C15.1 20.8 13.7 22.6 12 22.6C10.2 22.6 8.9 20.9 8.9 18.6C8.9 16.9 9.8 15.5 10.6 14.5C10.8 15.2 11.1 15.7 11.5 15.8C11.3 14.6 11.5 13.3 12.1 12.2Z"
            fill={
              onAccent
                ? state === 'lit'
                  ? `url(#${innerGradId})`
                  : 'var(--accent-primary)'
                : state === 'lit'
                ? `url(#${innerGradId})`
                : state === 'warm'
                ? 'var(--accent-primary)'
                : 'var(--streak-black-core)'
            }
          />
        )}
      </svg>
    </span>
  );
};
