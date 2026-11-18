import { requestsService } from './requestsService';
import { categoriesService } from './categoriesService';
import { wishlistService } from './wishlistService';
import { relationshipService } from './relationshipService';
import { dateMemoryService } from './dateMemoryService';
import { telegramService } from './telegramService';
import { clearCelebrationHistory } from './celebrationService';
import { isLocalDevHost } from '../utils/env';
import { sendPartnerNotification } from './notificationService';
import { getSwrCacheSection, updateSwrCache, clearSwrCache } from './swrCache';
import {
  supabase,
  isSupabaseConfigured,
  ensureUserInSupabase,
  fetchUserById,
  updateUserCoupleId,
  callServerDb,
  shouldUseServerDb,
} from './api';

import type { SpaceType } from '../types/couple';
export type { SpaceType };

export interface RegisteredUser {
  id: string;
  name: string;
  gender?: 'male' | 'female';
  avatarUrl?: string;
  joinedDate: string;
  coupleId?: string | null;
  timezoneOffset?: number;
  notificationsEnabled?: boolean;
}

export interface CoupleSpace {
  id: string;
  inviteCode: string;
  codeExpiresAt: string;
  codeStatus: 'active' | 'used' | 'expired';
  spaceType?: SpaceType;
  user1: {
    id: string;
    name: string;
    gender?: 'male' | 'female';
    avatarUrl?: string;
  };
  user2?: {
    id: string;
    name: string;
    gender?: 'male' | 'female';
    avatarUrl?: string;
  };
  status: 'waiting_partner' | 'connected' | 'dissolved';
  startDate?: string;
  createdAt: string;
  dissolvedAt?: string;
}

const STORAGE_COUPLES_KEY = 'lovia_couples_registry_v1';
const STORAGE_USERS_KEY = 'lovia_accounts_registry_v1';
const STORAGE_ACTIVE_USER_ID_KEY = 'lovia_active_user_id_v1';

// Initial pre-seeded demo state
const defaultUsers: Record<string, RegisteredUser> = {
  'user-marsel': {
    id: 'user-marsel',
    name: 'Марсель',
    gender: 'male',
    joinedDate: '2025-10-14',
    coupleId: 'couple-1',
  },
  'user-alisa': {
    id: 'user-alisa',
    name: 'Алиса',
    gender: 'female',
    joinedDate: '2025-10-14',
    coupleId: 'couple-1',
  },
};

const defaultCouple: CoupleSpace = {
  id: 'couple-1',
  inviteCode: 'LOVE-MARSEL-ALISA-77',
  codeExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  codeStatus: 'used',
  spaceType: 'relationship',
  user1: {
    id: 'user-marsel',
    name: 'Марсель',
    gender: 'male',
  },
  user2: {
    id: 'user-alisa',
    name: 'Алиса',
    gender: 'female',
  },
  status: 'connected',
  startDate: '2025-12-08',
  createdAt: '2025-10-14T10:00:00.000Z',
};

class CoupleService {
  private users: Record<string, RegisteredUser> = {};
  private couples: Record<string, CoupleSpace> = {};
  private activeUserId = 'user-marsel';
  private initialized = false;
  private subscriptionRequired = false;
  private channelUrl = '';
  private lastSyncAt = 0;
  private hiddenAt = 0;
  private inFlightBundlePromise: Promise<CoupleSpace | null> | null = null;

  isFresh(maxAgeMs = 15000): boolean {
    return this.lastSyncAt > 0 && Date.now() - this.lastSyncAt < maxAgeMs;
  }

  getLastSyncAt(): number {
    return this.lastSyncAt;
  }

  isSubscriptionRequired(): boolean {
    return this.subscriptionRequired;
  }

  getRequiredChannelUrl(): string {
    return this.channelUrl;
  }

