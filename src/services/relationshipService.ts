import type {
  MemorableDate,
  CreateMemorableDateInput,
  UpdateMemorableDateInput,
} from '../types/relationship';
import { coupleService } from './coupleService';
import { isLocalDevHost } from '../utils/env';
import { sendPartnerNotification } from './notificationService';
import { getSwrCacheSection, updateSwrCache } from './swrCache';
import { supabase, isSupabaseConfigured, callServerDb, shouldUseServerDb } from './api';
import { uploadPhotoIfNeeded } from './dateMemoryService';
import { normalizeMediaUrl } from '../utils/media';
import { initialDemoMemorableDates } from './mockData';

function mapMemorablePhotos(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    .slice(0, 2)
    .map((p) => normalizeMediaUrl(p));
}

const STORAGE_START_DATE_KEY = 'lovia_relationship_start_date_v1';
const STORAGE_MEMORABLE_DATES_KEY = 'lovia_memorable_dates_v1';

export const initialStartDate = '2025-07-25';

export const initialMemorableDates: MemorableDate[] = initialDemoMemorableDates;

class RelationshipService {
  private currentChannel: any = null;
  private subscribedCoupleId: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('lovia_couple_connected', () => {
        this.subscribeToRealtime();
      });
      window.addEventListener('lovia_couple_updated', () => {
        this.subscribeToRealtime();
      });
      window.addEventListener('lovia_couple_dissolved', () => {
        this.subscribedCoupleId = null;
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
    if (shouldUseServerDb() || !isSupabaseConfigured() || typeof window === 'undefined') return;
    const couple = coupleService.getCurrentCouple();
    if (!couple || couple.id === 'couple-1') return;
    if (this.currentChannel && this.subscribedCoupleId === couple.id) return;

    if (this.currentChannel) {
      try {
        supabase.removeChannel(this.currentChannel);
        this.currentChannel = null;
      } catch {
        // ignore
      }
    }

    this.subscribedCoupleId = couple.id;

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
    if (couple) {
      couple.startDate = newDate;
      if (couple.id && couple.id !== 'couple-1') {
        updateSwrCache(couple.id, 'couple', couple);
      }
    }
    if (shouldUseServerDb() && couple && couple.id !== 'couple-1') {
      callServerDb('update_start_date', { coupleId: couple.id, startDate: newDate }).catch((e) => {
        console.warn('[relationshipService] update_start_date error via /api/db:', e);
      });
      sendPartnerNotification('start_date_updated', { date: newDate });
    } else if (isSupabaseConfigured() && !isLocalDevHost() && couple && couple.id !== 'couple-1') {
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

  private isRevalidating = false;

  hasCachedData(): boolean {
    return this.getMemorableDates().length > 0;
  }

  hydrateFromBundle(rows: any[], coupleId?: string): void {
    const mapped: MemorableDate[] = (rows || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      date: row.date,
      description: row.description || undefined,
      isAnnual: Boolean(row.is_annual),
      photos: mapMemorablePhotos(row.photos),
      createdAt: row.created_at,
    }));
    this.saveMemorableDatesToStorage(mapped, coupleId);
    this.notify();
  }

  private saveMemorableDatesToStorage(dates: MemorableDate[], coupleId?: string): void {
    try {
      localStorage.setItem(STORAGE_MEMORABLE_DATES_KEY, JSON.stringify(dates));
      const targetCoupleId = coupleId || coupleService.getCurrentCouple()?.id;
      if (targetCoupleId && targetCoupleId !== 'couple-1') {
        updateSwrCache(targetCoupleId, 'dates', dates);
      }
    } catch (e) {
      console.warn('Failed to cache memorable dates:', e);
    }
  }

  getMemorableDates(): MemorableDate[] {
    try {
      const stored = localStorage.getItem(STORAGE_MEMORABLE_DATES_KEY);
      if (!stored) {
        if (isLocalDevHost() && coupleService.isDemoCouple()) {
          this.saveMemorableDatesToStorage(initialMemorableDates);
          return [...initialMemorableDates];
        }
        return [];
      }
      return JSON.parse(stored);
    } catch {
      return isLocalDevHost() && coupleService.isDemoCouple() ? [...initialMemorableDates] : [];
    }
  }

  private async revalidateDatesInBackground(coupleId: string): Promise<void> {
    if (this.isRevalidating) return;
    this.isRevalidating = true;
    try {
      if (shouldUseServerDb()) {
        if (coupleService.isFresh()) {
          return;
        }
        await coupleService.syncCoupleFromSupabase(undefined, false, { silent: true });
        return;
      }

      const { data, error } = await supabase
        .from('memorable_dates')
        .select('*')
        .eq('couple_id', coupleId)
        .order('date', { ascending: true });

      if (!error && data) {
        const mapped: MemorableDate[] = data.map((row: any) => ({
          id: row.id,
          title: row.title,
          date: row.date,
          description: row.description || undefined,
          isAnnual: Boolean(row.is_annual),
          photos: mapMemorablePhotos(row.photos),
          createdAt: row.created_at,
        }));
        this.saveMemorableDatesToStorage(mapped, coupleId);
        this.notify();
      }
    } catch (e) {
      console.warn('[relationshipService] SWR background revalidation failed:', e);
    } finally {
      this.isRevalidating = false;
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

      // Проверяем локальное хранилище и SWR-кэш
      let cached = this.getMemorableDates();
      if (cached.length === 0) {
        const swrCached = getSwrCacheSection(couple.id, 'dates') as MemorableDate[] | undefined;
        if (Array.isArray(swrCached) && swrCached.length > 0) {
          cached = swrCached;
          this.saveMemorableDatesToStorage(cached, couple.id);
        }
      }

      // Если в кэше уже есть данные, возвращаем их мгновенно (0 мс),
      // а свежие данные из Supabase тихо обновляем в фоне
      if (cached.length > 0) {
        this.revalidateDatesInBackground(couple.id);
        return cached;
      }

      if (shouldUseServerDb()) {
        if (coupleService.isFresh() && this.getMemorableDates().length > 0) {
          return this.getMemorableDates();
        }
        try {
          await coupleService.syncCoupleFromSupabase(undefined, false, { silent: true });
        } catch (e) {
          console.warn('[relationshipService] get_bundle error via /api/db:', e);
        }
        return this.getMemorableDates();
      }

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
        photos: mapMemorablePhotos(row.photos),
        createdAt: row.created_at,
      }));

