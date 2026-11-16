import fs from 'fs';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${message}`);
}

console.log('🧪 Запуск проверки позиционирования модальных окон и плавающей кнопки...\n');

// 1. Проверка анимации страниц (убран залипающий transform)
const animCss = fs.readFileSync('src/styles/animations.css', 'utf8');
assert(animCss.includes('.page-entrance') && animCss.includes('backwards'), 'animations.css: .page-entrance использует backwards');

const homeCss = fs.readFileSync('src/pages/HomePage.css', 'utf8');
const wishlistCss = fs.readFileSync('src/pages/WishlistPage.css', 'utf8');
const relCss = fs.readFileSync('src/pages/RelationshipPage.css', 'utf8');
const datesCss = fs.readFileSync('src/pages/DatesPage.css', 'utf8');
const profileCss = fs.readFileSync('src/pages/ProfilePage.css', 'utf8');

assert(homeCss.includes('pageEntrance') && homeCss.includes('backwards'), 'HomePage.css: animation использует backwards');
assert(wishlistCss.includes('pageEntrance') && wishlistCss.includes('backwards'), 'WishlistPage.css: animation использует backwards');
assert(relCss.includes('pageEntrance') && relCss.includes('backwards'), 'RelationshipPage.css: animation использует backwards');
assert(datesCss.includes('pageEntrance') && datesCss.includes('backwards'), 'DatesPage.css: animation использует backwards');
assert(profileCss.includes('pageEntrance') && profileCss.includes('backwards'), 'ProfilePage.css: animation использует backwards');

// 2. Проверка выноса модалок в document.body через createPortal
const modalTsx = fs.readFileSync('src/components/ui/Modal/Modal.tsx', 'utf8');
assert(modalTsx.includes('createPortal') && modalTsx.includes('document.body'), 'Modal.tsx: рендеринг через createPortal(..., document.body)');

const lightboxTsx = fs.readFileSync('src/features/dates/PhotoLightbox/PhotoLightbox.tsx', 'utf8');
assert(lightboxTsx.includes('createPortal') && lightboxTsx.includes('document.body'), 'PhotoLightbox.tsx: рендеринг через createPortal(..., document.body)');

// 3. Проверка BottomActionButton
const fabTsx = fs.readFileSync('src/components/ui/BottomActionButton/BottomActionButton.tsx', 'utf8');
assert(fabTsx.includes('createPortal') && fabTsx.includes('document.body'), 'BottomActionButton.tsx: плавающая кнопка выносится в document.body');

const fabCss = fs.readFileSync('src/components/ui/BottomActionButton/BottomActionButton.css', 'utf8');
assert(fabCss.includes('position: fixed'), 'BottomActionButton.css: position: fixed');
assert(fabCss.includes('86px'), 'BottomActionButton.css: отступ над BottomNav 86px');
assert(fabCss.includes('justify-content: center'), 'BottomActionButton.css: центрирование по горизонтали');
assert(fabCss.includes('z-index: 95'), 'BottomActionButton.css: z-index: 95');

// 4. Проверка Modal.css перекрытия BottomNav
const modalCss = fs.readFileSync('src/components/ui/Modal/Modal.css', 'utf8');
assert(modalCss.includes('z-index: 1000'), 'Modal.css: z-index: 1000 выше чем BottomNav (100) и FAB (95)');
assert(modalCss.includes('inset: 0'), 'Modal.css: inset: 0 на весь экран');
assert(modalCss.includes('align-items: flex-end'), 'Modal.css: шторка прижата к нижнему краю');

console.log('\n======================================================');
console.log('🎉 Все тесты позиционирования модалок и FAB успешно пройдены!');
console.log('======================================================');
