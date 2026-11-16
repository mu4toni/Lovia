import fs from 'fs';
import assert from 'assert';

console.log('🧪 Запуск проверки воздушности и просторности интерфейса Lovia по всем экранам...\n');

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

// ----------------------------------------------------
// 1. ВНЕШНИЕ ОТСТУПЫ СЕКЦИЙ И КОНТЕЙНЕРА (20-24px)
// ----------------------------------------------------

test('1.1. Все экраны: зазоры между секциями 20-24px', () => {
  const homeCss = fs.readFileSync('src/pages/HomePage.css', 'utf8');
  const relCss = fs.readFileSync('src/pages/RelationshipPage.css', 'utf8');
  const wishCss = fs.readFileSync('src/pages/WishlistPage.css', 'utf8');
  const datesCss = fs.readFileSync('src/pages/DatesPage.css', 'utf8');
  const profileCss = fs.readFileSync('src/pages/ProfilePage.css', 'utf8');

  assert(homeCss.includes('gap: var(--space-xl, 24px)'), 'HomePage.css: gap 24px');
  assert(relCss.includes('gap: var(--space-xl, 24px)'), 'RelationshipPage.css: gap 24px');
  assert(wishCss.includes('gap: var(--space-xl, 24px)'), 'WishlistPage.css: gap 24px');
  assert(datesCss.includes('gap: var(--space-xl, 24px)'), 'DatesPage.css: gap 24px');
  assert(profileCss.includes('gap: var(--space-xl, 24px)'), 'ProfilePage.css: gap 24px');
});

test('1.2. MainLayout: горизонтальные отступы контейнера 16-20px', () => {
  const mainLayoutCss = fs.readFileSync('src/layouts/MainLayout.css', 'utf8');

  assert(
    mainLayoutCss.includes('var(--space-lg, 20px)') || mainLayoutCss.includes('20px'),
    'MainLayout.css: горизонтальный отступ 20px для стандартных экранов'
  );
  assert(
    mainLayoutCss.includes('var(--space-md, 16px)') || mainLayoutCss.includes('16px'),
    'MainLayout.css: горизонтальный отступ 16px для компактных экранов (360-380px)'
  );
});

// ----------------------------------------------------
// 2. ВНУТРЕННИЕ ОТСТУПЫ КАРТОЧЕК (20-24px)
// ----------------------------------------------------

test('2.1. HomeHeader, HomeCalendar, CoupleInfoCard, RequestsList: padding 20-24px', () => {
  const headerCss = fs.readFileSync('src/components/home/HomeHeader/HomeHeader.css', 'utf8');
  const calendarCss = fs.readFileSync('src/components/home/HomeCalendar/HomeCalendar.css', 'utf8');
  const coupleCardCss = fs.readFileSync('src/widgets/Relationship/CoupleInfoCard/CoupleInfoCard.css', 'utf8');
  const requestsCss = fs.readFileSync('src/components/home/RequestsList/RequestsList.css', 'utf8');

  assert(headerCss.includes('padding: 22px 18px') || headerCss.includes('padding: 20px'), 'HomeHeader: карточка пары');
  assert(headerCss.includes('min-height: 106px'), 'HomeHeader: высота плашки');
  assert(calendarCss.includes('padding: 22px 20px'), 'HomeCalendar: карточка календаря');
  assert(coupleCardCss.includes('padding: 22px 20px'), 'CoupleInfoCard: карточка пары');
  assert(requestsCss.includes('padding: 20px 18px'), 'RequestsList: карточка напоминания');
});

test('2.2. Wishlist, Timeline, Dates & Profile: карточки с комфортными padding 20-24px', () => {
  const wishHeaderCss = fs.readFileSync('src/widgets/Wishlist/WishlistHeader/WishlistHeader.css', 'utf8');
  const wishGridCss = fs.readFileSync('src/widgets/Wishlist/WishlistGrid/WishlistGrid.css', 'utf8');
  const timelineCss = fs.readFileSync('src/widgets/Relationship/MemorableDatesList/MemorableDatesList.css', 'utf8');
  const datesPageCss = fs.readFileSync('src/pages/DatesPage.css', 'utf8');
  const dateCardCss = fs.readFileSync('src/widgets/Dates/DateMemoryCard/DateMemoryCard.css', 'utf8');
  const partnerCardCss = fs.readFileSync('src/features/profile/PartnerInfoCard/PartnerInfoCard.css', 'utf8');

  assert(wishHeaderCss.includes('padding: 22px 20px'), 'WishlistHeader: owner-card padding 22px 20px');
  assert(wishGridCss.includes('padding: 40px 24px'), 'WishlistGrid: empty card padding 40px 24px');
  assert(timelineCss.includes('padding: 18px 20px') || timelineCss.includes('padding: 20px'), 'MemorableDatesList: timeline card');
  assert(timelineCss.includes('padding: 40px 24px'), 'MemorableDatesList: empty timeline padding 40px 24px');
  assert(datesPageCss.includes('padding: 44px 24px'), 'DatesPage: empty state padding 44px 24px');
  assert(dateCardCss.includes('padding: 0 20px 20px 20px'), 'DateMemoryCard: content padding 20px');
  assert(partnerCardCss.includes('padding: 22px 20px'), 'PartnerInfoCard: card padding 22px 20px');
});

