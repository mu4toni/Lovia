export interface AnniversaryInfo {
  anniversaryDate: string; // YYYY-MM-DD
  formattedAnniversaryDate: string;
  daysUntil: number;
  yearsTogether: number;
  isToday: boolean;
  isUpcoming: boolean; // e.g. <= 30 days
  progressPercent: number; // 0..100
  daysPassedInYear: number;
  totalDaysInYear: number;
}

const MONTH_NAMES_RU_GENITIVE = [
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

const MONTH_NAMES_RU_NOMINATIVE = [
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

/**
 * Парсит дату формата YYYY-MM-DD в компоненты года, месяца (1-12) и дня
 */
export function parseDateComponents(dateStr: string): { year: number; month: number; day: number } {
  const parts = dateStr.split('-');
  if (parts.length >= 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return { year, month, day };
    }
  }
  const d = new Date(dateStr);
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  };
}

/**
 * Создает дату в полночь по UTC для корректных вычислений без искажений часовых поясов
 */
export function getUtcMidnight(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Получает текущую локальную дату пользователя в виде полночи UTC
 */
export function getTodayUtcMidnight(asOfDate?: Date): { timestamp: number; year: number; month: number; day: number } {
  const now = asOfDate || new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const timestamp = getUtcMidnight(year, month, day);
  return { timestamp, year, month, day };
}

/**
 * Проверяет, находится ли дата в будущем относительно сегодняшнего дня
 */
export function isFutureDate(dateStr: string, asOfDate?: Date): boolean {
  if (!dateStr) return false;
  const { year, month, day } = parseDateComponents(dateStr);
  const targetUtc = getUtcMidnight(year, month, day);
  const today = getTodayUtcMidnight(asOfDate);
  return targetUtc > today.timestamp;
}

/**
 * Получает сегодняшнюю дату в формате YYYY-MM-DD
 */
export function getTodayDateString(asOfDate?: Date): string {
  const { year, month, day } = getTodayUtcMidnight(asOfDate);
  const m = month < 10 ? `0${month}` : `${month}`;
  const d = day < 10 ? `0${day}` : `${day}`;
  return `${year}-${m}-${d}`;
}

/**
 * Русское склонение числительных: pluralizeRu(5, 'день', 'дня', 'дней')
 */
export function pluralizeRu(n: number, one: string, few: string, many: string): string {
  const absN = Math.abs(Math.floor(n));
  const mod10 = absN % 10;
  const mod100 = absN % 100;

  if (mod100 >= 11 && mod100 <= 19) {
    return many;
  }
  if (mod10 === 1) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return few;
  }
  return many;
}

/**
 * Форматирует дату YYYY-MM-DD в красивый русский формат (например, "8 декабря 2025")
 */
export function formatRussianDate(
  dateStr: string,
  options?: { includeYear?: boolean; shortMonth?: boolean }
): string {
  if (!dateStr) return '';
  const { year, month, day } = parseDateComponents(dateStr);
  const monthName = MONTH_NAMES_RU_GENITIVE[month - 1] || '';
  const includeYear = options?.includeYear !== false;
  return includeYear ? `${day} ${monthName} ${year}` : `${day} ${monthName}`;
}

/**
 * Форматирует месяц и год в родительном падеже (например: "октября 2025 г.")
 */
export function formatMonthYearGenitive(dateStrOrDate: string | Date): string {
  if (!dateStrOrDate) return '2025 г.';
  try {
    let year: number;
    let month: number;
    if (typeof dateStrOrDate === 'string') {
      const parts = parseDateComponents(dateStrOrDate);
      year = parts.year;
      month = parts.month;
    } else {
      year = dateStrOrDate.getFullYear();
      month = dateStrOrDate.getMonth() + 1;
    }
    const monthName = MONTH_NAMES_RU_GENITIVE[month - 1] || 'месяца';
    return `${monthName} ${year} г.`;
  } catch {
    return '2025 г.';
  }
}

/**
 * Рассчитывает точное количество дней вместе от даты начала отношений
 */
