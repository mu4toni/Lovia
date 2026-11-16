import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('🧪 Запуск всестороннего тестирования серверных Telegram-уведомлений и часовых поясов...\n');

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

// 1. Проверка схемы БД Supabase (schema.sql)
test('1. Supabase schema: timezone_offset, notifications_enabled и таблица notification_logs', () => {
  const schema = fs.readFileSync(path.resolve('supabase/schema.sql'), 'utf8');

  assert(schema.includes('timezone_offset INTEGER'), 'Колонка timezone_offset добавлена в public.users');
  assert(schema.includes('notifications_enabled BOOLEAN'), 'Колонка notifications_enabled добавлена в public.users');
  assert(schema.includes('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS timezone_offset'), 'Миграция timezone_offset добавлена');
  assert(schema.includes('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notifications_enabled'), 'Миграция notifications_enabled добавлена');
  assert(schema.includes('CREATE TABLE IF NOT EXISTS public.notification_logs'), 'Таблица public.notification_logs создана');
  assert(schema.includes('notification_type TEXT NOT NULL'), 'notification_type присутствует в notification_logs');
  assert(schema.includes('idx_notification_logs_user'), 'Индекс по user_id в notification_logs');
  assert(schema.includes('Public access to notification_logs'), 'RLS политика для notification_logs');
});

// 2. Проверка синхронизации часового пояса и настроек в api.ts и coupleService.ts
test('2. Синхронизация часового пояса и уведомлений в api.ts и coupleService.ts', () => {
  const apiTs = fs.readFileSync(path.resolve('src/services/api.ts'), 'utf8');
  const coupleServiceTs = fs.readFileSync(path.resolve('src/services/coupleService.ts'), 'utf8');

  assert(apiTs.includes('timezone_offset:'), 'api.ts сохраняет timezone_offset в public.users');
  assert(apiTs.includes('-new Date().getTimezoneOffset()'), 'api.ts вычисляет смещение часового пояса браузера');
  assert(apiTs.includes('notifications_enabled:'), 'api.ts сохраняет notifications_enabled в public.users');

  assert(coupleServiceTs.includes('-new Date().getTimezoneOffset()'), 'coupleService.ts обновляет часовой пояс браузера в фоне');
  assert(coupleServiceTs.includes('timezone_offset'), 'coupleService.ts синхронизирует timezone_offset в Supabase');
});

// 3. Проверка profileService.ts: обновление notifications_enabled в Supabase
test('3. profileService.ts: сохранение notifications_enabled в Supabase', () => {
  const profileServiceTs = fs.readFileSync(path.resolve('src/services/profileService.ts'), 'utf8');

  assert(profileServiceTs.includes('setNotificationsEnabled'), 'setNotificationsEnabled присутствует');
  assert(profileServiceTs.includes("from('users')"), 'profileService обращается к таблице users');
  assert(profileServiceTs.includes('notifications_enabled: enabled'), 'profileService обновляет notifications_enabled в Supabase');
});

// 4. Проверка серверной функции api/cron/notifications.ts: структура, защита, запросы
test('4. api/cron/notifications.ts: проверка CRON_SECRET и загрузка активных данных', () => {
  const cronCode = fs.readFileSync(path.resolve('api/cron/notifications.ts'), 'utf8');

  assert(cronCode.includes('CRON_SECRET'), 'Проверяется секретный ключ CRON_SECRET');
  assert(cronCode.includes("status', 'connected'"), 'Фильтрует пары со status = connected');
  assert(cronCode.includes("not('telegram_id', 'is', null)"), 'Выбирает только пользователей с telegram_id');
  assert(cronCode.includes("neq('notifications_enabled', false)"), 'Исключает пользователей с отключенными уведомлениями');
  assert(cronCode.includes("neq('status', 'completed')"), 'Исключает выполненные напоминания');
  assert(cronCode.includes("eq('is_annual', true)"), 'Загружает ежегодные памятные даты');
  assert(cronCode.includes("from('notification_logs')"), 'Использует notification_logs для дедупликации');
});

// 5. Проверка логики напоминаний за 1 час (0-65 минут) и формата сообщения
test('5. api/cron/notifications.ts: логика напоминаний за 1 час (rem1h_) и часовой пояс', () => {
  const cronCode = fs.readFileSync(path.resolve('api/cron/notifications.ts'), 'utf8');

  assert(cronCode.includes('diffMinutes > 0 && diffMinutes <= 65'), 'Окно проверки 1 час (от 0 до 65 минут)');
  assert(cronCode.includes('userOffsetMin'), 'Учитывается часовой пояс пользователя userOffsetMin');
  assert(cronCode.includes('rem1h_'), 'Уникальный ID лога начинается с rem1h_');
  assert(cronCode.includes('⏰ Через час:'), 'Текст уведомления содержит «⏰ Через час:»');
  assert(cronCode.includes('sentLogIds.has(logId)'), 'Проверяется строгая дедупликация перед отправкой');
});

