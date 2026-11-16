import { WishItem, CreateWishInput, UpdateWishInput, WISHLIST_CATEGORIES } from '../types/wishlist';
import { initialWishlistItems } from './mockWishlistData';
import { coupleService } from './coupleService';
import { isLocalDevHost } from '../utils/env';
import { sendPartnerNotification } from './notificationService';
import { supabase, isSupabaseConfigured } from './api';

const STORAGE_KEY = 'lovia_wishlist_items_v1';

class WishlistService {
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
        this.saveToStorage([]);
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
        .channel(`wishlist_${couple.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wishlist_items',
            filter: `couple_id=eq.${couple.id}`,
          },
          async () => {
            await this.getWishlist();
            window.dispatchEvent(new CustomEvent('lovia_wishlist_updated'));
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[wishlistService] Realtime subscription error:', e);
    }
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
          return [...initialWishlistItems];
        }
        return [];
      }
      return JSON.parse(raw);
    } catch {
      return isLocalDevHost() && coupleService.isDemoCouple() ? [...initialWishlistItems] : [];
    }
  }

  private saveToStorage(items: WishItem[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save wishlist items to localStorage', e);
    }
  }

  private notify() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lovia_wishlist_updated'));
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

      const { data, error } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('couple_id', couple.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[wishlistService] Failed to load wishlist from Supabase:', error);
        throw new Error('Ошибка БД: ' + error.message);
      }

      const mapped: WishItem[] = (data || []).map((row: any) => {
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
      });

      this.saveToStorage(mapped);

      if (userId) {
        return mapped.filter((item) => item.userId === userId);
      }
      return mapped;
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

    const all = this.loadFromStorage();
    const effectiveCategory = input.categoryId || 'gifts';
    const catInfo = this.getCategoryDetails(effectiveCategory);
    const now = new Date().toISOString();

    const newItem: WishItem = {
      id: `wish-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      imageUrl: input.imageUrl?.trim() || undefined,
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

    all.unshift(newItem);
    this.saveToStorage(all);
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

    if (isSupabaseConfigured() && !isLocalDevHost() && couple && couple.id !== 'couple-1') {
      const updateData: any = {};
      if (input.title !== undefined) updateData.title = input.title.trim();
      if (input.description !== undefined) updateData.description = input.description?.trim() || null;
      if (input.imageUrl !== undefined) updateData.image_url = input.imageUrl?.trim() || null;
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
      imageUrl: input.imageUrl !== undefined ? input.imageUrl?.trim() : existing.imageUrl,
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
