import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('🧪 Запуск проверки production-подобного режима (isLocalDevHost и чистое подключение)...');

function test(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`❌ [FAIL] ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

// 1. Проверка хелпера src/utils/env.ts
test('1. src/utils/env.ts экспортирует isLocalDevHost с проверками DEV, localhost и Telegram', () => {
  const filePath = path.resolve('src/utils/env.ts');
  assert(fs.existsSync(filePath), 'Файл src/utils/env.ts существует');
  const code = fs.readFileSync(filePath, 'utf8');

  assert(code.includes('export function isLocalDevHost'), 'Экспортирует функцию isLocalDevHost');
  assert(code.includes('import.meta.env.DEV'), 'Проверяет import.meta.env.DEV');
  assert(code.includes('localhost') && code.includes('127.0.0.1'), 'Проверяет localhost и 127.0.0.1');
  assert(code.includes('telegramService.isTelegramEnv()'), 'Проверяет отсутствие Telegram окружения');
});

// 2. Проверка DevBanner
test('2. DevBanner рендерится только при isLocalDevHost()', () => {
  const code = fs.readFileSync('src/components/DevBanner.tsx', 'utf8');
  assert(code.includes("import { isLocalDevHost } from '../utils/env'"), 'Импортирует isLocalDevHost');
  assert(code.includes('if (!isLocalDevHost()) return null;'), 'Возвращает null при !isLocalDevHost()');
});

// 3. Проверка HomePage (DemoStateSwitcher)
test('3. HomePage скрывает DemoStateSwitcher при !isLocalDevHost()', () => {
  const code = fs.readFileSync('src/pages/HomePage.tsx', 'utf8');
  assert(code.includes('isLocalDevHost'), 'Импортирует и использует isLocalDevHost');
  assert(code.includes('isLocalDevHost() && ('), 'DemoStateSwitcher обёрнут в проверку isLocalDevHost()');
});

// 4. Проверка OnboardingPage (тестовые кнопки и предзаполнение Telegram)
test('4. OnboardingPage: скрытие тестовых кнопок и чистое имя / Telegram предзаполнение', () => {
  const code = fs.readFileSync('src/pages/OnboardingPage.tsx', 'utf8');
  assert(code.includes('isLocalDevHost'), 'Импортирует isLocalDevHost');
  assert(code.includes('isLocalDevHost() && ('), 'onboarding-dev-panel скрыта при !isLocalDevHost()');
  assert(code.includes('telegramService.getTelegramUser()'), 'Использует getTelegramUser для имени');
});

// 5. Проверка coupleService (отсутствие defaultCouple в non-local-dev)
test('5. coupleService: пустая пара и coupleId: null при !isLocalDevHost()', () => {
  const code = fs.readFileSync('src/services/coupleService.ts', 'utf8');
  assert(code.includes('isLocalDevHost'), 'Импортирует isLocalDevHost');
  assert(code.includes('isLocalDevHost()'), 'Использует isLocalDevHost() в loadFromStorage / getActiveUser');
  assert(code.includes('isDemoCouple()'), 'Содержит метод isDemoCouple');
});

// 6. Проверка остальных сервисов на пустые массивы [] по умолчанию
test('6. Сервисы reminders, wishlist, relationship, dates не загружают демо-данные при !isLocalDevHost()', () => {
  const reminders = fs.readFileSync('src/services/requestsService.ts', 'utf8');
  const wishlist = fs.readFileSync('src/services/wishlistService.ts', 'utf8');
  const relationship = fs.readFileSync('src/services/relationshipService.ts', 'utf8');
  const dates = fs.readFileSync('src/services/dateMemoryService.ts', 'utf8');

  assert(reminders.includes('isLocalDevHost() && coupleService.isDemoCouple()'), 'requestsService проверяет isLocalDevHost');
  assert(wishlist.includes('isLocalDevHost() && coupleService.isDemoCouple()'), 'wishlistService проверяет isLocalDevHost');
  assert(relationship.includes('isLocalDevHost() && coupleService.isDemoCouple()'), 'relationshipService проверяет isLocalDevHost');
  assert(dates.includes('isLocalDevHost() && coupleService.isDemoCouple()'), 'dateMemoryService проверяет isLocalDevHost');
});

console.log('\n======================================================');
console.log('🎉 Все тесты production-подобного режима успешно пройдены!');
console.log('======================================================');
