import React, { useState } from 'react';
import { Icon } from '../../ui/Icon/Icon';
import { DatePicker } from '../../ui/DatePicker/DatePicker';
import './DeadlineSelector.css';

export type DeadlineMode = 'none' | 'today' | 'custom';

export interface DeadlineValue {
  mode: 'none' | 'today' | 'custom' | 'date';
  date?: Date;
  time?: string;
  dueLabel: string;
}

interface DeadlineSelectorProps {
  value: DeadlineValue;
  onChange: (val: DeadlineValue) => void;
  label?: string;
  dueTime?: string;
  onDueTimeChange?: (time: string) => void;
}

const MONTH_NAMES_GENITIVE_RU = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

const toYMD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const DeadlineSelector: React.FC<DeadlineSelectorProps> = ({
  value,
  onChange,
  label = 'Срок выполнения',
  dueTime: externalDueTime,
  onDueTimeChange,
}) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const todayYMD = toYMD(today);
  const tomorrowYMD = toYMD(tomorrow);
  const selectedYMD = value.date ? toYMD(value.date) : '';

  // Effective time: external prop takes precedence if provided, otherwise value.time
  const currentTime = externalDueTime !== undefined ? externalDueTime : (value.time || '');

  // Strictly mutually exclusive mode calculation:
  // 1) none: mode === 'none' or no date selected
  // 2) today: mode === 'today' (or legacy date === today with no custom time)
  // 3) custom: mode === 'custom' (or legacy date !== today)
  const isNone = value.mode === 'none' || (!value.date && value.mode !== 'today' && value.mode !== 'custom');
  const isToday = !isNone && (value.mode === 'today' || (value.mode === 'date' && selectedYMD === todayYMD && !currentTime));
  const isCustom = !isNone && !isToday && (value.mode === 'custom' || value.mode === 'date');

  const buildLabel = (d?: Date, t?: string): string => {
    if (!d) return 'Без срока';
    const ymd = toYMD(d);
    let base = '';
    if (ymd === todayYMD) base = 'Сегодня';
    else if (ymd === tomorrowYMD) base = 'Завтра';
    else {
      base = `${d.getDate()} ${MONTH_NAMES_GENITIVE_RU[d.getMonth()]}`;
    }
    return t ? `${base} · ${t}` : base;
  };

  const handleSelectNone = () => {
    setIsDatePickerOpen(false);
    onChange({
      mode: 'none',
      date: undefined,
      time: undefined,
      dueLabel: 'Без срока',
    });
    if (onDueTimeChange) {
      onDueTimeChange('');
    }
  };

  const handleToggleToday = () => {
    if (isToday) {
      handleSelectNone();
    } else {
      setIsDatePickerOpen(false);
      const d = new Date(today);
      onChange({
        mode: 'today',
        date: d,
        time: undefined,
        dueLabel: 'Сегодня',
      });
      if (onDueTimeChange) {
        onDueTimeChange('');
      }
    }
  };

  const handleToggleCustom = () => {
    if (isCustom) {
      handleSelectNone();
    } else {
      setIsDatePickerOpen(true);
      const d = value.date || new Date(tomorrow);
      const t = currentTime || undefined;
      onChange({
        mode: 'custom',
        date: d,
        time: t,
        dueLabel: buildLabel(d, t),
      });
    }
  };

  const handleCustomDateChange = (dateStr: string) => {
    if (!dateStr) return;
    const parts = dateStr.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const t = currentTime || undefined;
    onChange({
      mode: 'custom',
      date: d,
      time: t,
      dueLabel: buildLabel(d, t),
    });
  };

  const handleTimeChange = (newTime: string) => {
    const d = value.date || new Date(today);
    const trimmedTime = newTime ? newTime.trim() : undefined;
    onChange({
      mode: 'custom',
      date: d,
      time: trimmedTime,
      dueLabel: buildLabel(d, trimmedTime),
    });
    if (onDueTimeChange) {
      onDueTimeChange(trimmedTime || '');
    }
  };

  // Button 2 label text: shows custom selected date or "Выбрать дату"
  const customLabel = isCustom && value.date
    ? (toYMD(value.date) === tomorrowYMD
        ? 'Завтра'
        : `${value.date.getDate()} ${MONTH_NAMES_GENITIVE_RU[value.date.getMonth()]}`)
    : 'Выбрать дату';

  return (
    <div className="deadline-chips-selector">
      {/* Header Row: Label on left, compact status + reset on right */}
      <div className="deadline-header-row">
        <label className="create-form-label">{label}</label>
        <div className="deadline-status-wrap">
          {!isNone && (
            <>
              <span className="deadline-status-pill deadline-status-pill--active">
                Срок: {buildLabel(value.date, currentTime)}
              </span>
              <button
                type="button"
                className="deadline-clear-btn"
                onClick={handleSelectNone}
                title="Сбросить срок (Без срока)"
                aria-label="Сбросить срок"
              >
                ×
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2 Full-width Spacious Chips (Strictly mutually exclusive) */}
      <div className="deadline-chips-row deadline-chips-row--two" role="radiogroup" aria-label="Срок выполнения">
        <button
          type="button"
          role="radio"
          aria-checked={isToday}
          className={`deadline-chip ${isToday ? 'deadline-chip--active' : ''}`}
          onClick={handleToggleToday}
        >
          <Icon name="calendar" size={14} className="deadline-chip__icon" />
          <span>Сегодня</span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={isCustom}
          className={`deadline-chip deadline-chip--calendar ${
            isCustom ? 'deadline-chip--active' : ''
          }`}
          onClick={handleToggleCustom}
          aria-expanded={isCustom}
        >
          <Icon name="calendar" size={14} className="deadline-chip__icon" />
          <span>{customLabel}</span>
        </button>
      </div>

      {/* DatePicker Dropdown + Time Selector (visible ONLY when 'Выбрать дату' is active) */}
      {(isCustom || isDatePickerOpen) && (
        <div className="deadline-custom-wrap">
          <div className="deadline-datepicker-wrap">
            <DatePicker
              value={selectedYMD || tomorrowYMD}
              onChange={handleCustomDateChange}
              minDate={todayYMD}
              placeholder="Выберите дату"
              autoFocus
            />
          </div>

          {/* Time Selector directly inside custom date selection */}
          <div className="deadline-time-block">
            <div className="deadline-time-label-row">
              <label className="deadline-time-label" htmlFor="deadline-due-time-input">
                Точное время (необязательно)
              </label>
              {currentTime && (
                <button
                  type="button"
                  className="deadline-time-clear-btn"
                  onClick={() => handleTimeChange('')}
                >
                  Сбросить время
                </button>
              )}
            </div>

            <div className="deadline-time-row create-time-row">
              <input
                id="deadline-due-time-input"
                type="time"
                value={currentTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="deadline-time-input create-time-input"
              />
              <div className="deadline-time-presets create-time-presets">
                {['10:00', '14:00', '19:00', '21:00'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleTimeChange(currentTime === preset ? '' : preset)}
                    className={`deadline-time-preset create-time-preset ${
                      currentTime === preset ? 'create-time-preset--active deadline-time-preset--active' : ''
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
