import React from 'react';
import './CalendarStrip.css';

export interface DateBadgeProps {
  day: number | string;
  month: string;
  highlight?: boolean;
  className?: string;
}

export const DateBadge: React.FC<DateBadgeProps> = ({
  day,
  month,
  highlight = false,
  className = '',
}) => {
  return (
    <div
      className={`glass-date-badge ${
        highlight ? 'glass-date-badge--highlight' : ''
      } ${className}`}
      aria-label={`Дата: ${day} ${month}`}
    >
      <span className="glass-date-badge__month">{month}</span>
      <span className="glass-date-badge__day">{day}</span>
    </div>
  );
};
