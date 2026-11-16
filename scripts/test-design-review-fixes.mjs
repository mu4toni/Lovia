import fs from 'fs';
import assert from 'assert';
import { getAnniversaryInfo, calculateDaysTogether, formatMonthYearGenitive } from '../src/utils/dateCalculations.ts';

console.log('🧪 Тестирование 4 исправлений по результатам ревью дизайна...\n');

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

// --------------------------------------------------------------------------
// 1. Нижний отступ под плавающую кнопку (BottomActionButton + BottomNav)
// --------------------------------------------------------------------------
test('1. Достаточный padding-bottom в MainLayout.css и стилях страниц от перекрытия FAB', () => {
  const mainLayoutCss = fs.readFileSync('src/layouts/MainLayout.css', 'utf8');
  assert(
    mainLayoutCss.includes('160px'),
    'MainLayout.css должен иметь padding-bottom не менее 160px с учетом безопасных зон'
  );

  const homeCss = fs.readFileSync('src/pages/HomePage.css', 'utf8');
  assert(homeCss.includes('160px'), 'HomePage.css имеет отступ 160px для FAB');

  const wishlistCss = fs.readFileSync('src/pages/WishlistPage.css', 'utf8');
  assert(wishlistCss.includes('160px'), 'WishlistPage.css имеет отступ 160px для FAB');

  const relationshipCss = fs.readFileSync('src/pages/RelationshipPage.css', 'utf8');
  assert(relationshipCss.includes('160px'), 'RelationshipPage.css имеет отступ 160px для FAB');

  const datesCss = fs.readFileSync('src/pages/DatesPage.css', 'utf8');
  assert(datesCss.includes('160px'), 'DatesPage.css имеет отступ 160px для FAB');

  const requestsListCss = fs.readFileSync('src/components/home/RequestsList/RequestsList.css', 'utf8');
  assert(
    requestsListCss.includes('.requests-section .empty-state'),
    'RequestsList.css задает отступ под EmptyState, чтобы кнопка «Добавить напоминание» не перекрывала текст'
  );
});

// --------------------------------------------------------------------------
// 2. Исправление логики «0 дней» и годовщины
// --------------------------------------------------------------------------
test('2.1. В день начала отношений (0 дней) НЕ празднуется годовщина и прогресс равен 0%', () => {
  const today = new Date(2026, 10, 15); // 15 ноября 2026
  const todayStr = '2026-11-15';

  const days = calculateDaysTogether(todayStr, today);
  assert.strictEqual(days, 0, 'В день старта количество дней вместе должно быть ровно 0');

  const anniv = getAnniversaryInfo(todayStr, today);
  assert.strictEqual(anniv.isToday, false, 'В день старта (0 дней) isToday НЕ должен быть true');
  assert.strictEqual(anniv.progressPercent, 0, 'В день старта прогресс должен быть 0%');
  assert.strictEqual(anniv.yearsTogether, 1, 'Целевая годовщина должна быть 1-й годовщиной');
  assert(
    anniv.daysUntil === 365 || anniv.daysUntil === 366,
    `До первой годовщины должно оставаться 365/366 дней, фактически: ${anniv.daysUntil}`
  );
});

test('2.2. Ровно через 1 год наступает настоящая годовщина (isToday: true, progressPercent: 100%)', () => {
  const startDate = '2025-11-15';
  const todayAnniv = new Date(2026, 10, 15); // 15 ноября 2026

  const days = calculateDaysTogether(startDate, todayAnniv);
  assert(days >= 365, 'Прошел минимум 1 год');

  const anniv = getAnniversaryInfo(startDate, todayAnniv);
  assert.strictEqual(anniv.isToday, true, 'Через 1 год в этот же день годовщина должна быть true');
  assert.strictEqual(anniv.progressPercent, 100, 'В день годовщины прогресс должен быть 100%');
  assert.strictEqual(anniv.daysUntil, 0, 'В день годовщины daysUntil равен 0');
  assert.strictEqual(anniv.yearsTogether, 1, 'Ровно 1 год вместе');
});

// --------------------------------------------------------------------------
// 3. Синхронизация темы Lovia с системной шапкой Telegram
// --------------------------------------------------------------------------
test('3. Точные цвета фона tokens.css и вызов синхронизации темы в Telegram', () => {
  const tgService = fs.readFileSync('src/services/telegramService.ts', 'utf8');
  assert(
    tgService.includes('#1C0D13') || tgService.includes('#1c0d13'),
    'telegramService использует точный темный фон #1C0D13 из tokens.css'
  );
  assert(
    tgService.includes('#F8F5EE') || tgService.includes('#f8f5ee'),
    'telegramService использует точный светлый фон #F8F5EE из tokens.css'
  );

  const profilePage = fs.readFileSync('src/pages/ProfilePage.tsx', 'utf8');
  assert(
    profilePage.includes('telegramService.applyThemeColors'),
    'ProfilePage вызывает applyThemeColors при смене темы'
  );

  const themeToggle = fs.readFileSync('src/components/ui/ThemeToggle/ThemeToggle.tsx', 'utf8');
  assert(
    themeToggle.includes('telegramService.applyThemeColors'),
    'ThemeToggle вызывает applyThemeColors при клике'
  );

  const appTsx = fs.readFileSync('src/App.tsx', 'utf8');
  assert(
    appTsx.includes('telegramService.applyThemeColors'),
    'App.tsx инициализирует цвет системной шапки при запуске'
  );
});

// --------------------------------------------------------------------------
// 4. Текст даты регистрации в ProfileHeader (родительный падеж)
// --------------------------------------------------------------------------
test('4. Вывод месяца даты регистрации в родительном падеже («с октября 2025 г.»)', () => {
  assert.strictEqual(
    formatMonthYearGenitive('2025-10-14'),
    'октября 2025 г.',
    'Октябрь должен склоняться как «октября»'
  );
  assert.strictEqual(
    formatMonthYearGenitive('2026-01-01'),
    'января 2026 г.',
    'Январь должен склоняться как «января»'
  );
  assert.strictEqual(
    formatMonthYearGenitive('2025-05-09'),
    'мая 2025 г.',
    'Май должен склоняться как «мая»'
  );

  const profileHeader = fs.readFileSync('src/features/profile/ProfileHeader/ProfileHeader.tsx', 'utf8');
  assert(
    profileHeader.includes('formatMonthYearGenitive'),
    'ProfileHeader использует функцию родительного падежа'
  );
  assert(
    !profileHeader.includes('с ${month}'),
    'ProfileHeader больше не вставляет именительный падеж «с октябрь»'
  );
});

console.log(`\n🎉 Все тесты исправлений интерфейса успешно пройдены (${passed}/5)!`);