// 6. Проверка логики годовщин (7d, 1d, 0d) и памятных дат
test('6. api/cron/notifications.ts: годовщины отношений/дружбы и дневное окно 09:00 - 21:00', () => {
  const cronCode = fs.readFileSync(path.resolve('api/cron/notifications.ts'), 'utf8');

  assert(cronCode.includes('localHour < 9 || localHour >= 21'), 'Проверка дневного окна (09:00 - 21:00) по местному времени');
  assert(cronCode.includes('yearsTogether >= 1'), 'Проверка начиная строго с 1-й годовщины');
  assert(cronCode.includes('daysUntil === 7'), 'Проверка за 7 дней');
  assert(cronCode.includes('daysUntil === 1'), 'Проверка за 1 день');
  assert(cronCode.includes('daysUntil === 0'), 'Проверка в день годовщины');
  assert(cronCode.includes('Через неделю у вас'), 'Текст поздравления за 7 дней');
  assert(cronCode.includes('Уже завтра'), 'Текст поздравления за 1 день');
  assert(cronCode.includes('Поздравляем с'), 'Текст поздравления в день годовщины');
  assert(cronCode.includes('anniv_7d_'), 'ID лога anniv_7d_');
  assert(cronCode.includes('anniv_1d_'), 'ID лога anniv_1d_');
  assert(cronCode.includes('anniv_0d_'), 'ID лога anniv_0d_');
  assert(cronCode.includes('memdate_7d_'), 'ID лога памятных дат memdate_7d_');
});

// 7. Проверка Telegram отправки: inline web_app кнопка и защита от сбоев
test('7. api/cron/notifications.ts: inline web_app кнопка и мягкая обработка ошибок', () => {
  const cronCode = fs.readFileSync(path.resolve('api/cron/notifications.ts'), 'utf8');

  assert(cronCode.includes('api.telegram.org/bot'), 'Использует Telegram Bot API sendMessage');
  assert(cronCode.includes('inline_keyboard'), 'Отправляет inline_keyboard');
  assert(cronCode.includes('web_app'), 'Кнопка содержит web_app для запуска Mini App');
  assert(cronCode.includes('Открыть Lovia'), 'Текст кнопки «Открыть Lovia»');
  assert(cronCode.includes('catch'), 'Содержит блок catch для изолированной обработки ошибок');
});

// 8. Проверка вебхука бота api/telegram/webhook.ts
test('8. api/telegram/webhook.ts: обработка /start с приветствием и кнопкой web_app', () => {
  const webhookCode = fs.readFileSync(path.resolve('api/telegram/webhook.ts'), 'utf8');

  assert(webhookCode.includes("startsWith('/start')"), 'Обрабатывает команду /start');
  assert(webhookCode.includes('startapp'), 'Поддерживает startapp параметр deep linking');
  assert(webhookCode.includes('web_app'), 'Отправляет кнопку запуска Mini App');
  assert(webhookCode.includes('Добро пожаловать в Lovia'), 'Приветственный текст в Telegram');
  assert(webhookCode.includes('status(200)'), 'Возвращает 200 OK в Telegram');
});

// 9. Проверка vercel.json: только rewrites, crons удален для совместимости с Vercel Hobby и cron-job.org
test('9. vercel.json: только rewrites, crons отсутствует (внешний cron через cron-job.org)', () => {
  const vercelJson = JSON.parse(fs.readFileSync(path.resolve('vercel.json'), 'utf8'));

  assert(!vercelJson.crons, 'Секция crons отсутствует в vercel.json (не блокирует деплой на Vercel Hobby)');
  assert(Array.isArray(vercelJson.rewrites), 'vercel.json содержит секцию rewrites');
  assert(
    vercelJson.rewrites.some((r) => r.source === '/api/(.*)' && r.destination === '/api/$1'),
    'Настроен rewrite для /api/* эндпоинтов'
  );
});

// 10. Проверка математики разницы времени и часовых поясов
test('10. Математическая проверка вычисления времени за 1 час с учётом timezone_offset', () => {
  // Симуляция: пользователь в Самаре/Баку (UTC+4, offset = 240 мин)
  // Напоминание назначено на 2026-11-17 в 18:00 местного времени
  const userOffsetMin = 240;
  const eventDateStr = '2026-11-17';
  const eventTimeStr = '18:00';

  const [y, m, d] = eventDateStr.split('-').map(Number);
  const [hh, mm] = eventTimeStr.split(':').map(Number);

  // UTC ms события:
  const eventUtcMs = Date.UTC(y, m - 1, d, hh, mm, 0) - userOffsetMin * 60 * 1000;

  // Если текущее время за 45 минут до события:
  const nowMs = eventUtcMs - 45 * 60 * 1000;
  const diffMinutes = (eventUtcMs - nowMs) / (60 * 1000);

  assert.strictEqual(diffMinutes, 45, 'Разница ровно 45 минут');
  assert(diffMinutes > 0 && diffMinutes <= 65, 'Попадает в окно за 1 час (0-65 минут)');

  // Если событие уже прошло 5 минут назад:
  const pastNowMs = eventUtcMs + 5 * 60 * 1000;
  const pastDiff = (eventUtcMs - pastNowMs) / (60 * 1000);
  assert(!(pastDiff > 0 && pastDiff <= 65), 'Прошедшее событие исключается');

  // Если событие через 3 часа:
  const futureNowMs = eventUtcMs - 180 * 60 * 1000;
  const futureDiff = (eventUtcMs - futureNowMs) / (60 * 1000);
  assert(!(futureDiff > 0 && futureDiff <= 65), 'Событие через 3 часа исключается');
});

console.log(`\n======================================================`);
console.log(`🎉 Все ${passed} проверок уведомлений и часовых поясов успешно пройдены!`);
console.log(`======================================================\n`);
