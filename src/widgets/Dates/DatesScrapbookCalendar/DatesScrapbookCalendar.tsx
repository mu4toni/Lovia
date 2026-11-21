import React, { useMemo } from 'react';
import { DateMemory } from '../../../types/dates';
import { Icon } from '../../../components/ui/Icon/Icon';
import { SketchRays } from '../../../components/ui/SketchDecor/SketchDecor';
import {
  formatLocalDate,
  isSameDay,
  isToday,
  MONTH_NAMES_RU,
  WEEKDAYS_SHORT_RU,
} from '../../../shared/lib/dateUtils';
import { useSpaceMode } from '../../../hooks/useSpaceMode';
import './DatesScrapbookCalendar.css';

export interface DatesScrapbookCalendarProps {
  memories: DateMemory[];
  viewMonth: Date;
  selectedDate: Date;
  onChangeViewMonth: (nextMonth: Date) => void;
  onSelectDate: (date: Date) => void;
}

interface DayCell {
  date: Date;
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
}

export const DatesScrapbookCalendar: React.FC<DatesScrapbookCalendarProps> = ({
  memories,
  viewMonth,
  selectedDate,
  onChangeViewMonth,
  onSelectDate,
}) => {
  const { isFriendship } = useSpaceMode();

  // Set of YYYY-MM-DD strings that have at least one memory
  const memoryDatesSet = useMemo(() => {
    const set = new Set<string>();
    for (const m of memories) {
      if (m.date) {
        set.add(m.date.slice(0, 10));
      }
    }
    return set;
  }, [memories]);

  const monthTitle = `${MONTH_NAMES_RU[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;

  const cells = useMemo<DayCell[]>(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();

    const list: DayCell[] = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      const num = daysInPrev - i;
      const d = new Date(year, month - 1, num);
      list.push({ date: d, dateStr: formatLocalDate(d), dayNumber: num, isCurrentMonth: false });
    }

    for (let num = 1; num <= daysInMonth; num++) {
      const d = new Date(year, month, num);
      list.push({ date: d, dateStr: formatLocalDate(d), dayNumber: num, isCurrentMonth: true });
    }

    const total = list.length <= 35 ? 35 : 42;
    const trailing = total - list.length;
    for (let num = 1; num <= trailing; num++) {
      const d = new Date(year, month + 1, num);
      list.push({ date: d, dateStr: formatLocalDate(d), dayNumber: num, isCurrentMonth: false });
    }

    return list;
  }, [viewMonth]);

  const handlePrevMonth = () => {
    onChangeViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    onChangeViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
  };

  return (
    <section className="scrapbook-cal" aria-label="Календарь свиданий и планов">
      <div className="scrapbook-cal__header">
        <button
          type="button"
          className="scrapbook-cal__nav-btn"
          onClick={handlePrevMonth}
          aria-label="Предыдущий месяц"
        >
          <Icon name="chevron-left" size={18} />
        </button>

        <h2 className="scrapbook-cal__month-title">
          {monthTitle}{' '}
          <span className="scrapbook-cal__month-heart" aria-hidden="true">
            {isFriendship ? '✦' : '♥'}
          </span>
        </h2>

        <button
          type="button"
          className="scrapbook-cal__nav-btn"
          onClick={handleNextMonth}
          aria-label="Следующий месяц"
        >
          <Icon name="chevron-right" size={18} />
        </button>
      </div>

      <div className="scrapbook-cal__weekdays" aria-hidden="true">
        {WEEKDAYS_SHORT_RU.map((wd) => (
          <span key={wd} className="scrapbook-cal__weekday">
            {wd}
          </span>
        ))}
      </div>

      <div className="scrapbook-cal__grid" role="grid">
        {cells.map((cell) => {
          const isSelected = isSameDay(cell.date, selectedDate);
          const isTod = isToday(cell.date);
          const hasEvent = memoryDatesSet.has(cell.dateStr);

          return (
            <button
              key={cell.dateStr}
              type="button"
              className={`scrapbook-cal__cell ${
                !cell.isCurrentMonth ? 'scrapbook-cal__cell--outside' : ''
              } ${isTod && !isSelected ? 'scrapbook-cal__cell--today' : ''} ${
                isSelected ? 'scrapbook-cal__cell--selected' : ''
              }`}
              onClick={() => {
                if (!cell.isCurrentMonth) {
                  onChangeViewMonth(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
                }
                onSelectDate(cell.date);
              }}
              aria-pressed={isSelected}
              aria-label={`${cell.dayNumber} ${MONTH_NAMES_RU[cell.date.getMonth()]}${
                hasEvent ? ', есть запись' : ''
              }`}
            >
              {isSelected && <SketchRays className="scrapbook-cal__rays" />}
              <span className="scrapbook-cal__num">{cell.dayNumber}</span>
              <span className="scrapbook-cal__mark-slot" aria-hidden="true">
                {hasEvent && (
                  <span
                    className={`scrapbook-cal__event-heart ${
                      isSelected ? 'scrapbook-cal__event-heart--selected' : ''
                    }`}
                  >
                    {isFriendship ? '✦' : '♥'}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