  setSubscriptionRequired(required: boolean, channelUrl?: string): void {
    const changed = this.subscriptionRequired !== required || (channelUrl && this.channelUrl !== channelUrl);
    this.subscriptionRequired = required;
    if (channelUrl) this.channelUrl = channelUrl;
    if (changed && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(required ? 'lovia_subscription_required' : 'lovia_subscription_resolved', {
          detail: { channelUrl: this.channelUrl },
        })
      );
    }
  }

  /**
   * Проверить подписку на канал вручную с клиента (кнопка «Я подписался — проверить»)
   */
  async verifyChannelSubscription(): Promise<boolean> {
    if (!shouldUseServerDb()) {
      return true;
    }

    try {
      const res = await callServerDb<{
        subscribed: boolean;
        subscriptionRequired: boolean;
        channelUrl?: string;
        error?: string;
      }>('check_subscription');

      if (!res) {
        throw new Error('Пустой ответ от сервера при проверке подписки');
      }

      // Если Telegram API вернул явную ошибку (например, бот не админ в канале)
      if (res.error) {
        console.error('[coupleService] Telegram check_subscription error:', res.error);
        let userMessage = res.error;
        if (/chat not found/i.test(res.error)) {
          userMessage = 'Канал не найден или бот не добавлен администратором в канал.';
        } else if (/bot is not a member/i.test(res.error)) {
          userMessage = 'Бот не является участником или администратором канала.';
        }
        throw new Error(userMessage);
      }

      if (res.subscribed) {
        // Сразу скрываем экран блокировки и возвращаем true
        this.setSubscriptionRequired(false);
        // Запускаем фоновую синхронизацию данных без блокировки UI
        this.syncCoupleFromSupabase().catch((err) => {
          console.warn('[coupleService] Background sync after subscription error:', err);
        });
        return true;
      }

      // Пользователь проверен и действительно не подписан
      this.setSubscriptionRequired(true, res.channelUrl);
      return false;
    } catch (e: any) {
      console.warn('[coupleService] verifyChannelSubscription error:', e?.message || e);
      // Пробрасываем ошибку наружу в SubscriptionGate
      throw e;
    }
  }

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (
          e.key === STORAGE_COUPLES_KEY ||
          e.key === STORAGE_USERS_KEY ||
          e.key === STORAGE_ACTIVE_USER_ID_KEY
        ) {
          this.loadFromStorage();
          this.notify();
          const current = this.getCurrentCouple();
          if (!current || current.status === 'dissolved') {
            window.dispatchEvent(new CustomEvent('lovia_couple_dissolved'));
          } else if (current.status === 'connected') {
            window.dispatchEvent(new CustomEvent('lovia_couple_connected'));
          }
        }
      });

      // Centralized silent background sync on tab visibility (throttled: >=10s away, >=15s since last sync)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.hiddenAt = Date.now();
          return;
        }
        const now = Date.now();
        const awayTime = this.hiddenAt > 0 ? now - this.hiddenAt : 0;
        const timeSinceSync = now - this.lastSyncAt;

        if (awayTime >= 10000 && timeSinceSync >= 15000 && (isSupabaseConfigured() || shouldUseServerDb())) {
          this.syncCurrentCoupleFromSupabase(true);
        }
      });

      // Initial background sync to restore couple session from Supabase
      setTimeout(() => {
        if (isSupabaseConfigured() || shouldUseServerDb()) {
          this.syncCurrentCoupleFromSupabase();
        }
      }, 50);
    }
  }

  private notify() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lovia_couple_updated'));
      window.dispatchEvent(new CustomEvent('lovia_profile_updated'));
      window.dispatchEvent(new CustomEvent('lovia_relationship_updated'));
    }
  }

  private init() {
    if (this.initialized) return;
    this.loadFromStorage();
    this.initialized = true;
  }

  private loadFromStorage() {
    try {
      const isDevHost = isLocalDevHost();
      const storedUsers = localStorage.getItem(STORAGE_USERS_KEY);
      if (storedUsers) {
        this.users = JSON.parse(storedUsers);
        if (!isDevHost) {
          // In non-local-dev host, purge default demo users if present
          delete this.users['user-marsel'];
          delete this.users['user-alisa'];
        }
      } else if (isDevHost) {
        this.users = { ...defaultUsers };
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(this.users));
      } else {
        this.users = {};
      }

      const storedCouples = localStorage.getItem(STORAGE_COUPLES_KEY);
      if (storedCouples) {
        this.couples = JSON.parse(storedCouples);
        if (!isDevHost && this.couples['couple-1']) {
          delete this.couples['couple-1'];
        }
      } else if (isDevHost) {
        this.couples = { 'couple-1': { ...defaultCouple } };
        localStorage.setItem(STORAGE_COUPLES_KEY, JSON.stringify(this.couples));
      } else {
        this.couples = {};
      }

      // Check if running in a real Telegram environment with an authenticated Telegram user
      const isTg = telegramService.isTelegramEnv();
      const tgUser = telegramService.getTelegramUser();

      if (isTg && tgUser) {
        const tgId = `tg_${tgUser.id}`;
        if (!this.users[tgId]) {
          const fullName = [tgUser.first_name, tgUser.last_name]
            .filter(Boolean)
            .join(' ')
            .trim() || tgUser.first_name || '';
          this.users[tgId] = {
            id: tgId,
            name: fullName,
            avatarUrl: tgUser.photo_url,
            joinedDate: new Date().toISOString().split('T')[0],
            coupleId: null,
          };
          localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(this.users));
        } else if (tgUser.photo_url && !this.users[tgId].avatarUrl) {
          this.users[tgId].avatarUrl = tgUser.photo_url;
          localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(this.users));
        }

        this.activeUserId = tgId;
        localStorage.setItem(STORAGE_ACTIVE_USER_ID_KEY, this.activeUserId);

        // Гарантируем сохранение/обновление пользователя в public.users с telegram_id при запуске в Telegram
        if (isSupabaseConfigured()) {
          setTimeout(() => {
            this.ensureUserInSupabase(this.users[tgId]).catch((err) => {
              console.warn('[coupleService] Initial Telegram user upsert skipped/failed:', err?.message || err);
            });
          }, 50);
        }
      } else {
        const storedActiveId = localStorage.getItem(STORAGE_ACTIVE_USER_ID_KEY);
        if (storedActiveId && this.users[storedActiveId]) {
          this.activeUserId = storedActiveId;
        } else if (isDevHost) {
          this.activeUserId = 'user-marsel';
          localStorage.setItem(STORAGE_ACTIVE_USER_ID_KEY, this.activeUserId);
        } else {
          // Clean production/mobile state: new guest user with empty name and coupleId: null
          const guestId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          this.activeUserId = guestId;
          this.users[guestId] = {
            id: guestId,
            name: '',
            joinedDate: new Date().toISOString().split('T')[0],
            coupleId: null,
          };
          localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(this.users));
          localStorage.setItem(STORAGE_ACTIVE_USER_ID_KEY, this.activeUserId);
        }
      }
    } catch (e) {
      console.warn('Failed to load couple service from localStorage:', e);
      if (isLocalDevHost()) {
        this.users = { ...defaultUsers };
        this.couples = { 'couple-1': { ...defaultCouple } };
        this.activeUserId = 'user-marsel';
      } else {
        this.users = {};
        this.couples = {};
        this.activeUserId = 'guest';
      }
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(this.users));
      localStorage.setItem(STORAGE_COUPLES_KEY, JSON.stringify(this.couples));
      localStorage.setItem(STORAGE_ACTIVE_USER_ID_KEY, this.activeUserId);
    } catch (e) {
      console.error('Failed to save couple registry to localStorage:', e);
    }
    this.notify();
  }

  /**
   * Generates a unique, elegant, easy-to-read code: e.g. LOVIA-7492-MK
   */
  private generateUniqueInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      const part1 = Array.from({ length: 4 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
      ).join('');
      const part2 = Array.from({ length: 4 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
      ).join('');
      code = `LOVIA-${part1}-${part2}`;
    } while (Object.values(this.couples).some((c) => c.inviteCode === code));
    return code;
  }

  getActiveUser(): RegisteredUser {
    this.init();
    let u = this.users[this.activeUserId];
    if (!u) {
      const isTg = telegramService.isTelegramEnv();
      const tgUser = telegramService.getTelegramUser();
      const defaultName =
        isTg && tgUser
          ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ').trim() || tgUser.first_name || ''
          : isLocalDevHost()
          ? 'Марсель'
          : '';

      u = {
        id: this.activeUserId,
        name: defaultName,
        avatarUrl: isTg && tgUser ? tgUser.photo_url : undefined,
        joinedDate: new Date().toISOString().split('T')[0],
        coupleId: isLocalDevHost() ? 'couple-1' : null,
      };
      this.users[this.activeUserId] = u;
      this.saveToStorage();
    }
    return { ...u };
  }

  updateActiveUserProfile(updates: {
    name?: string;
    gender?: 'male' | 'female';
    avatarUrl?: string;
  }): RegisteredUser {
    this.init();
    const user = this.users[this.activeUserId] || {
      id: this.activeUserId,
      name: 'Гость',
      joinedDate: new Date().toISOString().split('T')[0],
    };

    if (updates.name !== undefined) user.name = updates.name.trim();
    if (updates.gender !== undefined) user.gender = updates.gender;
    if (updates.avatarUrl !== undefined) user.avatarUrl = updates.avatarUrl;

    this.users[this.activeUserId] = user;

    // Also update name in active couple if exists
    if (user.coupleId && this.couples[user.coupleId]) {
      const couple = this.couples[user.coupleId];
      if (couple.user1.id === user.id) {
        couple.user1.name = user.name;
        if (updates.avatarUrl) couple.user1.avatarUrl = updates.avatarUrl;
        if (updates.gender) couple.user1.gender = updates.gender;
      } else if (couple.user2?.id === user.id) {
        couple.user2.name = user.name;
        if (updates.avatarUrl) couple.user2.avatarUrl = updates.avatarUrl;
        if (updates.gender) couple.user2.gender = updates.gender;
      }
    }

    this.saveToStorage();
    if (shouldUseServerDb()) {
      (async () => {
        let finalAvatar = updates.avatarUrl;
        if (finalAvatar && finalAvatar.startsWith('data:image')) {
          try {
            const uploadRes = await callServerDb<{ publicUrl: string }>('upload_media', {
              base64Data: finalAvatar,
              type: 'avatar',
            });
            if (uploadRes?.publicUrl) {
              finalAvatar = uploadRes.publicUrl;
              user.avatarUrl = finalAvatar;
              if (user.coupleId && this.couples[user.coupleId]) {
                const c = this.couples[user.coupleId];
                if (c.user1.id === user.id) c.user1.avatarUrl = finalAvatar;
                else if (c.user2?.id === user.id) c.user2.avatarUrl = finalAvatar;
              }
              this.saveToStorage();
              this.notify();
            }
          } catch (e) {
            console.warn('[coupleService] Failed to upload avatar via upload_media:', e);
          }
        }
        await callServerDb('update_profile', {
          name: updates.name,
          gender: updates.gender,
          avatarUrl: finalAvatar,
        });
      })().catch((e) => console.warn('[coupleService] update_profile error via /api/db:', e));
    }
    return { ...user };
  }

  getCurrentCouple(): CoupleSpace | null {
    this.init();
    const user = this.users[this.activeUserId];
    if (!user || !user.coupleId) return null;

    const couple = this.couples[user.coupleId];
    if (!couple || couple.status === 'dissolved') return null;

    return { ...couple };
  }

  isConnected(): boolean {
    const couple = this.getCurrentCouple();
    return Boolean(couple && couple.status === 'connected' && couple.user2);
  }

  isWaitingPartner(): boolean {
    const couple = this.getCurrentCouple();
    return Boolean(couple && couple.status === 'waiting_partner');
  }

  isDemoCouple(): boolean {
    if (!isLocalDevHost()) return false;
    this.init();
    const couple = this.getCurrentCouple();
    return Boolean(couple && couple.id === 'couple-1');
  }

  getSpaceType(): SpaceType {
    this.init();
    const couple = this.getCurrentCouple();
    return couple?.spaceType || 'relationship';
  }

  /**
   * Resets and clears all shared spaces across all services.
   * Ensures storage is set to empty arrays and no old couple data leaks.
   */
  private async resetAllSharedSpaces(): Promise<void> {
    await requestsService.clearSharedData();
    categoriesService.clearSharedData();
    await wishlistService.clearSharedData();
    relationshipService.clearSharedData();
    dateMemoryService.clearSharedData();
    clearCelebrationHistory();
  }

  /**
   * Полная очистка локальных данных пары и кэшей
   */
  private clearLocalCoupleData(coupleId?: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const keysToRemove = [
          'lovia_couples_registry_v1',
          'lovia_reminders',
          'lovia_events',
          'lovia_wishlist_items_v1',
          'lovia_relationship_start_date_v1',
          'lovia_memorable_dates_v1',
          'lovia_date_memories_v1',
          'lovia_celebrated_events_v1',
          'lovia_user_categories',
        ];
        keysToRemove.forEach((k) => localStorage.removeItem(k));

        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith('lovia_swr_cache_')) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (e) {
      console.warn('[coupleService] Failed to clear local couple storage:', e);
    }

    if (coupleId) {
      clearSwrCache(coupleId);
    }
    clearSwrCache();
  }

  /**
   * Гарантирует наличие записи пользователя в public.users перед операциями с public.couples.
   */
  async ensureUserInSupabase(user?: RegisteredUser): Promise<void> {
    const targetUser = user || this.getActiveUser();
    await ensureUserInSupabase(targetUser);
  }

  /**
   * Подписка на Realtime-изменения статуса пары в Supabase
   */
  private subscribeToCoupleUpdates(coupleId: string): void {
    if (!isSupabaseConfigured() || coupleId === 'couple-1') return;

    try {
      supabase
        .channel(`couple_${coupleId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'couples',
            filter: `id=eq.${coupleId}`,
          },
          async () => {
            await this.syncCoupleFromSupabase(coupleId);
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[coupleService] Realtime subscription error:', e);
    }
  }

  applyBundle(bundle: {
    user: any;
    couple: any;
    partner: any;
    reminders: any[];
    wishlist: any[];
    memorableDates: any[];
    dateMemories: any[];
  }): CoupleSpace | null {
    const active = this.getActiveUser();

    if (bundle.user) {
      this.users[active.id] = {
        ...this.users[active.id],
        id: bundle.user.id || active.id,
        name: bundle.user.name || active.name,
        avatarUrl: bundle.user.avatar_url || active.avatarUrl,
        gender: bundle.user.gender || active.gender,
        coupleId: bundle.couple ? bundle.couple.id : null,
      };
    }

    if (!bundle.couple || bundle.couple.status === 'dissolved') {
      const oldId = this.users[active.id]?.coupleId;
      if (oldId || Object.keys(this.couples).length > 0) {
        this.couples = {};
        if (this.users[active.id]) {
          this.users[active.id].coupleId = null;
        }
        this.resetAllSharedSpaces().catch((err) =>
          console.warn('[coupleService] Failed to reset shared spaces in applyBundle:', err)
        );
        this.clearLocalCoupleData(oldId || undefined);
        this.saveToStorage();
        this.notify();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('lovia_couple_dissolved'));
        }
      }
      return null;
    }

    const coupleRow = bundle.couple;
    const user1Data = coupleRow.user1_id === active.id ? bundle.user : bundle.partner;
    const user2Data = coupleRow.user2_id === active.id ? bundle.user : bundle.partner;

    const syncedCouple: CoupleSpace = {
      id: coupleRow.id,
      inviteCode: coupleRow.invite_code,
      codeExpiresAt: coupleRow.code_expires_at,
      codeStatus: coupleRow.code_status as 'active' | 'used' | 'expired',
      spaceType: (coupleRow.space_type as SpaceType) || 'relationship',
      user1: {
        id: coupleRow.user1_id,
        name: user1Data?.name || 'Пользователь',
        gender: (user1Data?.gender as 'male' | 'female') || undefined,
        avatarUrl: user1Data?.avatar_url || undefined,
      },
      user2: coupleRow.user2_id
        ? {
            id: coupleRow.user2_id,
            name: user2Data?.name || 'Партнёр',
            gender: (user2Data?.gender as 'male' | 'female') || undefined,
            avatarUrl: user2Data?.avatar_url || undefined,
          }
        : undefined,
      status: coupleRow.status as 'waiting_partner' | 'connected' | 'dissolved',
      startDate: coupleRow.start_date || undefined,
      createdAt: coupleRow.created_at,
      dissolvedAt: coupleRow.dissolved_at || undefined,
    };

    const targetId = syncedCouple.id;
    const wasWaiting = this.couples[targetId]?.status === 'waiting_partner';
    this.couples[targetId] = syncedCouple;
    this.users[active.id].coupleId = targetId;
    updateSwrCache(targetId, 'couple', syncedCouple);

    if (bundle.partner) {
      this.users[bundle.partner.id] = {
        id: bundle.partner.id,
        name: bundle.partner.name,
        gender: bundle.partner.gender,
        avatarUrl: bundle.partner.avatar_url,
        joinedDate: bundle.partner.joined_date || new Date().toISOString().split('T')[0],
        coupleId: targetId,
      };
    }

    if (Array.isArray(bundle.reminders)) {
      requestsService.hydrateFromBundle(bundle.reminders, syncedCouple);
    }
    if (Array.isArray(bundle.wishlist)) {
      wishlistService.hydrateFromBundle(bundle.wishlist, syncedCouple.id);
    }
    if (Array.isArray(bundle.memorableDates)) {
      relationshipService.hydrateFromBundle(bundle.memorableDates, syncedCouple.id);
    }
    if (Array.isArray(bundle.dateMemories)) {
      dateMemoryService.hydrateFromBundle(bundle.dateMemories, syncedCouple.id);
    }

    this.saveToStorage();
    this.notify();

    if (wasWaiting && syncedCouple.status === 'connected' && syncedCouple.user2) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lovia_couple_connected'));
      }
    }

    return syncedCouple;
  }

  /**
   * Синхронизация данных пары из Supabase с локальным состоянием
   */
  async syncCoupleFromSupabase(coupleIdToSync?: string, force = false): Promise<CoupleSpace | null> {
    if (shouldUseServerDb()) {
      if (!force && this.isFresh() && this.getCurrentCouple()) {
        return this.getCurrentCouple();
      }

      if (this.inFlightBundlePromise) {
        return this.inFlightBundlePromise;
      }

      this.inFlightBundlePromise = (async () => {
        try {
          const bundle = await callServerDb<any>('get_bundle');
          if (bundle) {
            if (bundle.subscriptionRequired) {
              this.setSubscriptionRequired(true, bundle.channelUrl);
              return null;
            }
            this.setSubscriptionRequired(false);
            this.lastSyncAt = Date.now();
            return this.applyBundle(bundle);
          }
        } catch (err: any) {
          console.warn('[coupleService] get_bundle error via /api/db:', err?.message || err);
        } finally {
          this.inFlightBundlePromise = null;
        }
        return null;
      })();

      return this.inFlightBundlePromise;
    }

    if (!isSupabaseConfigured()) return null;

    const user = this.getActiveUser();
    const targetId = coupleIdToSync || user.coupleId;
    if (!targetId || targetId === 'couple-1') return null;

    // Мгновенное восстановление из локального SWR-кэша, если ещё нет в памяти
    if (!this.couples[targetId]) {
      const cached = getSwrCacheSection(targetId, 'couple') as CoupleSpace | undefined;
      if (cached) {
        this.couples[targetId] = cached;
        this.users[user.id].coupleId = targetId;
      }
    }

    try {
      const { data: coupleRow, error } = await supabase
        .from('couples')
        .select('*')
        .eq('id', targetId)
        .maybeSingle();

      if (error) {
        console.warn('[coupleService] syncCoupleFromSupabase error:', error.message);
        return null;
      }

      if (!coupleRow) {
        if (this.couples[targetId]) {
          delete this.couples[targetId];
          this.users[user.id].coupleId = null;
          this.saveToStorage();
          this.notify();
        }
        return null;
      }

      // Параллельный запрос данных участников (убираем водопад)
      const [user1Data, user2Data] = await Promise.all([
        fetchUserById(coupleRow.user1_id),
        coupleRow.user2_id ? fetchUserById(coupleRow.user2_id) : Promise.resolve(null),
      ]);

      const wasWaiting = this.couples[targetId]?.status === 'waiting_partner';

      const syncedCouple: CoupleSpace = {
        id: coupleRow.id,
        inviteCode: coupleRow.invite_code,
        codeExpiresAt: coupleRow.code_expires_at,
        codeStatus: coupleRow.code_status as 'active' | 'used' | 'expired',
        spaceType: (coupleRow.space_type as SpaceType) || 'relationship',
        user1: {
          id: coupleRow.user1_id,
          name: user1Data?.name || 'Пользователь',
          gender: (user1Data?.gender as 'male' | 'female') || undefined,
          avatarUrl: user1Data?.avatar_url || undefined,
        },
        user2: coupleRow.user2_id
          ? {
              id: coupleRow.user2_id,
              name: user2Data?.name || 'Партнёр',
              gender: (user2Data?.gender as 'male' | 'female') || undefined,
              avatarUrl: user2Data?.avatar_url || undefined,
            }
          : undefined,
        status: coupleRow.status as 'waiting_partner' | 'connected' | 'dissolved',
        startDate: coupleRow.start_date || undefined,
        createdAt: coupleRow.created_at,
        dissolvedAt: coupleRow.dissolved_at || undefined,
      };

      this.couples[targetId] = syncedCouple;
      this.users[user.id].coupleId = targetId;
      // Сохраняем в SWR-кэш для мгновенного старта
      updateSwrCache(targetId, 'couple', syncedCouple);

      if (user1Data) {
        this.users[user1Data.id] = {
          id: user1Data.id,
          name: user1Data.name,
          gender: (user1Data.gender as 'male' | 'female') || undefined,
          avatarUrl: user1Data.avatar_url || undefined,
          joinedDate: user1Data.joined_date || new Date().toISOString().split('T')[0],
          coupleId: targetId,
        };
      }

      if (user2Data) {
        this.users[user2Data.id] = {
          id: user2Data.id,
          name: user2Data.name,
          gender: (user2Data.gender as 'male' | 'female') || undefined,
          avatarUrl: user2Data.avatar_url || undefined,
          joinedDate: user2Data.joined_date || new Date().toISOString().split('T')[0],
          coupleId: targetId,
        };
      }

      this.saveToStorage();
      this.notify();

      if (wasWaiting && syncedCouple.status === 'connected' && syncedCouple.user2) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('lovia_couple_connected'));
        }
      }

      // Параллельная загрузка данных всех сервисов без блокировки рендера
      if (syncedCouple.status === 'connected') {
        this.preloadAllCoupleData(syncedCouple.id);
      }

      return syncedCouple;
    } catch (e: any) {
      console.warn('[coupleService] Failed syncCoupleFromSupabase:', e?.message || e);
      return null;
    }
  }

  /**
   * Подтягивает актуальную пару из Supabase при старте приложения и возвращении в Telegram
   */
  async syncCurrentCoupleFromSupabase(force = false): Promise<CoupleSpace | null> {
    if (shouldUseServerDb()) {
      return this.syncCoupleFromSupabase(undefined, force);
    }
    if (!isSupabaseConfigured()) return null;
    this.init();

    const user = this.getActiveUser();
    const tgUser = telegramService.getTelegramUser();

    // 1. Если локально coupleId не привязан, проверяем в public.users
    if (!user.coupleId || user.coupleId === 'couple-1') {
      try {
        let dbUser: any = null;
        if (tgUser?.id) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', Number(tgUser.id))
            .maybeSingle();
          dbUser = data;
        }
        if (!dbUser && user.id && user.id !== 'user-marsel' && !user.id.startsWith('guest')) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          dbUser = data;
        }

        if (dbUser && dbUser.couple_id) {
          user.coupleId = dbUser.couple_id;
          if (dbUser.name) user.name = dbUser.name;
          if (dbUser.avatar_url) user.avatarUrl = dbUser.avatar_url;
          this.users[user.id] = { ...user };
          this.saveToStorage();
        }
      } catch (e) {
        console.warn('[coupleService] Failed checking user in Supabase:', e);
      }
    }

    // Автоматическая синхронизация пользователя (telegram_id, timezone, etc.) в public.users
    const effectiveUserId = user.id && user.id !== 'user-marsel' && !user.id.startsWith('guest') ? user.id : null;
    if (effectiveUserId) {
      this.ensureUserInSupabase(user).catch((err) => {
        console.warn('[coupleService] Failed to auto-ensure user in Supabase during sync:', err?.message || err);
      });
    }

    // 2. Если coupleId есть, подтягиваем актуальные данные из public.couples
    if (user.coupleId && user.coupleId !== 'couple-1') {
      const synced = await this.syncCoupleFromSupabase(user.coupleId);
      if (synced) {
        this.subscribeToCoupleUpdates(user.coupleId);
        this.notify();
        return synced;
      }
    }

    return null;
  }

  /**
   * Проверка подключения партнёра (для поллинга в ожидании подключения)
   */
  async checkPartnerConnected(): Promise<boolean> {
    const couple = this.getCurrentCouple();
    if (!couple || couple.status !== 'waiting_partner') return false;
    const synced = await this.syncCoupleFromSupabase(couple.id);
    return Boolean(synced && synced.status === 'connected' && synced.user2);
  }

  /**
   * Параллельная предзагрузка всех активных сервисов пары (Promise.all).
   * Устраняет водопад запросов и прогревает локальный SWR-кэш.
   */
  preloadAllCoupleData(coupleId: string): void {
    if (!coupleId || coupleId === 'couple-1') return;
    Promise.all([
      requestsService.getRequests(false),
      wishlistService.getWishlist(),
      relationshipService.fetchMemorableDates(),
      dateMemoryService.fetchDateMemories(),
    ]).catch((err) => {
      console.warn('[coupleService] Background parallel preload error:', err);
    });
  }

  /**
   * 1. CREATE A NEW COUPLE
   */
  async createCouple(input: {
    name: string;
    gender?: 'male' | 'female';
    startDate?: string;
    spaceType?: SpaceType;
  }): Promise<CoupleSpace> {
    this.init();
    const cleanName = input.name.trim();
    if (!cleanName) {
      throw new Error('Имя обязательно для создания пары.');
    }

    // Если приложение запущено НЕ на localhost и Supabase не настроен — сразу выбрасываем ошибку
    if (!isLocalDevHost() && !isSupabaseConfigured()) {
      throw new Error('Не настроены ключи Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
    }

    // Update active user profile
    this.updateActiveUserProfile({ name: cleanName, gender: input.gender });
    const user = this.getActiveUser();

    // Check if user is already waiting in an active couple
    const existing = this.getCurrentCouple();
    if (existing) {
      if (existing.status === 'connected') {
        throw new Error('Вы уже состоите в активной паре.');
      }
      if (existing.status === 'waiting_partner') {
        if (input.startDate) {
          existing.startDate = input.startDate;
          relationshipService.setStartDate(input.startDate);
          this.saveToStorage();
        }
        if (input.spaceType) {
          existing.spaceType = input.spaceType;
          this.saveToStorage();
        }
        return existing;
      }
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const effectiveStartDate = input.startDate || todayStr;
    const effectiveSpaceType: SpaceType = input.spaceType || 'relationship';

    if (shouldUseServerDb()) {
      const serverCouple = await callServerDb<any>('create_couple', {
        startDate: effectiveStartDate,
        spaceType: effectiveSpaceType,
      });

      const newCouple: CoupleSpace = {
        id: serverCouple.id,
        inviteCode: serverCouple.invite_code,
        codeExpiresAt: serverCouple.code_expires_at,
        codeStatus: serverCouple.code_status || 'active',
        spaceType: (serverCouple.space_type as SpaceType) || effectiveSpaceType,
        user1: {
          id: user.id,
          name: user.name,
          gender: user.gender,
          avatarUrl: user.avatarUrl,
        },
        status: 'waiting_partner',
        startDate: serverCouple.start_date || effectiveStartDate,
        createdAt: serverCouple.created_at || now.toISOString(),
      };

      this.couples[serverCouple.id] = newCouple;
      this.users[user.id].coupleId = serverCouple.id;

      // Initialize clean shared spaces for new couple
      await this.resetAllSharedSpaces();
      relationshipService.setStartDate(effectiveStartDate);

      this.saveToStorage();
      this.subscribeToCoupleUpdates(serverCouple.id);
      this.notify();
      return { ...newCouple };
    }

    // 1. Обязательно гарантируем наличие пользователя в public.users перед записью в public.couples
    await this.ensureUserInSupabase(user);

    const coupleId = `couple-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const inviteCode = this.generateUniqueInviteCode().toUpperCase();
    // 7 days expiration
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // 2. Запись в Supabase при наличии подключения
    if (isSupabaseConfigured()) {
      const { error: insertError } = await supabase
        .from('couples')
        .insert({
          id: coupleId,
          invite_code: inviteCode,
          code_expires_at: expiresAt,
          code_status: 'active',
          user1_id: user.id,
          status: 'waiting_partner',
          start_date: effectiveStartDate,
          space_type: effectiveSpaceType,
        });

      if (insertError) {
        console.error('[coupleService] Failed to create couple in Supabase:', insertError);
        throw new Error('Ошибка БД: ' + insertError.message);
      }

      // Обновляем couple_id у user1 в public.users
      await updateUserCoupleId(user.id, coupleId);

      // Запускаем подписку на Realtime-обновления
      this.subscribeToCoupleUpdates(coupleId);
    }

    const newCouple: CoupleSpace = {
      id: coupleId,
      inviteCode,
      codeExpiresAt: expiresAt,
      codeStatus: 'active',
      spaceType: effectiveSpaceType,
      user1: {
        id: user.id,
        name: user.name,
        gender: user.gender,
        avatarUrl: user.avatarUrl,
      },
      status: 'waiting_partner',
      startDate: effectiveStartDate,
      createdAt: now.toISOString(),
    };

    this.couples[coupleId] = newCouple;
    this.users[user.id].coupleId = coupleId;

    // Initialize clean shared spaces for new couple
    await this.resetAllSharedSpaces();
    relationshipService.setStartDate(effectiveStartDate);

    this.saveToStorage();
    return { ...newCouple };
  }

  /**
   * 2. JOIN A COUPLE BY INVITE CODE
   */
  async joinCoupleByCode(input: {
    code: string;
    name: string;
    gender?: 'male' | 'female';
  }): Promise<CoupleSpace> {
    this.init();
    const cleanName = input.name.trim();
    if (!cleanName) {
      throw new Error('Укажите ваше имя перед подключением к паре.');
    }

    const cleanCode = input.code.trim().toUpperCase();
    if (!cleanCode) {
      throw new Error('Введите код пары.');
    }

    // Если приложение запущено НЕ на localhost и Supabase не настроен — сразу выбрасываем ошибку
    if (!isLocalDevHost() && !isSupabaseConfigured()) {
      throw new Error('Не настроены ключи Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
    }

    // Update active user profile
    this.updateActiveUserProfile({ name: cleanName, gender: input.gender });
    const user = this.getActiveUser();

    // Check if user is already in a connected couple
    const current = this.getCurrentCouple();
    if (current && current.status === 'connected') {
      throw new Error('Вы уже состоите в активной паре. Сначала разорвите текущую связь.');
    }

    let targetCoupleId = '';
    let targetCoupleCode = cleanCode;
    let targetSpaceType: SpaceType = 'relationship';
    let effectiveStartDate = new Date().toISOString().split('T')[0];
    let user1Info: CoupleSpace['user1'] = {
      id: '',
      name: 'Партнёр',
      gender: undefined,
      avatarUrl: undefined,
    };
    let createdAt = new Date().toISOString();

    if (shouldUseServerDb()) {
      const res = await callServerDb<{ couple: any; partner: any }>('join_couple', {
        inviteCode: cleanCode,
      });
      const c = res.couple;
      const partnerData = res.partner;

      targetCoupleId = c.id;
      targetCoupleCode = c.invite_code;
      targetSpaceType = (c.space_type as SpaceType) || 'relationship';
      effectiveStartDate = c.start_date || effectiveStartDate;
      createdAt = c.created_at || new Date().toISOString();

      if (partnerData) {
        user1Info = {
          id: partnerData.id,
          name: partnerData.name,
          gender: (partnerData.gender as 'male' | 'female') || undefined,
          avatarUrl: partnerData.avatar_url || undefined,
        };
      } else {
        user1Info.id = c.user1_id;
      }
    } else if (isSupabaseConfigured()) {
      // 1. Строгий прямой запрос в Supabase: НЕ ищем в локальном массиве!
      const { data: targetCouple, error } = await supabase
        .from('couples')
        .select('*')
        .ilike('invite_code', cleanCode)
        .maybeSingle();

      if (error) {
        console.error('[coupleService] Supabase query error for invite_code:', error);
        throw new Error('Ошибка БД: ' + error.message);
      }

      if (!targetCouple) {
        throw new Error('Код пары не найден. Проверьте правильность ввода.');
      }

      if (targetCouple.status === 'dissolved') {
        throw new Error('Это совместное пространство было расформировано.');
      }

      if (new Date(targetCouple.code_expires_at).getTime() < Date.now()) {
        throw new Error('Срок действия этого кода истёк. Попросите партнёра создать новый код.');
      }

      if (targetCouple.user1_id === user.id) {
        throw new Error('Вы не можете подключиться к собственному коду. Отправьте его партнёру.');
      }

      if (targetCouple.user2_id && targetCouple.user2_id !== user.id) {
        throw new Error('К этой паре уже подключены два участника. Подключение невозможно.');
      }

      // 2. Гарантируем запись второго пользователя в public.users перед подключением к паре
      await this.ensureUserInSupabase(user);

      // 3. Обновляем пару в Supabase
      const { error: updateError } = await supabase
        .from('couples')
        .update({
          user2_id: user.id,
          status: 'connected',
          code_status: 'used',
        })
        .eq('id', targetCouple.id);

      if (updateError) {
        console.error('[coupleService] Failed to link user2 in Supabase couple:', updateError);
        throw new Error('Ошибка БД: ' + updateError.message);
      }

      // 4. Обновляем couple_id у обоих пользователей
      await updateUserCoupleId(user.id, targetCouple.id);
      await updateUserCoupleId(targetCouple.user1_id, targetCouple.id);

      // 5. Загружаем данные первого партнёра из public.users
      const user1Data = await fetchUserById(targetCouple.user1_id);
      if (user1Data) {
        user1Info = {
          id: user1Data.id,
          name: user1Data.name,
          gender: (user1Data.gender as 'male' | 'female') || undefined,
          avatarUrl: user1Data.avatar_url || undefined,
        };
      } else {
        user1Info.id = targetCouple.user1_id;
      }

      targetCoupleId = targetCouple.id;
      targetCoupleCode = targetCouple.invite_code;
      targetSpaceType = (targetCouple.space_type as SpaceType) || 'relationship';
      effectiveStartDate = targetCouple.start_date || effectiveStartDate;
      createdAt = targetCouple.created_at;
    } else {
      if (!isLocalDevHost()) {
        throw new Error('Не настроены ключи Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
      }
      // Локальный фолбэк для оффлайн/тестового режима (ТОЛЬКО на localhost)
      const targetCouple = Object.values(this.couples).find(
        (c) => c.inviteCode.toUpperCase() === cleanCode
      );

      if (!targetCouple) {
        throw new Error('Код пары не найден. Проверьте правильность ввода.');
      }

      if (targetCouple.status === 'dissolved') {
        throw new Error('Это совместное пространство было расформировано.');
      }

      if (new Date(targetCouple.codeExpiresAt).getTime() < Date.now()) {
        targetCouple.codeStatus = 'expired';
        this.saveToStorage();
        throw new Error('Срок действия этого кода истёк. Попросите партнёра создать новый код.');
      }

      if (targetCouple.user1.id === user.id) {
        throw new Error('Вы не можете подключиться к собственному коду. Отправьте его партнёру.');
      }

      if (targetCouple.user2 && targetCouple.user2.id !== user.id) {
        throw new Error('К этой паре уже подключены два участника. Подключение невозможно.');
      }

      targetCoupleId = targetCouple.id;
      targetCoupleCode = targetCouple.inviteCode;
      targetSpaceType = targetCouple.spaceType || 'relationship';
      user1Info = { ...targetCouple.user1 };
      effectiveStartDate = targetCouple.startDate || effectiveStartDate;
      createdAt = targetCouple.createdAt;
    }

    // Successfully link user as user2!
    const connectedCouple: CoupleSpace = {
      id: targetCoupleId,
      inviteCode: targetCoupleCode,
      codeExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      codeStatus: 'used',
      spaceType: targetSpaceType,
      user1: user1Info,
      user2: {
        id: user.id,
        name: user.name,
        gender: user.gender,
        avatarUrl: user.avatarUrl,
      },
      status: 'connected',
      startDate: effectiveStartDate,
      createdAt,
    };

    this.couples[targetCoupleId] = connectedCouple;
    this.users[user.id].coupleId = targetCoupleId;
    if (user1Info.id) {
      this.users[user1Info.id] = {
        id: user1Info.id,
        name: user1Info.name,
        gender: user1Info.gender,
        avatarUrl: user1Info.avatarUrl,
        joinedDate: new Date().toISOString().split('T')[0],
        coupleId: targetCoupleId,
      };
    }

    // Initialize fresh shared space data for new couple
    await this.resetAllSharedSpaces();
    relationshipService.setStartDate(effectiveStartDate);

    this.saveToStorage();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lovia_couple_connected'));
    }

    sendPartnerNotification('couple_connected');

    return { ...connectedCouple };
  }

  /**
   * Updates relationship start date in couple space and relationship service
   */
  async updateStartDate(newStartDate: string): Promise<void> {
    this.init();
    const user = this.users[this.activeUserId];
    if (user && user.coupleId && this.couples[user.coupleId]) {
      this.couples[user.coupleId].startDate = newStartDate;
      this.saveToStorage();

      if (shouldUseServerDb()) {
        try {
          await callServerDb('update_start_date', {
            coupleId: user.coupleId,
            startDate: newStartDate,
          });
        } catch (e) {
          console.warn('[coupleService] Failed to update start_date via /api/db:', e);
        }
      } else if (isSupabaseConfigured() && user.coupleId !== 'couple-1') {
        try {
          await supabase
            .from('couples')
            .update({ start_date: newStartDate })
            .eq('id', user.coupleId);
        } catch (e) {
          console.warn('[coupleService] Failed to update start_date in Supabase:', e);
        }
      }
    }
    relationshipService.setStartDate(newStartDate);
    this.notify();
  }

  /**
   * 3. FULL DISSOLUTION / TEARDOWN OF SHARED SPACE
   */
  async dissolveCouple(): Promise<{ success: boolean; error?: string }> {
    this.init();
    try {
      const user = this.getActiveUser();
      const coupleId = user.coupleId;

      if (!coupleId || !this.couples[coupleId]) {
        // Already unpaired
        return { success: true };
      }

      const couple = this.couples[coupleId];
      // Запоминаем ID партнёра ДО обнуления пары в базе и локальном хранилище!
      const partnerId = couple.user1.id === user.id ? couple.user2?.id : couple.user1.id;

      if (shouldUseServerDb()) {
        await callServerDb('dissolve_couple', { coupleId });
      } else if (isSupabaseConfigured() && coupleId !== 'couple-1') {
        const { error: dissolveError } = await supabase
          .from('couples')
          .update({
            status: 'dissolved',
            code_status: 'expired',
            dissolved_at: new Date().toISOString(),
          })
          .eq('id', coupleId);

        if (dissolveError) {
          console.error('[coupleService] Failed to dissolve couple in Supabase:', dissolveError);
          throw new Error(`Ошибка разрыва связи в базе данных: ${dissolveError.message}`);
        }

        // Unlink users in Supabase
        await updateUserCoupleId(couple.user1.id, null);
        if (couple.user2) {
          await updateUserCoupleId(couple.user2.id, null);
        }
      }

      // 1. Transactionally wipe all joint data
      await this.resetAllSharedSpaces();

      // 2. Clear couples and unlink both participants
      this.couples = {};
      if (this.users[couple.user1.id]) {
        this.users[couple.user1.id].coupleId = null;
      }
      if (couple.user2 && this.users[couple.user2.id]) {
        this.users[couple.user2.id].coupleId = null;
      }
      if (this.users[user.id]) {
        this.users[user.id].coupleId = null;
      }

      // 3. Clear local storage and SWR caches
      this.clearLocalCoupleData(coupleId);
      this.saveToStorage();
      this.notify();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lovia_couple_dissolved'));
      }

      if (partnerId) {
        sendPartnerNotification('couple_dissolved', { partnerId, coupleId });
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Произошла непредвиденная ошибка при разрыве связи.';
      console.error('Failed to dissolve couple:', err);
      return { success: false, error: msg };
    }
  }

  /**
   * Cancel waiting couple code (if user created a code but wants to join partner's instead)
   */
  async cancelWaitingCouple(): Promise<void> {
    this.init();
    const user = this.getActiveUser();
    if (user.coupleId && this.couples[user.coupleId]) {
      const c = this.couples[user.coupleId];
      if (c.status === 'waiting_partner') {
        if (shouldUseServerDb()) {
          try {
            await callServerDb('dissolve_couple', { coupleId: user.coupleId });
          } catch (e) {
            console.warn('[coupleService] Failed to cancel waiting couple via /api/db:', e);
          }
        } else if (isSupabaseConfigured() && user.coupleId !== 'couple-1') {
          try {
            await supabase.from('couples').delete().eq('id', user.coupleId);
            await updateUserCoupleId(user.id, null);
          } catch (e) {
            console.warn('[coupleService] Failed to delete waiting couple from Supabase:', e);
          }
        }
        delete this.couples[user.coupleId];
      }
    }
    this.users[user.id].coupleId = null;
    this.saveToStorage();
  }

  /**
   * Test switch helper: switch between test user personas
   */
  switchTestUser(userId: string, nameFallback?: string, genderFallback?: 'male' | 'female'): RegisteredUser {
    this.init();
    if (!this.users[userId]) {
      this.users[userId] = {
        id: userId,
        name: nameFallback || (userId.includes('alisa') ? 'Алиса' : 'Тестовый пользователь'),
        gender: genderFallback || (userId.includes('alisa') ? 'female' : 'male'),
        joinedDate: new Date().toISOString().split('T')[0],
      };
    }
    this.activeUserId = userId;
    this.saveToStorage();
    return { ...this.users[userId] };
  }

  /**
   * Resets entire storage back to initial pre-seeded couple
   */
  resetToDemo(): void {
    this.users = { ...defaultUsers };
    this.couples = { 'couple-1': { ...defaultCouple } };
    this.activeUserId = 'user-marsel';
    this.saveToStorage();
    try {
      localStorage.removeItem('lovia_reminders');
      localStorage.removeItem('lovia_events');
      localStorage.removeItem('lovia_wishlist_items_v1');
      localStorage.removeItem('lovia_relationship_start_date_v1');
      localStorage.removeItem('lovia_memorable_dates_v1');
      localStorage.removeItem('lovia_date_memories_v1');
      localStorage.removeItem('lovia_user_categories');
      localStorage.removeItem('lovia_celebrated_events_v1');
    } catch (e) {
      console.warn('Failed to clean demo storage keys:', e);
    }
    this.notify();
  }

  /**
   * Запрос 6-значного кода подтверждения на удаление аккаунта в Telegram-бот
   */
  async requestAccountDeletion(): Promise<{ success: boolean; error?: string }> {
    this.init();
    try {
      if (shouldUseServerDb()) {
        await callServerDb('request_account_deletion', {});
        return { success: true };
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Не удалось запросить код удаления аккаунта.';
      console.error('[coupleService] requestAccountDeletion error:', err);
      return { success: false, error: msg };
    }
  }

  /**
   * Полное подтверждённое удаление аккаунта и очистка всех локальных данных
   */
  async confirmAccountDeletion(code: string): Promise<{ success: boolean; error?: string }> {
    this.init();
    try {
      if (shouldUseServerDb()) {
        await callServerDb('confirm_account_deletion', { code: code.trim() });
      }

      // Полная очистка SWR-кэша и локального хранилища
      clearSwrCache();
      try {
        if (typeof window !== 'undefined') {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('lovia_') || key.startsWith('telegram_') || key.startsWith('sb-'))) {
              localStorage.removeItem(key);
            }
          }
          localStorage.clear();
        }
      } catch (e) {
        console.warn('[coupleService] Failed to clear localStorage:', e);
      }

      // Сброс локального состояния
      this.couples = {};
      this.activeUserId = 'user-marsel';
      this.notify();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lovia_account_deleted'));
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Не удалось подтвердить удаление аккаунта.';
      console.error('[coupleService] confirmAccountDeletion error:', err);
      return { success: false, error: msg };
    }
  }
}

export const coupleService = new CoupleService();
