import fs from 'fs';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${message}`);
}

console.log('🧪 Запуск проверки мобильной адаптации, авто-скрытия FAB, модалок и буфера обмена...\n');

// 1. Проверка BottomActionButton автоскрытия и поднятия позиции
const fabTsx = fs.readFileSync('src/components/ui/BottomActionButton/BottomActionButton.tsx', 'utf8');
const fabCss = fs.readFileSync('src/components/ui/BottomActionButton/BottomActionButton.css', 'utf8');

assert(fabTsx.includes('useLocation'), 'BottomActionButton.tsx: использует useLocation для отслеживания смены маршрута');
assert(fabTsx.includes('handleScroll') && fabTsx.includes('delta > 16'), 'BottomActionButton.tsx: скрытие при скролле вниз > 16px');
assert(fabTsx.includes('delta < -10') || fabTsx.includes('currentY <= 60'), 'BottomActionButton.tsx: появление при скролле вверх > 10px или у верха (<= 60px)');
assert(fabTsx.includes('setIsScrollHidden(false)'), 'BottomActionButton.tsx: сброс в видимое состояние при смене маршрута');
assert(fabCss.includes('96px'), 'BottomActionButton.css: плавающая кнопка поднята на 96px над BottomNav');

// 2. Проверка одинарной анимации закрытия Modal.tsx
const modalTsx = fs.readFileSync('src/components/ui/Modal/Modal.tsx', 'utf8');
assert(modalTsx.includes('isClosingRef'), 'Modal.tsx: использует isClosingRef для защиты от двойного закрытия');
assert(modalTsx.includes('if (isClosingRef.current) return'), 'Modal.tsx: guard проверка в startCloseSequence');
assert(modalTsx.includes('isClosingRef.current = false') && modalTsx.includes('onClose()'), 'Modal.tsx: сброс флагов до вызова onClose');
assert(modalTsx.includes('!isClosingRef.current'), 'Modal.tsx: useEffect проверяет !isClosingRef.current перед закрытием');

// 3. Проверка утилиты clipboard.ts и копирования кода пары
const clipTs = fs.readFileSync('src/utils/clipboard.ts', 'utf8');
assert(clipTs.includes('export async function copyTextToClipboard'), 'clipboard.ts: экспорт copyTextToClipboard');
assert(clipTs.includes('window.isSecureContext') && clipTs.includes('navigator.clipboard?.writeText'), 'clipboard.ts: проверка secure context');
assert(clipTs.includes('document.createElement(\'textarea\')') && clipTs.includes('document.execCommand(\'copy\')'), 'clipboard.ts: fallback через textarea и execCommand для HTTP/iOS');

const onboardingTsx = fs.readFileSync('src/pages/OnboardingPage.tsx', 'utf8');
assert(onboardingTsx.includes('copyTextToClipboard') && onboardingTsx.includes('handleCopyCode'), 'OnboardingPage.tsx: использует copyTextToClipboard');

const sharedSpaceTsx = fs.readFileSync('src/features/profile/SharedSpaceSettings/SharedSpaceSettings.tsx', 'utf8');
assert(sharedSpaceTsx.includes('copyTextToClipboard') && sharedSpaceTsx.includes('handleCopyCode'), 'SharedSpaceSettings.tsx: использует copyTextToClipboard');
assert(sharedSpaceTsx.includes('Скопировать') || sharedSpaceTsx.includes('Скопировано'), 'SharedSpaceSettings.tsx: кнопка копирования кода в настройках');

// 4. Проверка мобильной адаптации календаря и плашки HomeHeader
const calendarCss = fs.readFileSync('src/components/home/HomeCalendar/HomeCalendar.css', 'utf8');
assert(calendarCss.includes('max-width: 430px'), 'HomeCalendar.css: медиа-запрос max-width: 430px');
assert(calendarCss.includes('flex-direction: column') && calendarCss.includes('home-calendar__header'), 'HomeCalendar.css: 2-рядная компоновка шапки на телефонах');
assert(calendarCss.includes('repeat(7, minmax(0, 1fr))'), 'HomeCalendar.css: полоса недели с repeat(7, minmax(0, 1fr))');

const stripCss = fs.readFileSync('src/components/ui/CalendarStrip/CalendarStrip.css', 'utf8');
assert(stripCss.includes('repeat(7, minmax(0, 1fr))') && stripCss.includes('min-width: 0'), 'CalendarStrip.css: 7 дней с min-width: 0');

const homeHeaderCss = fs.readFileSync('src/components/home/HomeHeader/HomeHeader.css', 'utf8');
assert(homeHeaderCss.includes('54px') && homeHeaderCss.includes('max-width: 400px'), 'HomeHeader.css: боковые аватары 54px на экранах < 400px');

const requestsCss = fs.readFileSync('src/components/home/RequestsList/RequestsList.css', 'utf8');
assert(requestsCss.includes('flex-wrap: wrap') && requestsCss.includes('max-width: 420px'), 'RequestsList.css: фильтры с flex-wrap: wrap на экранах < 420px');

// 5. Проверка вишлистов (WishlistHeader и WishCard)
const wishHeaderCss = fs.readFileSync('src/widgets/Wishlist/WishlistHeader/WishlistHeader.css', 'utf8');
assert(wishHeaderCss.includes('white-space: nowrap') && wishHeaderCss.includes('text-overflow: ellipsis'), 'WishlistHeader.css: табы в 1 строку без переноса');

const wishCardCss = fs.readFileSync('src/widgets/Wishlist/WishCard/WishCard.css', 'utf8');
assert(wishCardCss.includes('flex-direction: column') && wishCardCss.includes('max-width: 430px'), 'WishCard.css: вертикальное расположение кнопок на экранах < 430px');

// 6. Проверка модальных окон
const modalCss = fs.readFileSync('src/components/ui/Modal/Modal.css', 'utf8');
assert(modalCss.includes('14px 16px') && modalCss.includes('max-width: 480px'), 'Modal.css: аккуратные отступы 14px 16px на мобильных');
assert(modalCss.includes('overflow-wrap: anywhere'), 'Modal.css: перенос длинных слов overflow-wrap: anywhere');

const mainLayoutCss = fs.readFileSync('src/layouts/MainLayout.css', 'utf8');
assert(mainLayoutCss.includes('overflow-x: clip'), 'MainLayout.css: защита от горизонтального скролла overflow-x: clip');

console.log('\n======================================================');
console.log('🎉 Все тесты мобильной адаптации и буфера обмена успешно пройдены!');
console.log('======================================================');
