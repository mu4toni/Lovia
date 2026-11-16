import { CoupleProfile } from '../types/couple';
import { initialCoupleProfile } from './mockData';
import { relationshipService } from './relationshipService';
import { coupleService } from './coupleService';
import { supabase, isSupabaseConfigured } from './api';

const NOTIFICATIONS_KEY = 'lovia_notifications_enabled';

export interface UserProfileData {
  id: string;
  name: string;
  gender?: 'male' | 'female';
  avatarUrl?: string;
  joinedDate: string;
}

export interface PartnerProfileData {
  id: string;
  name: string;
  avatarUrl?: string;
  isPartnerConnected: boolean;
  inviteCode: string;
}

class ProfileService {
  private notificationsEnabled = true;
  private initialized = false;

  private notify() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lovia_profile_updated'));
      window.dispatchEvent(new CustomEvent('lovia_relationship_updated'));
    }
  }

  private init() {
    if (this.initialized) return;
    try {
      const notifs = localStorage.getItem(NOTIFICATIONS_KEY);
      if (notifs !== null) {
        this.notificationsEnabled = notifs === 'true';
      }
    } catch {
      // Fallback
    }
    this.initialized = true;

    // Фоновая синхронизация настройки уведомлений из Supabase
    if (isSupabaseConfigured()) {
      const activeUser = coupleService.getActiveUser();
      const effectiveUserId =
        activeUser?.id && activeUser.id !== 'user-marsel' && !activeUser.id.startsWith('guest')
          ? activeUser.id
          : null;
      if (effectiveUserId) {
        supabase
          .from('users')
          .select('notifications_enabled')
          .eq('id', effectiveUserId)
          .maybeSingle()
          .then(({ data }) => {
            if (data && typeof data.notifications_enabled === 'boolean') {
              this.notificationsEnabled = data.notifications_enabled;
              try {
                localStorage.setItem(NOTIFICATIONS_KEY, String(data.notifications_enabled));
              } catch {
                // ignore
              }
              this.notify();
            }
          });
      }
    }
  }

  getUser(): UserProfileData {
    this.init();
    const active = coupleService.getActiveUser();
    return {
      id: active.id,
      name: active.name,
      gender: active.gender,
      avatarUrl: active.avatarUrl,
      joinedDate: active.joinedDate,
    };
  }

  getUserProfile(): UserProfileData {
    return this.getUser();
  }

  getPartner(): PartnerProfileData {
    this.init();
    const activeUser = coupleService.getActiveUser();
    const couple = coupleService.getCurrentCouple();

    if (couple && couple.status === 'connected' && couple.user2) {
      const isUser1 = couple.user1.id === activeUser.id;
      const partnerData = isUser1 ? couple.user2 : couple.user1;
      return {
        id: partnerData.id,
        name: partnerData.name,
        avatarUrl: partnerData.avatarUrl,
        isPartnerConnected: true,
        inviteCode: couple.inviteCode,
      };
    }

    return {
      id: 'none',
      name: 'Партнёр не подключён',
      isPartnerConnected: false,
      inviteCode: couple?.inviteCode || '',
    };
  }

  getPartnerProfile(): PartnerProfileData {
    return this.getPartner();
  }

  isNotificationsEnabled(): boolean {
    this.init();
    return this.notificationsEnabled;
  }

  getNotificationsEnabled(): boolean {
    return this.isNotificationsEnabled();
  }

  getCoupleProfile(): CoupleProfile {
    this.init();
    const user = this.getUser();
    const partner = this.getPartner();
    const isConnected = partner.isPartnerConnected;
    const startDate = relationshipService.getStartDate();

    return {
      id: initialCoupleProfile.id,
      user: {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      partner: isConnected
        ? {
            id: partner.id,
            name: partner.name,
            avatarUrl: partner.avatarUrl,
          }
        : undefined,
      isPartnerConnected: isConnected,
      startDate,
      daysTogether: initialCoupleProfile.daysTogether,
      inviteCode: partner.inviteCode,
      motto: initialCoupleProfile.motto,
      spaceType: coupleService.getSpaceType(),
    };
  }

  updateUserName(name: string): void {
    coupleService.updateActiveUserProfile({ name });
    this.notify();
  }

  updateUserAvatar(avatarUrl: string): void {
    coupleService.updateActiveUserProfile({ avatarUrl });
    this.notify();
  }

  setNotificationsEnabled(enabled: boolean): void {
    this.init();
    this.notificationsEnabled = enabled;
    try {
      localStorage.setItem(NOTIFICATIONS_KEY, String(enabled));
    } catch (e) {
      console.warn('Failed to save notifications setting:', e);
    }
    this.notify();

    // Синхронизация настройки уведомлений в Supabase public.users
    if (isSupabaseConfigured()) {
      const activeUser = coupleService.getActiveUser();
      const effectiveUserId =
        activeUser?.id && activeUser.id !== 'user-marsel' && !activeUser.id.startsWith('guest')
          ? activeUser.id
          : null;
      if (effectiveUserId) {
        supabase
          .from('users')
          .update({
            notifications_enabled: enabled,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', effectiveUserId)
          .then(({ error }) => {
            if (error) {
              console.warn('[profileService] Failed to update notifications_enabled in Supabase:', error.message);
            }
          });
      }
    }
  }

  async unpairPartner(): Promise<{ success: boolean; error?: string }> {
    const res = await coupleService.dissolveCouple();
    this.notify();
    return res;
  }

  reconnectPartner(): void {
    coupleService.resetToDemo();
    this.notify();
  }
}

export const profileService = new ProfileService();