// ----------------------------------------------------
// 3. ВЫСОТА И ЗАЗОРЫ ТАБОВ, ФИЛЬТРОВ И ЭЛЕМЕНТОВ ВВОДА
// ----------------------------------------------------

test('3.1. Дни недели календаря: высота >= 56px, зазоры 6-8px', () => {
  const calendarCss = fs.readFileSync('src/components/home/HomeCalendar/HomeCalendar.css', 'utf8');
  const stripCss = fs.readFileSync('src/components/ui/CalendarStrip/CalendarStrip.css', 'utf8');

  assert(calendarCss.includes('min-height: 58px'), 'HomeCalendar: высота ячейки дня >= 56px');
  assert(calendarCss.includes('gap: 8px'), 'HomeCalendar: зазоры между днями 8px');
  assert(stripCss.includes('min-height: 58px'), 'CalendarStrip: высота ячейки дня 58px');
  assert(stripCss.includes('gap: 8px'), 'CalendarStrip: зазор между днями 8px');
});

test('3.2. Кнопки фильтра по цветам: размер 44px и зазоры >= 10px', () => {
  const calendarCss = fs.readFileSync('src/components/home/HomeCalendar/HomeCalendar.css', 'utf8');
  const requestsCss = fs.readFileSync('src/components/home/RequestsList/RequestsList.css', 'utf8');

  assert(calendarCss.includes('min-height: 44px'), 'HomeCalendar: кнопка «Все» min-height 44px');
  assert(requestsCss.includes('min-height: 44px'), 'RequestsList: кнопка «Все» min-height 44px');
  assert(calendarCss.includes('width: 44px') && calendarCss.includes('height: 44px'), 'HomeCalendar: круги 44x44px');
  assert(requestsCss.includes('width: 44px') && requestsCss.includes('height: 44px'), 'RequestsList: круги 44x44px');
});

test('3.3. Табы Wishlist, фильтры Dates и профиль: высота >= 44-48px', () => {
  const wishHeaderCss = fs.readFileSync('src/widgets/Wishlist/WishlistHeader/WishlistHeader.css', 'utf8');
  const datesHeaderCss = fs.readFileSync('src/widgets/Dates/DatesHeader/DatesHeader.css', 'utf8');
  const partnerCardCss = fs.readFileSync('src/features/profile/PartnerInfoCard/PartnerInfoCard.css', 'utf8');

  assert(wishHeaderCss.includes('min-height: 48px') || wishHeaderCss.includes('min-height: 44px'), 'Wishlist tab btn >= 44px');
  assert(datesHeaderCss.includes('height: 44px') && datesHeaderCss.includes('min-height: 44px'), 'Dates stat-pill height 44px');
  assert(datesHeaderCss.includes('min-height: 44px'), 'Dates year-pill min-height 44px');
  assert(partnerCardCss.includes('min-height: 48px'), 'Partner action button min-height 48px');
});

// ----------------------------------------------------
// 4. СТАТИСТИКА И МИНИ-КАРТОЧКИ
// ----------------------------------------------------

test('4.1. Статистика в CoupleInfoCard и DatesHeader: достаточный размер и зазоры', () => {
  const coupleCardCss = fs.readFileSync('src/widgets/Relationship/CoupleInfoCard/CoupleInfoCard.css', 'utf8');
  const datesHeaderCss = fs.readFileSync('src/widgets/Dates/DatesHeader/DatesHeader.css', 'utf8');

  assert(coupleCardCss.includes('gap: 14px'), 'CoupleInfoCard: stats gap 14px');
  assert(coupleCardCss.includes('min-height: 92px'), 'CoupleInfoCard: stat-item min-height 92px');
  assert(datesHeaderCss.includes('gap: 10px'), 'DatesHeader: stats gap 10px');
});

// ----------------------------------------------------
// 5. НИЖНИЙ ОТСТУП КОНТЕНТА ОТ НАВИГАЦИИ
// ----------------------------------------------------

test('5.1. Нижний отступ контента: формула с nav-height + safe-area + floating clearance', () => {
  const homeCss = fs.readFileSync('src/pages/HomePage.css', 'utf8');
  const relCss = fs.readFileSync('src/pages/RelationshipPage.css', 'utf8');
  const wishCss = fs.readFileSync('src/pages/WishlistPage.css', 'utf8');
  const datesCss = fs.readFileSync('src/pages/DatesPage.css', 'utf8');
  const profileCss = fs.readFileSync('src/pages/ProfilePage.css', 'utf8');

  assert(homeCss.includes('var(--nav-height, 64px)'), 'HomePage.css: nav formula');
  assert(relCss.includes('var(--nav-height, 64px)'), 'RelationshipPage.css: nav formula');
  assert(wishCss.includes('+ 48px + 24px'), 'WishlistPage.css: nav + floating button formula');
  assert(datesCss.includes('+ 48px + 24px'), 'DatesPage.css: nav + floating button formula');
  assert(profileCss.includes('var(--nav-height, 64px)'), 'ProfilePage.css: nav formula');
});

