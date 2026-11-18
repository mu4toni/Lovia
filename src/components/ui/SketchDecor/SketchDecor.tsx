import React from 'react';
import './SketchDecor.css';

export interface SketchUnderlineProps {
  className?: string;
  width?: string | number;
  height?: number;
  color?: string;
  variant?: 'wave' | 'flourish' | 'straight';
}

export const SketchUnderline: React.FC<SketchUnderlineProps> = ({
  className = '',
  width = '100%',
  height = 8,
  color = 'currentColor',
  variant = 'wave',
}) => {
  const renderPath = () => {
    switch (variant) {
      case 'flourish':
        // Gentle wave ending in a delicate little loop/curl
        return 'M2 6C28 1.5 58 7.5 88 3C102 1 112 1.5 118 4.5C122 6.5 119 8 114 7.5C108 7 109 4 114 3.5';
      case 'straight':
        // Organic hand-drawn stroke with slight human imperfection
        return 'M2 4.5C32 3.8 68 5.2 126 4';
      case 'wave':
      default:
        // Gentle warm wave like a cozy ink stroke in a diary
        return 'M2 5.5C24 2.5 52 7.2 82 3.2C102 0.8 116 5.8 126 3.8';
    }
  };

  return (
    <svg
      viewBox="0 0 128 9"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`sketch-underline sketch-underline--${variant} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: `${height}px`,
      }}
      aria-hidden="true"
    >
      <path
        d={renderPath()}
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export type SketchDoodleType = 'heart' | 'star' | 'sparkle' | 'swirl';

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
      case 'heart':
        return (
          <path
            d="M8 13.5C7.3 12.8 1.8 8.8 1.8 5C1.8 2.8 3.5 1.5 5.3 1.5C6.5 1.5 7.4 2.2 8 3.1C8.6 2.2 9.5 1.5 10.7 1.5C12.5 1.5 14.2 2.8 14.2 5C14.2 8.8 8.7 12.8 8 13.5Z"
            stroke={color}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      case 'star':
        return (
          <path
            d="M8 1.5C8 4.6 5.2 7.6 1.8 8C5.2 8.4 8 11.4 8 14.5C8 11.4 10.8 8.4 14.2 8C10.8 7.6 8 4.6 8 1.5Z"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      case 'sparkle':
        return (
          <>
            <path d="M8 1.5V14.5M1.5 8H14.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
            <path d="M3.5 3.5L12.5 12.5M12.5 3.5L3.5 12.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
          </>
        );
      case 'swirl':
        return (
          <path
            d="M3 8C3 4.8 5.8 2.5 9 2.5C12.2 2.5 14.2 5.2 13.8 8C13.4 10.8 11 12.8 8.2 12.8C5.4 12.8 4 10.5 4.8 8.5C5.6 6.5 7.8 5.8 9.5 6.8"
            stroke={color}
            strokeWidth="1.5"
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
