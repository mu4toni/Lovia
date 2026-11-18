import type {
  DateMemory,
  CreateDateMemoryInput,
  UpdateDateMemoryInput,
} from '../types/dates';
import { isFutureDate } from '../utils/dateCalculations';
import { coupleService } from './coupleService';
import { isLocalDevHost } from '../utils/env';
import { sendPartnerNotification } from './notificationService';
import { getSwrCacheSection, updateSwrCache } from './swrCache';
import { supabase, isSupabaseConfigured, callServerDb, shouldUseServerDb } from './api';

const STORAGE_DATE_MEMORIES_KEY = 'lovia_date_memories_v1';

export const initialDateMemories: DateMemory[] = [
  {
    id: 'memory-1',
    title: 'Поход в кино на ночной сеанс',
    date: '2026-11-08',
    place: 'Кинотеатр «Художественный»',
    location: {
      placeName: 'Кинотеатр «Художественный»',
      address: 'Арбатская площадь, 14с1, Москва',
      latitude: 55.7523,
      longitude: 37.5996,
      placeId: 'cinema-hudozh',
    },
    story:
      'Смотрели старую французскую романтическую классику на последнем ряду. На улице шёл лёгкий дождь, а внутри пахло кофе и тёплым попкорном. Держались за руки весь сеанс.',
    photos: [
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80',
    ],
    createdAt: '2026-11-08T23:30:00.000Z',
  },
  {
    id: 'memory-2',
    title: 'Уютный ужин при свечах',
    date: '2026-10-25',
    place: 'Траттория у Патриарших',
    location: {
      placeName: 'Траттория у Патриарших',
      address: 'Малая Бронная ул., 24, Москва',
      latitude: 55.7628,
      longitude: 37.5947,
      placeId: 'trattoria-patr',
    },
    story:
      'Наш любимый столик у окна, негромкий джаз и домашняя паста с трюфелем. Говорили часами обо всём на свете и строили планы на зиму.',
    photos: [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    ],
    createdAt: '2026-10-25T21:00:00.000Z',
  },
  {
    id: 'memory-3',
    title: 'Осенняя прогулка в парке',
    date: '2026-10-12',
    place: 'Нескучный сад',
    location: {
      placeName: 'Нескучный сад',
      address: 'Ленинский проспект, 16–20, Москва',
      latitude: 55.7231,
      longitude: 37.5944,
      placeId: 'neskuchny-sad',
    },
    story:
      'Гуляли среди золотых клёнов, шуршали листьями, пили горячий чай с облепихой из термоса и сделали десяток тёплых совместных полароидов.',
    photos: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=800&q=80',
    ],
    createdAt: '2026-10-12T16:20:00.000Z',
  },
  {
    id: 'memory-4',
    title: 'Выходные в домике у озера',
    date: '2026-09-18',
    place: 'Парк-отель «Лесное»',
    location: {
      placeName: 'Парк-отель «Лесное»',
      address: 'Озёрная набережная, Ярославская область',
      latitude: 56.7328,
      longitude: 38.8541,
      placeId: 'lesnoe-resort',
    },
    story:
      'Два дня тишины вдали от городской суеты: деревянный домик с камином среди вековых сосен, утренний туман над тихой водой и звёздное небо ночью.',
    photos: [
      'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=800&q=80',
    ],
    createdAt: '2026-09-18T19:40:00.000Z',
  },
  {
    id: 'memory-5',
    title: 'Домашний вечер с пиццей и настолками',
    date: '2026-08-30',
    place: 'Дома на кухне',
    location: {
      placeName: 'Наш уютный дом',
      address: 'ул. Покровка, 19, Москва',
      latitude: 55.7591,
      longitude: 37.6472,
      placeId: 'home-sweet-home',
    },
    story:
      'Вместе замесили тесто для неаполитанской пиццы, перепачкались мукой, а потом устроили турнир по настольным играм до двух часов ночи.',
    photos: [
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    ],
    createdAt: '2026-08-30T22:15:00.000Z',
  },
];

