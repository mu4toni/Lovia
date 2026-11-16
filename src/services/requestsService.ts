import {
  CoupleProfile,
  CoupleReminder,
  CoupleEvent,
  CreateReminderInput,
} from '../types';
import {
  initialRequests,
  initialEvents,
  overdueRequest,
} from './mockData';
import { profileService } from './profileService';
import { coupleService } from './coupleService';

const STORAGE_REMINDERS_KEY = 'lovia_reminders';
const STORAGE_EVENTS_KEY = 'lovia_events';

class RemindersService {
  private reminders: CoupleReminder[] = [];
  private events: CoupleEvent[] = [];
  private initialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('lovia_couple_updated', () => {
        this.initialized = false;
      });
      window.addEventListener('lovia_couple_dissolved', () => {
        this.reminders = [];
        this.events = [];
        this.initialized = false;
      });
      window.addEventListener('lovia_couple_connected', () => {
        this.initialized = false;
      });
    }
  }

  private init() {
    if (this.initialized) return;
    try {
      const stored = localStorage.getItem(STORAGE_REMINDERS_KEY);
      if (stored !== null) {
        this.reminders = JSON.parse(stored);
      } else if (coupleService.isDemoCouple()) {
        this.reminders = [...initialRequests];
        this.save();
      } else {
        this.reminders = [];
        this.save();
      }

      const storedEvents = localStorage.getItem(STORAGE_EVENTS_KEY);
      if (storedEvents !== null) {
        this.events = JSON.parse(storedEvents);
      } else if (coupleService.isDemoCouple()) {
        this.events = [...initialEvents];
        this.saveEvents();
      } else {
        this.events = [];
        this.saveEvents();
      }
    } catch {
      this.reminders = coupleService.isDemoCouple() ? [...initialRequests] : [];
      this.events = coupleService.isDemoCouple() ? [...initialEvents] : [];
    }
    this.initialized = true;
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_REMINDERS_KEY, JSON.stringify(this.reminders));
    } catch (e) {
      console.warn('Failed to save reminders to localStorage:', e);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lovia_reminders_updated'));
      window.dispatchEvent(new CustomEvent('lovia_categories_updated'));
    }
  }

  private saveEvents() {
    try {
      localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(this.events));
    } catch (e) {
      console.warn('Failed to save events to localStorage:', e);
    }
  }

  async getProfile(): Promise<CoupleProfile> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(profileService.getCoupleProfile()), 60);
    });
  }

  async getRequests(includeOverdue = false): Promise<CoupleReminder[]> {
    this.init();
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = [...this.reminders];
        if (includeOverdue && !list.some((r) => r.id === overdueRequest.id)) {
          list.unshift(overdueRequest);
        }
        resolve(list);
      }, 80);
    });
  }

  async createRequest(input: CreateReminderInput): Promise<CoupleReminder> {
    this.init();
    const activeUser = coupleService.getActiveUser();
    const newReminder: CoupleReminder = {
      id: `rem-${Date.now()}`,
      title: input.title,
      description: input.description,
      authorId: activeUser.id,
      authorName: activeUser.name,
      targetId: input.targetId,
      targetName: input.targetName,
      dueDate: input.dueDate,
      dueLabel: input.dueLabel,
      dueTime: input.dueTime,
      urgency: input.urgency,
      categoryId: input.categoryId,
      categoryName: input.categoryName,
      categoryColor: input.categoryColor,
      categoryIcon: input.categoryIcon,
      category: input.category,
      status: 'pending',
      createdAt: new Date().toISOString(),
      rewardNote: input.rewardNote,
    };

    this.reminders.unshift(newReminder);
    this.save();
    return newReminder;
  }

  async updateRequest(id: string, input: Partial<CreateReminderInput>): Promise<CoupleReminder | undefined> {
    this.init();
    const index = this.reminders.findIndex((r) => r.id === id);
    if (index === -1) return undefined;

    const existing = this.reminders[index];
    const updated: CoupleReminder = {
      ...existing,
      title: input.title !== undefined ? input.title : existing.title,
      description: input.description !== undefined ? input.description : existing.description,
      targetId: input.targetId !== undefined ? input.targetId : existing.targetId,
      targetName: input.targetName !== undefined ? input.targetName : existing.targetName,
      dueDate: input.dueDate !== undefined ? input.dueDate : existing.dueDate,
      dueLabel: input.dueLabel !== undefined ? input.dueLabel : existing.dueLabel,
      dueTime: input.dueTime !== undefined ? input.dueTime : existing.dueTime,
      urgency: input.urgency !== undefined ? input.urgency : existing.urgency,
      categoryId: input.categoryId !== undefined ? input.categoryId : existing.categoryId,
      categoryName: input.categoryName !== undefined ? input.categoryName : existing.categoryName,
      categoryColor: input.categoryColor !== undefined ? input.categoryColor : existing.categoryColor,
      categoryIcon: input.categoryIcon !== undefined ? input.categoryIcon : existing.categoryIcon,
      category: input.category !== undefined ? input.category : existing.category,
      rewardNote: input.rewardNote !== undefined ? input.rewardNote : existing.rewardNote,
    };

    this.reminders[index] = updated;
    this.save();
    return { ...updated };
  }

  async toggleStatus(id: string): Promise<CoupleReminder | undefined> {
    this.init();
    const rem = this.reminders.find((r) => r.id === id);
    if (!rem) return undefined;

    rem.status = rem.status === 'completed' ? 'pending' : 'completed';
    this.save();
    return { ...rem };
  }

  async deleteRequest(id: string): Promise<boolean> {
    this.init();
    const prevLen = this.reminders.length;
    this.reminders = this.reminders.filter((r) => r.id !== id);
    this.save();
    return this.reminders.length < prevLen;
  }

  /**
   * Returns count of reminders (active and completed) associated with the category
   */
  getAffectedRemindersCount(categoryId: string): number {
    this.init();
    return this.reminders.filter(
      (r) => r.categoryId === categoryId || r.category === categoryId
    ).length;
  }

  /**
   * Safe category deletion: unlinks category from reminders so data is NEVER lost
   */
  async unlinkCategory(categoryId: string): Promise<void> {
    this.init();
    let updated = false;
    this.reminders = this.reminders.map((r) => {
      if (r.categoryId === categoryId || r.category === categoryId) {
        updated = true;
        return {
          ...r,
          categoryId: undefined,
          categoryName: undefined,
          categoryColor: undefined,
          categoryIcon: undefined,
          category: undefined,
        };
      }
      return r;
    });
    if (updated) {
      this.save();
    }
  }

  /**
   * Updates category info (color/name/icon) across all associated reminders
   */
  async updateCategoryInfo(categoryId: string, name?: string, color?: string, icon?: string): Promise<void> {
    this.init();
    let updated = false;
    this.reminders = this.reminders.map((r) => {
      if (r.categoryId === categoryId || r.category === categoryId) {
        updated = true;
        return {
          ...r,
          categoryName: name !== undefined ? name : r.categoryName,
          categoryColor: color !== undefined ? color : r.categoryColor,
          categoryIcon: icon !== undefined ? icon : r.categoryIcon,
        };
      }
      return r;
    });
    if (updated) {
      this.save();
    }
  }

  /**
   * Reassigns all reminders from one category to another
   */
  async reassignCategory(
    fromCategoryId: string,
    toCategoryId: string,
    toCategoryName?: string,
    toCategoryColor?: string,
    toCategoryIcon?: string
  ): Promise<void> {
    this.init();
    let updated = false;
    this.reminders = this.reminders.map((r) => {
      if (r.categoryId === fromCategoryId || r.category === fromCategoryId) {
        updated = true;
        return {
          ...r,
          categoryId: toCategoryId,
          category: toCategoryId,
          categoryName: toCategoryName,
          categoryColor: toCategoryColor,
          categoryIcon: toCategoryIcon,
        };
      }
      return r;
    });
    if (updated) {
      this.save();
    }
  }

  async getEvents(): Promise<CoupleEvent[]> {
    this.init();
    return new Promise((resolve) => {
      setTimeout(() => resolve([...this.events]), 60);
    });
  }

  /**
   * Completely clears all shared reminders and resets state upon couple dissolution
   */
  async clearSharedData(): Promise<void> {
    this.reminders = [];
    this.events = [];
    this.initialized = true;
    try {
      localStorage.setItem(STORAGE_REMINDERS_KEY, JSON.stringify([]));
      localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify([]));
    } catch (e) {
      console.warn('Failed to clear reminders from localStorage:', e);
    }
  }
}

export const requestsService = new RemindersService();
export const remindersService = requestsService;
