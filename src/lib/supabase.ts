import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isLocalDevHost } from '../utils/env';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          telegram_id: number | null;
          name: string;
          gender: 'male' | 'female' | null;
          avatar_url: string | null;
          couple_id: string | null;
          joined_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          telegram_id?: number | null;
          name: string;
          gender?: 'male' | 'female' | null;
          avatar_url?: string | null;
          couple_id?: string | null;
          joined_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          telegram_id?: number | null;
          name?: string;
          gender?: 'male' | 'female' | null;
          avatar_url?: string | null;
          couple_id?: string | null;
          joined_date?: string;
          updated_at?: string;
        };
      };
      couples: {
        Row: {
          id: string;
          invite_code: string;
          code_expires_at: string;
          code_status: 'active' | 'used' | 'expired';
          user1_id: string;
          user2_id: string | null;
          status: 'waiting_partner' | 'connected' | 'dissolved';
          start_date: string | null;
          created_at: string;
          dissolved_at: string | null;
        };
        Insert: {
          id: string;
          invite_code: string;
          code_expires_at: string;
          code_status?: 'active' | 'used' | 'expired';
          user1_id: string;
          user2_id?: string | null;
          status?: 'waiting_partner' | 'connected' | 'dissolved';
          start_date?: string | null;
          created_at?: string;
          dissolved_at?: string | null;
        };
        Update: {
          id?: string;
          invite_code?: string;
          code_expires_at?: string;
          code_status?: 'active' | 'used' | 'expired';
          user1_id?: string;
          user2_id?: string | null;
          status?: 'waiting_partner' | 'connected' | 'dissolved';
          start_date?: string | null;
          dissolved_at?: string | null;
        };
      };
      reminders: {
        Row: {
          id: string;
          couple_id: string;
          title: string;
          category_id: string | null;
          priority: 'low' | 'medium' | 'high';
          for_user_id: string;
          created_by_id: string;
          status: 'pending' | 'completed' | 'overdue';
          due_date: string | null;
          due_time: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          title: string;
          category_id?: string | null;
          priority?: 'low' | 'medium' | 'high';
          for_user_id: string;
          created_by_id: string;
          status?: 'pending' | 'completed' | 'overdue';
          due_date?: string | null;
          due_time?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          couple_id?: string;
          title?: string;
          category_id?: string | null;
          priority?: 'low' | 'medium' | 'high';
          for_user_id?: string;
          created_by_id?: string;
          status?: 'pending' | 'completed' | 'overdue';
          due_date?: string | null;
          due_time?: string | null;
          completed_at?: string | null;
        };
      };
      events: {
        Row: {
          id: string;
          couple_id: string;
          title: string;
          category_id: string | null;
          date: string;
          time: string | null;
          color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          title: string;
          category_id?: string | null;
          date: string;
          time?: string | null;
          color?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          couple_id?: string;
          title?: string;
          category_id?: string | null;
          date?: string;
          time?: string | null;
          color?: string | null;
        };
      };
      wishlist_items: {
        Row: {
          id: string;
          couple_id: string;
          user_id: string;
          title: string;
          description: string | null;
          image_url: string | null;
          link_url: string | null;
          price: number | null;
          category_id: string | null;
          is_booked: boolean;
          booked_by_user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          user_id: string;
          title: string;
          description?: string | null;
          image_url?: string | null;
          link_url?: string | null;
          price?: number | null;
          category_id?: string | null;
          is_booked?: boolean;
          booked_by_user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          couple_id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          image_url?: string | null;
          link_url?: string | null;
          price?: number | null;
          category_id?: string | null;
          is_booked?: boolean;
          booked_by_user_id?: string | null;
        };
      };
      memorable_dates: {
        Row: {
          id: string;
          couple_id: string;
          title: string;
          date: string;
          description: string | null;
          is_annual: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          title: string;
          date: string;
          description?: string | null;
          is_annual?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          couple_id?: string;
          title?: string;
          date?: string;
          description?: string | null;
          is_annual?: boolean;
        };
      };
      date_memories: {
        Row: {
          id: string;
          couple_id: string;
          title: string;
          date: string;
          place: string | null;
          location_data: Record<string, any> | null;
          story: string | null;
          photos: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          title: string;
          date: string;
          place?: string | null;
          location_data?: Record<string, any> | null;
          story?: string | null;
          photos?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          couple_id?: string;
          title?: string;
          date?: string;
          place?: string | null;
          location_data?: Record<string, any> | null;
          story?: string | null;
          photos?: string[];
        };
      };
      categories: {
        Row: {
          id: string;
          couple_id: string;
          name: string;
          color: string;
          icon: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          name: string;
          color?: string;
          icon?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          couple_id?: string;
          name?: string;
          color?: string;
          icon?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseAnonKey && (supabaseUrl || (typeof window !== 'undefined' && !isLocalDevHost()))
  );
}

/**
 * Returns the effective Supabase URL.
 * In production / Telegram (non-localhost), requests are proxied via Vercel (/supabase-proxy)
 * on the app's own origin to avoid Russian ISP blocks on *.supabase.co (TypeError: Failed to fetch).
 */
function getEffectiveSupabaseUrl(): string {
  if (typeof window !== 'undefined') {
    // In production, Telegram, or when accessing by IP/domain:
    if (!isLocalDevHost()) {
      return `${window.location.origin}/supabase-proxy`;
    }
    // On localhost: use explicit env URL if configured, or proxy
    if (supabaseUrl) {
      return supabaseUrl;
    }
    return `${window.location.origin}/supabase-proxy`;
  }

  return supabaseUrl || 'https://uwbdtisxjzmnzkodiexo.supabase.co';
}

const effectiveUrl = getEffectiveSupabaseUrl();
const effectiveKey = supabaseAnonKey || 'placeholder-anon-key';

export const supabase: SupabaseClient<any> = createClient(
  effectiveUrl,
  effectiveKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);
