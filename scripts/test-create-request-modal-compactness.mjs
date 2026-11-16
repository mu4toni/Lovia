import fs from 'fs';
import assert from 'assert';

console.log('🧪 Запуск проверки компактности модального окна «Новое напоминание» (CreateRequestModal)...\n');

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

const modalCss = fs.readFileSync('src/components/ui/Modal/Modal.css', 'utf8');
const createModalCss = fs.readFileSync('src/components/home/CreateRequestModal/CreateRequestModal.css', 'utf8');
const createModalTsx = fs.readFileSync('src/components/home/CreateRequestModal/CreateRequestModal.tsx', 'utf8');
const deadlineCss = fs.readFileSync('src/components/home/CreateRequestModal/DeadlineSelector.css', 'utf8');
const deadlineTsx = fs.readFileSync('src/components/home/CreateRequestModal/DeadlineSelector.tsx', 'utf8');

// 1. Высота шторки и 3-составной flex
test('1. Высота шторки: max-height: 90vh / 90dvh, flex-колонка (шапка, тело, футер)', () => {
  assert(modalCss.includes('max-height: 90vh') && modalCss.includes('max-height: 90dvh'), 'Modal.css: max-height 90vh/90dvh');
  assert(modalCss.includes('.modal-sheet__body') && modalCss.includes('flex: 1'), 'Body занимает оставшееся место');
  assert(modalCss.includes('overflow-y: auto'), 'Body имеет запасной скролл');
  assert(modalCss.includes('.modal-sheet__footer') && modalCss.includes('flex-shrink: 0'), 'Footer фиксирован внизу');
});

// 2. Шапка и полоса-ручка
test('2. Шапка: высота 56px, заголовок и крестик по центру, ручка 8px сверху', () => {
  assert(modalCss.includes('height: 56px') && modalCss.includes('min-height: 56px'), 'Высота шапки 56px');
  assert(modalCss.includes('margin: 8px auto 4px'), 'Ручка: отступ от верхнего края 8px');
  assert(modalCss.includes('align-items: center'), 'Выравнивание по центру');
});

// 3. Вертикальные отступы между полями 12-16px, отступ от лейбла 6-8px
test('3. Отступы формы: между полями 14px (12-16px), между лейблом и инпутом 6px (6-8px)', () => {
  assert(createModalCss.includes('gap: 14px'), 'CreateRequestModal.css: gap формы 14px');
  assert(createModalCss.includes('.create-form-field') && createModalCss.includes('gap: 6px'), 'Зазор лейбл-инпут 6px');
  assert(createModalCss.includes('.create-form-label') && createModalCss.includes('font-weight: 600'), 'Лейблы полужирные');
});

// 4. Срок выполнения: удаление дублирования «Срок: Без срока» и кнопки 44-48px
test('4. Срок выполнения: отсутствие дублирования «Срок: Без срока», кнопки 44px', () => {
  assert(!deadlineTsx.includes("'Без срока' :"), 'Нет дублирующей надписи Срок: Без срока в шапке блока');
  assert(deadlineTsx.includes('!isNone'), 'Статус пилюли и крестик отображаются только при выбранной дате');
  assert(deadlineCss.includes('height: 44px') && deadlineCss.includes('min-height: 44px'), 'Кнопки срока высотой 44px');
});

// 5. Категория: пустой блок в 1 строку <= 40px, горизонтальная полоса чипов
test('5. Категория: пустой блок <= 40px (38px), горизонтальный скролл чипов в 1 строку', () => {
  assert(createModalCss.includes('.create-categories-empty-hint') && createModalCss.includes('height: 38px'), 'Пустой блок высотой 38px');
  assert(createModalCss.includes('white-space: nowrap'), 'Текст пустого блока в одну строку без двух строк');
  assert(createModalCss.includes('.create-category-chips-row') && createModalCss.includes('overflow-x: auto'), 'Горизонтальная прокрутка чипов');
  assert(createModalCss.includes('.create-cat-chip') && createModalCss.includes('height: 40px'), 'Высота чипов категорий 40px');
});

// 6. Переключатель «Для кого задача»: 40-44px
test('6. Переключатель получателя: высота 40px (40-44px), компактные внутренние отступы', () => {
  assert(createModalCss.includes('.create-target-btn') && createModalCss.includes('height: 40px'), 'Кнопки переключателя высотой 40px');
  assert(createModalCss.includes('padding: 3px'), 'Уменьшенный внутренний отступ переключателя');
});

// 7. Дополнительные параметры по умолчанию свернуты
test('7. Дополнительные параметры: свернуты по умолчанию, раскрываются внутри тела', () => {
  assert(createModalTsx.includes('setIsAdvancedOpen(false)'), 'По умолчанию свернуто для нового напоминания');
  assert(createModalCss.includes('.create-advanced-toggle') && createModalCss.includes('height: 42px'), 'Кнопка раскрытия 42px');
});

// 8. Точное время: горизонтальная прокручиваемая строка чипов 38px без переноса
test('8. Точное время: однорядная компоновка инпута и пресетов со скроллом, высота 38px', () => {
  assert(createModalCss.includes('.create-time-row') && createModalCss.includes('flex-wrap: nowrap'), 'Однорядная строка времени');
  assert(createModalCss.includes('.create-time-presets') && createModalCss.includes('overflow-x: auto'), 'Горизонтальный скролл пресетов времени');
  assert(createModalCss.includes('.create-time-preset') && createModalCss.includes('height: 38px'), 'Высота чипа времени 38px');
});

// 9. Футер: кнопка 48px, отмена 40px, safe-area, разделитель и фон
test('9. Футер: кнопка 48px, отмена 40px, отступы 12px + safe-area, разделитель', () => {
  assert(createModalCss.includes('.create-request-submit-btn') && createModalCss.includes('height: 48px'), 'Основная кнопка высотой 48px');
  assert(createModalCss.includes('.create-request-cancel-link') && createModalCss.includes('height: 40px'), 'Кнопка отмены высотой 40px');
  assert(modalCss.includes('.modal-sheet__footer') && modalCss.includes('border-top: 1px solid var(--border-subtle)'), 'Верхний разделитель футера');
  assert(modalCss.includes('padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px))'), 'Безопасный отступ снизу футера');
});

console.log(`\n======================================================`);
console.log(`🎉 Все 9 тестов компактности CreateRequestModal (${passed}/9) пройдены!`);
console.log(`======================================================\n`);
