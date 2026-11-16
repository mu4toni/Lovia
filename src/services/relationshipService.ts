import type {
  MemorableDate,
  CreateMemorableDateInput,
  UpdateMemorableDateInput,
} from '../types/relationship';
import { coupleService } from './coupleService';
import { isLocalDevHost } from '../utils/env';
import { sendPartnerNotification } from './notificationService';
import { supabase, isSupabaseConfigured } from './api';

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
  private currentChannel: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('lovia_couple_connected', () => {
        this.subscribeToRealtime();
      });
      window.addEventListener('lovia_couple_updated', () => {
        this.subscribeToRealtime();
      });
      window.addEventListener('lovia_couple_dissolved', () => {
        if (this.currentChannel) {
          try {
            supabase.removeChannel(this.currentChannel);
            this.currentChannel = null;
          } catch {
            // ignore
          }
        }
        this.clearSharedData();
      });
    }
  }

  private subscribeToRealtime(): void {
    if (!isSupabaseConfigured() || typeof window === 'undefined') return;
    const couple = coupleService.getCurrentCouple();
    if (!couple || couple.id === 'couple-1') return;

    if (this.currentChannel) {
      try {
        supabase.removeChannel(this.currentChannel);
        this.currentChannel = null;
      } catch {
        // ignore
      }
    }

    try {
      this.currentChannel = supabase
        .channel(`memorable_dates_${couple.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'memorable_dates',
            filter: `couple_id=eq.${couple.id}`,
          },
          async () => {
            await this.fetchMemorableDates();
            this.notify();
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[relationshipService] Realtime subscription error:', e);
    }
  }

  private notify() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lovia_relationship_updated'));
      window.dispatchEvent(new CustomEvent('lovia_dates_updated'));
    }
  }

  getStartDate(): string {
    const couple = coupleService.getCurrentCouple();
    if (couple?.startDate) {
      return couple.startDate;
    }

    try {
      const stored = localStorage.getItem(STORAGE_START_DATE_KEY);
      if (stored) return stored;
      if (isLocalDevHost() && coupleService.isDemoCouple()) {
        localStorage.setItem(STORAGE_START_DATE_KEY, initialStartDate);
        return initialStartDate;
      }
      const todayStr = new Date().toISOString().split('T')[0];
      localStorage.setItem(STORAGE_START_DATE_KEY, todayStr);
      return todayStr;
    } catch {
      return isLocalDevHost() && coupleService.isDemoCouple()
        ? initialStartDate
        : new Date().toISOString().split('T')[0];
    }
  }

  setStartDate(newDate: string): string {
    try {
      localStorage.setItem(STORAGE_START_DATE_KEY, newDate);
    } catch (e) {
      console.warn('Failed to save start date:', e);
    }

    const couple = coupleService.getCurrentCouple();
    if (isSupabaseConfigured() && !isLocalDevHost() && couple && couple.id !== 'couple-1') {
      supabase
        .from('couples')
        .update({ start_date: newDate })
        .eq('id', couple.id)
        .then(({ error }) => {
          if (error) {
            console.error('[relationshipService] Failed to update start_date in Supabase:', error);
          }
        });

      sendPartnerNotification('start_date_updated', { date: newDate });
    }

    this.notify();
    return newDate;
  }

  getMemorableDates(): MemorableDate[] {
    try {
      const stored = localStorage.getItem(STORAGE_MEMORABLE_DATES_KEY);
      if (!stored) {
        if (isLocalDevHost() && coupleService.isDemoCouple()) {
          localStorage.setItem(STORAGE_MEMORABLE_DATES_KEY, JSON.stringify(initialMemorableDates));
          return [...initialMemorableDates];
        }
        return [];
      }
      return JSON.parse(stored);
    } catch {
      return isLocalDevHost() && coupleService.isDemoCouple() ? [...initialMemorableDates] : [];
    }
  }

  async fetchMemorableDates(): Promise<MemorableDate[]> {
    if (isSupabaseConfigured() && !isLocalDevHost()) {
      let couple = coupleService.getCurrentCouple();
      if (!couple || couple.id === 'couple-1') {
        await coupleService.syncCurrentCoupleFromSupabase();
        couple = coupleService.getCurrentCouple();
      }

      if (!couple || couple.id === 'couple-1') {
        return [];
      }

      this.subscribeToRealtime();

      const { data, error } = await supabase
        .from('memorable_dates')
        .select('*')
        .eq('couple_id', couple.id)
        .order('date', { ascending: true });

      if (error) {
        console.error('[relationshipService] Failed to load memorable dates from Supabase:', error);
        throw new Error('Ошибка БД: ' + error.message);
      }

      const mapped: MemorableDate[] = (data || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        date: row.date,
        description: row.description || undefined,
        isAnnual: Boolean(row.is_annual),
        createdAt: row.created_at,
      }));

      try {
        localStorage.setItem(STORAGE_MEMORABLE_DATES_KEY, JSON.stringify(mapped));
      } catch (e) {
        console.warn('Failed to cache memorable dates:', e);
      }

      return mapped;
    }

    return this.getMemorableDates();
  }

  async addMemorableDate(input: CreateMemorableDateInput): Promise<MemorableDate> {
    let couple = coupleService.getCurrentCouple();

    if (isSupabaseConfigured() && !isLocalDevHost()) {
      if (!couple || couple.id === 'couple-1') {
        await coupleService.syncCurrentCoupleFromSupabase();
        couple = coupleService.getCurrentCouple();
      }

      if (!couple || couple.id === 'couple-1') {
        throw new Error('Пара не подключена. Сначала создайте или подключитесь к паре.');
      }
    }

    const dates = this.getMemorableDates();
    const newEntry: MemorableDate = {
      id: `mdate-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: input.title.trim(),
      date: input.date,
      description: input.description?.trim() || undefined,
      isAnnual: !!input.isAnnual,
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && !isLocalDevHost() && couple) {
      const row = {
        id: newEntry.id,
        couple_id: couple.id,
        title: newEntry.title,
        date: newEntry.date,
        description: newEntry.description || null,
        is_annual: newEntry.isAnnual,
        created_at: newEntry.createdAt,
      };

      const { error } = await supabase.from('memorable_dates').insert(row);
      if (error) {
        console.error('[relationshipService] Failed to insert memorable date in Supabase:', error);
        throw new Error('Ошибка БД: ' + error.message);
      }
    }

    const updated = [newEntry, ...dates];
    try {
      localStorage.setItem(STORAGE_MEMORABLE_DATES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save memorable date:', e);
    }
    this.notify();

    sendPartnerNotification('memorable_date_added', {
      title: newEntry.title,
      date: newEntry.date,
    });

    return newEntry;
  }

  async updateMemorableDate(id: string, input: UpdateMemorableDateInput): Promise<MemorableDate | null> {
    const couple = coupleService.getCurrentCouple();

    if (isSupabaseConfigured() && !isLocalDevHost() && couple && couple.id !== 'couple-1') {
      const updateData: any = {};
      if (input.title !== undefined) updateData.title = input.title.trim();
      if (input.date !== undefined) updateData.date = input.date;
      if (input.description !== undefined) updateData.description = input.description?.trim() || null;
      if (input.isAnnual !== undefined) updateData.is_annual = input.isAnnual;

      const { error } = await supabase
        .from('memorable_dates')
        .update(updateData)
        .eq('id', id)
        .eq('couple_id', couple.id);

      if (error) {
        console.error('[relationshipService] Failed to update memorable date in Supabase:', error);
        throw new Error('Ошибка БД: ' + error.message);
      }
    }

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

  async deleteMemorableDate(id: string): Promise<boolean> {
    const couple = coupleService.getCurrentCouple();

    if (isSupabaseConfigured() && !isLocalDevHost() && couple && couple.id !== 'couple-1') {
      const { error } = await supabase
        .from('memorable_dates')
        .delete()
        .eq('id', id)
        .eq('couple_id', couple.id);

      if (error) {
        console.error('[relationshipService] Failed to delete memorable date from Supabase:', error);
        throw new Error('Ошибка БД: ' + error.message);
      }
    }

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
