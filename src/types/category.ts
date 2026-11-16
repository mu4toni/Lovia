export type CategoryIconName =
  | 'heart'
  | 'shopping-bag'
  | 'home'
  | 'coffee'
  | 'gift'
  | 'car'
  | 'sparkles'
  | 'briefcase'
  | 'film'
  | 'music'
  | 'star'
  | 'paw'
  | 'plane';

export interface CategoryIconOption {
  id: CategoryIconName;
  name: string;
  isBase?: boolean;
}

/**
 * 3 Base Icons available immediately
 */
export const BASE_CATEGORY_ICONS: CategoryIconOption[] = [
  { id: 'heart', name: 'Любовь и забота', isBase: true },
  { id: 'shopping-bag', name: 'Покупки', isBase: true },
  { id: 'home', name: 'Дом и уют', isBase: true },
];

/**
 * 10 Extended Icons available via expandable menu
 */
export const EXTENDED_CATEGORY_ICONS: CategoryIconOption[] = [
  { id: 'coffee', name: 'Кафе и еда' },
  { id: 'gift', name: 'Подарки' },
  { id: 'car', name: 'Поездки и авто' },
  { id: 'sparkles', name: 'Свидания' },
  { id: 'briefcase', name: 'Дела и работа' },
  { id: 'film', name: 'Кино и сериалы' },
  { id: 'music', name: 'Музыка' },
  { id: 'star', name: 'Важное' },
  { id: 'paw', name: 'Питомцы' },
  { id: 'plane', name: 'Путешествия' },
];

export const ALL_CATEGORY_ICONS: CategoryIconOption[] = [
  ...BASE_CATEGORY_ICONS,
  ...EXTENDED_CATEGORY_ICONS,
];

export interface UserCategory {
  id: string;
  name?: string; // Optional now: categories can be purely icon + color
  color: string; // Hex color code from curated Lovia palette
  icon?: string; // Icon name e.g. 'heart', 'shopping-bag', 'home', etc.
  createdAt: string;
}

/**
 * 3 Base Categories available out of the box:
 * - «Личное / Забота» (#F4DDE2, heart)
 * - «Дела / Дом» (#E3EBDD, home)
 * - «Вместе / Свидания» (#F5EACD, sparkles)
 */
export const DEFAULT_BASE_CATEGORIES: UserCategory[] = [
  {
    id: 'cat-care',
    name: 'Личное / Забота',
    color: '#F4DDE2',
    icon: 'heart',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cat-home',
    name: 'Дела / Дом',
    color: '#E3EBDD',
    icon: 'home',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cat-together',
    name: 'Вместе / Свидания',
    color: '#F5EACD',
    icon: 'sparkles',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export interface CategoryPaletteOption {
  id: string;
  name: string;
  hex: string;
  isStandard?: boolean;
}

/**
 * 3 Standard Pastel Colors per prompt specification:
 * - Пудровый — #F4DDE2
 * - Шалфейный — #E3EBDD
 * - Сливочный — #F5EACD
 */
export const STANDARD_PASTEL_COLORS: CategoryPaletteOption[] = [
  { id: 'powder', name: 'Пудровый', hex: '#F4DDE2', isStandard: true },
  { id: 'sage', name: 'Шалфейный', hex: '#E3EBDD', isStandard: true },
  { id: 'cream', name: 'Сливочный', hex: '#F5EACD', isStandard: true },
];

/**
 * 15 Existing curated colors of Lovia brand palette:
 */
export const EXTENDED_LOVIA_PALETTE: CategoryPaletteOption[] = [
  { id: 'ruby', name: 'Рубиновый', hex: '#C83649' },
  { id: 'dusty-mauve', name: 'Пыльно-розовый', hex: '#8E5B74' },
  { id: 'terracotta', name: 'Терракотовый', hex: '#B45C4F' },
  { id: 'caramel', name: 'Карамельный', hex: '#A86824' },
  { id: 'olive', name: 'Оливковый', hex: '#557A59' },
  { id: 'slate-blue', name: 'Серо-синий', hex: '#4A6B82' },
  { id: 'plum', name: 'Сливовый', hex: '#684A6E' },
  { id: 'deep-teal', name: 'Глубокий тиловый', hex: '#3D7975' },
  { id: 'taupe', name: 'Теплый песочный', hex: '#837362' },
  { id: 'champagne', name: 'Шампань', hex: '#E4CAA5' },
  { id: 'lavender', name: 'Мягкий лавандовый', hex: '#B286AD' },
  { id: 'jade', name: 'Спокойный нефритовый', hex: '#7FA884' },
  { id: 'steel-blue', name: 'Небесно-стальной', hex: '#85A4C0' },
  { id: 'wine', name: 'Бархатное вино', hex: '#68303F' },
  { id: 'charcoal', name: 'Графитовый сланец', hex: '#3C3941' },
];

/**
 * Full combined palette of Lovia: 3 standard pastels + 15 extended colors = 18 colors
 */
export const ALL_LOVIA_COLORS: CategoryPaletteOption[] = [
  ...STANDARD_PASTEL_COLORS,
  ...EXTENDED_LOVIA_PALETTE,
];

// Backwards compatibility alias
export const LOVIA_CATEGORY_PALETTE = ALL_LOVIA_COLORS;
