export interface WishCategory {
  id: string;
  label: string;
  iconName: string;
  color: string;
}

export const WISHLIST_CATEGORIES: WishCategory[] = [
  { id: 'gifts', label: 'Подарки и сюрпризы', iconName: 'gift', color: '#F4DDE2' },
  { id: 'style', label: 'Гардероб и стиль', iconName: 'sparkles', color: '#E3EBDD' },
  { id: 'tech', label: 'Гаджеты и техника', iconName: 'tag', color: '#DDEBF4' },
  { id: 'home', label: 'Уют и дом', iconName: 'home', color: '#F5EACD' },
  { id: 'dates', label: 'Впечатления и свидания', iconName: 'dates', color: '#F3E0EC' },
  { id: 'books', label: 'Хобби и книги', iconName: 'note', color: '#EDE4F5' },
  { id: 'other', label: 'Другое', iconName: 'heart', color: '#E8E6DF' },
];

export interface WishItem {
  id: string;
  userId: string; // Владелец желания ('user-marsel' | 'user-alisa')
  title: string;
  description?: string;
  imageUrl?: string;
  linkUrl?: string;
  estimatedPrice?: number;
  currency?: string;
  categoryId: string;
  categoryLabel?: string;
  categoryColor?: string;
  comment?: string; // Необязательный комментарий (для партнера)
  isReserved?: boolean; // Отметка партнером «Я подарю это»
  reservedByUserId?: string;
  reservedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWishInput {
  title: string;
  description?: string;
  imageUrl?: string;
  linkUrl?: string;
  estimatedPrice?: number;
  currency?: string;
  categoryId?: string;
  comment?: string;
}

export interface UpdateWishInput {
  title?: string;
  description?: string;
  imageUrl?: string;
  linkUrl?: string;
  estimatedPrice?: number;
  currency?: string;
  categoryId?: string;
  comment?: string;
}

export type WishlistTab = 'mine' | 'partner';
