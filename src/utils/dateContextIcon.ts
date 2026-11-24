import type { IconName } from '../components/ui/Icon/Icon';

const RULES: Array<{ icon: IconName; pattern: RegExp }> = [
  {
    icon: 'heart',
    pattern: /поцелу|любов|влюбл|сердц|свадьб|предложен|годовщин|романт|объяти/i,
  },
  {
    icon: 'plane',
    pattern:
      /поездк|путешеств|самол[её]т|перел[её]т|мор[ея]|казан|отпуск|билет|приключен|вокзал|поезд|маяк|гор[ыа]|пол[её]т|курорт/i,
  },
  {
    icon: 'gift',
    pattern: /подар|сюрприз|день рожден|рождени|праздник|новый год|новогод|юбиле/i,
  },
  {
    icon: 'home',
    pattern: /дом(?:а|ик|е|у)?\b|переезд|квартир|ремонт|ключ|съехались|жиль[её]/i,
  },
  {
    icon: 'star',
    pattern: /знакомств|встреч|перв(?:ый|ая|ое|ые)|начал[оа]|познаком/i,
  },
  {
    icon: 'coffee',
    pattern: /кофе|ужин|ресторан|кафе|пикник|завтрак|обед|ча[йюя]|бар\b|пицц|пекарн/i,
  },
];

/**
 * Автоподбор контекстной иконки для памятной даты по названию и описанию.
 * Сначала проверяется заголовок (более высокий приоритет), затем описание.
 */
export function getDateContextIcon(title: string, description?: string): IconName {
  const cleanTitle = (title || '').trim();
  const cleanDesc = (description || '').trim();

  for (const rule of RULES) {
    if (rule.pattern.test(cleanTitle)) {
      return rule.icon;
    }
  }

  if (cleanDesc) {
    for (const rule of RULES) {
      if (rule.pattern.test(cleanDesc)) {
        return rule.icon;
      }
    }
  }

  return 'calendar';
}
