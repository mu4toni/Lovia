import { TaskCategory } from '../components/ui/Badge/Badge';
import { IconName } from '../components/ui/Icon/Icon';

export interface CategoryMeta {
  key: TaskCategory;
  label: string;
  colorVar: string;
  bgVar: string;
  borderVar: string;
  icon: IconName;
}

export const CATEGORY_LIST: CategoryMeta[] = [
  {
    key: 'dates',
    label: 'Свидания',
    colorVar: 'var(--cat-dates)',
    bgVar: 'var(--cat-dates-bg)',
    borderVar: 'var(--cat-dates-border)',
    icon: 'heart',
  },
  {
    key: 'chores',
    label: 'Быт и забота',
    colorVar: 'var(--cat-chores)',
    bgVar: 'var(--cat-chores-bg)',
    borderVar: 'var(--cat-chores-border)',
    icon: 'check-circle',
  },
  {
    key: 'gifts',
    label: 'Сюрпризы',
    colorVar: 'var(--cat-gifts)',
    bgVar: 'var(--cat-gifts-bg)',
    borderVar: 'var(--cat-gifts-border)',
    icon: 'gift',
  },
  {
    key: 'wishes',
    label: 'Желания',
    colorVar: 'var(--cat-wishes)',
    bgVar: 'var(--cat-wishes-bg)',
    borderVar: 'var(--cat-wishes-border)',
    icon: 'sparkles',
  },
  {
    key: 'memories',
    label: 'Воспоминания',
    colorVar: 'var(--cat-memories)',
    bgVar: 'var(--cat-memories-bg)',
    borderVar: 'var(--cat-memories-border)',
    icon: 'pin',
  },
];

export const CATEGORY_MAP: Record<TaskCategory, CategoryMeta> = CATEGORY_LIST.reduce(
  (acc, item) => {
    acc[item.key] = item;
    return acc;
  },
  {} as Record<TaskCategory, CategoryMeta>
);

export function getCategoryMeta(key: TaskCategory): CategoryMeta {
  return CATEGORY_MAP[key] || CATEGORY_LIST[0];
}

/**
 * Русское склонение имени для надписей «Для Алисы», «Для Марселя»
 */
export function getGenitivePartnerName(name: string): string {
  if (!name) return 'партнёра';
  const trimmed = name.trim();
  // Женские на -а -> -ы (Алиса -> Алисы)
  if (trimmed.endsWith('са')) return `${trimmed.slice(0, -1)}ы`;
  if (trimmed.endsWith('ка')) return `${trimmed.slice(0, -1)}и`;
  if (trimmed.endsWith('а')) return `${trimmed.slice(0, -1)}ы`;
  // Женские на -я -> -и (Настя -> Насти)
  if (trimmed.endsWith('я')) return `${trimmed.slice(0, -1)}и`;
  // Мужские на согласный -> -а (Марсель -> Марселя, Иван -> Ивана)
  if (trimmed.endsWith('ль')) return `${trimmed.slice(0, -1)}я`;
  if (/[бвгджзклмнпрстфхцчшщ]$/i.test(trimmed)) return `${trimmed}а`;
  return trimmed;
}

/**
 * Calculates accessible high-contrast text color (#1A1517 or #FFFFFF) for a given background hex
 * according to WCAG 2.1 contrast formulas.
 */
export function getContrastColor(hexColor: string): '#1A1517' | '#FFFFFF' {
  if (!hexColor) return '#1A1517';
  let hex = hexColor.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  if (hex.length !== 6) return '#1A1517';
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  return L > 0.45 ? '#1A1517' : '#FFFFFF';
}

