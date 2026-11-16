import { requestsService } from './requestsService';
import { categoriesService } from './categoriesService';
import { wishlistService } from './wishlistService';
import { relationshipService } from './relationshipService';
import { dateMemoryService } from './dateMemoryService';
import { telegramService } from './telegramService';
import { clearCelebrationHistory } from './celebrationService';

export interface RegisteredUser {
  id: string;
  name: string;
  gender?: 'male' | 'female';
  avatarUrl?: string;
  joinedDate: string;
  coupleId?: string | null;
}

export interface CoupleSpace {
  id: string;
  inviteCode: string;
  codeExpiresAt: string;
  codeStatus: 'active' | 'used' | 'expired';
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
      const storedUsers = localStorage.getItem(STORAGE_USERS_KEY);
      if (storedUsers) {
        this.users = JSON.parse(storedUsers);
      } else {
        this.users = { ...defaultUsers };
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(this.users));
      }

      const storedCouples = localStorage.getItem(STORAGE_COUPLES_KEY);
      if (storedCouples) {
        this.couples = JSON.parse(storedCouples);
      } else {
        this.couples = { 'couple-1': { ...defaultCouple } };
        localStorage.setItem(STORAGE_COUPLES_KEY, JSON.stringify(this.couples));
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
            .trim() || 'Пользователь';
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
      } else {
        const storedActiveId = localStorage.getItem(STORAGE_ACTIVE_USER_ID_KEY);
        if (storedActiveId && this.users[storedActiveId]) {
          this.activeUserId = storedActiveId;
        } else {
          this.activeUserId = 'user-marsel';
          localStorage.setItem(STORAGE_ACTIVE_USER_ID_KEY, this.activeUserId);
        }
      }
    } catch (e) {
      console.warn('Failed to load couple service from localStorage:', e);
      this.users = { ...defaultUsers };
      this.couples = { 'couple-1': { ...defaultCouple } };
      this.activeUserId = 'user-marsel';
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
          ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ').trim() || 'Пользователь'
          : 'Марсель';

      u = {
        id: this.activeUserId,
        name: defaultName,
        avatarUrl: isTg && tgUser ? tgUser.photo_url : undefined,
        joinedDate: new Date().toISOString().split('T')[0],
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
    this.init();
    const couple = this.getCurrentCouple();
    return Boolean(couple && couple.id === 'couple-1');
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
   * 1. CREATE A NEW COUPLE
   */
  async createCouple(input: {
    name: string;
    gender?: 'male' | 'female';
    startDate?: string;
  }): Promise<CoupleSpace> {
    this.init();
    const cleanName = input.name.trim();
    if (!cleanName) {
      throw new Error('Имя обязательно для создания пары.');
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
        return existing;
      }
    }

    const coupleId = `couple-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const inviteCode = this.generateUniqueInviteCode();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const effectiveStartDate = input.startDate || todayStr;
    // 7 days expiration
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const newCouple: CoupleSpace = {
      id: coupleId,
      inviteCode,
      codeExpiresAt: expiresAt,
      codeStatus: 'active',
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

    // Update active user profile
    this.updateActiveUserProfile({ name: cleanName, gender: input.gender });
    const user = this.getActiveUser();

    // Check if user is already in a connected couple
    const current = this.getCurrentCouple();
    if (current && current.status === 'connected') {
      throw new Error('Вы уже состоите в активной паре. Сначала разорвите текущую связь.');
    }

    // Find couple by code
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

    // Successfully link user as user2!
    targetCouple.user2 = {
      id: user.id,
      name: user.name,
      gender: user.gender,
      avatarUrl: user.avatarUrl,
    };
    targetCouple.status = 'connected';
    targetCouple.codeStatus = 'used';

    // Inherit already set startDate from targetCouple, or default to today
    const effectiveStartDate = targetCouple.startDate || new Date().toISOString().split('T')[0];
    targetCouple.startDate = effectiveStartDate;

    // Link both users to coupleId
    this.users[user.id].coupleId = targetCouple.id;
    if (this.users[targetCouple.user1.id]) {
      this.users[targetCouple.user1.id].coupleId = targetCouple.id;
    }

    // Initialize fresh shared space data for new couple
    await this.resetAllSharedSpaces();
    relationshipService.setStartDate(effectiveStartDate);

    this.saveToStorage();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lovia_couple_connected'));
    }

    return { ...targetCouple };
  }

  /**
   * Updates relationship start date in couple space and relationship service
   */
  updateStartDate(newStartDate: string): void {
    this.init();
    const user = this.users[this.activeUserId];
    if (user && user.coupleId && this.couples[user.coupleId]) {
      this.couples[user.coupleId].startDate = newStartDate;
      this.saveToStorage();
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

      // 1. Transactionally wipe all joint data
      await this.resetAllSharedSpaces();

      // 2. Mark couple dissolved
      couple.status = 'dissolved';
      couple.codeStatus = 'expired';
      couple.dissolvedAt = new Date().toISOString();

      // 3. Unlink BOTH participants from this couple
      if (this.users[couple.user1.id]) {
        this.users[couple.user1.id].coupleId = null;
      }
      if (couple.user2 && this.users[couple.user2.id]) {
        this.users[couple.user2.id].coupleId = null;
      }
      if (this.users[user.id]) {
        this.users[user.id].coupleId = null;
      }

      this.saveToStorage();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lovia_couple_dissolved'));
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
  cancelWaitingCouple(): void {
    this.init();
    const user = this.getActiveUser();
    if (user.coupleId && this.couples[user.coupleId]) {
      const c = this.couples[user.coupleId];
      if (c.status === 'waiting_partner') {
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
}

export const coupleService = new CoupleService();
