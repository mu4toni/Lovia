import React, { useEffect, useState } from 'react';
import { pluralizeRu } from '../../../utils/dateCalculations';
import './AnniversaryProgressBar.css';

export interface AnniversaryProgressBarProps {
  progressPercent: number; // 0..100
  daysUntil: number;
  isToday: boolean;
  yearsTogether?: number;
  className?: string;
  hideCaption?: boolean;
}

export const AnniversaryProgressBar: React.FC<AnniversaryProgressBarProps> = ({
  progressPercent,
  daysUntil,
  isToday,
  yearsTogether,
  className = '',
  hideCaption = false,
}) => {
  const [animatedWidth, setAnimatedWidth] = useState(0);

  useEffect(() => {
    // Smooth entry animation for the progress bar
    const timer = setTimeout(() => {
      setAnimatedWidth(Math.min(100, Math.max(0, progressPercent)));
    }, 100);
    return () => clearTimeout(timer);
  }, [progressPercent]);

  const daysLabel = pluralizeRu(daysUntil, 'день', 'дня', 'дней');

  let caption = '';
  if (isToday) {
    caption = `Сегодня годовщина`;
  } else if (daysUntil <= 30) {
    caption = `До годовщины — ${daysUntil} ${daysLabel}`;
  } else {
    caption = `До ${yearsTogether ? `${yearsTogether}-й ` : ''}годовщины — ${daysUntil} ${daysLabel}`;
  }

  return (
    <div
      className={`anniversary-progress ${className}`}
      role="progressbar"
      aria-valuenow={animatedWidth}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Прогресс до годовщины: ${animatedWidth}%`}
    >
      <div className="anniversary-progress__track">
        <div
          className={`anniversary-progress__fill ${
            isToday ? 'anniversary-progress__fill--celebrate' : ''
          }`}
          style={{ width: `${animatedWidth}%` }}
        >
          {/* Subtle gleam marker at the end of the progress */}
          <span className="anniversary-progress__marker" aria-hidden="true" />
        </div>
      </div>

      {!hideCaption && (
        <div className="anniversary-progress__caption-row">
          <span className="anniversary-progress__caption">{caption}</span>
          <span className="anniversary-progress__percent">{Math.round(animatedWidth)}%</span>
        </div>
      )}
    </div>
  );
};
