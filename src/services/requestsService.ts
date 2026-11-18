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
import { isLocalDevHost } from '../utils/env';
import { sendPartnerNotification } from './notificationService';
import { getSwrCacheSection, updateSwrCache } from './swrCache';
import { supabase, isSupabaseConfigured, callServerDb, shouldUseServerDb } from './api';

const STORAGE_REMINDERS_KEY = 'lovia_reminders';
const STORAGE_EVENTS_KEY = 'lovia_events';

class RemindersService {
  private reminders: CoupleReminder[] = [];
  private events: CoupleEvent[] = [];
  private initialized = false;
  private currentChannel: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('lovia_couple_updated', () => {
        this.initialized = false;
        this.subscribeToRealtime();
      });
      window.addEventListener('lovia_couple_connected', () => {
        this.initialized = false;
        this.subscribeToRealtime();
      });
      window.addEventListener('lovia_couple_dissolved', () => {
        this.reminders = [];
        this.events = [];
        this.initialized = false;
        if (this.currentChannel) {
          try {
            supabase.removeChannel(this.currentChannel);
            this.currentChannel = null;
          } catch {
            // ignore
          }
        }
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
        .channel(`reminders_${couple.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reminders',
            filter: `couple_id=eq.${couple.id}`,
          },
          async () => {
            await this.fetchFromSupabase(couple.id);
            window.dispatchEvent(new CustomEvent('lovia_reminders_updated'));
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[requestsService] Realtime subscription error:', e);
    }
  }

  private initLocal(): void {
    if (this.initialized) return;
    try {
      const stored = localStorage.getItem(STORAGE_REMINDERS_KEY);
      if (stored !== null) {
        this.reminders = JSON.parse(stored);
      } else if (isLocalDevHost() && coupleService.isDemoCouple()) {
        this.reminders = [...initialRequests];
        this.saveLocal();
      } else {
        this.reminders = [];
      }

      const storedEvents = localStorage.getItem(STORAGE_EVENTS_KEY);
      if (storedEvents !== null) {
        this.events = JSON.parse(storedEvents);
      } else if (isLocalDevHost() && coupleService.isDemoCouple()) {
        this.events = [...initialEvents];
        this.saveEventsLocal();
      } else {
        this.events = [];
      }
    } catch {
      this.reminders = isLocalDevHost() && coupleService.isDemoCouple() ? [...initialRequests] : [];
      this.events = isLocalDevHost() && coupleService.isDemoCouple() ? [...initialEvents] : [];
    }
    this.initialized = true;
  }

  private isRevalidating = false;

  hasCachedData(): boolean {
    this.initLocal();
    return this.reminders.length > 0;
  }

  private saveLocal() {
    try {
      localStorage.setItem(STORAGE_REMINDERS_KEY, JSON.stringify(this.reminders));
      const couple = coupleService.getCurrentCouple();
      if (couple && couple.id && couple.id !== 'couple-1') {
        updateSwrCache(couple.id, 'reminders', this.reminders);
      }
    } catch (e) {
      console.warn('Failed to save reminders to localStorage:', e);
    }
  }

  private notify() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lovia_reminders_updated'));
      window.dispatchEvent(new CustomEvent('lovia_categories_updated'));
    }
  }

  private saveEventsLocal() {
    try {
      localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(this.events));
    } catch (e) {
      console.warn('Failed to save events to localStorage:', e);
    }
  }

  async getProfile(): Promise<CoupleProfile> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(profileService.getCoupleProfile()), 40);
    });
  }

  mapReminderRow(row: any, couple?: any): CoupleReminder {
    const isUser1Target = couple ? row.for_user_id === couple.user1.id : false;
    const isUser2Target = couple && couple.user2 ? row.for_user_id === couple.user2.id : false;
    const targetName = isUser1Target
      ? couple?.user1.name || 'Партнёр'
      : isUser2Target
      ? couple?.user2?.name || 'Партнёр'
      : row.for_user_id === 'both'
      ? 'Для нас обоих'
      : 'Партнёр';

    const isUser1Author = couple ? row.created_by_id === couple.user1.id : false;
    const authorName = isUser1Author
      ? couple?.user1.name || 'Пользователь'
      : couple?.user2?.name || 'Партнёр';

    const dueLabel = row.due_date
      ? row.due_time
        ? `${row.due_date} · ${row.due_time}`
        : row.due_date
      : 'Несрочно';

    return {
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      authorId: row.created_by_id,
      authorName,
      targetId: row.for_user_id,
      targetName,
      dueDate: row.due_date || '',
      dueLabel,
      dueTime: row.due_time || undefined,
      remindBeforeMinutes: row.remind_before_minutes ?? 60,
      urgency: (row.priority as 'low' | 'medium' | 'high') || 'medium',
      categoryId: row.category_id || undefined,
      category: row.category_id || undefined,
      status: (row.status as 'pending' | 'completed') || 'pending',
      createdAt: row.created_at,
      rewardNote: row.reward_note || undefined,
    };
  }

  hydrateFromBundle(rows: any[], couple?: any): void {
    const effCouple = couple || coupleService.getCurrentCouple();
    const mapped = (rows || []).map((r) => this.mapReminderRow(r, effCouple));
    this.reminders = mapped;
    this.saveLocal();
    if (effCouple && effCouple.id && effCouple.id !== 'couple-1') {
      updateSwrCache(effCouple.id, 'reminders', mapped);
    }
    this.notify();
  }

  private async fetchFromSupabase(coupleId: string): Promise<CoupleReminder[]> {
    if (shouldUseServerDb()) {
      if (coupleService.isFresh() && this.reminders.length > 0) {
        return [...this.reminders];
      }
      try {
        await coupleService.syncCoupleFromSupabase();
        return [...this.reminders];
      } catch (e) {
        console.warn('[requestsService] get_bundle error via /api/db:', e);
      }
    }

    const couple = coupleService.getCurrentCouple();
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[requestsService] Failed to load reminders from Supabase:', error);
      throw new Error('Ошибка БД: ' + error.message);
    }

    const mapped: CoupleReminder[] = (data || []).map((row: any) => this.mapReminderRow(row, couple));

    this.reminders = mapped;
    this.saveLocal();
    updateSwrCache(coupleId, 'reminders', mapped);
    return mapped;
  }

  private async revalidateInBackground(coupleId: string): Promise<void> {
    if (this.isRevalidating) return;
    this.isRevalidating = true;
    try {
      await this.fetchFromSupabase(coupleId);
      this.notify();
    } catch (e) {
      console.warn('[requestsService] SWR background revalidation failed:', e);
    } finally {
      this.isRevalidating = false;
    }
  }

  async getRequests(includeOverdue = false): Promise<CoupleReminder[]> {
    this.initLocal();

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

      // Проверяем SWR-кэш, если в памяти список пуст
      if (this.reminders.length === 0) {
        const cached = getSwrCacheSection(couple.id, 'reminders') as CoupleReminder[] | undefined;
        if (Array.isArray(cached) && cached.length > 0) {
          this.reminders = cached;
        }
      }

      // Если в кэше уже есть данные, возвращаем их мгновенно (0 мс),
      // а свежие данные из Supabase тихо обновляем в фоне
      if (this.reminders.length > 0) {
        this.revalidateInBackground(couple.id);
        const list = [...this.reminders];
        if (includeOverdue && !list.some((r) => r.id === overdueRequest.id)) {
          list.unshift(overdueRequest);
        }
        return list;
      }

      return await this.fetchFromSupabase(couple.id);
    }

    const list = [...this.reminders];
    if (includeOverdue && !list.some((r) => r.id === overdueRequest.id)) {
      list.unshift(overdueRequest);
    }
    return list;
  }

  async createRequest(input: CreateReminderInput): Promise<CoupleReminder> {
    this.initLocal();
    const activeUser = coupleService.getActiveUser();
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

    if (shouldUseServerDb() && couple && couple.id !== 'couple-1') {
      const reminderId = `reminder-${crypto.randomUUID()}`;
      const optimisticReminder: CoupleReminder = {
        id: reminderId,
        title: input.title.trim(),
        description: input.description?.trim(),
        authorId: activeUser.id,
        authorName: activeUser.name,
        targetId: input.targetId,
        targetName: input.targetName,
        dueDate: input.dueDate,
        dueLabel: input.dueLabel,
        dueTime: input.dueTime,
        remindBeforeMinutes: input.remindBeforeMinutes ?? 60,
        urgency: input.urgency || 'medium',
        categoryId: input.categoryId || input.category,
        rewardNote: input.rewardNote?.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      // 0ms Optimistic UI update
      this.reminders.unshift(optimisticReminder);
      this.saveLocal();
      this.notify();

      try {
        const serverRow = await callServerDb<any>('reminders_create', {
          id: reminderId,
          couple_id: couple.id,
          title: input.title.trim(),
          description: input.description?.trim(),
          for_user_id: input.targetId,
          due_date: input.dueDate || null,
          due_time: input.dueTime || null,
          remind_before_minutes: input.remindBeforeMinutes ?? 60,
          priority: input.urgency || 'medium',
          category_id: input.categoryId || input.category || null,
          reward_note: input.rewardNote?.trim() || null,
        });

        if (serverRow) {
          const updated = this.mapReminderRow(serverRow, couple);
          const idx = this.reminders.findIndex((r) => r.id === reminderId);
          if (idx !== -1) {
            this.reminders[idx] = updated;
            this.saveLocal();
          }
        }
      } catch (err) {
        console.error('[requestsService] Failed to create reminder on server, rolling back:', err);
        this.reminders = this.reminders.filter((r) => r.id !== reminderId);
        this.saveLocal();
        this.notify();
        throw err;
      }

      if (optimisticReminder.targetId !== 'user-self' && optimisticReminder.targetId !== activeUser.id) {
        sendPartnerNotification('reminder_created', {
          title: optimisticReminder.title,
          dueLabel: optimisticReminder.dueLabel,
          dueTime: optimisticReminder.dueTime,
          isCommon:
            optimisticReminder.targetId === 'all' ||
            optimisticReminder.targetId === 'both' ||
            optimisticReminder.targetId === 'common',
        });
      }
      return optimisticReminder;
    }

    const newReminder: CoupleReminder = {
      id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: input.title.trim(),
      description: input.description?.trim(),
      authorId: activeUser.id,
      authorName: activeUser.name,
      targetId: input.targetId,
      targetName: input.targetName,
      dueDate: input.dueDate,
      dueLabel: input.dueLabel,
      dueTime: input.dueTime,
      remindBeforeMinutes: input.remindBeforeMinutes ?? 60,
      urgency: input.urgency,
      categoryId: input.categoryId,
      categoryName: input.categoryName,
      categoryColor: input.categoryColor,
      categoryIcon: input.categoryIcon,
      category: input.category,
      status: 'pending',
      createdAt: new Date().toISOString(),
      rewardNote: input.rewardNote?.trim(),
    };

    if (isSupabaseConfigured() && !isLocalDevHost() && couple) {
      const row = {
        id: newReminder.id,
        couple_id: couple.id,
        title: newReminder.title,
        category_id: newReminder.categoryId || null,
        priority: newReminder.urgency || 'medium',
        for_user_id: newReminder.targetId,
        created_by_id: newReminder.authorId,
        status: newReminder.status,
        due_date: newReminder.dueDate || null,
        due_time: newReminder.dueTime || null,
        remind_before_minutes: newReminder.remindBeforeMinutes ?? 60,
        created_at: newReminder.createdAt,
      };

      const { error } = await supabase.from('reminders').insert(row);
      if (error) {
        console.error('[requestsService] Failed to insert reminder in Supabase:', error);
        throw new Error('Ошибка БД: ' + error.message);
      }
    }

    this.reminders.unshift(newReminder);
    this.saveLocal();
    this.notify();

    // Мгновенное Telegram-уведомление партнёру (только если задача не создана чисто для себя)
    if (newReminder.targetId !== 'user-self' && newReminder.targetId !== activeUser.id) {
      sendPartnerNotification('reminder_created', {
        title: newReminder.title,
        dueLabel: newReminder.dueLabel,
        dueTime: newReminder.dueTime,
        isCommon:
          newReminder.targetId === 'all' ||
          newReminder.targetId === 'both' ||
          newReminder.targetId === 'common',
      });
    }

    return newReminder;
  }

  async updateRequest(id: string, input: Partial<CreateReminderInput>): Promise<CoupleReminder | undefined> {
    this.initLocal();
    const couple = coupleService.getCurrentCouple();

    if (shouldUseServerDb()) {
      const patch: any = {};
      if (input.title !== undefined) patch.title = input.title.trim();
      if (input.description !== undefined) patch.description = input.description.trim() || null;
      if (input.targetId !== undefined) patch.for_user_id = input.targetId;
      if (input.urgency !== undefined) patch.priority = input.urgency;
      if (input.categoryId !== undefined || input.category !== undefined) {
        patch.category_id = input.categoryId || input.category || null;
      }
      if (input.dueDate !== undefined) patch.due_date = input.dueDate || null;
      if (input.dueTime !== undefined) patch.due_time = input.dueTime || null;
      if (input.remindBeforeMinutes !== undefined) patch.remind_before_minutes = input.remindBeforeMinutes;
      if (input.rewardNote !== undefined) patch.reward_note = input.rewardNote.trim() || null;

      const serverRow = await callServerDb<any>('reminders_update', { id, patch });
      const updated = this.mapReminderRow(serverRow, coupleService.getCurrentCouple());
      const idx = this.reminders.findIndex((r) => r.id === id);
      if (idx !== -1) {
        this.reminders[idx] = updated;
      }
      this.saveLocal();
      this.notify();
      return updated;
    }

    if (isSupabaseConfigured() && !isLocalDevHost() && couple && couple.id !== 'couple-1') {
      const updateData: any = {};
      if (input.title !== undefined) updateData.title = input.title.trim();
      if (input.urgency !== undefined) updateData.priority = input.urgency;
      if (input.targetId !== undefined) updateData.for_user_id = input.targetId;
      if (input.dueDate !== undefined) updateData.due_date = input.dueDate || null;
      if (input.dueTime !== undefined) updateData.due_time = input.dueTime || null;
      if (input.remindBeforeMinutes !== undefined) updateData.remind_before_minutes = input.remindBeforeMinutes;
      if (input.categoryId !== undefined) updateData.category_id = input.categoryId || null;

      const { error } = await supabase
        .from('reminders')
        .update(updateData)
        .eq('id', id)
        .eq('couple_id', couple.id);

      if (error) {
        console.error('[requestsService] Failed to update reminder in Supabase:', error);
        throw new Error('Ошибка БД: ' + error.message);
      }
    }

    const index = this.reminders.findIndex((r) => r.id === id);
    if (index === -1) return undefined;

    const existing = this.reminders[index];
    const updated: CoupleReminder = {
      ...existing,
      title: input.title !== undefined ? input.title.trim() : existing.title,
      description: input.description !== undefined ? input.description.trim() : existing.description,
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
    this.saveLocal();
    this.notify();
    return { ...updated };
  }

  async toggleStatus(id: string): Promise<CoupleReminder | undefined> {
    this.initLocal();
    const rem = this.reminders.find((r) => r.id === id);
    if (!rem) return undefined;

    const oldStatus = rem.status;
    const newStatus = oldStatus === 'completed' ? 'pending' : 'completed';
    const couple = coupleService.getCurrentCouple();

    // 0ms Optimistic UI update
    rem.status = newStatus;
    this.saveLocal();
    this.notify();

    if (newStatus === 'completed') {
      sendPartnerNotification('reminder_completed', {
        title: rem.title,
      });
    }

    if (shouldUseServerDb()) {
      callServerDb<any>('reminders_toggle', {
        id,
        status: newStatus,
      }).then((serverRow) => {
        if (serverRow) {
          const updated = this.mapReminderRow(serverRow, coupleService.getCurrentCouple());
          rem.status = updated.status;
          this.saveLocal();
        }
      }).catch((err) => {
        console.error('[requestsService] Failed to toggle reminder status on server, rolling back:', err);
        rem.status = oldStatus;
        this.saveLocal();
        this.notify();
      });

      return { ...rem };
    }

    if (isSupabaseConfigured() && !isLocalDevHost() && couple && couple.id !== 'couple-1') {
      const { error } = await supabase
        .from('reminders')
        .update({
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .eq('couple_id', couple.id);

      if (error) {
        console.error('[requestsService] Failed to toggle reminder status in Supabase:', error);
        rem.status = oldStatus;
        this.saveLocal();
        this.notify();
        throw new Error('Ошибка БД: ' + error.message);
      }
    }

    return { ...rem };
  }

  async deleteRequest(id: string): Promise<boolean> {
    this.initLocal();
    const couple = coupleService.getCurrentCouple();
    const prevIndex = this.reminders.findIndex((r) => r.id === id);
    if (prevIndex === -1) return true;
    const deletedItem = this.reminders[prevIndex];

    // 0ms Optimistic UI update
    this.reminders = this.reminders.filter((r) => r.id !== id);
    this.saveLocal();
    this.notify();

    if (shouldUseServerDb()) {
      try {
        await callServerDb('reminders_delete', { id });
        return true;
      } catch (err) {
        console.error('[requestsService] Failed to delete reminder on server, rolling back:', err);
        this.reminders.splice(prevIndex, 0, deletedItem);
        this.saveLocal();
        this.notify();
        throw err;
      }
    }

    if (isSupabaseConfigured() && !isLocalDevHost() && couple && couple.id !== 'couple-1') {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id)
        .eq('couple_id', couple.id);

      if (error) {
        console.error('[requestsService] Failed to delete reminder from Supabase:', error);
        throw new Error('Ошибка БД: ' + error.message);
      }
    }

    const prevLen = this.reminders.length;
    this.reminders = this.reminders.filter((r) => r.id !== id);
    this.saveLocal();
    this.notify();
    return this.reminders.length < prevLen;
  }

  getAffectedRemindersCount(categoryId: string): number {
    this.initLocal();
    return this.reminders.filter(
      (r) => r.categoryId === categoryId || r.category === categoryId
    ).length;
  }

  async unlinkCategory(categoryId: string): Promise<void> {
    this.initLocal();
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
      this.saveLocal();
      this.notify();
    }
  }

  async updateCategoryInfo(categoryId: string, name?: string, color?: string, icon?: string): Promise<void> {
    this.initLocal();
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
      this.saveLocal();
      this.notify();
    }
  }

  async reassignCategory(
    fromCategoryId: string,
    toCategoryId: string,
    toCategoryName?: string,
    toCategoryColor?: string,
    toCategoryIcon?: string
  ): Promise<void> {
    this.initLocal();
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
      this.saveLocal();
      this.notify();
    }
  }

  async getEvents(): Promise<CoupleEvent[]> {
    this.initLocal();
    if (isSupabaseConfigured() && !isLocalDevHost()) {
      const couple = coupleService.getCurrentCouple();
      if (couple && couple.id !== 'couple-1') {
        try {
          const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('couple_id', couple.id);

          if (!error && data && data.length > 0) {
            return data.map((e: any) => ({
              id: e.id,
              title: e.title,
              date: e.date,
              time: e.time || undefined,
              category: (e.category || 'dates') as any,
              emoji: e.emoji || '✨',
              location: e.location || undefined,
            }));
          }
        } catch {
          // fallback to local events
        }
      }
    }
    return [...this.events];
  }

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
