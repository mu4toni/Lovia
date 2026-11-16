import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('🧪 Запуск расширенного тестирования глобальной плавающей кнопки и редизайна карточек...');

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

// 1. Проверка BottomActionButton компонента
test('BottomActionButton: поддержка floating режима, WCAG touch target и скрытия при модальных окнах', () => {
  const tsx = fs.readFileSync('src/components/ui/BottomActionButton/BottomActionButton.tsx', 'utf8');
  const css = fs.readFileSync('src/components/ui/BottomActionButton/BottomActionButton.css', 'utf8');

  assert(tsx.includes("variant === 'floating' || floating"), 'Поддержка variant="floating"');
  assert(tsx.includes('bottom-action-wrapper--hidden'), 'Поддержка скрытия когда modal открыт');
  assert(css.includes('position: fixed'), 'Фиксированное позиционирование над BottomNav');
  assert(css.includes('bottom: calc(72px + env(safe-area-inset-bottom, 0px) + 14px)'), 'Правильный отступ от дока BottomNav');
  assert(css.includes('z-index: 95'), 'Правильный z-index над контентом но под модальными окнами');
  assert(css.includes('min-width: 44px') && css.includes('min-height: 44px'), 'WCAG touch target >= 44x44px');
  assert(css.includes('prefers-reduced-motion'), 'Поддержка prefers-reduced-motion');
});

// 2. Проверка 4 страниц на использование плавающей кнопки
test('HomePage: интеграция плавающей кнопки «Добавить напоминание» и safe padding', () => {
  const tsx = fs.readFileSync('src/pages/HomePage.tsx', 'utf8');
  const css = fs.readFileSync('src/pages/HomePage.css', 'utf8');

  assert(tsx.includes('<BottomActionButton') && tsx.includes('variant="floating"'), 'Использует variant="floating"');
  assert(tsx.includes('visible={!isCreateModalOpen'), 'Скрывается при открытых модальных окнах');
  assert(tsx.includes('Добавить напоминание'), 'Правильная подпись кнопки');
  assert(css.includes('padding-bottom: calc(130px + env(safe-area-inset-bottom, 0px))'), 'Safe bottom padding от перекрытия');
});

test('WishlistPage: интеграция плавающей кнопки «Добавить желание» и safe padding', () => {
  const tsx = fs.readFileSync('src/pages/WishlistPage.tsx', 'utf8');
  const css = fs.readFileSync('src/pages/WishlistPage.css', 'utf8');

  assert(tsx.includes('<BottomActionButton') && tsx.includes('variant="floating"'), 'Использует variant="floating"');
  assert(tsx.includes('visible={!isCreateModalOpen && !editingWish && !deletingWish}'), 'Скрывается при открытых модальных окнах');
  assert(tsx.includes('Добавить желание'), 'Правильная подпись кнопки');
  assert(css.includes('padding-bottom: calc(130px + env(safe-area-inset-bottom, 0px))'), 'Safe bottom padding от перекрытия');
});

test('RelationshipPage: интеграция плавающей кнопки «Добавить памятную дату» и safe padding', () => {
  const tsx = fs.readFileSync('src/pages/RelationshipPage.tsx', 'utf8');
  const css = fs.readFileSync('src/pages/RelationshipPage.css', 'utf8');

  assert(tsx.includes('<BottomActionButton') && tsx.includes('variant="floating"'), 'Использует variant="floating"');
  assert(tsx.includes('visible={!isCreateModalOpen && !isEditStartDateOpen && !deletingDate}'), 'Скрывается при открытых модальных окнах');
  assert(tsx.includes('Добавить памятную дату'), 'Правильная подпись кнопки');
  assert(css.includes('padding-bottom: calc(130px + env(safe-area-inset-bottom, 0px))'), 'Safe bottom padding от перекрытия');
});

test('DatesPage: интеграция плавающей кнопки «Добавить воспоминание» и safe padding', () => {
  const tsx = fs.readFileSync('src/pages/DatesPage.tsx', 'utf8');
  const css = fs.readFileSync('src/pages/DatesPage.css', 'utf8');

  assert(tsx.includes('<BottomActionButton') && tsx.includes('variant="floating"'), 'Использует variant="floating"');
  assert(tsx.includes('visible={!isAnyModalOpen}'), 'Скрывается при открытых модальных окнах');
  assert(tsx.includes('Добавить воспоминание'), 'Правильная подпись кнопки');
  assert(css.includes('padding-bottom: calc(130px + env(safe-area-inset-bottom, 0px))'), 'Safe bottom padding от перекрытия');
});

