import { UrgencyLevel } from '../components/ui/Badge/Badge';

export type RequestStatus = 'pending' | 'completed' | 'overdue';

export interface CoupleReminder {
  id: string;
  title: string;
  description?: string;
  authorId: string;
  authorName: string;
  targetId: string;
  targetName: string; // 'Для тебя' | 'Для Алисы' | 'Для Марселя'
  dueDate: string; // ISO date string or ''
  dueLabel: string; // 'Несрочно', '14 ноября', '14 ноября · 19:00'
  dueTime?: string; // '19:00'
  remindBeforeMinutes?: number; // 15, 30, 60 (default), 180, 1440
  urgency: UrgencyLevel; // 'low' | 'medium' | 'high'
  categoryId?: string; // ID of user-created category, or undefined if no category
  categoryName?: string; // Cached category name for display
  categoryColor?: string; // Cached category color hex
  categoryIcon?: string; // Cached icon name for display
  category?: string; // Backwards compatible key
  status: RequestStatus;
  createdAt: string;
  rewardNote?: string; // Напр.: «С меня тёплые объятия 🥰»
}

// Alias for backwards compatibility
export type CoupleRequest = CoupleReminder;

export type RequestFilterTab = 'all' | 'for_me' | 'from_me';

export interface CreateReminderInput {
  title: string;
  description?: string;
  targetId: string;
  targetName: string;
  dueDate: string;
  dueLabel: string;
  dueTime?: string;
  remindBeforeMinutes?: number;
  urgency: UrgencyLevel;
  categoryId?: string;
  categoryName?: string;
  categoryColor?: string;
  categoryIcon?: string;
  category?: string;
  rewardNote?: string;
}

export type CreateRequestInput = CreateReminderInput;
