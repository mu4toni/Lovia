import { TaskCategory } from '../components/ui/Badge/Badge';

export type CalendarViewMode = 'day' | 'week' | 'month';

export interface CoupleEvent {
  id: string;
  title: string;
  date: string; // ISO date YYYY-MM-DD
  time?: string; // '19:30'
  category: TaskCategory;
  emoji: string;
  location?: string;
  note?: string;
}
