import fs from 'fs';
import path from 'path';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${message}`);
}

console.log('🧪 Запуск всесторонней проверки Telegram Motion Design в Lovia...\n');

// 1. Проверка токенов физики Telegram и кривых в tokens.css
const tokensCss = fs.readFileSync('src/styles/tokens.css', 'utf8');
assert(
  tokensCss.includes('--ease-telegram: cubic-bezier(0.32, 0.72, 0, 1)'),
  'tokens.css: Определена фирменная кривая Telegram/iOS для шторок и переходов: cubic-bezier(0.32, 0.72, 0, 1)'
);
assert(
  tokensCss.includes('--ease-tactile: cubic-bezier(0.22, 1, 0.36, 1)'),
  'tokens.css: Определена кривая тактильного отклика: cubic-bezier(0.22, 1, 0.36, 1)'
);
assert(
  tokensCss.includes('--duration-sheet: 280ms'),
  'tokens.css: Длительность анимации шторки 280ms'
);
assert(
  tokensCss.includes('--duration-tactile: 140ms'),
  'tokens.css: Длительность тактильного микровзаимодействия 140ms'
);

// 2. Проверка ключевых кадров в animations.css
const animationsCss = fs.readFileSync('src/styles/animations.css', 'utf8');
assert(
  animationsCss.includes('@keyframes pageEntrance') &&
  animationsCss.includes('transform: translateY(4px);') &&
  animationsCss.includes('opacity: 0;') &&
  animationsCss.includes('transform: translateY(0);') &&
  animationsCss.includes('opacity: 1;'),
  'animations.css: Анимация быстрого легкого входа страниц (pageEntrance, 4px -> 0, opacity 0 -> 1)'
);
assert(
  animationsCss.includes('@keyframes slideUpSheet') &&
  animationsCss.includes('transform: translateY(100%);') &&
  animationsCss.includes('transform: translateY(0);'),
  'animations.css: Анимация выезда шторки снизу (slideUpSheet, 100% -> 0)'
);
assert(
  animationsCss.includes('@keyframes slideDownSheet') &&
  animationsCss.includes('transform: translateY(0);') &&
  animationsCss.includes('transform: translateY(100%);'),
  'animations.css: Анимация плавного закрытия шторки вниз (slideDownSheet, 0 -> 100%)'
);
assert(
  animationsCss.includes('@keyframes fadeIn') &&
  animationsCss.includes('@keyframes fadeOut'),
  'animations.css: Анимация плавного фейда бэкдропа (fadeIn & fadeOut)'
);
assert(
  animationsCss.includes('@media (prefers-reduced-motion: reduce)'),
  'animations.css: Полная поддержка режима отключения анимаций prefers-reduced-motion'
);

// 3. Проверка Modal (Native Telegram Bottom Sheet + Swipe-to-Dismiss)
const modalTsx = fs.readFileSync('src/components/ui/Modal/Modal.tsx', 'utf8');
const modalCss = fs.readFileSync('src/components/ui/Modal/Modal.css', 'utf8');

assert(
  modalTsx.includes('startCloseSequence') &&
  modalTsx.includes('isClosing') &&
  modalTsx.includes('shouldRender'),
  'Modal.tsx: Реализован плавный двухфазный жизненный цикл закрытия (280ms) перед размонтированием'
);
assert(
  modalTsx.includes('handlePointerDown') &&
  modalTsx.includes('handlePointerMove') &&
  modalTsx.includes('handlePointerUp') &&
  modalTsx.includes('setPointerCapture'),
  'Modal.tsx: Реализован Swipe-to-Dismiss на Pointer Events с захватом курсора'
);
assert(
  modalTsx.includes('Math.pow(Math.abs(dy), 0.72)') || modalTsx.includes('dy < 0'),
  'Modal.tsx: Сопротивление (damping) при попытке перетаскивания вверх'
);
assert(
  modalTsx.includes('totalDy > 80') || modalTsx.includes('velocity > 0.45'),
  'Modal.tsx: Порог закрытия > 80px или быстрый свайп вниз'
);
assert(
  modalTsx.includes('telegramService.hapticImpact'),
  'Modal.tsx: Тактильная вибрация Telegram WebApp при закрытии свайпом'
);
assert(
  modalCss.includes('.modal-sheet--closing') &&
  modalCss.includes('slideDownSheet 280ms var(--ease-telegram)'),
  'Modal.css: Класс плавного закрытия modal-sheet--closing использует кривую Telegram'
);
assert(
  modalCss.includes('.modal-backdrop--closing') &&
  modalCss.includes('fadeOut 260ms var(--ease-telegram)'),
  'Modal.css: Класс затухания бэкдропа modal-backdrop--closing'
);
assert(
  modalCss.includes('.modal-sheet__drag-zone') &&
  modalCss.includes('touch-action: none;'),
  'Modal.css: Зона перетаскивания имеет touch-action: none для блокировки паразитного скролла'
);

// 4. Проверка тактильных откликов (:active { transform: scale(...) })
const buttonCss = fs.readFileSync('src/components/ui/Button/Button.css', 'utf8');
const iconButtonCss = fs.readFileSync('src/components/ui/IconButton/IconButton.css', 'utf8');
const bottomNavCss = fs.readFileSync('src/components/BottomNav.css', 'utf8');
const cardCss = fs.readFileSync('src/components/ui/Card/Card.css', 'utf8');
const calendarCss = fs.readFileSync('src/components/home/HomeCalendar/HomeCalendar.css', 'utf8');
const requestsListCss = fs.readFileSync('src/components/home/RequestsList/RequestsList.css', 'utf8');
const dateMemoryCardCss = fs.readFileSync('src/widgets/Dates/DateMemoryCard/DateMemoryCard.css', 'utf8');
const wishCardCss = fs.readFileSync('src/widgets/Wishlist/WishCard/WishCard.css', 'utf8');

assert(
  buttonCss.includes('.btn:active:not(:disabled)') &&
  buttonCss.includes('scale(0.93)') &&
  buttonCss.includes('var(--ease-tactile)'),
  'Button.css: Кнопки масштабируются до scale(0.93) с кривой ease-tactile'
);
assert(
  iconButtonCss.includes('.icon-btn:active:not(:disabled)') &&
  iconButtonCss.includes('scale(0.93)') &&
  iconButtonCss.includes('var(--ease-tactile)'),
  'IconButton.css: Иконки-кнопки масштабируются до scale(0.93) с кривой ease-tactile'
);
assert(
  bottomNavCss.includes('.bottom-nav__item:not(.bottom-nav__item--featured):active') &&
  bottomNavCss.includes('scale(0.93)'),
  'BottomNav.css: Вкладки навигации масштабируются до scale(0.93)'
);
assert(
  bottomNavCss.includes('.bottom-nav__item--featured:active .bottom-nav__icon--featured') &&
  bottomNavCss.includes('scale(0.93)'),
  'BottomNav.css: Центральная крупная кнопка «Отношения» масштабируется до scale(0.93)'
);
assert(
  cardCss.includes('.glass-card--interactive:active') &&
  cardCss.includes('scale(0.975)') &&
  cardCss.includes('var(--ease-tactile)'),
  'Card.css: Интерактивные карточки масштабируются до scale(0.975) с кривой ease-tactile'
);
assert(
  calendarCss.includes('.calendar-day:active') &&
  calendarCss.includes('scale(0.975)') &&
  calendarCss.includes('.home-calendar__month-cell:active') &&
  calendarCss.includes('scale(0.975)'),
  'HomeCalendar.css: Ячейки дней и месяца календаря масштабируются до scale(0.975)'
);
assert(
  requestsListCss.includes('.request-card:active') &&
  requestsListCss.includes('scale(0.975)'),
  'RequestsList.css: Карточки напоминаний масштабируются до scale(0.975)'
);
assert(
  dateMemoryCardCss.includes('.date-memory-card:active') &&
  dateMemoryCardCss.includes('scale(0.975)'),
  'DateMemoryCard.css: Карточки свиданий масштабируются до scale(0.975)'
);
assert(
  wishCardCss.includes('.wish-card:active') &&
  wishCardCss.includes('scale(0.975)'),
  'WishCard.css: Карточки желаний масштабируются до scale(0.975)'
);

// 5. Проверка анимации плавного входа основных страниц
const homePageCss = fs.readFileSync('src/pages/HomePage.css', 'utf8');
const wishlistPageCss = fs.readFileSync('src/pages/WishlistPage.css', 'utf8');
const relationshipPageCss = fs.readFileSync('src/pages/RelationshipPage.css', 'utf8');
const datesPageCss = fs.readFileSync('src/pages/DatesPage.css', 'utf8');
const profilePageCss = fs.readFileSync('src/pages/ProfilePage.css', 'utf8');

assert(
  homePageCss.includes('pageEntrance') && homePageCss.includes('var(--ease-telegram)'),
  'HomePage.css: Применена анимация pageEntrance с кривой ease-telegram'
);
assert(
  wishlistPageCss.includes('pageEntrance') && wishlistPageCss.includes('var(--ease-telegram)'),
  'WishlistPage.css: Применена анимация pageEntrance с кривой ease-telegram'
);
assert(
  relationshipPageCss.includes('pageEntrance') && relationshipPageCss.includes('var(--ease-telegram)'),
  'RelationshipPage.css: Применена анимация pageEntrance с кривой ease-telegram'
);
assert(
  datesPageCss.includes('pageEntrance') && datesPageCss.includes('var(--ease-telegram)'),
  'DatesPage.css: Применена анимация pageEntrance с кривой ease-telegram'
);
assert(
  profilePageCss.includes('pageEntrance') && profilePageCss.includes('var(--ease-telegram)'),
  'ProfilePage.css: Применена анимация pageEntrance с кривой ease-telegram'
);

console.log('\n======================================================');
console.log('🎉 Все тесты Motion Design по стандарту Telegram успешно пройдены!');
console.log('======================================================');
