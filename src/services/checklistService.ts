import type { ChecklistItem } from '../types/checklist';
import { coupleService } from './coupleService';
import { getSwrCacheSection, updateSwrCache } from './swrCache';
import { supabase, isSupabaseConfigured, callServerDb, shouldUseServerDb } from './api';
import { isLocalDevHost } from '../utils/env';
import { initialDemoChecklistItems } from './mockData';

export const MAX_CHECKLIST_ITEMS = 50;
const STORAGE_CHECKLIST_KEY = 'lovia_checklist_items_v1';

function generateChecklistId(): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 6)
      : Math.random().toString(36).slice(2, 8);
  return `chk-${Date.now()}-${rand}`;
}

function mapRowToItem(row: any): ChecklistItem {
  return {
    id: String(row.id),
    coupleId: String(row.couple_id || row.coupleId || ''),
    text: String(row.text || ''),
    createdById: String(row.created_by_id || row.createdById || ''),
    createdAt: String(row.created_at || row.createdAt || new Date().toISOString()),
  };
}

class ChecklistService {
  private items: ChecklistItem[] = [];
  private initialized = false;
  private pendingCreateIds = new Set<string>();
  private currentChannel: any = null;
  private subscribedCoupleId: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('lovia_couple_updated', () => {
        this.subscribeToRealtime();
      });
      window.addEventListener('lovia_couple_connected', () => {
        this.subscribeToRealtime();
      });
      window.addEventListener('lovia_couple_dissolved', () => {
        this.clearSharedData();
        this.subscribedCoupleId = null;
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

  private notify(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lovia_checklist_updated'));
    }
  }

  private subscribeToRealtime(): void {
    if (shouldUseServerDb() || !isSupabaseConfigured() || typeof window === 'undefined') return;
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
        .channel(`checklist_items_${couple.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'checklist_items',
            filter: `couple_id=eq.${couple.id}`,
          },
          (payload: any) => {
            if (payload.eventType === 'INSERT' && payload.new) {
              const incoming = mapRowToItem(payload.new);
              const current = this.getItems();
              if (!current.some((item) => item.id === incoming.id)) {
                this.saveToStorage([...current, incoming].slice(0, MAX_CHECKLIST_ITEMS), couple.id);
                this.notify();
              }
            } else if (payload.eventType === 'DELETE' && payload.old?.id) {
              const deletedId = String(payload.old.id);
              const current = this.getItems();
              const next = current.filter((item) => item.id !== deletedId);
              if (next.length !== current.length) {
                this.saveToStorage(next, couple.id);
                this.notify();
              }
            } else {
              void this.fetchFromSupabase(couple.id);
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[checklistService] Realtime subscription error:', e);
    }
  }

  private async fetchFromSupabase(coupleId: string): Promise<void> {
    if (shouldUseServerDb()) {
      try {
        await coupleService.syncCoupleFromSupabase(undefined, true, { silent: true });
      } catch (e) {
        console.warn('[checklistService] get_bundle error via /api/db:', e);
      }
      return;
    }
    if (!isSupabaseConfigured() || coupleId === 'couple-1') return;
    try {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('id, couple_id, text, created_by_id, created_at')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data)) {
        const merged = this.mergeWithPending(data.map(mapRowToItem));
        this.saveToStorage(merged, coupleId);
        this.notify();
      }
    } catch (e) {
      console.warn('[checklistService] fetchFromSupabase error:', e);
    }
  }

  private mergeWithPending(serverItems: ChecklistItem[]): ChecklistItem[] {
    if (this.pendingCreateIds.size === 0) {
      return serverItems.slice(0, MAX_CHECKLIST_ITEMS);
    }
    const serverIds = new Set(serverItems.map((x) => x.id));
    const stillPending = this.items.filter(
      (x) => this.pendingCreateIds.has(x.id) && !serverIds.has(x.id)
    );
    return [...serverItems, ...stillPending].slice(0, MAX_CHECKLIST_ITEMS);
  }

  private initLocal(): void {
    if (this.initialized) return;
    this.initialized = true;
    const coupleId = coupleService.getCurrentCouple()?.id;
    if (coupleId && coupleId !== 'couple-1') {
      const swr = getSwrCacheSection(coupleId, 'checklist');
      if (Array.isArray(swr)) {
        this.items = swr.map(mapRowToItem).slice(0, MAX_CHECKLIST_ITEMS);
        return;
      }
    }
    try {
      const raw = localStorage.getItem(STORAGE_CHECKLIST_KEY);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.items = parsed.map(mapRowToItem).slice(0, MAX_CHECKLIST_ITEMS);
        }
      } else if (isLocalDevHost() && coupleService.isDemoCouple()) {
        this.items = [...initialDemoChecklistItems];
        localStorage.setItem(STORAGE_CHECKLIST_KEY, JSON.stringify(this.items));
      }
    } catch {
      this.items = [];
    }
  }

  private saveToStorage(items: ChecklistItem[], coupleId?: string): void {
    this.items = items;
    this.initialized = true;
    try {
      localStorage.setItem(STORAGE_CHECKLIST_KEY, JSON.stringify(items));
      const targetCoupleId = coupleId || coupleService.getCurrentCouple()?.id;
      if (targetCoupleId && targetCoupleId !== 'couple-1') {
        updateSwrCache(targetCoupleId, 'checklist', items);
      }
    } catch (e) {
      console.warn('[checklistService] Failed to cache checklist:', e);
    }
  }

  hydrateFromBundle(rows: any[], coupleId?: string): void {
    const mapped = (rows || []).map(mapRowToItem);
    mapped.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    this.saveToStorage(this.mergeWithPending(mapped), coupleId);
    this.subscribeToRealtime();
    this.notify();
  }

  clearSharedData(): void {
    this.items = [];
    this.pendingCreateIds.clear();
    this.initialized = false;
    try {
      localStorage.removeItem(STORAGE_CHECKLIST_KEY);
    } catch {
      // ignore
    }
    this.notify();
  }

  getItems(): ChecklistItem[] {
    this.initLocal();
    return [...this.items];
  }

  private async persistSingleItem(item: ChecklistItem, coupleId: string): Promise<void> {
    if (shouldUseServerDb() && coupleId !== 'couple-1') {
      try {
        const created = await callServerDb<any>('checklist_create', {
          id: item.id,
          couple_id: coupleId,
          text: item.text,
        });
        this.pendingCreateIds.delete(item.id);
        if (created?.id) {
          const synced = mapRowToItem(created);
          const current = this.getItems();
          if (current.some((x) => x.id === item.id)) {
            this.saveToStorage(
              current.map((x) => (x.id === item.id ? synced : x)),
              coupleId
            );
            this.notify();
          }
        }
      } catch (err) {
        this.pendingCreateIds.delete(item.id);
        const current = this.getItems();
        this.saveToStorage(
          current.filter((x) => x.id !== item.id),
          coupleId
        );
        this.notify();
        throw err;
      }
    } else if (isSupabaseConfigured() && coupleId !== 'couple-1') {
      try {
        const { error } = await supabase.from('checklist_items').insert({
          id: item.id,
          couple_id: coupleId,
          text: item.text,
          created_by_id: item.createdById,
          created_at: item.createdAt,
        });
        this.pendingCreateIds.delete(item.id);
        if (error) throw error;
      } catch (err) {
        this.pendingCreateIds.delete(item.id);
        const current = this.getItems();
        this.saveToStorage(
          current.filter((x) => x.id !== item.id),
          coupleId
        );
        this.notify();
        throw err;
      }
    } else {
      this.pendingCreateIds.delete(item.id);
    }
  }

  /**
   * Optimistically adds one or multiple lines (up to MAX_CHECKLIST_ITEMS = 50)
   * without blocking input. Network persistence runs asynchronously in background.
   */
  addItems(rawLines: string[]): { added: ChecklistItem[]; hitLimit: boolean; persistence: Promise<void> } {
    const couple = coupleService.getCurrentCouple();
    const activeUser = coupleService.getActiveUser();
    const coupleId = couple?.id || 'couple-1';

    const current = this.getItems();
    const remaining = Math.max(0, MAX_CHECKLIST_ITEMS - current.length);
    const cleaned = rawLines
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (cleaned.length === 0 || remaining === 0) {
      return {
        added: [],
        hitLimit: remaining === 0 && cleaned.length > 0,
        persistence: Promise.resolve(),
      };
    }

    const hitLimit = cleaned.length > remaining;
    const toAdd = cleaned.slice(0, remaining);
    const baseTime = Date.now();
    const newItems: ChecklistItem[] = toAdd.map((text, idx) => {
      const id = generateChecklistId();
      this.pendingCreateIds.add(id);
      return {
        id,
        coupleId,
        text,
        createdById: activeUser.id,
        createdAt: new Date(baseTime + idx).toISOString(),
      };
    });

    this.saveToStorage([...current, ...newItems], coupleId);
    this.notify();

    const persistence = Promise.all(
      newItems.map((item) => this.persistSingleItem(item, coupleId))
    ).then(() => undefined);

    return { added: newItems, hitLimit, persistence };
  }

  async addItem(text: string): Promise<ChecklistItem | null> {
    const { added, persistence } = this.addItems([text]);
    await persistence;
    return added[0] || null;
  }

  async deleteItem(id: string): Promise<void> {
    const couple = coupleService.getCurrentCouple();
    const prev = this.getItems();
    const removed = prev.find((x) => x.id === id);
    this.pendingCreateIds.delete(id);
    this.saveToStorage(
      prev.filter((x) => x.id !== id),
      couple?.id
    );
    this.notify();

    if (shouldUseServerDb() && couple && couple.id !== 'couple-1') {
      try {
        await callServerDb('checklist_delete', { id });
      } catch (err) {
        if (removed) {
          const current = this.getItems();
          if (!current.some((x) => x.id === removed.id)) {
            const restored = [...current, removed].sort((a, b) =>
              a.createdAt.localeCompare(b.createdAt)
            );
            this.saveToStorage(restored, couple.id);
            this.notify();
          }
        }
        throw err;
      }
    } else if (isSupabaseConfigured() && couple && couple.id !== 'couple-1') {
      const { error } = await supabase.from('checklist_items').delete().eq('id', id);
      if (error && removed) {
        const current = this.getItems();
        if (!current.some((x) => x.id === removed.id)) {
          const restored = [...current, removed].sort((a, b) =>
            a.createdAt.localeCompare(b.createdAt)
          );
          this.saveToStorage(restored, couple.id);
          this.notify();
        }
        throw error;
      }
    }
  }
}

export const checklistService = new ChecklistService();
