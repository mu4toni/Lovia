import React from 'react';
import './SketchDecor.css';

export interface SketchUnderlineProps {
  className?: string;
  width?: string | number;
  height?: number;
  color?: string;
  variant?: 'wave' | 'flourish' | 'straight';
}

/** Decorative underlines were removed: titles stay clean. Kept as a no-op so call sites compile. */
export const SketchUnderline: React.FC<SketchUnderlineProps> = () => null;

export type SketchDoodleType = 'heart' | 'heart-filled' | 'star' | 'sparkle' | 'swirl';

export interface SketchDoodleProps {
  type: SketchDoodleType;
  size?: number;
  color?: string;
  className?: string;
}

export const SketchDoodle: React.FC<SketchDoodleProps> = ({
  type,
  size = 14,
  color = 'currentColor',
  className = '',
}) => {
  const renderDoodle = () => {
    switch (type) {
      case 'heart-filled':
        return (
          <path
            d="M8 13.5C7.3 12.8 1.8 8.8 1.8 5C1.8 2.8 3.5 1.5 5.3 1.5C6.5 1.5 7.4 2.2 8 3.1C8.6 2.2 9.5 1.5 10.7 1.5C12.5 1.5 14.2 2.8 14.2 5C14.2 8.8 8.7 12.8 8 13.5Z"
            fill={color}
          />
        );
      case 'heart':
        return (
          <path
            d="M8 13.5C7.3 12.8 1.8 8.8 1.8 5C1.8 2.8 3.5 1.5 5.3 1.5C6.5 1.5 7.4 2.2 8 3.1C8.6 2.2 9.5 1.5 10.7 1.5C12.5 1.5 14.2 2.8 14.2 5C14.2 8.8 8.7 12.8 8 13.5Z"
            stroke={color}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      case 'star':
        return (
          <path
            d="M8 1.5C8 4.6 5.2 7.6 1.8 8C5.2 8.4 8 11.4 8 14.5C8 11.4 10.8 8.4 14.2 8C10.8 7.6 8 4.6 8 1.5Z"
            stroke={color}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      case 'sparkle':
        return (
          <>
            <path d="M8 1.5V14.5M1.5 8H14.5" stroke={color} strokeWidth="1.65" strokeLinecap="round" />
            <path d="M3.5 3.5L12.5 12.5M12.5 3.5L3.5 12.5" stroke={color} strokeWidth="1.25" strokeLinecap="round" />
          </>
        );
      case 'swirl':
        return (
          <path
            d="M3 8C3 4.8 5.8 2.5 9 2.5C12.2 2.5 14.2 5.2 13.8 8C13.4 10.8 11 12.8 8.2 12.8C5.4 12.8 4 10.5 4.8 8.5C5.6 6.5 7.8 5.8 9.5 6.8"
            stroke={color}
            strokeWidth="1.55"
            strokeLinecap="round"
          />
        );
    }
  };

  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`sketch-doodle sketch-doodle--${type} ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
      }}
      aria-hidden="true"
    >
      {renderDoodle()}
    </svg>
  );
};

/**
 * Tiny hand-drawn radiating sparkle strokes around active TabBar circle or selected Calendar day.
 * Strictly pointer-events: none.
 */
export const SketchRays: React.FC<{ className?: string; color?: string }> = ({
  className = '',
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 60 60"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`sketch-rays ${className}`}
    aria-hidden="true"
  >
    <path d="M30 2.5L30 7" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M12 9L15.2 12.2" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    <path d="M48 9L44.8 12.2" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    <path d="M4 26L8.2 26.8" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
    <path d="M56 26L51.8 26.8" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);