async function uploadPhotoIfNeeded(coupleId: string, photo: string): Promise<string> {
  if (!photo || !photo.startsWith('data:')) {
    return photo;
  }

  if (shouldUseServerDb()) {
    try {
      const res = await callServerDb<{ publicUrl: string }>('upload_media', {
        base64Data: photo,
        type: 'date_photo',
      });
      if (res?.publicUrl) return res.publicUrl;
      throw new Error('Сервер не вернул URL фото');
    } catch (e: any) {
      console.warn('[dateMemoryService] upload_media error via /api/db:', e);
      throw new Error('Не удалось загрузить фото: ' + (e.message || 'ошибка сети'));
    }
  }

  try {
    const match = photo.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) return photo;
    const mime = match[1];
    const b64 = match[2];
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const ext = mime.split('/')[1] || 'jpg';
    const filePath = `${coupleId}/dates/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

    const { error: err1 } = await supabase.storage.from('lovia_media').upload(filePath, bytes, {
      contentType: mime,
      upsert: true,
    });

    if (!err1) {
      const { data } = supabase.storage.from('lovia_media').getPublicUrl(filePath);
      if (data?.publicUrl) return data.publicUrl;
    } else {
      const { error: err2 } = await supabase.storage.from('lovia-media').upload(filePath, bytes, {
        contentType: mime,
        upsert: true,
      });
      if (!err2) {
        const { data } = supabase.storage.from('lovia-media').getPublicUrl(filePath);
        if (data?.publicUrl) return data.publicUrl;
      }
    }
  } catch (e) {
    console.warn('[dateMemoryService] Failed to upload photo to storage:', e);
  }
  return photo;
}

class DateMemoryService {
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
        .channel(`date_memories_${couple.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'date_memories',
            filter: `couple_id=eq.${couple.id}`,
          },
          async () => {
            await this.fetchDateMemories();
            this.notify();
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[dateMemoryService] Realtime subscription error:', e);
    }
  }

  private notify() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lovia_dates_updated'));
    }
  }

  private isRevalidating = false;

  hasCachedData(): boolean {
    return this.getDateMemories().length > 0;
  }

  private saveDateMemoriesToStorage(memories: DateMemory[], coupleId?: string): void {
    try {
      localStorage.setItem(STORAGE_DATE_MEMORIES_KEY, JSON.stringify(memories));
      const targetCoupleId = coupleId || coupleService.getCurrentCouple()?.id;
      if (targetCoupleId && targetCoupleId !== 'couple-1') {
        updateSwrCache(targetCoupleId, 'memories', memories);
      }
    } catch (e) {
      console.warn('Failed to cache date memories:', e);
    }
  }

  hydrateFromBundle(rows: any[], coupleId?: string): void {
    const mapped: DateMemory[] = (rows || []).map((row: any) => {
      let rawLoc = row.location_data ?? row.location;
      if (typeof rawLoc === 'string') {
        try {
          rawLoc = JSON.parse(rawLoc);
        } catch {
          rawLoc = undefined;
        }
      }
      return {
        id: row.id,
        title: row.title,
        date: row.date,
        place: row.place || undefined,
        location: rawLoc && typeof rawLoc === 'object' ? rawLoc : undefined,
        story: row.story || undefined,
        photos: Array.isArray(row.photos) ? row.photos : [],
        createdAt: row.created_at,
      };
    });
    this.saveDateMemoriesToStorage(mapped, coupleId);
    this.notify();
  }

  getDateMemories(): DateMemory[] {
    try {
      const stored = localStorage.getItem(STORAGE_DATE_MEMORIES_KEY);
      if (!stored) {
        if (isLocalDevHost() && coupleService.isDemoCouple()) {
          this.saveDateMemoriesToStorage(initialDateMemories);
          return [...initialDateMemories];
        }
        return [];
      }
      return JSON.parse(stored);
    } catch {
      return isLocalDevHost() && coupleService.isDemoCouple() ? [...initialDateMemories] : [];
    }
  }

  private async revalidateMemoriesInBackground(coupleId: string): Promise<void> {
    if (this.isRevalidating) return;
    this.isRevalidating = true;
    try {
      if (shouldUseServerDb()) {
        if (coupleService.isFresh()) {
          return;
        }
        await coupleService.syncCoupleFromSupabase();
        return;
      }

      const { data, error } = await supabase
        .from('date_memories')
        .select('*')
        .eq('couple_id', coupleId)
        .order('date', { ascending: false });

      if (!error && data) {
        const mapped: DateMemory[] = data.map((row: any) => {
          let rawLoc = row.location_data ?? row.location;
          if (typeof rawLoc === 'string') {
            try {
              rawLoc = JSON.parse(rawLoc);
            } catch {
              rawLoc = undefined;
            }
          }

          return {
            id: row.id,
            title: row.title,
            date: row.date,
            place: row.place || undefined,
            location: rawLoc && typeof rawLoc === 'object' ? rawLoc : undefined,
            story: row.story || undefined,
            photos: Array.isArray(row.photos) ? row.photos : [],
            createdAt: row.created_at,
          };
        });

        this.saveDateMemoriesToStorage(mapped, coupleId);
        this.notify();
      }
    } catch (e) {
      console.warn('[dateMemoryService] SWR background revalidation failed:', e);
    } finally {
      this.isRevalidating = false;
    }
  }

  async fetchDateMemories(): Promise<DateMemory[]> {
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
      let cached = this.getDateMemories();
      if (cached.length === 0) {
        const swrCached = getSwrCacheSection(couple.id, 'memories') as DateMemory[] | undefined;
        if (Array.isArray(swrCached) && swrCached.length > 0) {
          cached = swrCached;
          this.saveDateMemoriesToStorage(cached, couple.id);
        }
      }

      // Если в кэше уже есть данные, возвращаем их мгновенно (0 мс),
      // а свежие данные из Supabase тихо обновляем в фоне
      if (cached.length > 0) {
        this.revalidateMemoriesInBackground(couple.id);
        return cached;
      }

      if (shouldUseServerDb()) {
        if (coupleService.isFresh() && this.getDateMemories().length > 0) {
          return this.getDateMemories();
        }
        try {
          await coupleService.syncCoupleFromSupabase();
          return this.getDateMemories();
        } catch (e) {
          console.warn('[dateMemoryService] get_bundle error via /api/db:', e);
        }
      }

      const { data, error } = await supabase
        .from('date_memories')
        .select('*')
        .eq('couple_id', couple.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('[dateMemoryService] Failed to load date memories from Supabase:', error);
        throw new Error('Ошибка БД: ' + error.message);
      }

      const mapped: DateMemory[] = (data || []).map((row: any) => {
        let rawLoc = row.location_data ?? row.location;
        if (typeof rawLoc === 'string') {
          try {
            rawLoc = JSON.parse(rawLoc);
          } catch {
            rawLoc = undefined;
          }
        }

        return {
          id: row.id,
          title: row.title,
          date: row.date,
          place: row.place || undefined,
          location: rawLoc && typeof rawLoc === 'object' ? rawLoc : undefined,
          story: row.story || undefined,
          photos: Array.isArray(row.photos) ? row.photos : [],
          createdAt: row.created_at,
        };
      });

      this.saveDateMemoriesToStorage(mapped, couple.id);
      return mapped;
    }

    return this.getDateMemories();
  }

  getDateMemoryById(id: string): DateMemory | null {
    const list = this.getDateMemories();
    return list.find((m) => m.id === id) || null;
  }

  async createDateMemory(input: CreateDateMemoryInput): Promise<DateMemory> {
    if (isFutureDate(input.date)) {
      throw new Error(
        'Можно сохранять только воспоминания о свиданиях, которые уже состоялись. Будущую дату выбрать нельзя.'
      );
    }

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

    const list = this.getDateMemories();
    const effectivePlace = input.place?.trim() || input.location?.placeName || undefined;

    let processedPhotos: string[] = input.photos ? [...input.photos] : [];
    if (couple) {
      processedPhotos = await Promise.all(
        processedPhotos.map((p) => uploadPhotoIfNeeded(couple.id, p))
      );
    }

    if (shouldUseServerDb() && couple && couple.id !== 'couple-1') {
      const serverRow = await callServerDb<any>('date_memories_create', {
        couple_id: couple.id,
        title: input.title.trim(),
        date: input.date,
        place: effectivePlace || null,
        location: input.location ? { ...input.location } : null,
        story: input.story?.trim() || null,
        photos: processedPhotos,
      });

      let rawLoc = serverRow.location_data ?? serverRow.location;
      if (typeof rawLoc === 'string') {
        try {
          rawLoc = JSON.parse(rawLoc);
        } catch {
          rawLoc = undefined;
        }
      }

      const newEntry: DateMemory = {
        id: serverRow.id,
        title: serverRow.title,
        date: serverRow.date,
        place: serverRow.place || undefined,
        location: rawLoc && typeof rawLoc === 'object' ? rawLoc : undefined,
        story: serverRow.story || undefined,
        photos: Array.isArray(serverRow.photos) ? serverRow.photos : [],
        createdAt: serverRow.created_at,
      };

      const updated = [newEntry, ...list];
      this.saveDateMemoriesToStorage(updated, couple.id);
      this.notify();

      sendPartnerNotification('date_memory_added', {
        title: newEntry.title,
      });

      return newEntry;
    }

    const newEntry: DateMemory = {
      id: `memory-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: input.title.trim(),
      date: input.date,
      place: effectivePlace,
      location: input.location ? { ...input.location } : undefined,
      story: input.story?.trim() || undefined,
      photos: processedPhotos,
      linkUrl: input.linkUrl?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && !isLocalDevHost() && couple) {
      const row = {
        id: newEntry.id,
        couple_id: couple.id,
        title: newEntry.title,
        date: newEntry.date,
        place: newEntry.place || null,
        location_data: newEntry.location || null,
        story: newEntry.story || null,
        photos: newEntry.photos,
        created_at: newEntry.createdAt,
      };

      const { error } = await supabase.from('date_memories').insert(row as any);
      if (error) {
        console.error('[dateMemoryService] Failed to insert date memory in Supabase:', error);
        throw new Error('Ошибка БД: ' + error.message);
      }
    }

    const updated = [newEntry, ...list];
    this.saveDateMemoriesToStorage(updated, couple?.id);
    this.notify();

    sendPartnerNotification('date_memory_added', {
      title: newEntry.title,
    });

    return newEntry;
  }

  async updateDateMemory(id: string, input: UpdateDateMemoryInput): Promise<DateMemory | null> {
    if (input.date && isFutureDate(input.date)) {
      throw new Error(
        'Можно сохранять только воспоминания о свиданиях, которые уже состоялись. Будущую дату выбрать нельзя.'
      );
    }

    const couple = coupleService.getCurrentCouple();
    const list = this.getDateMemories();
    const index = list.findIndex((m) => m.id === id);
    if (index === -1) return null;

    const existing = list[index];
    const effectivePlace =
      input.place !== undefined
        ? input.place.trim() || undefined
        : input.location !== undefined
        ? input.location?.placeName
        : existing.place;

    let processedPhotos = input.photos !== undefined ? [...input.photos] : existing.photos;
    if (couple && input.photos !== undefined) {
      processedPhotos = await Promise.all(
        processedPhotos.map((p) => uploadPhotoIfNeeded(couple.id, p))
      );
    }

    if (shouldUseServerDb() && couple && couple.id !== 'couple-1') {
      const patch: any = {};
      if (input.title !== undefined) patch.title = input.title.trim();
      if (input.date !== undefined) patch.date = input.date;
      if (input.place !== undefined || input.location !== undefined) patch.place = effectivePlace || null;
      if (input.location !== undefined) patch.location = input.location ? { ...input.location } : null;
      if (input.story !== undefined) patch.story = input.story?.trim() || null;
      if (input.photos !== undefined) patch.photos = processedPhotos;

      const serverRow = await callServerDb<any>('date_memories_update', { id, patch });
      let rawLoc = serverRow.location_data ?? serverRow.location;
      if (typeof rawLoc === 'string') {
        try {
          rawLoc = JSON.parse(rawLoc);
        } catch {
          rawLoc = undefined;
        }
      }

      const updatedEntry: DateMemory = {
        id: serverRow.id,
        title: serverRow.title,
        date: serverRow.date,
        place: serverRow.place || undefined,
        location: rawLoc && typeof rawLoc === 'object' ? rawLoc : undefined,
        story: serverRow.story || undefined,
        photos: Array.isArray(serverRow.photos) ? serverRow.photos : [],
        createdAt: serverRow.created_at,
        updatedAt: serverRow.created_at,
      };

      list[index] = updatedEntry;
      this.saveDateMemoriesToStorage(list, couple.id);
      this.notify();
      return updatedEntry;
    }

    if (isSupabaseConfigured() && !isLocalDevHost() && couple && couple.id !== 'couple-1') {
      const updateData: any = {};
      if (input.title !== undefined) updateData.title = input.title.trim();
      if (input.date !== undefined) updateData.date = input.date;
      if (input.place !== undefined || input.location !== undefined) updateData.place = effectivePlace || null;
      if (input.location !== undefined) updateData.location_data = input.location ? { ...input.location } : null;
      if (input.story !== undefined) updateData.story = input.story?.trim() || null;
      if (input.photos !== undefined) updateData.photos = processedPhotos;

      const { error } = await supabase
        .from('date_memories')
        .update(updateData)
        .eq('id', id)
        .eq('couple_id', couple.id);

      if (error) {
        console.error('[dateMemoryService] Failed to update date memory in Supabase:', error);
        throw new Error('Ошибка БД: ' + error.message);
      }
    }

    const updatedEntry: DateMemory = {
      ...existing,
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.date !== undefined ? { date: input.date } : {}),
      place: effectivePlace,
      ...(input.location !== undefined ? { location: input.location ? { ...input.location } : undefined } : {}),
      ...(input.story !== undefined ? { story: input.story.trim() || undefined } : {}),
      photos: processedPhotos,
      ...(input.linkUrl !== undefined ? { linkUrl: input.linkUrl.trim() || undefined } : {}),
      updatedAt: new Date().toISOString(),
    };

    list[index] = updatedEntry;
    this.saveDateMemoriesToStorage(list, couple?.id);
    this.notify();
    return updatedEntry;
  }

  async deleteDateMemory(id: string): Promise<boolean> {
    const couple = coupleService.getCurrentCouple();

    if (shouldUseServerDb()) {
      await callServerDb('date_memories_delete', { id });
      const list = this.getDateMemories();
      const filtered = list.filter((m) => m.id !== id);
      this.saveDateMemoriesToStorage(filtered, couple?.id);
      this.notify();
      return true;
    }

    if (isSupabaseConfigured() && !isLocalDevHost() && couple && couple.id !== 'couple-1') {
      const { error } = await supabase
        .from('date_memories')
        .delete()
        .eq('id', id)
        .eq('couple_id', couple.id);

      if (error) {
        console.error('[dateMemoryService] Failed to delete date memory from Supabase:', error);
        throw new Error('Ошибка БД: ' + error.message);
      }
    }

    const list = this.getDateMemories();
    const filtered = list.filter((m) => m.id !== id);
    if (filtered.length === list.length) return false;

    this.saveDateMemoriesToStorage(filtered, couple?.id);
    this.notify();
    return true;
  }

  getHeldDatesCount(): number {
    return this.getDateMemories().length;
  }

  clearSharedData(): void {
    try {
      this.saveDateMemoriesToStorage([]);
    } catch (e) {
      console.warn('Failed to clear date memories from localStorage:', e);
    }
    this.notify();
  }
}

export const dateMemoryService = new DateMemoryService();
