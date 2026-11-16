import { WishItem, WISHLIST_CATEGORIES } from '../types/wishlist';

const getCategoryInfo = (categoryId: string) => {
  const cat = WISHLIST_CATEGORIES.find((c) => c.id === categoryId);
  return {
    categoryLabel: cat?.label || 'Желание',
    categoryColor: cat?.color || '#F4DDE2',
  };
};

export const initialWishlistItems: WishItem[] = [
  // --- Список Марселя ---
  {
    id: 'wish-m-1',
    userId: 'user-marsel',
    title: 'Беспроводные наушники с шумоподавлением',
    description: 'Для работы, созвонов и вечерних подкастов в дороге. Чистый звук и удобная посадка.',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
    linkUrl: 'https://market.yandex.ru',
    estimatedPrice: 18900,
    currency: '₽',
    categoryId: 'tech',
    ...getCategoryInfo('tech'),
    comment: 'Графитовый или серебристый цвет',
    isReserved: false,
    createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'wish-m-2',
    userId: 'user-marsel',
    title: 'Медная турка для спешелти кофе',
    description: 'Аутентичная джезва ручной ковки с деревянной ручкой. Буду варить нам утренний кофе!',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
    linkUrl: 'https://specialtycoffee.ru',
    estimatedPrice: 5800,
    currency: '₽',
    categoryId: 'home',
    ...getCategoryInfo('home'),
    comment: 'Объём 220–250 мл, чтобы хватало ровно на две чашки',
    isReserved: false,
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'wish-m-3',
    userId: 'user-marsel',
    title: 'Тёплый кашемировый шарф',
    description: 'Мягкий шарф крупной вязки для долгих осенних и зимних прогулок вдвоём.',
    imageUrl: 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?auto=format&fit=crop&w=600&q=80',
    linkUrl: 'https://www.lamoda.ru',
    estimatedPrice: 4200,
    currency: '₽',
    categoryId: 'style',
    ...getCategoryInfo('style'),
    comment: 'Спокойный оттенок: серый, тёмно-синий или капучино',
    isReserved: false,
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
  },

  // --- Список Алисы ---
  {
    id: 'wish-a-1',
    userId: 'user-alisa',
    title: 'Аромасвеча с инжиром и кедром',
    description: 'Соевый воск с деревянным фитилем, который уютно потрескивает как камин.',
    imageUrl: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=600&q=80',
    linkUrl: 'https://goldapple.ru',
    estimatedPrice: 2600,
    currency: '₽',
    categoryId: 'home',
    ...getCategoryInfo('home'),
    comment: 'В Золотом Яблоке или Zielinski & Rozen',
    isReserved: true,
    reservedByUserId: 'user-marsel',
    reservedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'wish-a-2',
    userId: 'user-alisa',
    title: 'Шёлковая пижама пудрового оттенка',
    description: 'Нежный комплект из натурального шёлка с элегантным кантом и свободным кроем.',
    imageUrl: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=600&q=80',
    linkUrl: 'https://intimissimi.com',
    estimatedPrice: 9900,
    currency: '₽',
    categoryId: 'style',
    ...getCategoryInfo('style'),
    comment: 'Размер S, пудровый или шалфейный цвет',
    isReserved: false,
    createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'wish-a-3',
    userId: 'user-alisa',
    title: 'Гончарный мастер-класс для двоих',
    description: 'Романтическое свидание за гончарным кругом — слепим вместе нашу чайную пару.',
    imageUrl: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=600&q=80',
    linkUrl: 'https://gonchar-studio.ru',
    estimatedPrice: 5500,
    currency: '₽',
    categoryId: 'dates',
    ...getCategoryInfo('dates'),
    comment: 'В выходные дни, чтобы никуда не торопиться',
    isReserved: false,
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'wish-a-4',
    userId: 'user-alisa',
    title: 'Иллюстрированная книга рецептов десертов',
    description: 'Вдохновляющее издание о французских пирожных, тартах и выпечке.',
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    linkUrl: 'https://www.chitai-gorod.ru',
    estimatedPrice: 2200,
    currency: '₽',
    categoryId: 'books',
    ...getCategoryInfo('books'),
    comment: 'В твёрдом переплёте для нашей книжной полки',
    isReserved: false,
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
  },
];

// Curated presets for quick photo picking when creating a wish
export interface PhotoPreset {
  id: string;
  label: string;
  emoji: string;
  url: string;
}

export const PHOTO_PRESETS: PhotoPreset[] = [
  {
    id: 'preset-gift',
    label: 'Подарок',
    emoji: '🎁',
    url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'preset-flowers',
    label: 'Цветы',
    emoji: '💐',
    url: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'preset-candle',
    label: 'Свеча',
    emoji: '🕯️',
    url: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'preset-tech',
    label: 'Гаджеты',
    emoji: '🎧',
    url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'preset-coffee',
    label: 'Кофе',
    emoji: '☕',
    url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'preset-clothes',
    label: 'Одежда',
    emoji: '👗',
    url: 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'preset-date',
    label: 'Свидание',
    emoji: '🍷',
    url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'preset-travel',
    label: 'Поездка',
    emoji: '✈️',
    url: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'preset-book',
    label: 'Книга',
    emoji: '📚',
    url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'preset-spa',
    label: 'СПА / Уход',
    emoji: '🫧',
    url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80',
  },
];
