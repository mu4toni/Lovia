import { WishItem, CreateWishInput, UpdateWishInput, WISHLIST_CATEGORIES } from '../types/wishlist';
import { initialWishlistItems } from './mockWishlistData';
import { coupleService } from './coupleService';
import { isLocalDevHost } from '../utils/env';

const STORAGE_KEY = 'lovia_wishlist_items_v1';

class WishlistService {
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
        this.saveToStorage([]);
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

  /**
   * Получить список желаний. Если указан userId, возвращает только желания этого пользователя.
   */
  async getWishlist(userId?: string): Promise<WishItem[]> {
    await new Promise((res) => setTimeout(res, 40));
    const all = this.loadFromStorage();
    if (userId) {
      return all.filter((item) => item.userId === userId);
    }
    return all;
  }

  /**
   * Создать новое желание (привязывается к текущему пользователю).
   */
  async createWishItem(userId: string, input: CreateWishInput): Promise<WishItem> {
    await new Promise((res) => setTimeout(res, 60));
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

    all.unshift(newItem);
    this.saveToStorage(all);
    return newItem;
  }

  /**
   * Обновить существующее желание (только владелец может редактировать).
   */
  async updateWishItem(
    id: string,
    currentUserId: string,
    input: UpdateWishInput
  ): Promise<WishItem> {
    await new Promise((res) => setTimeout(res, 60));
    const all = this.loadFromStorage();
    const index = all.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new Error('Желание не найдено');
    }

    const existing = all[index];
    if (existing.userId !== currentUserId) {
      throw new Error('Вы можете редактировать только собственные желания');
    }

    const catInfo = input.categoryId
      ? this.getCategoryDetails(input.categoryId)
      : { categoryLabel: existing.categoryLabel, categoryColor: existing.categoryColor };

    const updated: WishItem = {
      ...existing,
      title: input.title !== undefined ? input.title.trim() : existing.title,
      description: input.description !== undefined ? input.description.trim() || undefined : existing.description,
      imageUrl: input.imageUrl !== undefined ? input.imageUrl.trim() || undefined : existing.imageUrl,
      linkUrl: input.linkUrl !== undefined ? input.linkUrl.trim() || undefined : existing.linkUrl,
      estimatedPrice: input.estimatedPrice !== undefined
        ? (input.estimatedPrice ? Math.max(0, input.estimatedPrice) : undefined)
        : existing.estimatedPrice,
      currency: input.currency || existing.currency || '₽',
      categoryId: input.categoryId || existing.categoryId,
      categoryLabel: catInfo.categoryLabel,
      categoryColor: catInfo.categoryColor,
      comment: input.comment !== undefined ? input.comment.trim() || undefined : existing.comment,
      updatedAt: new Date().toISOString(),
    };

    all[index] = updated;
    this.saveToStorage(all);
    return updated;
  }

  /**
   * Удалить желание (только владелец может удалять).
   */
  async deleteWishItem(id: string, currentUserId: string): Promise<boolean> {
    await new Promise((res) => setTimeout(res, 50));
    const all = this.loadFromStorage();
    const item = all.find((w) => w.id === id);

    if (!item) {
      return false;
    }

    if (item.userId !== currentUserId) {
      throw new Error('Вы можете удалять только собственные желания');
    }

    const filtered = all.filter((w) => w.id !== id);
    this.saveToStorage(filtered);
    return true;
  }

  /**
   * Секретно зарезервировать желание партнёра («Я подарю это! 🤫»).
   * Владелец не может резервировать собственное желание.
   */
  async toggleReserveWishItem(id: string, currentUserId: string): Promise<WishItem> {
    await new Promise((res) => setTimeout(res, 50));
    const all = this.loadFromStorage();
    const index = all.findIndex((w) => w.id === id);

    if (index === -1) {
      throw new Error('Желание не найдено');
    }

    const item = all[index];
    if (item.userId === currentUserId) {
      throw new Error('Нельзя зарезервировать подарок для самого себя');
    }

    const willReserve = !item.isReserved;

    const updated: WishItem = {
      ...item,
      isReserved: willReserve,
      reservedByUserId: willReserve ? currentUserId : undefined,
      reservedAt: willReserve ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };

    all[index] = updated;
    this.saveToStorage(all);
    return updated;
  }

  /**
   * Сбросить список до тестовых данных
   */
  async resetToMock(): Promise<WishItem[]> {
    this.saveToStorage(initialWishlistItems);
    return [...initialWishlistItems];
  }

  /**
   * Completely clears all shared wishlist items upon couple dissolution
   */
  async clearSharedData(): Promise<void> {
    try {
      this.saveToStorage([]);
    } catch (e) {
      console.warn('Failed to clear wishlist items from localStorage:', e);
    }
  }
}

export const wishlistService = new WishlistService();
