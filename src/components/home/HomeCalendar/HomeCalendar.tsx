import React, { useState, useMemo } from 'react';
import { CalendarViewMode, CoupleEvent, CoupleReminder } from '../../../types';
import { UserCategory } from '../../../types/category';
import { Card } from '../../ui/Card/Card';
import { DateBadge } from '../../ui/CalendarStrip/DateBadge';
import { Icon } from '../../ui/Icon/Icon';
import { Mascot } from '../../ui/Mascot/Mascot';
import { getCardColorStyles } from '../../../utils/colorContrast';
import {
  formatLocalDate,
  isSameDay,
  isToday,
  MONTH_NAMES_RU,
  MONTH_NAMES_GENITIVE_RU,
  WEEKDAYS_SHORT_RU,
} from '../../../shared/lib/dateUtils';
import './HomeCalendar.css';

interface HomeCalendarProps {
  events: CoupleEvent[];
  requests?: CoupleReminder[];
  categories?: UserCategory[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  className?: string;
}

interface CalendarMonthCell {
  date: Date;
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isPrevMonth?: boolean;
  isNextMonth?: boolean;
}

export const HomeCalendar: React.FC<HomeCalendarProps> = ({
  events,
  requests = [],
  categories: _categories = [],
  selectedDate,
  onSelectDate,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');

  // Navigation viewing month (independent from selectedDate)
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  });

  const today = useMemo(() => new Date(), []);
  const selectedDateStr = formatLocalDate(selectedDate);

  // Navigation handlers depending on active viewMode
  const handlePrev = () => {
    if (viewMode === 'month') {
      setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      const prevWeekDate = new Date(selectedDate);
      prevWeekDate.setDate(selectedDate.getDate() - 7);
      setViewMonth(new Date(prevWeekDate.getFullYear(), prevWeekDate.getMonth(), 1));
      onSelectDate(prevWeekDate);
    } else {
      // Day view
      const prevDay = new Date(selectedDate);
      prevDay.setDate(selectedDate.getDate() - 1);
      setViewMonth(new Date(prevDay.getFullYear(), prevDay.getMonth(), 1));
      onSelectDate(prevDay);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    } else if (viewMode === 'week') {
      const nextWeekDate = new Date(selectedDate);
      nextWeekDate.setDate(selectedDate.getDate() + 7);
      setViewMonth(new Date(nextWeekDate.getFullYear(), nextWeekDate.getMonth(), 1));
      onSelectDate(nextWeekDate);
    } else {
      // Day view
      const nextDay = new Date(selectedDate);
      nextDay.setDate(selectedDate.getDate() + 1);
      setViewMonth(new Date(nextDay.getFullYear(), nextDay.getMonth(), 1));
      onSelectDate(nextDay);
    }
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    onSelectDate(now);
  };

  const isViewingCurrentMonth = useMemo(() => {
    const activeDate = viewMode === 'month' ? viewMonth : selectedDate;
    return (
      activeDate.getFullYear() === today.getFullYear() &&
      activeDate.getMonth() === today.getMonth()
    );
  }, [viewMode, viewMonth, selectedDate, today]);

  const headerTitle = useMemo(() => {
    const activeDate = viewMode === 'month' ? viewMonth : selectedDate;
    return `${MONTH_NAMES_RU[activeDate.getMonth()]} ${activeDate.getFullYear()}`;
  }, [viewMode, viewMonth, selectedDate]);

  const prevAriaLabel =
    viewMode === 'month'
      ? 'Предыдущий месяц'
      : viewMode === 'week'
      ? 'Предыдущая неделя'
      : 'Предыдущий день';

  const nextAriaLabel =
    viewMode === 'month'
      ? 'Следующий месяц'
      : viewMode === 'week'
      ? 'Следующая неделя'
      : 'Следующий день';

  // Only active (non-completed) requests should appear on the calendar
  const activeRequests = useMemo(() => {
    return requests.filter((r) => r.status !== 'completed');
  }, [requests]);