// 3. Проверка редизайна карточки пары на Главной (HomeHeader)
test('HomeHeader: 3-зонная горизонтальная композиция с крупными аватарами и прогрессом годовщины', () => {
  const tsx = fs.readFileSync('src/components/home/HomeHeader/HomeHeader.tsx', 'utf8');
  const css = fs.readFileSync('src/components/home/HomeHeader/HomeHeader.css', 'utf8');

  assert(tsx.includes('home-header__avatar-side--user'), 'Левая зона: крупный аватар пользователя');
  assert(tsx.includes('home-header__center-zone'), 'Центральная зона: статус, имена и прогресс');
  assert(tsx.includes('home-header__avatar-side--partner'), 'Правая зона: крупный аватар партнера');
  assert(tsx.includes('AnniversaryProgressBar'), 'Интегрированный AnniversaryProgressBar');
  assert(tsx.includes('МЫ ВМЕСТЕ'), 'Фирменный кикер МЫ ВМЕСТЕ');
  assert(css.includes('home-header__couple-card--celebrate'), 'Праздничное состояние карточки');
});

// 4. Проверка компонента AnniversaryProgressBar
test('AnniversaryProgressBar: прогресс с закруглением, маркером конца и поддержкой prefers-reduced-motion', () => {
  const tsx = fs.readFileSync('src/components/ui/AnniversaryProgress/AnniversaryProgressBar.tsx', 'utf8');
  const css = fs.readFileSync('src/components/ui/AnniversaryProgress/AnniversaryProgressBar.css', 'utf8');

  assert(tsx.includes('role="progressbar"'), 'ARIA роль progressbar');
  assert(tsx.includes('aria-valuenow'), 'ARIA valuenow');
  assert(tsx.includes('anniversary-progress__marker'), 'Маркер конца прогресса');
  assert(css.includes('linear-gradient'), 'Многослойный градиент');
  assert(css.includes('prefers-reduced-motion'), 'Поддержка prefers-reduced-motion');
});

// 5. Проверка редизайна раздела «Отношения»
test('RelationshipPage & Widgets: Hero Card, Anniversary Card и Vertical Timeline', () => {
  const pageTsx = fs.readFileSync('src/pages/RelationshipPage.tsx', 'utf8');
  const coupleCardTsx = fs.readFileSync('src/widgets/Relationship/CoupleInfoCard/CoupleInfoCard.tsx', 'utf8');
  const annivCardTsx = fs.readFileSync('src/widgets/Relationship/AnniversaryCard/AnniversaryCard.tsx', 'utf8');
  const timelineTsx = fs.readFileSync('src/widgets/Relationship/MemorableDatesList/MemorableDatesList.tsx', 'utf8');
  const timelineCss = fs.readFileSync('src/widgets/Relationship/MemorableDatesList/MemorableDatesList.css', 'utf8');

  assert(pageTsx.includes('Наша история'), 'Новый заголовок шапки «Наша история»');
  assert(coupleCardTsx.includes('relationship-hero-card__top'), 'Единая 3-зонная композиция Hero Card');
  assert(coupleCardTsx.includes('relationship-hero-card__stats'), 'Сетка статистики дней вместе и проведенных свиданий');
  assert(annivCardTsx.includes('anniversary-showcase__hero-badge'), 'Выразительное число оставшихся дней');
  assert(annivCardTsx.includes('AnniversaryProgressBar'), 'Встроенный AnniversaryProgressBar');
  assert(timelineTsx.includes('memorable-timeline__track'), 'Вертикальная дорожка таймлайна');
  assert(timelineTsx.includes('timeline-node__marker'), 'Визуальные маркеры на таймлайне');
  assert(timelineTsx.includes('more-vertical'), 'Компактное меню действий (три точки)');
  assert(timelineCss.includes('timeline-node__popover'), 'Всплывающее меню редактирования/удаления');
});

console.log(`\n======================================================`);
console.log(`🎉 Все ${passed} сценариев валидации глобальных FAB и редизайна успешно пройдены!`);
console.log(`======================================================`);
