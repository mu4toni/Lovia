import { WishItem, CreateWishInput, UpdateWishInput, WISHLIST_CATEGORIES } from '../types/wishlist';
import { initialWishlistItems } from './mockWishlistData';
import { coupleService } from './coupleService';
import { isLocalDevHost } from '../utils/env';
import { sendPartnerNotification } from './notificationService';
import { getSwrCacheSection, updateSwrCache } from './swrCache';
import { supabase, isSupabaseConfigured, callServerDb, shouldUseServerDb } from './api';
import { normalizeMediaUrl } from '../utils/media';

const STORAGE_KEY = 'lovia_wishlist_items_v1';

async function uploadWishPhotoIfNeeded(coupleId: string, imageUrl?: string): Promise<string | null> {
  const trimmed = imageUrl?.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith('data:image')) {
    return normalizeMediaUrl(trimmed);
  }

  if (shouldUseServerDb()) {
    const uploadRes = await callServerDb<{ publicUrl: string }>('upload_media', {
      base64Data: trimmed,
      type: 'wish',
    });
    if (!uploadRes?.publicUrl) {
      throw new Error('Не удалось загрузить фото желания на сервер');
    }
    return uploadRes.publicUrl;
  }

  if (isSupabaseConfigured() && !isLocalDevHost()) {
    try {
      const match = trimmed.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (!match) return trimmed;
      const mime = match[1];
      const binary = atob(match[2]);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
      const filePath = `${coupleId}/wishes/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

      const { error: err1 } = await supabase.storage.from('lovia_media').upload(filePath, bytes, {
        contentType: mime,
        upsert: true,
      });
      if (!err1) {
        const { data } = supabase.storage.from('lovia_media').getPublicUrl(filePath);
        if (data?.publicUrl) return normalizeMediaUrl(data.publicUrl);
      } else {
        const { error: err2 } = await supabase.storage.from('lovia-media').upload(filePath, bytes, {
          contentType: mime,
          upsert: true,
        });
        if (!err2) {
          const { data } = supabase.storage.from('lovia-media').getPublicUrl(filePath);
          if (data?.publicUrl) return normalizeMediaUrl(data.publicUrl);
        }
      }
    } catch (e) {
      console.warn('[wishlistService] Failed to upload wish photo to storage:', e);
    }
  }

  return trimmed;
}

class WishlistService {
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
        this.saveToStorage([]);
      });
    }
  }

  private subscribeToRealtime(): void {
    if (!isSupabaseConfigured() || typeof window === 'undefined') return;
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
        .channel(`wishlist_${couple.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wishlist_items',
            filter: `couple_id=eq.${couple.id}`,
          },
          async (payload: any) => {
            try {
              const eventType = payload?.eventType;
              if (eventType === 'INSERT' && payload.new) {
                const inserted = this.mapWishRow(payload.new);
                const current = this.loadFromStorage();
                const next = current.some((x) => x.id === inserted.id)
                  ? current.map((x) => (x.id === inserted.id ? inserted : x))
                  : [inserted, ...current];
                this.saveToStorage(next);
                this.notify();
                return;
              }
              if (eventType === 'UPDATE' && payload.new) {
                const updated = this.mapWishRow(payload.new);
                const current = this.loadFromStorage();
                const next = current.some((x) => x.id === updated.id)
                  ? current.map((x) => (x.id === updated.id ? updated : x))
                  : [updated, ...current];
                this.saveToStorage(next);
                this.notify();
                return;
              }
              if (eventType === 'DELETE' && payload.old?.id) {
                const current = this.loadFromStorage();
                const next = current.filter((x) => x.id !== payload.old.id);
                this.saveToStorage(next);
                this.notify();
                return;
              }
            } catch {
              // fallback to full fetch below
            }

            await this.fetchWishlistFromSupabase(couple.id);
            this.notify();
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[wishlistService] Realtime subscription error:', e);
    }
  }

  private dedupeItems(items: WishItem[]): WishItem[] {
    if (!Array.isArray(items)) return [];
    const seen = new Set<string>();
    const unique: WishItem[] = [];
    for (const item of items) {
      if (!item || !item.id || seen.has(item.id)) continue;
      seen.add(item.id);
      unique.push(item);
    }
    return unique;
  }

  private getCategoryDetails(categoryId: string) {
    const cat = WISHLIST_CATEGORIES.find((c) => c.id === categoryId);
    return {
      categoryLabel: cat?.label || 'Желание',
      categoryColor: cat?.color || '#F4DDE2',
    };
  }

  private loadFromStorage(): WishItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        if (isLocalDevHost() && coupleService.isDemoCouple()) {
          this.saveToStorage(initialWishlistItems);
          return this.dedupeItems([...initialWishlistItems]);
        }
        return [];
      }
      return this.dedupeItems(JSON.parse(raw));
    } catch {
      return isLocalDevHost() && coupleService.isDemoCouple()
        ? this.dedupeItems([...initialWishlistItems])
        : [];
    }
  }

  private isRevalidating = false;

  hasCachedData(): boolean {
    return this.loadFromStorage().length > 0;
  }

  private saveToStorage(items: WishItem[]) {
    const deduped = this.dedupeItems(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deduped));
      const couple = coupleService.getCurrentCouple();
      if (couple && couple.id && couple.id !== 'couple-1') {
        updateSwrCache(couple.id, 'wishlist', deduped);
      }
    } catch (e) {
      console.error('Failed to save wishlist items to localStorage', e);
    }
  }

  private notify() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lovia_wishlist_updated'));
    }
  }

  mapWishRow(row: any): WishItem {
    const catInfo = this.getCategoryDetails(row.category_id || 'gifts');
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description || undefined,
      imageUrl: row.image_url || undefined,
      linkUrl: row.link_url || undefined,
      estimatedPrice: row.price ? Number(row.price) : undefined,
      currency: '₽',
      categoryId: row.category_id || 'gifts',
      categoryLabel: catInfo.categoryLabel,
      categoryColor: catInfo.categoryColor,
      isReserved: Boolean(row.is_booked),
      reservedByUserId: row.booked_by_user_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.created_at,
    };
  }

  hydrateFromBundle(rows: any[], _coupleId?: string): void {
    const mapped = this.dedupeItems((rows || []).map((r) => this.mapWishRow(r)));
    this.saveToStorage(mapped);
    this.notify();
  }

  private async fetchWishlistFromSupabase(coupleId: string): Promise<WishItem[]> {
    if (shouldUseServerDb()) {
      if (coupleService.isFresh() && this.loadFromStorage().length > 0) {
        return this.loadFromStorage();
      }
      try {
        await coupleService.syncCoupleFromSupabase();
        return this.loadFromStorage();
      } catch (e) {
        console.warn('[wishlistService] get_bundle error via /api/db:', e);
      }
    }

    const { data, error } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[wishlistService] Failed to load wishlist from Supabase:', error);
      throw new Error('Ошибка БД: ' + error.message);
    }

    const mapped: WishItem[] = this.dedupeItems((data || []).map((row: any) => this.mapWishRow(row)));

    this.saveToStorage(mapped);
    return mapped;
  }

  private async revalidateInBackground(coupleId: string): Promise<void> {
    if (this.isRevalidating) return;
    this.isRevalidating = true;
    try {
      await this.fetchWishlistFromSupabase(coupleId);
      this.notify();
    } catch (e) {
      console.warn('[wishlistService] SWR background revalidation failed:', e);
    } finally {
      this.isRevalidating = false;
    }
  }

  /**
   * Получить список желаний. Если указан userId, возвращает только желания этого пользователя.
   */
  async getWishlist(userId?: string): Promise<WishItem[]> {
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
      let cached = this.loadFromStorage();
      if (cached.length === 0) {
        const swrCached = getSwrCacheSection(couple.id, 'wishlist') as WishItem[] | undefined;
        if (Array.isArray(swrCached) && swrCached.length > 0) {
          cached = swrCached;
          this.saveToStorage(cached);
        }
      }

      // Если в кэше уже есть данные, возвращаем их мгновенно (0 мс),
      // а свежие данные из Supabase тихо обновляем в фоне
      if (cached.length > 0) {
        this.revalidateInBackground(couple.id);
        if (userId) {
          return cached.filter((item) => item.userId === userId);
        }
        return cached;
      }

      const fresh = await this.fetchWishlistFromSupabase(couple.id);
      if (userId) {
        return fresh.filter((item) => item.userId === userId);
      }
      return fresh;
    }

    const all = this.loadFromStorage();
    if (userId) {
      return all.filter((item) => item.userId === userId);
    }
    return all;
  }

  /**
   * Создать новое желание (привязывается к пользователю и паре).
   */
  async createWishItem(userId: string, input: CreateWishInput): Promise<WishItem> {
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

    const uploadedImageUrl = couple
      ? await uploadWishPhotoIfNeeded(couple.id, input.imageUrl)
      : input.imageUrl?.trim() || null;

    if (shouldUseServerDb() && couple && couple.id !== 'couple-1') {
      const serverRow = await callServerDb<any>('wishlist_create', {
        couple_id: couple.id,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        imageUrl: uploadedImageUrl,
        linkUrl: input.linkUrl?.trim() || null,
        estimatedPrice: input.estimatedPrice ? Math.max(0, input.estimatedPrice) : null,
        categoryId: input.categoryId || 'gifts',
      });
      const newItem = this.mapWishRow(serverRow);
      // Reload fresh storage AFTER server call in case Realtime already inserted this item
      const current = this.loadFromStorage();
      const next = current.some((x) => x.id === newItem.id)
        ? current.map((x) => (x.id === newItem.id ? newItem : x))
        : [newItem, ...current];
      this.saveToStorage(next);
      this.notify();

      sendPartnerNotification('wishlist_added', {
        title: newItem.title,
        price: newItem.estimatedPrice,
      });

      return newItem;
    }

    const effectiveCategory = input.categoryId || 'gifts';
    const catInfo = this.getCategoryDetails(effectiveCategory);
    const now = new Date().toISOString();

    const newItem: WishItem = {
      id: `wish-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      imageUrl: uploadedImageUrl || undefined,
      linkUrl: input.linkUrl?.trim() || undefined,
      estimatedPrice: input.estimatedPrice ? Math.max(0, input.estimatedPrice) : undefined,
      currency: input.currency || '₽',
      categoryId: effectiveCategory,
      categoryLabel: catInfo.categoryLabel,
      categoryColor: catInfo.categoryColor,
      comment: input.comment?.trim() || undefined,
      isReserved: false,
      createdAt: now,
      updatedAt: now,
    };

    if (isSupabaseConfigured() && !isLocalDevHost() && couple) {
      const row = {
        id: newItem.id,
        couple_id: couple.id,
        user_id: userId,
        title: newItem.title,
        description: newItem.description || null,
        image_url: newItem.imageUrl || null,
        link_url: newItem.linkUrl || null,
        price: newItem.estimatedPrice || null,
        category_id: newItem.categoryId,
        is_booked: false,
        booked_by_user_id: null,
        created_at: newItem.createdAt,
      };

      const { error } = await supabase.from('wishlist_items').insert(row);
      if (error) {
        console.error('[wishlistService] Failed to insert wishlist item in Supabase:', error);
        throw new Error('Ошибка БД: ' + error.message);
      }
    }

    // Reload fresh storage AFTER async insert and strictly deduplicate by item.id
    const current = this.loadFromStorage();
    const next = current.some((x) => x.id === newItem.id)
      ? current.map((x) => (x.id === newItem.id ? newItem : x))
      : [newItem, ...current];
    this.saveToStorage(next);
    this.notify();

    sendPartnerNotification('wishlist_added', {
      title: newItem.title,
      price: newItem.estimatedPrice,
    });

    return newItem;
  }

  /**
   * Обновить существующее желание.
   */
  async updateWishItem(
    id: string,
    _currentUserId: string,
    input: UpdateWishInput
  ): Promise<WishItem> {
    const couple = coupleService.getCurrentCouple();

    const resolvedUpdateImage =
      input.imageUrl !== undefined && couple
        ? await uploadWishPhotoIfNeeded(couple.id, input.imageUrl)
        : input.imageUrl !== undefined
        ? input.imageUrl.trim() || null
        : undefined;

    if (shouldUseServerDb()) {
      const patch: any = {};
      if (input.title !== undefined) patch.title = input.title.trim();
      if (input.description !== undefined) patch.description = input.description?.trim() || null;
      if (resolvedUpdateImage !== undefined) patch.imageUrl = resolvedUpdateImage;
      if (input.linkUrl !== undefined) patch.linkUrl = input.linkUrl?.trim() || null;
      if (input.estimatedPrice !== undefined) patch.estimatedPrice = input.estimatedPrice || null;
      if (input.categoryId !== undefined) patch.categoryId = input.categoryId;

      const serverRow = await callServerDb<any>('wishlist_update', { id, patch });
      const updated = this.mapWishRow(serverRow);
      const all = this.loadFromStorage();
      const idx = all.findIndex((item) => item.id === id);
      if (idx !== -1) {
        all[idx] = updated;
      }
      this.saveToStorage(all);
      this.notify();
      return updated;
    }

    if (isSupabaseConfigured() && !isLocalDevHost() && couple && couple.id !== 'couple-1') {
      const updateData: any = {};
      if (input.title !== undefined) updateData.title = input.title.trim();
      if (input.description !== undefined) updateData.description = input.description?.trim() || null;
      if (resolvedUpdateImage !== undefined) updateData.image_url = resolvedUpdateImage;
      if (input.linkUrl !== undefined) updateData.link_url = input.linkUrl?.trim() || null;
      if (input.estimatedPrice !== undefined) updateData.price = input.estimatedPrice || null;
      if (input.categoryId !== undefined) updateData.category_id = input.categoryId;

      const { error } = await supabase
        .from('wishlist_items')
        .update(updateData)
        .eq('id', id)
        .eq('couple_id', couple.id);

      if (error) {
        console.error('[wishlistService] Failed to update wishlist item in Supabase:', error);
        throw new Error('Ошибка БД: ' + error.message);
      }
    }

    const all = this.loadFromStorage();
    const index = all.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new Error('Желание не найдено');
    }

    const existing = all[index];
    const catId = input.categoryId || existing.categoryId;
    const catInfo = this.getCategoryDetails(catId);

    const updated: WishItem = {
      ...existing,
      title: input.title !== undefined ? input.title.trim() : existing.title,
      description: input.description !== undefined ? input.description?.trim() : existing.description,
      imageUrl: resolvedUpdateImage !== undefined ? resolvedUpdateImage || undefined : existing.imageUrl,
      linkUrl: input.linkUrl !== undefined ? input.linkUrl?.trim() : existing.linkUrl,
      estimatedPrice:
        input.estimatedPrice !== undefined
          ? input.estimatedPrice ? Math.max(0, input.estimatedPrice) : undefined
          : existing.estimatedPrice,
      currency: input.currency || existing.currency,
      categoryId: catId,
      categoryLabel: catInfo.categoryLabel,
      categoryColor: catInfo.categoryColor,
      comment: input.comment !== undefined ? input.comment?.trim() : existing.comment,
      updatedAt: new Date().toISOString(),
    };

    all[index] = updated;
    this.saveToStorage(all);
    this.notify();
    return updated;
  }

  /**
   * Удалить желание.
   */
  async deleteWishItem(id: string, _currentUserId?: string): Promise<boolean> {
    const couple = coupleService.getCurrentCouple();

    if (shouldUseServerDb()) {
      await callServerDb('wishlist_delete', { id });
      const all = this.loadFromStorage();
      const filtered = all.filter((item) => item.id !== id);
      this.saveToStorage(filtered);
      this.notify();
      return true;
    }

    if (isSupabaseConfigured() && !isLocalDevHost() && couple && couple.id !== 'couple-1') {
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('id', id)
        .eq('couple_id', couple.id);

      if (error) {
        console.error('[wishlistService] Failed to delete wishlist item from Supabase:', error);
        throw new Error('Ошибка БД: ' + error.message);
      }
    }

    const all = this.loadFromStorage();
    const filtered = all.filter((item) => item.id !== id);
    if (filtered.length === all.length) {
      return false;
    }
    this.saveToStorage(filtered);
    this.notify();
    return true;
  }

  /**
   * Забронировать / снять бронь с желания партнёра (сюрприз).
   */
  async toggleReservation(id: string, currentUserId: string): Promise<WishItem> {
    const all = this.loadFromStorage();
    const index = all.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new Error('Желание не найдено');
    }

    const item = all[index];
    const couple = coupleService.getCurrentCouple();
    const newIsReserved = !item.isReserved;
    const newReservedBy = newIsReserved ? currentUserId : null;

    const optimisticItem: WishItem = {
      ...item,
      isReserved: newIsReserved,
      reservedByUserId: newReservedBy || undefined,
      reservedAt: newIsReserved ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };

    // 0ms Optimistic UI update
    all[index] = optimisticItem;
    this.saveToStorage(all);
    this.notify();

    if (shouldUseServerDb()) {
      callServerDb<any>('wishlist_toggle_reserve', { id }).then((serverRow) => {
        if (serverRow) {
          const updated = this.mapWishRow(serverRow);
          const freshAll = this.loadFromStorage();
          const freshIdx = freshAll.findIndex((i) => i.id === id);
          if (freshIdx !== -1) {
            freshAll[freshIdx] = updated;
            this.saveToStorage(freshAll);
          }
        }
      }).catch((err) => {
        console.error('[wishlistService] Failed to toggle reservation on server, rolling back:', err);
        const freshAll = this.loadFromStorage();
        const freshIdx = freshAll.findIndex((i) => i.id === id);
        if (freshIdx !== -1) {
          freshAll[freshIdx] = item;
          this.saveToStorage(freshAll);
          this.notify();
        }
      });

      return optimisticItem;
    }

    if (isSupabaseConfigured() && !isLocalDevHost() && couple && couple.id !== 'couple-1') {
      const { error } = await supabase
        .from('wishlist_items')
        .update({
          is_booked: newIsReserved,
          booked_by_user_id: newReservedBy,
        })
        .eq('id', id)
        .eq('couple_id', couple.id);

      if (error) {
        console.error('[wishlistService] Failed to toggle reservation in Supabase:', error);
        throw new Error('Ошибка БД: ' + error.message);
      }
    }

    const updated: WishItem = {
      ...item,
      isReserved: newIsReserved,
      reservedByUserId: newReservedBy || undefined,
      reservedAt: newIsReserved ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };

    all[index] = updated;
    this.saveToStorage(all);
    this.notify();
    return updated;
  }

  async toggleReserveWishItem(id: string, currentUserId: string): Promise<WishItem> {
    return this.toggleReservation(id, currentUserId);
  }

  async resetToMock(): Promise<WishItem[]> {
    this.saveToStorage(initialWishlistItems);
    this.notify();
    return [...initialWishlistItems];
  }

  async clearSharedData(): Promise<void> {
    this.saveToStorage([]);
    this.notify();
  }
}

export const wishlistService = new WishlistService();