      this.saveMemorableDatesToStorage(mapped, couple.id);
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

    const rawPhotos = Array.isArray(input.photos) ? input.photos.slice(0, 2) : [];
    const uploadedPhotos =
      rawPhotos.length > 0 && couple && couple.id !== 'couple-1'
        ? await Promise.all(rawPhotos.map((p) => uploadPhotoIfNeeded(couple.id, p)))
        : rawPhotos;

    if (shouldUseServerDb() && couple && couple.id !== 'couple-1') {
      const serverRow = await callServerDb<any>('memorable_dates_create', {
        couple_id: couple.id,
        title: input.title.trim(),
        date: input.date,
        description: input.description?.trim() || null,
        isAnnual: !!input.isAnnual,
        photos: uploadedPhotos.slice(0, 2),
      });

      const newEntry: MemorableDate = {
        id: serverRow.id,
        title: serverRow.title,
        date: serverRow.date,
        description: serverRow.description || undefined,
        isAnnual: Boolean(serverRow.is_annual),
        photos: mapMemorablePhotos(serverRow.photos),
        createdAt: serverRow.created_at,
      };

      const dates = this.getMemorableDates();
      const updated = [newEntry, ...dates];
      this.saveMemorableDatesToStorage(updated, couple.id);
      this.notify();

      sendPartnerNotification('memorable_date_added', {
        title: newEntry.title,
        date: newEntry.date,
      });

      return newEntry;
    }