  // Convert dated active requests into unified calendar items if they match the date
  const datedRequestsOnDay = useMemo(() => {
    return activeRequests
      .filter((r) => {
        if (!r.dueDate) return false;
        return r.dueDate.startsWith(selectedDateStr);
      })
      .map((r) => ({
        id: `req-${r.id}`,
        title: r.title,
        time: r.dueTime || (r.dueLabel.includes('·') ? r.dueLabel.split('·')[1].trim() : undefined),
        location: undefined as string | undefined,
        categoryColor: r.categoryColor,
        categoryIcon: r.categoryIcon,
        isRequest: true,
        rewardNote: r.rewardNote,
      }));
  }, [activeRequests, selectedDateStr]);

  const dayEvents = useMemo(() => {
    const activeTitles = new Set(activeRequests.map((r) => r.title.trim().toLowerCase()));
    const completedTitles = new Set(
      requests
        .filter((r) => r.status === 'completed')
        .map((r) => r.title.trim().toLowerCase())
    );

    const validEvents = events
      .filter((e) => e.date === selectedDateStr)
      .filter((e) => !completedTitles.has(e.title.trim().toLowerCase()))
      .filter((e) => !activeTitles.has(e.title.trim().toLowerCase()))
      .map((e) => ({
        id: e.id,
        title: e.title,
        time: e.time,
        location: e.location,
        categoryColor: undefined as string | undefined,
        categoryIcon: undefined as string | undefined,
        isRequest: false,
        rewardNote: undefined,
      }));

    return [...validEvents, ...datedRequestsOnDay];
  }, [events, selectedDateStr, datedRequestsOnDay, activeRequests, requests]);

  // Check whether any active reminder or event is scheduled on a given YYYY-MM-DD date
  const completedTitlesSet = useMemo(
    () =>
      new Set(
        requests
          .filter((r) => r.status === 'completed')
          .map((r) => r.title.trim().toLowerCase())
      ),
    [requests]
  );

  const hasItemsOnDate = (dateStr: string): boolean => {
    const hasActiveReminder = activeRequests.some(
      (r) => Boolean(r.dueDate) && r.dueDate!.startsWith(dateStr)
    );
    if (hasActiveReminder) return true;
    return events.some(
      (e) => e.date === dateStr && !completedTitlesSet.has(e.title.trim().toLowerCase())
    );
  };

  // Calculate days of current week (Monday-based)
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    const current = new Date(selectedDate);
    const dayOfWeek = (current.getDay() + 6) % 7;
    const monday = new Date(current);
    monday.setDate(current.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [selectedDate]);

  // Calculate complete month matrix including neighbor months
  const monthCells = useMemo((): CalendarMonthCell[] => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // 0 for Mon, 6 for Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: CalendarMonthCell[] = [];

    // 1. Leading days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(year, month - 1, dayNum);
      cells.push({
        date: d,
        dateStr: formatLocalDate(d),
        dayNumber: dayNum,
        isCurrentMonth: false,
        isPrevMonth: true,
      });
    }

