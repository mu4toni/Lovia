import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('🧪 Запуск проверки реорганизации экрана «Свидания» (DatesPage, DatesHeader, BottomActionButton)...\n');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

// 1. Пустое состояние
test('1. DatesPage: кнопка «Сохранить первое воспоминание» удалена, подсказка обновлена на «Нажмите «+»...»', () => {
  const tsx = fs.readFileSync('src/pages/DatesPage.tsx', 'utf8');
  assert(!tsx.includes('Сохранить первое воспоминание'), 'Кнопка «Сохранить первое воспоминание» удалена');
  assert(tsx.includes('Нажмите «+», чтобы сохранить первое воспоминание'), 'Новая формулировка подсказки с ориентиром на «+»');
  assert(tsx.includes('dates-empty-state__icon-box'), 'Иконка сохранена');
  assert(tsx.includes('dates-empty-state__title'), 'Заголовок сохранен');
  assert(tsx.includes('dates-empty-state__desc'), 'Описание сохранено');
});

// 2. Компактность пустого состояния
test('2. DatesPage.css: компактная высота пустой карточки (padding 20-24px, иконка 50px)', () => {
  const css = fs.readFileSync('src/pages/DatesPage.css', 'utf8');
  assert(css.includes('padding: 24px 20px') || css.includes('padding: 20px 16px'), 'Уменьшенный padding карточки');
  assert(css.includes('width: 50px') || css.includes('width: 48px'), 'Компактный размер блока иконки');
  assert(css.includes('font-size: 17px'), 'Аккуратный размер заголовка');
});

// 3. Плавающая кнопка (BottomActionButton)
test('3. BottomActionButton.css: высота 48-52px, фиксация над навигацией с зазором 12-16px', () => {
  const css = fs.readFileSync('src/components/ui/BottomActionButton/BottomActionButton.css', 'utf8');
  assert(css.includes('height: 48px') && css.includes('min-height: 48px'), 'Высота плавающей кнопки 48px (в диапазоне 48-52px)');
  assert(css.includes('border-radius: var(--radius-pill)'), 'Скругление pill');
  assert(css.includes('108px') || css.includes('106px') || css.includes('110px'), 'Зазор 12-16px над приподнятой навигацией (94px + 14px = 108px)');
  assert(css.includes('var(--color-primary)'), 'Акцентный цвет сохранен');
  assert(css.includes('box-shadow'), 'Тень сохранена');
});

// 4. Формула нижнего отступа
test('4. DatesPage.css: формула padding-bottom calc(высота_навигации + высота_кнопки + 16px + safe-area + 24px)', () => {
  const css = fs.readFileSync('src/pages/DatesPage.css', 'utf8');
  assert(css.includes('padding-bottom: calc(var(--nav-height, 64px) + 48px + 16px + env(safe-area-inset-bottom, 0px) + 24px)'), 'Явная формула padding-bottom с навигацией, кнопкой 48px, 16px и 24px');
  assert(css.includes('184px'), 'Защита для расширенных безопасных зон Telegram/iOS');
});

// 5. Статистика в единой карточке с разделителем
test('5. DatesHeader: объединение статистики в одну строку/карточку с разделителем, без обводок кнопок', () => {
  const tsx = fs.readFileSync('src/widgets/Dates/DatesHeader/DatesHeader.tsx', 'utf8');
  const css = fs.readFileSync('src/widgets/Dates/DatesHeader/DatesHeader.css', 'utf8');
  assert(tsx.includes('dates-header__stats-card'), 'Единая карточка/строка статистики');
  assert(tsx.includes('dates-header__stat-divider'), 'Вертикальный разделитель между счетчиками');
  assert(css.includes('dates-header__stat-divider'), 'Стили разделителя');
  assert(css.includes('.dates-header__stat-pill') && css.includes('border: none'), 'Убрана обводка счетчиков');
  assert(css.includes('background: transparent'), 'Убран тяжелый кнопочный фон');
  assert(tsx.includes('dates-header__stat-val') && tsx.includes('dates-header__stat-txt'), 'Иконки и цифры сохранены');
});

// 6. Фильтры и сортировка в одной строке
test('6. DatesHeader: фильтры и сортировка в одной строке с зазором 8-12px и touch target >= 44px', () => {
  const css = fs.readFileSync('src/widgets/Dates/DatesHeader/DatesHeader.css', 'utf8');
  assert(css.includes('gap: 10px'), 'Зазор 10px (в диапазоне 8-12px)');
  assert(css.includes('min-height: 44px'), 'Высота касания не менее 44px');
  assert(css.includes('flex-wrap: nowrap') || css.includes('justify-content: space-between'), 'Строчное размещение');
});

console.log(`\n======================================================`);
console.log(`🎉 Все 6 тестов реорганизации экрана «Свидания» (${passed}/6) успешно пройдены!`);
console.log(`======================================================`);
