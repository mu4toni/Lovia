import type {
  MemorableDate,
  CreateMemorableDateInput,
  UpdateMemorableDateInput,
} from '../types/relationship';
import { coupleService } from './coupleService';

const STORAGE_START_DATE_KEY = 'lovia_relationship_start_date_v1';
const STORAGE_MEMORABLE_DATES_KEY = 'lovia_memorable_dates_v1';

export const initialStartDate = '2025-12-08';

export const initialMemorableDates: MemorableDate[] = [
  {
    id: 'mdate-1',
    title: 'Первое знакомство',
    date: '2025-10-14',
    description: 'Случайная встреча за кофе в книжном на Покровке',
    isAnnual: true,
    createdAt: '2025-10-14T15:30:00.000Z',
  },
  {
    id: 'mdate-2',
    title: 'Первый поцелуй',
    date: '2025-11-20',
    description: 'Под тихим ночным снегопадом у Патриарших прудов',
    isAnnual: true,
    createdAt: '2025-11-20T21:45:00.000Z',
  },
  {
    id: 'mdate-3',
    title: 'Начало отношений',
    date: '2025-12-08',
    description: 'Тот самый вечер, когда мы поняли, что это навсегда',
    isAnnual: true,
    createdAt: '2025-12-08T19:00:00.000Z',
  },
  {
    id: 'mdate-4',
    title: 'Поездка на маяк',
    date: '2026-06-15',
    description: 'Встретили рассвет на скалистом берегу залива',
    isAnnual: false,
    createdAt: '2026-06-15T05:00:00.000Z',
  },
  {
    id: 'mdate-5',
    title: 'День рождения Алисы',
    date: '2026-08-22',
    description: 'Самый счастливый праздник лета',
    isAnnual: true,
    createdAt: '2026-08-22T00:00:00.000Z',
  },
];

class RelationshipService {
  private notify() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lovia_relationship_updated'));
    }
  }

  getStartDate(): string {
    try {
      const stored = localStorage.getItem(STORAGE_START_DATE_KEY);
      if (stored) return stored;
      if (coupleService.isDemoCouple()) {
        localStorage.setItem(STORAGE_START_DATE_KEY, initialStartDate);
        return initialStartDate;
      }
      const todayStr = new Date().toISOString().split('T')[0];
      localStorage.setItem(STORAGE_START_DATE_KEY, todayStr);
      return todayStr;
    } catch {
      return coupleService.isDemoCouple() ? initialStartDate : new Date().toISOString().split('T')[0];
    }
  }

  setStartDate(newDate: string): string {
    try {
      localStorage.setItem(STORAGE_START_DATE_KEY, newDate);
    } catch (e) {
      console.warn('Failed to save start date:', e);
    }
    this.notify();
    return newDate;
  }

  getMemorableDates(): MemorableDate[] {
    try {
      const stored = localStorage.getItem(STORAGE_MEMORABLE_DATES_KEY);
      if (!stored) {
        if (coupleService.isDemoCouple()) {
          localStorage.setItem(STORAGE_MEMORABLE_DATES_KEY, JSON.stringify(initialMemorableDates));
          return [...initialMemorableDates];
        }
        localStorage.setItem(STORAGE_MEMORABLE_DATES_KEY, JSON.stringify([]));
        return [];
      }
      return JSON.parse(stored);
    } catch {
      return coupleService.isDemoCouple() ? [...initialMemorableDates] : [];
    }
  }

  addMemorableDate(input: CreateMemorableDateInput): MemorableDate {
    const dates = this.getMemorableDates();
    const newEntry: MemorableDate = {
      id: `mdate-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: input.title.trim(),
      date: input.date,
      description: input.description?.trim() || undefined,
      isAnnual: !!input.isAnnual,
      createdAt: new Date().toISOString(),
    };

    const updated = [newEntry, ...dates];
    try {
      localStorage.setItem(STORAGE_MEMORABLE_DATES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save memorable date:', e);
    }
    this.notify();
    return newEntry;
  }

  updateMemorableDate(id: string, input: UpdateMemorableDateInput): MemorableDate | null {
    const dates = this.getMemorableDates();
    const index = dates.findIndex((d) => d.id === id);
    if (index === -1) return null;

    const existing = dates[index];
    const updatedEntry: MemorableDate = {
      ...existing,
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.date !== undefined ? { date: input.date } : {}),
      ...(input.description !== undefined ? { description: input.description.trim() || undefined } : {}),
      ...(input.isAnnual !== undefined ? { isAnnual: input.isAnnual } : {}),
      updatedAt: new Date().toISOString(),
    };

    dates[index] = updatedEntry;
    try {
      localStorage.setItem(STORAGE_MEMORABLE_DATES_KEY, JSON.stringify(dates));
    } catch (e) {
      console.warn('Failed to update memorable date:', e);
    }
    this.notify();
    return updatedEntry;
  }

  deleteMemorableDate(id: string): boolean {
    const dates = this.getMemorableDates();
    const filtered = dates.filter((d) => d.id !== id);
    if (filtered.length === dates.length) return false;

    try {
      localStorage.setItem(STORAGE_MEMORABLE_DATES_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Failed to delete memorable date:', e);
    }
    this.notify();
    return true;
  }

  /**
   * Completely clears all shared relationship data upon couple dissolution
   */
  clearSharedData(): void {
    try {
      localStorage.setItem(STORAGE_MEMORABLE_DATES_KEY, JSON.stringify([]));
      const todayStr = new Date().toISOString().split('T')[0];
      localStorage.setItem(STORAGE_START_DATE_KEY, todayStr);
    } catch (e) {
      console.warn('Failed to clear relationship data from localStorage:', e);
    }
    this.notify();
  }
}

export const relationshipService = new RelationshipService();
