/**
 * Вспомогательные функции.
 */

/**
 * Форматирует дату в русском формате: «14 ноября 2026»
 */
export function formatDateRu(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Вычисляет количество дней между двумя датами.
 */
export function daysBetween(from: Date, to: Date): number {
  const ms = Math.abs(to.getTime() - from.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