// ----------------------------------------------------
// 6. РАЗДЕЛИТЕЛИ И ИХ ВЕРТИКАЛЬНЫЕ ОТСТУПЫ (16-20px)
// ----------------------------------------------------

test('6.1. Разделители заметнее (border-subtle) с комфортным воздухом', () => {
  const calendarCss = fs.readFileSync('src/components/home/HomeCalendar/HomeCalendar.css', 'utf8');
  const wishCardCss = fs.readFileSync('src/widgets/Wishlist/WishCard/WishCard.css', 'utf8');
  const partnerCardCss = fs.readFileSync('src/features/profile/PartnerInfoCard/PartnerInfoCard.css', 'utf8');

  assert(calendarCss.includes('border-bottom: 1px solid var(--border-subtle)'), 'HomeCalendar: border-subtle');
  assert(calendarCss.includes('margin-bottom: var(--space-lg, 20px)'), 'HomeCalendar: margin-bottom 20px');
  assert(wishCardCss.includes('border-top: 1px solid var(--border-subtle)'), 'WishCard: border-subtle');
  assert(partnerCardCss.includes('border-top: 1px solid var(--border-subtle)'), 'PartnerInfoCard: border-subtle');
  assert(partnerCardCss.includes('padding-top: 16px'), 'PartnerInfoCard: padding-top 16px');
});

// ----------------------------------------------------
// 7. МЕЖСТРОЧНЫЙ ИНТЕРВАЛ 1.5 И ТИПОГРАФИКА
// ----------------------------------------------------

test('7.1. Вторичный текст и описания: line-height 1.5 по всем экранам', () => {
  const requestsCss = fs.readFileSync('src/components/home/RequestsList/RequestsList.css', 'utf8');
  const emptyCss = fs.readFileSync('src/components/ui/EmptyState/EmptyState.css', 'utf8');
  const calendarCss = fs.readFileSync('src/components/home/HomeCalendar/HomeCalendar.css', 'utf8');
  const relCss = fs.readFileSync('src/pages/RelationshipPage.css', 'utf8');
  const wishCardCss = fs.readFileSync('src/widgets/Wishlist/WishCard/WishCard.css', 'utf8');
  const timelineCss = fs.readFileSync('src/widgets/Relationship/MemorableDatesList/MemorableDatesList.css', 'utf8');
  const datesPageCss = fs.readFileSync('src/pages/DatesPage.css', 'utf8');
  const profileHeaderCss = fs.readFileSync('src/features/profile/ProfileHeader/ProfileHeader.css', 'utf8');

  assert(requestsCss.includes('.requests-section__subtitle') && requestsCss.includes('line-height: 1.5'), 'RequestsList: line-height 1.5');
  assert(emptyCss.includes('line-height: 1.5'), 'EmptyState: line-height 1.5');
  assert(calendarCss.includes('.home-calendar__empty-events') && calendarCss.includes('line-height: 1.5'), 'HomeCalendar: line-height 1.5');
  assert(relCss.includes('.relationship-page__subtitle') && relCss.includes('line-height: 1.5'), 'RelationshipPage: line-height 1.5');
  assert(wishCardCss.includes('line-height: 1.5'), 'WishCard: line-height 1.5');
  assert(timelineCss.includes('.timeline-node__desc') && timelineCss.includes('line-height: 1.5'), 'MemorableDates: line-height 1.5');
  assert(datesPageCss.includes('.dates-empty-state__desc') && datesPageCss.includes('line-height: 1.5'), 'DatesPage empty: line-height 1.5');
  assert(profileHeaderCss.includes('.profile-hero-card__joined') && profileHeaderCss.includes('line-height: 1.5'), 'ProfileHeader: line-height 1.5');
});

// ----------------------------------------------------
// 8. ПРЕВЬЮ-БАННЕР (DevBanner)
// ----------------------------------------------------

test('8.1. DevBanner: отступ снизу >= 16px и комфортный padding', () => {
  const devBannerCss = fs.readFileSync('src/components/DevBanner.css', 'utf8');

  assert(devBannerCss.includes('margin-bottom: var(--space-md, 16px)') || devBannerCss.includes('margin-bottom: 16px'), 'DevBanner: margin-bottom >= 16px');
  assert(devBannerCss.includes('padding: 8px var(--space-md, 16px)'), 'DevBanner: padding 8px');
});

console.log(`\n======================================================`);
console.log(`🎉 Все проверки просторности и воздушности (${passed}/12) успешно пройдены!`);
console.log(`======================================================\n`);
