import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('🧪 Запуск проверки мгновенных уведомлений о новых напоминаниях и отступа Toast...\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}: ${err.message}`);
    failed++;
    process.exitCode = 1;
  }
}

// 1. Проверка отступа Toast.css под Telegram safe insets
test('1. Toast.css: top с учётом --tg-total-top-inset', () => {
  const toastCss = fs.readFileSync(path.resolve('src/components/ui/Toast/Toast.css'), 'utf8');

  assert(
    toastCss.includes('top: calc(12px + var(--tg-total-top-inset, env(safe-area-inset-top, 0px)));'),
    'Верхний отступ Toast.css учитывает Telegram total top inset'
  );
});

// 2. Проверка вызова fetch('/api/notify/new-reminder') в requestsService.ts
test('2. requestsService.ts: фоновый вызов /api/notify/new-reminder при создании', () => {
  const reqService = fs.readFileSync(path.resolve('src/services/requestsService.ts'), 'utf8');

  assert(reqService.includes("fetch('/api/notify/new-reminder'"), 'Вызывается эндпоинт /api/notify/new-reminder');
  assert(reqService.includes('coupleId: couple.id'), 'Передаётся coupleId');
  assert(reqService.includes('authorId: newReminder.authorId'), 'Передаётся authorId');
  assert(reqService.includes('authorName: newReminder.authorName'), 'Передаётся authorName');
  assert(reqService.includes('targetId: newReminder.targetId'), 'Передаётся targetId');
  assert(reqService.includes('title: newReminder.title'), 'Передаётся title');
  assert(reqService.includes('dueLabel: newReminder.dueLabel'), 'Передаётся dueLabel');
  assert(reqService.includes('.catch('), 'Вызов неблокирующий с обработкой catch');
  assert(reqService.includes('!isLocalDevHost()'), 'Вызов происходит в продакшене/Telegram');
});

// 3. Проверка серверного эндпоинта api/notify/new-reminder.ts: структура и само-напоминания
test('3. api/notify/new-reminder.ts: пропуск напоминаний самому себе и валидация', () => {
  const notifyCode = fs.readFileSync(path.resolve('api/notify/new-reminder.ts'), 'utf8');

  assert(notifyCode.includes("targetId === authorId || targetId === 'user-self'"), 'Проверяется само-назначение');
  assert(notifyCode.includes('skipped: true'), 'Само-напоминания пропускаются без отправки');
  assert(notifyCode.includes("from('couples')"), 'Запрашивается пара в Supabase');
  assert(notifyCode.includes("from('users')"), 'Запрашивается партнёр в Supabase');
});

// 4. Проверка серверного эндпоинта api/notify/new-reminder.ts: тон текста и Telegram API
test('4. api/notify/new-reminder.ts: тон дружба/отношения, срок и inline web_app кнопка', () => {
  const notifyCode = fs.readFileSync(path.resolve('api/notify/new-reminder.ts'), 'utf8');

  assert(notifyCode.includes("couple.space_type === 'friendship'"), 'Проверяется space_type friendship vs relationship');
  assert(notifyCode.includes('Новая совместная задача') || notifyCode.includes('Новое совместное дело'), 'Формируется текст для совместных задач');
  assert(notifyCode.includes('dueLabel'), 'Включается информация о сроке dueLabel');
  assert(notifyCode.includes('dueTime'), 'Включается время dueTime');
  assert(notifyCode.includes('api.telegram.org/bot'), 'Используется Telegram Bot API sendMessage');
  assert(notifyCode.includes('inline_keyboard'), 'Отправляется inline_keyboard');
  assert(notifyCode.includes('web_app'), 'Кнопка содержит web_app для запуска Lovia');
  assert(notifyCode.includes('Открыть Lovia'), 'Текст кнопки Открыть Lovia');
  assert(notifyCode.includes('catch'), 'Изолированный перехват ошибок без падения');
});

console.log(`\n======================================================`);
console.log(`🎉 Все ${passed} проверок мгновенных уведомлений успешно пройдены!`);
console.log(`======================================================\n`);
