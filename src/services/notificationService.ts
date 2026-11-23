import { coupleService } from './coupleService';
import { isLocalDevHost } from '../utils/env';

export type PartnerEventType =
  | 'couple_connected'
  | 'couple_dissolved'
  | 'reminder_created'
  | 'reminder_completed'
  | 'wishlist_added'
  | 'memorable_date_added'
  | 'date_memory_added'
  | 'start_date_updated';

export interface PartnerNotificationPayload {
  title?: string;
  dueLabel?: string;
  dueTime?: string;
  price?: number | string;
  date?: string;
  partnerId?: string;
  coupleId?: string;
  isCommon?: boolean;
  [key: string]: any;
}

const DEDUP_WINDOW_MS = 10_000;
const recentEvents = new Map<string, number>();

function isDuplicateEvent(eventType: string, title?: string, coupleId?: string): boolean {
  const now = Date.now();
  for (const [key, ts] of recentEvents) {
    if (now - ts > DEDUP_WINDOW_MS) {
      recentEvents.delete(key);
    }
  }
  const key = `${eventType}:${title ?? ''}:${coupleId ?? ''}`;
  const prevTs = recentEvents.get(key);
  if (prevTs !== undefined && now - prevTs <= DEDUP_WINDOW_MS) {
    return true;
  }
  recentEvents.set(key, now);
  return false;
}

/**
 * Неблокирующая отправка мгновенного Telegram-уведомления партнёру/другу
 * о действиях в общем пространстве Lovia.
 */
export async function sendPartnerNotification(
  eventType: PartnerEventType,
  payload?: PartnerNotificationPayload
): Promise<void> {
  // В режиме локальной разработки на localhost уведомления в Telegram не отправляем
  if (isLocalDevHost()) {
    return;
  }

  try {
    const couple = coupleService.getCurrentCouple();
    const activeUser = coupleService.getActiveUser();

    const coupleId = payload?.coupleId || couple?.id || activeUser?.coupleId || undefined;
    const actorId = activeUser?.id;
    const actorName = activeUser?.name?.trim() || 'Партнёр';

    let partnerId = payload?.partnerId;
    if (!partnerId && couple) {
      partnerId = couple.user1.id === actorId ? couple.user2?.id : couple.user1.id;
    }

    // В демо-режиме локальной пары couple-1 уведомления не отправляем
    if (coupleId === 'couple-1' && !payload?.partnerId) {
      return;
    }

    // Если нет ни id пары, ни прямого id партнёра — отправка невозможна
    if (!coupleId && !partnerId) {
      return;
    }

    // Защита от дублей (повторный рендер / двойной клик) с окном 10 секунд
    if (isDuplicateEvent(eventType, payload?.title, coupleId)) {
      return;
    }

    fetch('/api/notify/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventType,
        coupleId,
        actorId,
        actorName,
        partnerId,
        payload: payload || {},
      }),
    }).catch((networkErr) => {
      console.warn(`[notificationService] Failed to send ${eventType}:`, networkErr);
    });
  } catch (err) {
    console.warn(`[notificationService] Error initiating partner notification:`, err);
  }
}
