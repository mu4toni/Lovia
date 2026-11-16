import { MemorableDate } from '../types/relationship';
import { calculateDaysTogether, getAnniversaryInfo } from '../utils/dateCalculations';
import { coupleService } from './coupleService';

export type CelebrationType = 'anniversary' | 'milestone' | 'monthiversary' | 'memorable_date';

export interface CelebrationEvent {
  key: string;
  type: CelebrationType;
  title: string;
  subtitle?: string;
  dateStr: string; // YYYY-MM-DD
  yearsTogether?: number;
  daysTogether?: number;
  monthsTogether?: number;
  burstCount: number; // rockets count (e.g. 6-7 for anniversary/milestone, 3 for monthiversary)
}

const STORAGE_KEY = 'lovia_celebrated_events_v1';
const ROUND_MILESTONES = [50, 100, 200, 300, 400, 500, 777, 1000, 1500, 2000, 2500, 3000, 5000];

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks whether today is a celebration date (Anniversary, Round Milestone, Monthiversary, or Memorable Date).
 * Strictly excludes daysTogether === 0 (day of registration/start).
 */
export function checkTodayCelebration(
  startDate: string,
  memorableDates: MemorableDate[] = []
): CelebrationEvent | null {
  if (!startDate) return null;

  const today = new Date();
  const todayStr = formatLocalDate(today);
  const daysTogether = calculateDaysTogether(startDate);

  // 1. Never celebrate on day 0
  if (daysTogether <= 0) {
    return null;
  }

  const anniversary = getAnniversaryInfo(startDate);

  const isFriendship = coupleService.getSpaceType() === 'friendship';

  // 2. Yearly Anniversary (1 year, 2 years, etc.)
  if (anniversary.isToday && anniversary.yearsTogether >= 1 && daysTogether >= 365) {
    return {
      key: `anniversary_${anniversary.yearsTogether}`,
      type: 'anniversary',
      title: isFriendship
        ? `С ${anniversary.yearsTogether}-й годовщиной дружбы!`
        : `С ${anniversary.yearsTogether}-й годовщиной!`,
      subtitle: isFriendship
        ? `${daysTogether} дней крепкой дружбы и взаимной поддержки`
        : `${daysTogether} дней счастливой совместной истории`,
      dateStr: todayStr,
      yearsTogether: anniversary.yearsTogether,
      daysTogether,
      burstCount: 7,
    };
  }

  // 3. Round Milestone in days (100, 200, 300, 500, 777, 1000...)
  if (ROUND_MILESTONES.includes(daysTogether)) {
    return {
      key: `milestone_${daysTogether}`,
      type: 'milestone',
      title: isFriendship
        ? `Сегодня ровно ${daysTogether} дней дружбы!`
        : `Сегодня ровно ${daysTogether} дней вместе!`,
      subtitle: isFriendship
        ? 'Прекрасная круглая веха вашей дружбы'
        : 'Прекрасная круглая веха вашей любви',
      dateStr: todayStr,
      daysTogether,
      burstCount: 6,
    };
  }

  // 4. Annual Memorable Date (from list)
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  for (const mDate of memorableDates) {
    if (!mDate.date) continue;
    const dateObj = new Date(mDate.date);
    if (isNaN(dateObj.getTime())) continue;

    const isMatch = mDate.isAnnual
      ? dateObj.getMonth() === todayMonth && dateObj.getDate() === todayDay
      : formatLocalDate(dateObj) === todayStr;

    if (isMatch) {
      return {
        key: `memorable_${mDate.id}`,
        type: 'memorable_date',
        title: `«${mDate.title}» — сегодня памятный день!`,
        subtitle: mDate.description || 'Особый момент вашей истории',
        dateStr: todayStr,
        burstCount: 5,
      };
    }
  }

  // 5. Monthiversary during first year (daysTogether > 0 and < 365)
  if (daysTogether > 0 && daysTogether < 365) {
    const startObj = new Date(startDate);
    if (!isNaN(startObj.getTime())) {
      const startDay = startObj.getDate();
      const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const isDayMatch = todayDay === startDay || (startDay > daysInCurrentMonth && todayDay === daysInCurrentMonth);

      if (isDayMatch) {
        const monthsTogether =
          (today.getFullYear() - startObj.getFullYear()) * 12 +
          (today.getMonth() - startObj.getMonth());

        if (monthsTogether > 0 && monthsTogether < 12) {
          return {
            key: `monthiversary_${monthsTogether}`,
            type: 'monthiversary',
            title: `${monthsTogether} мес. вместе!`,
            subtitle: `${daysTogether} дней непрерывной истории`,
            dateStr: todayStr,
            monthsTogether,
            daysTogether,
            burstCount: 4,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Checks celebration on today's date. If new (has NOT been celebrated today yet),
 * records it to localStorage and returns the celebration event.
 * If already consumed today, returns null so fireworks never repeat on page reloads/tab changes.
 */
export function consumeTodayCelebrationIfNew(
  startDate: string,
  memorableDates: MemorableDate[] = []
): CelebrationEvent | null {
  const celebration = checkTodayCelebration(startDate, memorableDates);
  if (!celebration) return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const celebrated: Record<string, boolean> = raw ? JSON.parse(raw) : {};
    const fullKey = `${celebration.key}_${celebration.dateStr}`;

    if (celebrated[fullKey]) {
      return null; // Already celebrated today
    }

    // Mark as consumed for today
    celebrated[fullKey] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(celebrated));
    return celebration;
  } catch (err) {
    console.warn('celebrationService: Failed to access localStorage', err);
    return celebration;
  }
}

/**
 * Trigger manual celebration event for testing (e.g. from DemoStateSwitcher).
 */
export function triggerTestCelebration(type: CelebrationType = 'milestone'): CelebrationEvent {
  const todayStr = formatLocalDate(new Date());
  const testEvent: CelebrationEvent = {
    key: `test_${Date.now()}`,
    type,
    title:
      type === 'anniversary'
        ? 'С 1-й годовщиной!'
        : type === 'monthiversary'
        ? '6 мес. вместе!'
        : 'Праздничный салют в честь вашей пары! 🎆',
    subtitle: 'Тестовый запуск праздничной анимации',
    dateStr: todayStr,
    burstCount: type === 'monthiversary' ? 4 : 6,
  };

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('lovia_celebrate', { detail: testEvent }));
  }

  return testEvent;
}

/**
 * Clears celebration history from localStorage (called on couple dissolution or reset).
 */
export function clearCelebrationHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('celebrationService: Failed to clear celebration history', err);
  }
}