    const dates = this.getMemorableDates();
    const newEntry: MemorableDate = {
      id: `mdate-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: input.title.trim(),
      date: input.date,
      description: input.description?.trim() || undefined,
      isAnnual: !!input.isAnnual,
      photos: uploadedPhotos.slice(0, 2),
      createdAt: new Date().toISOString(),
    };

    if (!shouldUseServerDb() && isSupabaseConfigured() && !isLocalDevHost() && couple) {
      const row = {
        id: newEntry.id,
        couple_id: couple.id,
        title: newEntry.title,
        date: newEntry.date,
        description: newEntry.description || null,
        is_annual: newEntry.isAnnual,
        photos: newEntry.photos || [],
        created_at: newEntry.createdAt,
      };

      const { error } = await supabase.from('memorable_dates').insert(row);
      if (error) {
        console.error('[relationshipService] Failed to insert memorable date in Supabase:', error);
        throw new Error('Ошибка БД: ' + error.message);
      }
    }

    const updated = [newEntry, ...dates];
    this.saveMemorableDatesToStorage(updated, couple?.id);
    this.notify();

    sendPartnerNotification('memorable_date_added', {
      title: newEntry.title,
      date: newEntry.date,
    });

    return newEntry;
  }

  async updateMemorableDate(id: string, input: UpdateMemorableDateInput): Promise<MemorableDate | null> {
    const couple = coupleService.getCurrentCouple();

    const uploadedPhotos =
      input.photos !== undefined
        ? couple && couple.id !== 'couple-1'
          ? await Promise.all(input.photos.slice(0, 2).map((p) => uploadPhotoIfNeeded(couple.id, p)))
          : input.photos.slice(0, 2)
        : undefined;

    if (shouldUseServerDb()) {
      const patch: any = {};
      if (input.title !== undefined) patch.title = input.title.trim();
      if (input.date !== undefined) patch.date = input.date;
      if (input.description !== undefined) patch.description = input.description?.trim() || null;
      if (input.isAnnual !== undefined) patch.is_annual = input.isAnnual;
      if (uploadedPhotos !== undefined) patch.photos = uploadedPhotos.slice(0, 2);

      const serverRow = await callServerDb<any>('memorable_dates_update', { id, patch });
      const updatedEntry: MemorableDate = {
        id: serverRow.id,
        title: serverRow.title,
        date: serverRow.date,
        description: serverRow.description || undefined,
        isAnnual: Boolean(serverRow.is_annual),
        photos: mapMemorablePhotos(serverRow.photos),
        createdAt: serverRow.created_at,
        updatedAt: serverRow.created_at,
      };

      const dates = this.getMemorableDates();
      const index = dates.findIndex((d) => d.id === id);
      if (index !== -1) {
        dates[index] = updatedEntry;
        this.saveMemorableDatesToStorage(dates, couple?.id);
        this.notify();
      }
      return updatedEntry;
    }

    if (isSupabaseConfigured() && !isLocalDevHost() && couple && couple.id !== 'couple-1') {
      const updateData: any = {};
      if (input.title !== undefined) updateData.title = input.title.trim();
      if (input.date !== undefined) updateData.date = input.date;
      if (input.description !== undefined) updateData.description = input.description?.trim() || null;
      if (input.isAnnual !== undefined) updateData.is_annual = input.isAnnual;
      if (uploadedPhotos !== undefined) updateData.photos = uploadedPhotos.slice(0, 2);

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
      ...(uploadedPhotos !== undefined ? { photos: uploadedPhotos.slice(0, 2) } : {}),
      updatedAt: new Date().toISOString(),
    };

    dates[index] = updatedEntry;
    this.saveMemorableDatesToStorage(dates, couple?.id);
    this.notify();
    return updatedEntry;
  }

  async deleteMemorableDate(id: string): Promise<boolean> {
    const couple = coupleService.getCurrentCouple();

    if (shouldUseServerDb()) {
      await callServerDb('memorable_dates_delete', { id });
      const dates = this.getMemorableDates();
      const filtered = dates.filter((d) => d.id !== id);
      this.saveMemorableDatesToStorage(filtered, couple?.id);
      this.notify();
      return true;
    }

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

    this.saveMemorableDatesToStorage(filtered, couple?.id);
    this.notify();
    return true;
  }

  clearSharedData(): void {
    try {
      this.saveMemorableDatesToStorage([]);
      const todayStr = new Date().toISOString().split('T')[0];
      localStorage.setItem(STORAGE_START_DATE_KEY, todayStr);
    } catch (e) {
      console.warn('Failed to clear relationship data from localStorage:', e);
    }
    this.notify();
  }
}

export const relationshipService = new RelationshipService();
