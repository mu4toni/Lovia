import React from 'react';
import './CalendarStrip.css';

export interface CalendarDay {
  date: Date;
  hasEvent?: boolean;
  eventLabel?: string;
}

export interface CalendarStripProps {
  days: CalendarDay[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  className?: string;
}

export const CalendarStrip: React.FC<CalendarStripProps> = ({
  days,
  selectedDate,
  onSelectDate,
  className = '',
}) => {
  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const isToday = (d: Date) => isSameDay(d, new Date());

  const weekdayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  return (
    <div
      className={`calendar-strip ${className}`}
      role="group"
      aria-label="Выбор дня в календаре"
    >
      <div className="calendar-strip__scroll">
        {days.map((item) => {
          const isSelected = isSameDay(item.date, selectedDate);
          const currentDay = item.date.getDate();
          const dayOfWeek = weekdayNames[item.date.getDay()];
          const today = isToday(item.date);

          return (
            <button
              type="button"
              key={item.date.toISOString()}
              onClick={() => onSelectDate(item.date)}
              aria-pressed={isSelected}
              className={`calendar-day ${isSelected ? 'calendar-day--selected' : ''} ${
                today ? 'calendar-day--today' : ''
              }`}
            >
              <span className="calendar-day__weekday">{dayOfWeek}</span>
              <span className="calendar-day__number">{currentDay}</span>
              {item.hasEvent && (
                <span
                  className="calendar-day__dot"
                  title={item.eventLabel || 'Событие'}
                  aria-label={item.eventLabel || 'Событие'}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
