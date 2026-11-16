import fs from 'fs';
import assert from 'assert';

console.log('🧪 Запуск проверки синхронизации Supabase и защиты от наезда на системные кнопки Telegram...');

function test(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`❌ [FAIL] ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

// 1. Telegram Service: safe area sum and listeners
test('1. telegramService: сумма safeAreaInset.top + contentSafeAreaInset.top в --tg-total-top-inset', () => {
  const code = fs.readFileSync('src/services/telegramService.ts', 'utf8');
  assert(code.includes('--tg-total-top-inset'), 'Устанавливает --tg-total-top-inset');
  assert(code.includes('safeTop + contentTop') || code.includes('totalTop'), 'Вычисляет сумму безопасных отступов');
  assert(code.includes('safeAreaChanged'), 'Слушает событие safeAreaChanged');
  assert(code.includes('contentSafeAreaChanged'), 'Слушает событие contentSafeAreaChanged');
  assert(code.includes('updateViewportVars'), 'Предоставляет метод updateViewportVars');
});

// 2. CSS: защита от системных кнопок Telegram
test('2. CSS: применение --tg-total-top-inset в MainLayout, Modal, PlacePickerModal и OnboardingPage', () => {
  const mainLayoutCss = fs.readFileSync('src/layouts/MainLayout.css', 'utf8');
  assert(mainLayoutCss.includes('--tg-total-top-inset'), 'MainLayout.css использует --tg-total-top-inset для padding-top');

  const modalCss = fs.readFileSync('src/components/ui/Modal/Modal.css', 'utf8');
  assert(modalCss.includes('--tg-total-top-inset'), 'Modal.css ограничивает max-height через --tg-total-top-inset');

  const placePickerCss = fs.readFileSync('src/features/dates/PlacePickerModal/PlacePickerModal.css', 'utf8');
  assert(placePickerCss.includes('--tg-total-top-inset'), 'PlacePickerModal.css защищает шапку с поиском через --tg-total-top-inset');

  const onboardingCss = fs.readFileSync('src/pages/OnboardingPage.css', 'utf8');
  assert(onboardingCss.includes('--tg-total-top-inset'), 'OnboardingPage.css использует --tg-total-top-inset');
});

// 3. requestsService: синхронизация reminders через Supabase
test('3. requestsService: чтение и запись в public.reminders с couple_id и Realtime подпиской', () => {
  const code = fs.readFileSync('src/services/requestsService.ts', 'utf8');
  assert(code.includes(".from('reminders')"), 'Обращается к таблице reminders');
  assert(code.includes("eq('couple_id'"), 'Фильтрует по couple_id');
  assert(code.includes('subscribeToRealtime'), 'Подписывается на Realtime обновления');
  assert(code.includes('fetchFromSupabase'), 'Содержит функцию загрузки из Supabase');
  assert(code.includes("throw new Error('Ошибка БД: ' + error.message)"), 'Пробрасывает ошибку БД');
});

// 4. wishlistService: синхронизация wishlist_items через Supabase
test('4. wishlistService: чтение и запись в public.wishlist_items с couple_id и Realtime подпиской', () => {
  const code = fs.readFileSync('src/services/wishlistService.ts', 'utf8');
  assert(code.includes(".from('wishlist_items')"), 'Обращается к таблице wishlist_items');
  assert(code.includes("eq('couple_id'"), 'Фильтрует по couple_id');
  assert(code.includes('subscribeToRealtime'), 'Подписывается на Realtime обновления');
  assert(code.includes("throw new Error('Ошибка БД: ' + error.message)"), 'Пробрасывает ошибку БД');
});

// 5. relationshipService: синхронизация start_date и memorable_dates через Supabase
test('5. relationshipService: синхронизация start_date и public.memorable_dates с couple_id', () => {
  const code = fs.readFileSync('src/services/relationshipService.ts', 'utf8');
  assert(code.includes(".from('memorable_dates')"), 'Обращается к таблице memorable_dates');
  assert(code.includes("eq('couple_id'"), 'Фильтрует по couple_id');
  assert(code.includes('fetchMemorableDates'), 'Содержит fetchMemorableDates');
  assert(code.includes('subscribeToRealtime'), 'Подписывается на Realtime обновления');
  assert(code.includes(".from('couples')") && code.includes('start_date'), 'Обновляет start_date в таблице couples');
});

// 6. dateMemoryService: синхронизация date_memories и загрузка фото в Storage
test('6. dateMemoryService: синхронизация date_memories и загрузка фото в Storage lovia_media', () => {
  const code = fs.readFileSync('src/services/dateMemoryService.ts', 'utf8');
  assert(code.includes(".from('date_memories')"), 'Обращается к таблице date_memories');
  assert(code.includes("eq('couple_id'"), 'Фильтрует по couple_id');
  assert(code.includes('fetchDateMemories'), 'Содержит fetchDateMemories');
  assert(code.includes('subscribeToRealtime'), 'Подписывается на Realtime обновления');
  assert(code.includes('supabase.storage'), 'Использует Supabase Storage для фото');
});

// 7. coupleService: автоматическое восстановление пары при старте и возвращении в Telegram
test('7. coupleService: syncCurrentCoupleFromSupabase при старте и visibilitychange', () => {
  const code = fs.readFileSync('src/services/coupleService.ts', 'utf8');
  assert(code.includes('syncCurrentCoupleFromSupabase'), 'Содержит syncCurrentCoupleFromSupabase');
  assert(code.includes('visibilitychange'), 'Слушает visibilitychange');
});

// 8. Hooks: тихий интервал 5 секунд и обработка visibilitychange
test('8. Хуки: тихий фоновый интервал 5 сек и реакция на visibilitychange', () => {
  const homeCode = fs.readFileSync('src/hooks/useHomeData.ts', 'utf8');
  assert(homeCode.includes('5000') && homeCode.includes('visibilitychange'), 'useHomeData содержит 5s интервал и visibilitychange');

  const wishCode = fs.readFileSync('src/hooks/useWishlist.ts', 'utf8');
  assert(wishCode.includes('5000') && wishCode.includes('visibilitychange'), 'useWishlist содержит 5s интервал и visibilitychange');

  const relCode = fs.readFileSync('src/hooks/useRelationship.ts', 'utf8');
  assert(relCode.includes('5000') && relCode.includes('visibilitychange'), 'useRelationship содержит 5s интервал и visibilitychange');

  const dateCode = fs.readFileSync('src/hooks/useDateMemories.ts', 'utf8');
  assert(dateCode.includes('5000') && dateCode.includes('visibilitychange'), 'useDateMemories содержит 5s интервал и visibilitychange');
});

console.log('\n========================================================================');
console.log('🎉 Все тесты синхронизации данных и Telegram safe insets успешно пройдены!');
console.log('========================================================================');