export function calculateDaysTogether(startDateStr: string, asOfDate?: Date): number {
  if (!startDateStr) return 0;
  const { year, month, day } = parseDateComponents(startDateStr);
  const startUtc = getUtcMidnight(year, month, day);
  const today = getTodayUtcMidnight(asOfDate);

  if (today.timestamp < startUtc) {
    return 0;
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((today.timestamp - startUtc) / msPerDay);
}

/**
 * Рассчитывает информацию о ближайшей годовщине отношений
 */
export function getAnniversaryInfo(startDateStr: string, asOfDate?: Date): AnniversaryInfo {
  const { year: startYear, month: startMonth, day: startDay } = parseDateComponents(startDateStr);
  const today = getTodayUtcMidnight(asOfDate);
  const startUtc = getUtcMidnight(startYear, startMonth, startDay);

  // Случай, когда дата начала совпадает с сегодняшним днем (0 дней вместе) или в будущем
  const isStartDay = today.timestamp === startUtc;
  const isFuture = today.timestamp < startUtc;

  // Годовщина «сегодня» наступает только если совпали месяц и день, и прошел минимум 1 полный год (today.year > startYear)
  const isToday =
    today.month === startMonth &&
    today.day === startDay &&
    today.year > startYear &&
    !isStartDay &&
    !isFuture;

  let targetYear = today.year;
  const thisYearAnnivUtc = getUtcMidnight(today.year, startMonth, startDay);

  if (isStartDay || isFuture) {
    // В день старта отношений или до него целевая годовщина — ровно через 1 год
    targetYear = startYear + 1;
  } else if (thisYearAnnivUtc < today.timestamp && !isToday) {
    // Если в текущем году дата уже прошла (и сегодня не день годовщины)
    targetYear = today.year + 1;
  }

  const nextAnnivUtc = isToday ? today.timestamp : getUtcMidnight(targetYear, startMonth, startDay);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntil = isToday ? 0 : Math.round((nextAnnivUtc - today.timestamp) / msPerDay);

  const yearsTogether = targetYear - startYear;
  const m = startMonth < 10 ? `0${startMonth}` : `${startMonth}`;
  const d = startDay < 10 ? `0${startDay}` : `${startDay}`;
  const anniversaryDate = `${targetYear}-${m}-${d}`;
  const formattedAnniversaryDate = formatRussianDate(anniversaryDate);

  // Расчет прогресса внутри текущего годового цикла
  const prevYear = targetYear - 1;
  const prevAnnivUtc = getUtcMidnight(prevYear, startMonth, startDay);
  const totalDaysInYear = Math.max(
    365,
    Math.round((getUtcMidnight(targetYear, startMonth, startDay) - prevAnnivUtc) / msPerDay)
  );

  let daysPassedInYear = Math.max(0, Math.round((today.timestamp - prevAnnivUtc) / msPerDay));
  let progressPercent = 0;

  if (isToday) {
    daysPassedInYear = totalDaysInYear;
    progressPercent = 100;
  } else if (isStartDay) {
    // В день старта отношений (0 дней) отсчет только начался: 0% прогресса и 365 (или 366) дней до 1-й годовщины
    daysPassedInYear = 0;
    progressPercent = 0;
  } else {
    progressPercent = Math.min(
      100,
      Math.max(0, Math.round((daysPassedInYear / totalDaysInYear) * 1000) / 10)
    );
  }

  return {
    anniversaryDate,
    formattedAnniversaryDate,
    daysUntil,
    yearsTogether: Math.max(1, yearsTogether),
    isToday,
    isUpcoming: daysUntil > 0 && daysUntil <= 30,
    progressPercent,
    daysPassedInYear,
    totalDaysInYear,
  };
}

export interface NextMemorableOccurrence {
  isAnnual: boolean;
  isToday: boolean;
  daysUntil: number;
  nextDate: string; // YYYY-MM-DD
  formattedNextDate: string;
  occurrenceNumber?: number; // e.g. 1st, 2nd anniversary
  daysAgo?: number; // for non-annual events in the past
}

/**
 * Рассчитывает время до следующего наступления памятной даты или сколько дней назад она была
 */
export function getMemorableDateStatus(
  dateStr: string,
  isAnnual: boolean,
  asOfDate?: Date
): NextMemorableOccurrence {
  const { year: origYear, month: origMonth, day: origDay } = parseDateComponents(dateStr);
  const today = getTodayUtcMidnight(asOfDate);
  const origUtc = getUtcMidnight(origYear, origMonth, origDay);
  const msPerDay = 1000 * 60 * 60 * 24;

  if (!isAnnual) {
    const daysAgo = Math.round((today.timestamp - origUtc) / msPerDay);
    return {
      isAnnual: false,
      isToday: today.timestamp === origUtc,
      daysUntil: Math.max(0, -daysAgo),
      nextDate: dateStr,
      formattedNextDate: formatRussianDate(dateStr),
      daysAgo: Math.max(0, daysAgo),
    };
  }

  // Для ежегодных дат
  const isToday = today.month === origMonth && today.day === origDay;
  let targetYear = today.year;
  const thisYearUtc = getUtcMidnight(today.year, origMonth, origDay);

  if (thisYearUtc < today.timestamp && !isToday) {
    targetYear = today.year + 1;
  }

  const nextUtc = isToday ? today.timestamp : getUtcMidnight(targetYear, origMonth, origDay);
  const daysUntil = isToday ? 0 : Math.round((nextUtc - today.timestamp) / msPerDay);
  const occurrenceNumber = Math.max(1, targetYear - origYear);

  const m = origMonth < 10 ? `0${origMonth}` : `${origMonth}`;
  const d = origDay < 10 ? `0${origDay}` : `${origDay}`;
  const nextDate = `${targetYear}-${m}-${d}`;

  return {
    isAnnual: true,
    isToday,
    daysUntil,
    nextDate,
    formattedNextDate: formatRussianDate(nextDate),
    occurrenceNumber,
  };
}

export { MONTH_NAMES_RU_GENITIVE, MONTH_NAMES_RU_NOMINATIVE };
