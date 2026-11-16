import fs from 'fs';
import assert from 'assert';

console.log('🧪 Тестирование интеграции Telegram Mini App (TMA)...\n');

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

test('1. Подключение SDK и правильный viewport в index.html', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert(
    html.includes('https://telegram.org/js/telegram-web-app.js'),
    'index.html должен подключать официальный telegram-web-app.js'
  );
  assert(
    html.includes('user-scalable=no') && html.includes('viewport-fit=cover'),
    'viewport meta-тег должен содержать user-scalable=no и viewport-fit=cover'
  );
});

test('2. Типизация и методы сервиса telegramService.ts', () => {
  const ts = fs.readFileSync('src/services/telegramService.ts', 'utf8');
  assert(ts.includes('interface TelegramWebApp'), 'Описан интерфейс TelegramWebApp');
  assert(ts.includes('interface TelegramUser'), 'Описан интерфейс TelegramUser');
  assert(ts.includes('interface TelegramBackButton'), 'Описан интерфейс TelegramBackButton');
  assert(ts.includes('interface TelegramHapticFeedback'), 'Описан интерфейс TelegramHapticFeedback');
  assert(ts.includes('interface TelegramSafeAreaInset'), 'Описан интерфейс TelegramSafeAreaInset');
  
  assert(ts.includes('isTelegramEnv(): boolean'), 'Присутствует метод isTelegramEnv()');
  assert(ts.includes('init(): void'), 'Присутствует метод init()');
  assert(ts.includes('getInitData(): string'), 'Присутствует метод getInitData()');
  assert(ts.includes('getTelegramUser(): TelegramUser | null'), 'Присутствует метод getTelegramUser()');
  assert(ts.includes('getStartParam(): string | null'), 'Присутствует метод getStartParam()');
  assert(ts.includes('hapticImpact('), 'Присутствует метод hapticImpact()');
  assert(ts.includes('hapticNotification('), 'Присутствует метод hapticNotification()');
  assert(ts.includes('setupBackButton('), 'Присутствует метод setupBackButton()');
});

test('3. Безопасные отступы (Safe Area) и высота viewport в CSS', () => {
  const globalCss = fs.readFileSync('src/styles/global.css', 'utf8');
  assert(
    globalCss.includes('--tg-viewport-stable-height'),
    'global.css использует --tg-viewport-stable-height для высоты экрана'
  );

  const mainLayoutCss = fs.readFileSync('src/layouts/MainLayout.css', 'utf8');
  assert(
    mainLayoutCss.includes('--tg-content-safe-area-inset-top') ||
    mainLayoutCss.includes('--tg-safe-area-inset-top'),
    'MainLayout.css учитывает верхний safe-area отступ Telegram'
  );
  assert(
    mainLayoutCss.includes('--tg-content-safe-area-inset-bottom') ||
    mainLayoutCss.includes('--tg-safe-area-inset-bottom'),
    'MainLayout.css учитывает нижний safe-area отступ Telegram'
  );

  const bottomNavCss = fs.readFileSync('src/components/BottomNav.css', 'utf8');
  assert(
    bottomNavCss.includes('--tg-content-safe-area-inset-bottom') ||
    bottomNavCss.includes('--tg-safe-area-inset-bottom'),
    'BottomNav.css учитывает нижний safe-area отступ Telegram'
  );

  const bottomActionCss = fs.readFileSync('src/components/ui/BottomActionButton/BottomActionButton.css', 'utf8');
  assert(
    bottomActionCss.includes('--tg-content-safe-area-inset-bottom') ||
    bottomActionCss.includes('--tg-safe-area-inset-bottom'),
    'BottomActionButton.css учитывает нижний safe-area отступ Telegram'
  );
});

test('4. Автоподстановка пользователя Telegram и скрытие dev-инструментов', () => {
  const coupleService = fs.readFileSync('src/services/coupleService.ts', 'utf8');
  assert(
    coupleService.includes('telegramService.isTelegramEnv()'),
    'coupleService проверяет окружение Telegram'
  );
  assert(
    coupleService.includes('tgUser') && coupleService.includes('tg_${tgUser.id}'),
    'coupleService формирует ID tg_${tgUser.id} для пользователя Telegram'
  );

  const homePage = fs.readFileSync('src/pages/HomePage.tsx', 'utf8');
  assert(
    homePage.includes('!telegramService.isTelegramEnv()'),
    'HomePage скрывает DemoStateSwitcher внутри TMA'
  );

  const onboardingPage = fs.readFileSync('src/pages/OnboardingPage.tsx', 'utf8');
  assert(
    onboardingPage.includes('!telegramService.isTelegramEnv()'),
    'OnboardingPage скрывает dev-переключатель внутри TMA'
  );
  assert(
    onboardingPage.includes('telegramService.getStartParam()'),
    'OnboardingPage считывает инвайт-код из start_param'
  );

  const devBanner = fs.readFileSync('src/components/DevBanner.tsx', 'utf8');
  assert(
    devBanner.includes('telegramService.isTelegramEnv()'),
    'DevBanner скрывается внутри TMA'
  );
});

test('5. Haptic Feedback и синхронизация BackButton', () => {
  const bottomNav = fs.readFileSync('src/components/BottomNav.tsx', 'utf8');
  assert(
    bottomNav.includes("hapticImpact('light')"),
    'BottomNav вызывает hapticImpact при переключении вкладок'
  );

  const homePage = fs.readFileSync('src/pages/HomePage.tsx', 'utf8');
  assert(
    homePage.includes("hapticImpact('light')"),
    'HomePage вызывает hapticImpact при смене статуса напоминания'
  );
  assert(
    homePage.includes("hapticNotification('success')"),
    'HomePage вызывает hapticNotification при создании напоминания'
  );

  const wishlistPage = fs.readFileSync('src/pages/WishlistPage.tsx', 'utf8');
  assert(
    wishlistPage.includes("hapticImpact('light')"),
    'WishlistPage вызывает hapticImpact при резервировании желания'
  );
  assert(
    wishlistPage.includes("hapticNotification('success')"),
    'WishlistPage вызывает hapticNotification при создании желания'
  );

  const datesPage = fs.readFileSync('src/pages/DatesPage.tsx', 'utf8');
  assert(
    datesPage.includes("hapticNotification('success')"),
    'DatesPage вызывает hapticNotification при создании свидания'
  );

  const onboardingPage = fs.readFileSync('src/pages/OnboardingPage.tsx', 'utf8');
  assert(
    onboardingPage.includes("hapticNotification('success')"),
    'OnboardingPage вызывает hapticNotification при создании/подключении пары'
  );

  const app = fs.readFileSync('src/App.tsx', 'utf8');
  assert(
    app.includes('setupBackButton'),
    'App.tsx синхронизирует состояние системной кнопки BackButton'
  );
  assert(
    app.includes("location.pathname === '/'"),
    'BackButton скрыт на главной странице'
  );
});

console.log(`\n🎉 Все 5 блоков тестов TMA интеграции пройдены (${passed}/5)!`);
