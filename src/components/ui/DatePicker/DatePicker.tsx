import React, { useState, useEffect, useRef, useId, useMemo } from 'react';
import { Icon } from '../Icon/Icon';
import {
  formatRussianDate,
  parseDateComponents,
  getTodayDateString,
} from '../../../utils/dateCalculations';
import './DatePicker.css';

export interface DatePickerProps {
  value?: string; // Format: 'YYYY-MM-DD'
  onChange: (dateStr: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  minDate?: string; // Format: 'YYYY-MM-DD'
  maxDate?: string; // Format: 'YYYY-MM-DD'
  error?: string;
  hint?: string;
  className?: string;
  id?: string;
  autoFocus?: boolean;
}

const MONTH_NAMES_FULL = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const DatePicker: React.FC<DatePickerProps> = ({
  value = '',
  onChange,
  label,
  placeholder = 'Выберите дату',
  required = false,
  disabled = false,
  minDate,
  maxDate,
  error,
  hint,
  className = '',
  id,
  autoFocus = false,
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const containerRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);

  // Initialize view year and month based on value, maxDate, or today
  const initialDate = useMemo(() => {
    if (value) {
      const { year, month } = parseDateComponents(value);
      if (year && month) return { year, month: month - 1 };
    }
    if (maxDate) {
      const { year, month } = parseDateComponents(maxDate);
      if (year && month) return { year, month: month - 1 };
    }
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  }, [value, maxDate]);

  const [viewYear, setViewYear] = useState<number>(initialDate.year);
  const [viewMonth, setViewMonth] = useState<number>(initialDate.month);

  // Sync view when value or initialDate changes
  useEffect(() => {
    if (value) {
      const { year, month } = parseDateComponents(value);
      if (year && month) {
        setViewYear(year);
        setViewMonth(month - 1);
      }
    }
  }, [value]);

  // Close calendar when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Year range for quick select (from 1950 to maxYear or 2035)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const maxYearNum = maxDate ? parseDateComponents(maxDate).year : currentYear + 10;
    const minYearNum = minDate ? parseDateComponents(minDate).year : 1960;
    const startYear = Math.max(1950, Math.min(minYearNum, currentYear - 30));
    const endYear = Math.max(currentYear + 5, maxYearNum);

    const years: number[] = [];
    for (let y = endYear; y >= startYear; y--) {
      years.push(y);
    }
    return years;
  }, [minDate, maxDate]);

  // Helper to check if a specific date is disabled
  const isDateDisabled = (dateStr: string): boolean => {
    if (maxDate && dateStr > maxDate) return true;
    if (minDate && dateStr < minDate) return true;
    return false;
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((prev) => prev - 1);
      setViewMonth(11);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((prev) => prev + 1);
      setViewMonth(0);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const selectedDateStr = `${viewYear}-${mStr}-${dStr}`;

    if (isDateDisabled(selectedDateStr)) return;

    onChange(selectedDateStr);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const todayStr = getTodayDateString();
    if (!isDateDisabled(todayStr)) {
      onChange(todayStr);
      const { year, month } = parseDateComponents(todayStr);
      setViewYear(year);
      setViewMonth(month - 1);
      setIsOpen(false);
    }
  };

  const handleSelectYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    const dStr = String(d.getDate()).padStart(2, '0');
    const yesterdayStr = `${d.getFullYear()}-${mStr}-${dStr}`;

    if (!isDateDisabled(yesterdayStr)) {
      onChange(yesterdayStr);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setIsOpen(false);
    }
  };

  // Month grid calculation
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // 0: Mon, 6: Sun
    const leadingBlanks = (firstDayOfMonth.getDay() + 6) % 7;

    const cells: {
      type: 'blank' | 'day';
      day?: number;
      dateStr?: string;
      isSelected?: boolean;
      isToday?: boolean;
      isDisabled?: boolean;
    }[] = [];

    // Leading blanks
    for (let i = 0; i < leadingBlanks; i++) {
      cells.push({ type: 'blank' });
    }

    const todayStr = getTodayDateString();

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const mStr = String(viewMonth + 1).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      const dateStr = `${viewYear}-${mStr}-${dStr}`;

      const isSelected = value === dateStr;
      const isToday = dateStr === todayStr;
      const isDisabled = isDateDisabled(dateStr);

      cells.push({
        type: 'day',
        day,
        dateStr,
        isSelected,
        isToday,
        isDisabled,
      });
    }

    return cells;
  }, [viewYear, viewMonth, value, minDate, maxDate]);

  const displayDateText = value ? formatRussianDate(value) : '';

  return (
    <div
      ref={containerRef}
      className={`date-picker ${className} ${disabled ? 'date-picker--disabled' : ''} ${
        error ? 'date-picker--error' : ''
      }`}
    >
      {label && (
        <label htmlFor={inputId} className="date-picker__label">
          {label}
        </label>
      )}

      {/* Main Trigger Input Button */}
      <button
        id={inputId}
        type="button"
        disabled={disabled}
        autoFocus={autoFocus}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`date-picker__trigger ${
          isOpen ? 'date-picker__trigger--open' : ''
        } ${!displayDateText ? 'date-picker__trigger--placeholder' : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-required={required}
        aria-label={label || placeholder}
      >
        <span className="date-picker__display-text">
          {displayDateText || placeholder}
        </span>
        <span className="date-picker__icon-wrap" aria-hidden="true">
          <Icon name="calendar" size={16} className="date-picker__icon" />
        </span>
      </button>

      {/* Calendar Dropdown Panel */}
      {isOpen && (
        <div
          className="date-picker__dropdown"
          role="dialog"
          aria-modal="true"
          aria-label="Календарь для выбора даты"
        >
          {/* Header: Month/Year Dropdown Selectors and Navigation Arrows */}
          <div className="date-picker__header">
            <button
              type="button"
              className="date-picker__nav-btn"
              onClick={handlePrevMonth}
              title="Предыдущий месяц"
              aria-label="Предыдущий месяц"
            >
              <Icon name="chevron-left" size={16} />
            </button>

            <div className="date-picker__selectors">
              {/* Month Select */}
              <select
                className="date-picker__select date-picker__select--month"
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                aria-label="Выбор месяца"
              >
                {MONTH_NAMES_FULL.map((name, idx) => (
                  <option key={idx} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Year Select */}
              <select
                className="date-picker__select date-picker__select--year"
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                aria-label="Выбор года"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="date-picker__nav-btn"
              onClick={handleNextMonth}
              title="Следующий месяц"
              aria-label="Следующий месяц"
            >
              <Icon name="chevron-right" size={16} />
            </button>
          </div>

          {/* Weekday Names Header */}
          <div className="date-picker__weekdays" aria-hidden="true">
            {WEEKDAYS_SHORT.map((wd) => (
              <span key={wd} className="date-picker__weekday">
                {wd}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="date-picker__grid" role="grid" aria-label="Сетка дней">
            {calendarCells.map((cell, idx) => {
              if (cell.type === 'blank') {
                return (
                  <div
                    key={`blank-${idx}`}
                    className="date-picker__cell date-picker__cell--blank"
                    aria-hidden="true"
                  />
                );
              }

              const { day, dateStr, isSelected, isToday, isDisabled } = cell;

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => day && handleSelectDay(day)}
                  className={`date-picker__day-btn ${
                    isSelected ? 'date-picker__day-btn--selected' : ''
                  } ${isToday && !isSelected ? 'date-picker__day-btn--today' : ''} ${
                    isDisabled ? 'date-picker__day-btn--disabled' : ''
                  }`}
                  aria-pressed={isSelected}
                  aria-disabled={isDisabled}
                  aria-label={`${day} ${MONTH_NAMES_FULL[viewMonth]} ${viewYear}${
                    isToday ? ', сегодня' : ''
                  }${isSelected ? ', выбрано' : ''}${isDisabled ? ', недоступно' : ''}`}
                >
                  <span className="date-picker__day-number">{day}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Presets Footer */}
          <div className="date-picker__footer">
            <div className="date-picker__quick-actions">
              <button
                type="button"
                className="date-picker__quick-btn"
                onClick={handleSelectYesterday}
                disabled={isDateDisabled(
                  new Date(Date.now() - 86400000).toISOString().split('T')[0]
                )}
              >
                Вчера
              </button>
              <button
                type="button"
                className="date-picker__quick-btn"
                onClick={handleSelectToday}
                disabled={isDateDisabled(getTodayDateString())}
              >
                Сегодня
              </button>
            </div>

            <button
              type="button"
              className="date-picker__close-btn"
              onClick={() => setIsOpen(false)}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {error && (
        <span className="date-picker__error-text" role="alert">
          {error}
        </span>
      )}

      {hint && !error && (
        <span className="date-picker__hint-text">{hint}</span>
      )}
    </div>
  );
};