    // 2. Days of current month
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const d = new Date(year, month, dayNum);
      cells.push({
        date: d,
        dateStr: formatLocalDate(d),
        dayNumber: dayNum,
        isCurrentMonth: true,
      });
    }

    // 3. Trailing days from next month (complete to 35 or 42 rows)
    const targetTotal = cells.length <= 35 ? 35 : 42;
    const needed = targetTotal - cells.length;
    for (let dayNum = 1; dayNum <= needed; dayNum++) {
      const d = new Date(year, month + 1, dayNum);
      cells.push({
        date: d,
        dateStr: formatLocalDate(d),
        dayNumber: dayNum,
        isCurrentMonth: false,
        isNextMonth: true,
      });
    }

    return cells;
  }, [viewMonth]);

  const handleSelectMonthCell = (cell: CalendarMonthCell) => {
    if (!cell.isCurrentMonth) {
      setViewMonth(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
    }
    onSelectDate(cell.date);
  };

  return (
    <section className={`home-calendar ${className}`} aria-label="Совместный календарь">
      <Card variant="solid" className="home-calendar__card">
        {/* 1. Header with Month, Arrow Navigation and View Switcher */}
        <div className="home-calendar__header">
          <div className="home-calendar__month-controls">
            <button
              type="button"
              className="home-calendar__arrow-btn"
              onClick={handlePrev}
              aria-label={prevAriaLabel}
              title={prevAriaLabel}
            >
              <Icon name="chevron-left" size={16} />
            </button>

            <span className="home-calendar__month-name" aria-live="polite">
              {headerTitle}
            </span>

            <button
              type="button"
              className="home-calendar__arrow-btn"
              onClick={handleNext}
              aria-label={nextAriaLabel}
              title={nextAriaLabel}
            >
              <Icon name="chevron-right" size={16} />
            </button>
          </div>

          {/* View mode switcher */}
          <div
            className="home-calendar__view-switch"
            role="group"
            aria-label="Режим отображения календаря"
          >
            <button
              type="button"
              className={`home-calendar__view-btn ${
                viewMode === 'day' ? 'home-calendar__view-btn--active' : ''
              }`}
              onClick={() => setViewMode('day')}
              aria-pressed={viewMode === 'day'}
            >
              День
            </button>
            <button
              type="button"
              className={`home-calendar__view-btn ${
                viewMode === 'week' ? 'home-calendar__view-btn--active' : ''
              }`}
              onClick={() => setViewMode('week')}
              aria-pressed={viewMode === 'week'}
            >
              Неделя
            </button>
            <button
              type="button"
              className={`home-calendar__view-btn ${
                viewMode === 'month' ? 'home-calendar__view-btn--active' : ''
              }`}
              onClick={() => setViewMode('month')}
              aria-pressed={viewMode === 'month'}
            >
              Месяц
            </button>
          </div>
        </div>

        {/* Quick jump to Today notice if navigated away from current month */}
        {!isViewingCurrentMonth && (
          <div className="home-calendar__month-notice" role="status">
            <div className="home-calendar__month-notice-content">
              <Icon name="calendar" size={14} className="home-calendar__month-notice-icon" />
              <span className="home-calendar__month-notice-text">
                Просмотр архива или планов другого месяца
              </span>
            </div>
            <button
              type="button"
              className="home-calendar__today-jump-btn"
              onClick={handleJumpToToday}
              aria-label="Вернуться к сегодняшнему дню"
            >
              Сегодня
            </button>
          </div>
        )}

        {/* 2. Calendar Views */}

        {/* Day View */}
        {viewMode === 'day' && (
          <div className="home-calendar__day-view">
            <DateBadge
              day={selectedDate.getDate()}
              month={MONTH_NAMES_RU[selectedDate.getMonth()].slice(0, 3).toUpperCase()}
              highlight
            />
            <div className="home-calendar__day-info">
              <span className="home-calendar__day-weekday">
                {selectedDate.toLocaleDateString('ru-RU', { weekday: 'long' })}
              </span>
              <span className="home-calendar__day-full">
                {selectedDate.getDate()} {MONTH_NAMES_GENITIVE_RU[selectedDate.getMonth()]}{' '}
                {selectedDate.getFullYear()}
              </span>
            </div>
          </div>
        )}

        {/* Week View */}
        {viewMode === 'week' && (
          <div className="home-calendar__week-view" role="grid" aria-label="Дни недели">
            <div className="home-calendar__week-badges">
              {weekDays.map((date) => {
                const dateStr = formatLocalDate(date);
                const isSel = isSameDay(date, selectedDate);
                const isTod = isToday(date);
                const hasItems = hasItemsOnDate(dateStr);
                const dayOfWeek = WEEKDAYS_SHORT_RU[(date.getDay() + 6) % 7];

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => onSelectDate(date)}
                    aria-pressed={isSel}
                    aria-label={`${date.getDate()} ${MONTH_NAMES_RU[date.getMonth()]}${
                      isTod ? ', сегодня' : ''
                    }${isSel ? ', выбрано' : ''}${
                      hasItems ? ', есть напоминания или события' : ''
                    }`}
                    className={`calendar-day ${isSel ? 'calendar-day--selected' : ''} ${
                      isTod ? 'calendar-day--today' : ''
                    }`}
                  >
                    <span className="calendar-day__weekday">{dayOfWeek}</span>
                    <span className="calendar-day__number">{date.getDate()}</span>
                    {hasItems && (
                      <div className="calendar-day__dots" aria-hidden="true">
                        <span className="calendar-day__dot" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Month Grid View */}
        {viewMode === 'month' && (
          <div className="home-calendar__month-view" role="grid" aria-label="Сетка месяца">
            {/* Weekdays table header */}
            <div className="home-calendar__month-weekdays" aria-hidden="true">
              {WEEKDAYS_SHORT_RU.map((wd) => (
                <span key={wd} className="home-calendar__month-th">
                  {wd}
                </span>
              ))}
            </div>

            {/* Complete grid of days */}
            <div className="home-calendar__month-grid">
              {monthCells.map((cell) => {
                const isSel = isSameDay(cell.date, selectedDate);
                const isTod = isToday(cell.date);
                const hasItems = hasItemsOnDate(cell.dateStr);

                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    className={`home-calendar__month-cell ${
                      !cell.isCurrentMonth ? 'home-calendar__month-cell--neighbor' : ''
                    } ${isTod && !isSel ? 'home-calendar__month-cell--today' : ''} ${
                      isSel ? 'home-calendar__month-cell--selected' : ''
                    }`}
                    onClick={() => handleSelectMonthCell(cell)}
                    aria-label={`${cell.dayNumber} ${MONTH_NAMES_RU[cell.date.getMonth()]}${
                      isTod ? ', сегодня' : ''
                    }${isSel ? ', выбрано' : ''}${
                      hasItems ? ', есть напоминания или события' : ''
                    }`}
                  >
                    <span className="home-calendar__month-num">{cell.dayNumber}</span>
                    {hasItems && (
                      <div className="home-calendar__cell-dots" aria-hidden="true">
                        <span className="home-calendar__cell-dot" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}


        {/* 3. Scheduled Events & Reminders for Selected Date */}
        <div className="home-calendar__events-section">
          <div className="home-calendar__events-header">
            <span className="home-calendar__events-title">
              Планы и напоминания на {selectedDate.getDate()}{' '}
              {MONTH_NAMES_GENITIVE_RU[selectedDate.getMonth()]}
            </span>
            <span
              className={`home-calendar__events-count ${
                dayEvents.length > 0 ? 'home-calendar__events-count--has-items' : ''
              }`}
            >
              {dayEvents.length > 0
                ? `${dayEvents.length} ${
                    dayEvents.length === 1 ? 'событие' : 'события'
                  }`
                : 'Нет планов'}
            </span>
          </div>

          {dayEvents.length > 0 ? (
            <div className="home-calendar__events-list">
              {dayEvents.map((item) => {
                const cardStyles = getCardColorStyles(item.categoryColor);

                return (
                  <div
                    key={item.id}
                    className={`home-calendar__event-card ${
                      item.categoryColor ? 'home-calendar__event-card--tinted' : ''
                    }`}
                    style={{
                      backgroundColor: cardStyles.backgroundColor,
                      borderColor: cardStyles.borderColor,
                      color: cardStyles.color,
                    }}
                  >
                    <div className="home-calendar__event-info">
                      <div className="home-calendar__event-title-row">
                        <span
                          className="home-calendar__event-name"
                          style={{ color: cardStyles.color }}
                        >
                          {item.title}
                        </span>
                      </div>
                      <div className="home-calendar__event-meta">
                        {item.time && (
                          <span
                            className="home-calendar__event-meta-item"
                            style={{ color: cardStyles.colorSecondary }}
                          >
                            <Icon
                              name="clock"
                              size={13}
                              style={{ color: cardStyles.colorTertiary }}
                            />
                            {item.time}
                          </span>
                        )}
                        {item.location && (
                          <span
                            className="home-calendar__event-meta-item"
                            style={{ color: cardStyles.colorSecondary }}
                          >
                            <Icon
                              name="pin"
                              size={13}
                              style={{ color: cardStyles.colorTertiary }}
                            />
                            {item.location}
                          </span>
                        )}
                        {item.isRequest && (
                          <span
                            className="home-calendar__event-meta-item home-calendar__event-req-tag"
                            style={{
                              backgroundColor: cardStyles.urgencyBg,
                              color: cardStyles.color,
                            }}
                          >
                            Напоминание пары
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="home-calendar__empty-events">
              <Mascot
                name={today.getHours() >= 21 ? '40_sleeping_moon' : '34_lying_dreaming'}
                size={52}
              />
              <span>День свободен — отличное время для совместного отдыха</span>
            </div>
          )}
        </div>
      </Card>
    </section>
  );
};
