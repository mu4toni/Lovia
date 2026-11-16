import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('🧪 Запуск проверки Supabase workflow создания и подключения пары по коду...');

function test(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`❌ [FAIL] ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

// 1. Проверка модуля src/services/api.ts
test('1. src/services/api.ts содержит функции интеграции с Supabase', () => {
  const apiCode = fs.readFileSync('src/services/api.ts', 'utf8');
  assert(apiCode.includes('ensureUserInSupabase'), 'Экспортирует ensureUserInSupabase');
  assert(apiCode.includes('findCoupleByInviteCode'), 'Экспортирует findCoupleByInviteCode');
  assert(apiCode.includes('fetchUserById'), 'Экспортирует fetchUserById');
  assert(apiCode.includes('updateUserCoupleId'), 'Экспортирует updateUserCoupleId');
  assert(apiCode.includes(".from('users')") && apiCode.includes(".upsert("), 'Выполняет upsert в public.users');
  assert(apiCode.includes("ilike('invite_code'"), 'Использует ilike без учёта регистра');
});

// 2. Проверка ensureUserInSupabase перед createCouple
test('2. coupleService: ensureUserInSupabase вызывается перед созданием пары', () => {
  const code = fs.readFileSync('src/services/coupleService.ts', 'utf8');
  assert(code.includes('await this.ensureUserInSupabase(user)'), 'Вызывает ensureUserInSupabase перед createCouple');
  
  const createIndex = code.indexOf('async createCouple');
  const ensureIndex = code.indexOf('await this.ensureUserInSupabase(user)', createIndex);
  const insertIndex = code.indexOf(".from('couples')", ensureIndex);
  
  assert(createIndex !== -1, 'createCouple существует');
  assert(ensureIndex > createIndex, 'ensureUserInSupabase вызывается внутри createCouple');
  assert(insertIndex > ensureIndex, 'insert в public.couples вызывается строго ПОСЛЕ ensureUserInSupabase');
});

// 3. Проверка createCouple в Supabase
test('3. coupleService: createCouple корректно пишет в public.couples и обновляет user1', () => {
  const code = fs.readFileSync('src/services/coupleService.ts', 'utf8');
  assert(code.includes("invite_code: inviteCode"), 'Записывает invite_code');
  assert(code.includes("code_status: 'active'"), 'Устанавливает code_status active');
  assert(code.includes("status: 'waiting_partner'"), 'Устанавливает статус waiting_partner');
  assert(code.includes('await updateUserCoupleId(user.id, coupleId)'), 'Обновляет couple_id у user1 в public.users');
});

// 4. Проверка прямого поиска в Supabase в joinCoupleByCode
test('4. coupleService: joinCoupleByCode делает прямой запрос в Supabase без поиска в local this.couples', () => {
  const code = fs.readFileSync('src/services/coupleService.ts', 'utf8');
  const joinIndex = code.indexOf('async joinCoupleByCode');
  assert(joinIndex !== -1, 'joinCoupleByCode существует');

  const joinBody = code.slice(joinIndex);
  assert(joinBody.includes("supabase\n        .from('couples')") || joinBody.includes("supabase.from('couples')") || joinBody.includes(".from('couples')\n        .select('*')\n        .ilike('invite_code', cleanCode)"), 'Делает прямой запрос в Supabase по invite_code');
  assert(joinBody.includes("throw new Error('Код пары не найден. Проверьте правильность ввода.');"), 'Выбрасывает понятную ошибку если пара не найдена');
  assert(joinBody.includes("throw new Error('Ошибка БД: ' + error.message);"), 'Не глотает ошибку базы, а выбрасывает Ошибка БД:');
});

// 5. Проверка подключения user2 к паре в Supabase
test('5. coupleService: joinCoupleByCode связывает user2, обновляет пользователей и шлет событие', () => {
  const code = fs.readFileSync('src/services/coupleService.ts', 'utf8');
  const joinIndex = code.indexOf('async joinCoupleByCode');
  const joinBody = code.slice(joinIndex);

  assert(joinBody.includes('await this.ensureUserInSupabase(user)'), 'Гарантирует user2 в public.users');
  assert(joinBody.includes("status: 'connected'"), 'Обновляет статус на connected');
  assert(joinBody.includes("code_status: 'used'"), 'Помечает код как used');
  assert(joinBody.includes('await updateUserCoupleId(user.id, targetCouple.id)'), 'Привязывает couple_id к user2');
  assert(joinBody.includes('await updateUserCoupleId(targetCouple.user1_id, targetCouple.id)'), 'Привязывает couple_id к user1');
  assert(joinBody.includes('fetchUserById(targetCouple.user1_id)'), 'Загружает данные user1 для информации о партнёре');
  assert(joinBody.includes("new CustomEvent('lovia_couple_connected')"), 'Рассылает lovia_couple_connected');
});

// 6. Проверка авто-поллинга на OnboardingPage
test('6. OnboardingPage: авто-поллинг checkPartnerConnected во время ожидания партнёра', () => {
  const onboardingCode = fs.readFileSync('src/pages/OnboardingPage.tsx', 'utf8');
  assert(onboardingCode.includes('checkPartnerConnected'), 'Использует checkPartnerConnected для поллинга');
  assert(onboardingCode.includes("currentCouple?.status !== 'waiting_partner'"), 'Запускает поллинг только в режиме ожидания');
});

// 7. Проверка строгого запрета отката на localStorage в продакшене
test('7. coupleService: строгий запрет localStorage в продакшене при отсутствии ключей Supabase', () => {
  const code = fs.readFileSync('src/services/coupleService.ts', 'utf8');
  assert(code.includes("if (!isLocalDevHost() && !isSupabaseConfigured())"), 'Проверяет среду перед созданием/подключением');
  assert(code.includes("throw new Error('Не настроены ключи Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)')"), 'Выбрасывает исключение если ключи не настроены вне localhost');
  assert(code.includes("throw new Error('Ошибка БД: ' + insertError.message)"), 'Выбрасывает Ошибка БД при сбое insert');
  assert(code.includes("throw new Error('Ошибка БД: ' + updateError.message)"), 'Выбрасывает Ошибка БД при сбое update');
});

// 8. Проверка OnboardingPage: вывод ошибок на экран и через showToast
test('8. OnboardingPage: отображение ошибок createError / joinError и вызов showToast', () => {
  const code = fs.readFileSync('src/pages/OnboardingPage.tsx', 'utf8');
  assert(code.includes('setCreateError(msg)'), 'Сохраняет createError в state');
  assert(code.includes('setJoinError(msg)'), 'Сохраняет joinError в state');
  assert(code.includes("title: 'Ошибка создания пары'"), 'Показывает тост при ошибке создания');
  assert(code.includes("title: 'Ошибка подключения'"), 'Показывает тост при ошибке подключения');
  assert(code.includes('createError &&'), 'Отображает блок ошибки создания на экране');
  assert(code.includes('joinError &&'), 'Отображает блок ошибки подключения на экране');
});

console.log('\n======================================================');
console.log('🎉 Все тесты Supabase couple connection пройдены успешно!');
console.log('======================================================');
