import { UserCategory, LOVIA_CATEGORY_PALETTE, DEFAULT_BASE_CATEGORIES } from '../types/category';
import { requestsService } from './requestsService';

const STORAGE_KEY = 'lovia_user_categories';

class CategoriesService {
  private categories: UserCategory[] = [];
  private initialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('lovia_couple_dissolved', () => {
        this.categories = [];
        this.save();
      });
    }
  }

  private notify() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lovia_categories_updated'));
    }
  }

  private init() {
    if (this.initialized) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.categories = Array.isArray(parsed) && parsed.length > 0
          ? parsed.map((c) => ({
              ...c,
              icon: c.icon || 'heart',
            }))
          : [...DEFAULT_BASE_CATEGORIES];
      } else {
        // Base categories available immediately out of the box
        this.categories = [...DEFAULT_BASE_CATEGORIES];
      }
    } catch {
      this.categories = [...DEFAULT_BASE_CATEGORIES];
    }
    this.initialized = true;
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.categories));
    } catch (e) {
      console.warn('Failed to save categories to localStorage:', e);
    }
    this.notify();
  }

  getCategories(): UserCategory[] {
    this.init();
    return this.categories.length > 0 ? [...this.categories] : [...DEFAULT_BASE_CATEGORIES];
  }

  getCategoryById(id: string): UserCategory | undefined {
    this.init();
    return (
      this.categories.find((c) => c.id === id) ||
      DEFAULT_BASE_CATEGORIES.find((c) => c.id === id)
    );
  }

  createCategory(name?: string, color?: string, icon?: string): UserCategory {
    this.init();
    const newCat: UserCategory = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name ? name.trim() : undefined,
      color: color || LOVIA_CATEGORY_PALETTE[0].hex,
      icon: icon || 'heart',
      createdAt: new Date().toISOString(),
    };
    this.categories.push(newCat);
    this.save();
    return newCat;
  }

  updateCategory(
    id: string,
    updates: { name?: string; color?: string; icon?: string }
  ): UserCategory | undefined {
    this.init();
    const cat = this.categories.find((c) => c.id === id);
    if (!cat) return undefined;

    if (updates.name !== undefined) cat.name = updates.name ? updates.name.trim() : undefined;
    if (updates.color !== undefined) cat.color = updates.color;
    if (updates.icon !== undefined) cat.icon = updates.icon;

    this.save();

    // Automatically update linked reminders so card backgrounds dynamically update in Home
    requestsService.updateCategoryInfo(id, cat.name, cat.color, cat.icon);

    return { ...cat };
  }

  deleteCategory(id: string): boolean {
    this.init();
    const prevLen = this.categories.length;
    this.categories = this.categories.filter((c) => c.id !== id);
    if (this.categories.length < prevLen) {
      this.save();
      requestsService.unlinkCategory(id);
      return true;
    }
    return false;
  }

  async deleteAndReassign(id: string, reassignToId?: string): Promise<boolean> {
    this.init();
    if (reassignToId) {
      const target = this.getCategoryById(reassignToId);
      if (target) {
        await requestsService.reassignCategory(
          id,
          target.id,
          target.name,
          target.color,
          target.icon
        );
      } else {
        await requestsService.unlinkCategory(id);
      }
    } else {
      await requestsService.unlinkCategory(id);
    }

    const prevLen = this.categories.length;
    this.categories = this.categories.filter((c) => c.id !== id);
    if (this.categories.length < prevLen) {
      this.save();
      return true;
    }
    return false;
  }

  resetToEmpty(): void {
    this.categories = [];
    this.save();
  }

  /**
   * Completely clears all shared categories upon couple dissolution
   */
  clearSharedData(): void {
    this.categories = [];
    this.initialized = true;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    } catch (e) {
      console.warn('Failed to clear categories from localStorage:', e);
    }
    this.notify();
  }
}

export const categoriesService = new CategoriesService();
