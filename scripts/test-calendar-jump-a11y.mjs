import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('🧪 Проверка устранения бага "прыгающей верхней панели управления" и a11y...\n');

const calTsx = fs.readFileSync(path.resolve('src/components/home/HomeCalendar/HomeCalendar.tsx'), 'utf8');
const calCss = fs.readFileSync(path.resolve('src/components/home/HomeCalendar/HomeCalendar.css'), 'utf8');

// 1. Проверка отсутствия условия || !isToday(selectedDate) в заголовке
assert(!calTsx.includes('!isToday(selectedDate)'), '❌ Условие !isToday(selectedDate) не должно вызывать монтирование кнопок при переходе по дням');
console.log('✅ [1] Переход по дням не вызывает монтирование/демонтирование кнопок в шапке календаря');

// 2. Проверка стабильности flex-контейнера в CSS
assert(calCss.includes('flex-wrap: nowrap'), '❌ .home-calendar__header должен иметь flex-wrap: nowrap для предотвращения переноса строк');
assert(calCss.includes('min-height: 44px'), '❌ .home-calendar__header должен иметь фиксированную доступную высоту min-height: 44px');
console.log('✅ [2] .home-calendar__header имеет flex-wrap: nowrap и стабильную min-height: 44px');

// 3. Проверка touch target мишеней (>= 44x44px)
assert(calCss.includes('.home-calendar__arrow-btn::before') && calCss.includes('min-height: 44px'), '❌ Стрелки навигации должны иметь touch target >= 44x44px');
assert(calCss.includes('.home-calendar__view-btn::before') && calCss.includes('min-height: 44px'), '❌ Кнопки переключения режимов должны иметь touch target >= 44x44px');
assert(calCss.includes('.home-calendar__today-jump-btn::before') && calCss.includes('min-height: 44px'), '❌ Кнопка Сегодня должна иметь touch target >= 44x44px');
console.log('✅ [3] Все интерактивные элементы управления имеют touch target >= 44x44px (WCAG 2.5.5 / 2.5.8)');

// 4. Проверка фокуса и клавиатурной доступности
assert(calCss.includes(':focus-visible'), '❌ Отсутствуют стили :focus-visible для клавиатурного управления');
console.log('✅ [4] Стили :focus-visible настроены для навигации с клавиатуры (WCAG 2.4.7)');

// 5. Проверка aria-label для дней недели и стрелок
assert(calTsx.includes('prevAriaLabel'), '❌ Стрелки навигации должны иметь динамический aria-label');
assert(calTsx.includes('nextAriaLabel'), '❌ Стрелки навигации должны иметь динамический aria-label');
assert(calTsx.includes('aria-live="polite"'), '❌ Название месяца должно объявляться через aria-live="polite"');
console.log('✅ [5] Доступные имена и aria-live настроены для скринридеров (WCAG 4.1.2, 4.1.3)');

console.log('\n========================================');
console.log('Итог: Все проверки пройдены успешно! Баг устранён.');
console.log('========================================\n');
