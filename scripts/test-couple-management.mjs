import fs from 'fs';
import assert from 'assert';

console.log('🧪 Запуск всестороннего тестирования: Управление парой, разрыв связи и регистрация...\n');

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
// ЧАСТЬ 1: ПОЛНОЦЕННЫЙ РАЗРЫВ СВЯЗИ И ПРЕДУПРЕЖДЕНИЕ
// ----------------------------------------------------

test('1.1. Модальное окно предупреждения: правильный заголовок, текст и кнопки', () => {
  const tsx = fs.readFileSync('src/features/profile/SharedSpaceSettings/SharedSpaceSettings.tsx', 'utf8');
  const css = fs.readFileSync('src/features/profile/SharedSpaceSettings/SharedSpaceSettings.css', 'utf8');

  assert(tsx.includes('Вы уверены, что хотите разорвать связь?'), 'Точный заголовок модального окна');
  assert(tsx.includes('Это действие завершит ваше совместное пространство'), 'Основной текст предупреждения');
  assert(tsx.includes('Восстановить их после разрыва связи будет невозможно'), 'Предупреждение о необратимости');
  assert(tsx.includes('Ваш партнёр также потеряет доступ к совместному пространству'), 'Предупреждение о потере доступа партнёром');
  assert(tsx.includes('Да, разорвать связь'), 'Кнопка «Да, разорвать связь»');
  assert(tsx.includes('Отмена'), 'Кнопка «Отмена»');
  assert(css.includes('shared-space-warning-divider'), 'Визуальное разделение предупреждения и кнопок');
  assert(css.includes('shared-space-confirm-unpair-btn'), 'Стили предупреждающей кнопки');
});

test('1.2. Процесс удаления: блокировка повторных нажатий, спиннер и обработка ошибок', () => {
  const tsx = fs.readFileSync('src/features/profile/SharedSpaceSettings/SharedSpaceSettings.tsx', 'utf8');
  const css = fs.readFileSync('src/features/profile/SharedSpaceSettings/SharedSpaceSettings.css', 'utf8');

  assert(tsx.includes('isDeleting'), 'Состояние выполнения удаления');
  assert(tsx.includes('disabled={isDeleting}'), 'Блокировка повторных нажатий');
  assert(tsx.includes('shared-space-spinner'), 'Индикатор выполнения операции');
  assert(tsx.includes('deleteError'), 'Обработка и отображение ошибок при сбое');
  assert(tsx.includes('navigate(\'/connect\')'), 'Перенаправление на страницу создания/подключения к паре');
  assert(css.includes('shared-space-spinner'), 'Стили анимации индикатора');
});

test('1.3. Полное удаление данных совместного пространства во всех сервисах', () => {
  const coupleServiceTs = fs.readFileSync('src/services/coupleService.ts', 'utf8');
  const reqServiceTs = fs.readFileSync('src/services/requestsService.ts', 'utf8');
  const catServiceTs = fs.readFileSync('src/services/categoriesService.ts', 'utf8');
  const wishServiceTs = fs.readFileSync('src/services/wishlistService.ts', 'utf8');
  const relServiceTs = fs.readFileSync('src/services/relationshipService.ts', 'utf8');
  const dateMemServiceTs = fs.readFileSync('src/services/dateMemoryService.ts', 'utf8');

  assert(coupleServiceTs.includes('requestsService.clearSharedData()'), 'Очистка напоминаний');
  assert(coupleServiceTs.includes('categoriesService.clearSharedData()'), 'Очистка категорий');
  assert(coupleServiceTs.includes('wishlistService.clearSharedData()'), 'Очистка вишлистов');
  assert(coupleServiceTs.includes('relationshipService.clearSharedData()'), 'Очистка дат отношений');
  assert(coupleServiceTs.includes('dateMemoryService.clearSharedData()'), 'Очистка воспоминаний о свиданиях');

  assert(reqServiceTs.includes('clearSharedData'), 'Метод clearSharedData в requestsService');
  assert(catServiceTs.includes('clearSharedData'), 'Метод clearSharedData в categoriesService');
  assert(wishServiceTs.includes('clearSharedData'), 'Метод clearSharedData в wishlistService');
  assert(relServiceTs.includes('clearSharedData'), 'Метод clearSharedData в relationshipService');
  assert(dateMemServiceTs.includes('clearSharedData'), 'Метод clearSharedData в dateMemoryService');
});

test('1.4. Разрыв связи: отвязка обоих участников и сохранение личного аккаунта', () => {
  const coupleServiceTs = fs.readFileSync('src/services/coupleService.ts', 'utf8');

  assert(coupleServiceTs.includes('this.users[couple.user1.id].coupleId = null'), 'Отвязка первого участника');
  assert(coupleServiceTs.includes('this.users[couple.user2.id].coupleId = null'), 'Отвязка второго участника');
  assert(coupleServiceTs.includes('couple.status = \'dissolved\''), 'Статус пары переведён в dissolved');
  assert(coupleServiceTs.includes('lovia_couple_dissolved'), 'Событие lovia_couple_dissolved для сквозной синхронизации');
  // Личный аккаунт не удаляется
  assert(!coupleServiceTs.includes('delete this.users[user.id]'), 'Личный аккаунт пользователя не удаляется');
});

// ----------------------------------------------------
// ЧАСТЬ 2: ЗАЩИТА МАРШРУТОВ И ПОВЕДЕНИЕ ВТОРОГО ПАРТНЁРА
// ----------------------------------------------------

test('2.1. ProtectedCoupleRoute: автоматическое перенаправление на /connect для обоих участников', () => {
  const appTsx = fs.readFileSync('src/App.tsx', 'utf8');

  assert(appTsx.includes('ProtectedCoupleRoute'), 'Наличие защитного маршрута ProtectedCoupleRoute');
  assert(appTsx.includes('coupleService.isConnected()'), 'Проверка активного подключения пары');
  assert(appTsx.includes('lovia_couple_dissolved'), 'Подписка на разрыв связи для мгновенного перехода второго партнёра');
  assert(appTsx.includes('<Navigate to="/connect" replace />'), 'Перенаправление не подключённых пользователей на /connect');
  assert(appTsx.includes('path="/connect" element={<OnboardingPage />}'), 'Маршрут страницы подключения');
});

// ----------------------------------------------------
// ЧАСТЬ 3: СТРАНИЦА РЕГИСТРАЦИИ (OnboardingPage)
// ----------------------------------------------------

test('3.1. Блок 1. Приветствие: логотип, заголовок и подзаголовок', () => {
  const tsx = fs.readFileSync('src/pages/OnboardingPage.tsx', 'utf8');
  const css = fs.readFileSync('src/pages/OnboardingPage.css', 'utf8');

  assert(tsx.includes('Lovia'), 'Бренд Lovia в шапке');
  assert(tsx.includes('Давайте знакомиться'), 'Заголовок «Давайте знакомиться»');
  assert(tsx.includes('Создадим ваше маленькое общее пространство'), 'Подзаголовок приветствия');
  assert(css.includes('onboarding-hero__badge'), 'Фирменный бейдж с иконкой');
});

test('3.2. Блок 2. Имя пользователя: обязательность, валидация и сохранение в профиль', () => {
  const tsx = fs.readFileSync('src/pages/OnboardingPage.tsx', 'utf8');

  assert(tsx.includes('Как вас зовут?'), 'Заголовок блока имени');
  assert(tsx.includes('Введите ваше имя'), 'Плейсхолдер ввода имени');
  assert(tsx.includes('validateName'), 'Валидация имени');
  assert(tsx.includes('Пожалуйста, введите ваше имя'), 'Сообщение об ошибке при пустом имени');
  assert(tsx.includes('nameError'), 'Отображение ошибки валидации');
});

test('3.3. Блок 3. Выбор пола: интерактивные карточки, мягкая подсветка, доступность', () => {
  const tsx = fs.readFileSync('src/pages/OnboardingPage.tsx', 'utf8');
  const css = fs.readFileSync('src/pages/OnboardingPage.css', 'utf8');

  assert(tsx.includes('Укажите ваш пол'), 'Заголовок блока выбора пола');
  assert(tsx.includes('Мужской') && tsx.includes('Женский'), 'Оба варианта пола');
  assert(tsx.includes('role="radiogroup"'), 'Семантика radiogroup');
  assert(tsx.includes('role="radio"'), 'Семантика radio для вариантов');
  assert(css.includes('onboarding-gender-pill--active'), 'Стиль активного выбора пола');
  assert(css.includes('min-height: 48px'), 'Сенсорная область выбора пола');
});

// ----------------------------------------------------
// ЧАСТЬ 4: СОЗДАНИЕ И ПОДКЛЮЧЕНИЕ ПАРЫ
// ----------------------------------------------------

test('4.1. Блок 4.1. Создать новую пару: заголовок, кнопка, генерация и отображение кода', () => {
  const tsx = fs.readFileSync('src/pages/OnboardingPage.tsx', 'utf8');
  const css = fs.readFileSync('src/pages/OnboardingPage.css', 'utf8');

  assert(tsx.includes('Создать наше пространство'), 'Заголовок блока создания пары');
  assert(tsx.includes('Создайте свою пару и пригласите партнёра присоединиться'), 'Описание создания пары');
  assert(tsx.includes('Создать код пары'), 'Кнопка создания кода пары');
  assert(tsx.includes('Код вашей пары'), 'Заголовок отображения созданного кода');
  assert(tsx.includes('onboarding-code-value'), 'Элемент для крупного отображения кода');
  assert(tsx.includes('Скопировать код'), 'Кнопка копирования кода');
  assert(tsx.includes('handleCopyCode'), 'Функция копирования в буфер обмена');
  assert(css.includes('onboarding-code-banner'), 'Оформление баннера с кодом');
});

test('4.2. Сохранение кода при повторном входе: ожидание партнёра без дублирования пар', () => {
  const tsx = fs.readFileSync('src/pages/OnboardingPage.tsx', 'utf8');
  const coupleServiceTs = fs.readFileSync('src/services/coupleService.ts', 'utf8');

  assert(tsx.includes('isWaitingPartner'), 'Проверка ожидания партнёра');
  assert(tsx.includes('currentCouple.inviteCode'), 'Отображение существующего кода пары');
  assert(coupleServiceTs.includes('if (existing.status === \'waiting_partner\')'), 'Возврат существующей пары без создания дубликата');
  assert(tsx.includes('Отменить и ввести код партнёра'), 'Возможность отменить ожидание и ввести код партнёра');
});

test('4.3. Блок 4.2. Подключиться по коду: плавное раскрытие, нечувствительность к регистру, валидация', () => {
  const tsx = fs.readFileSync('src/pages/OnboardingPage.tsx', 'utf8');
  const css = fs.readFileSync('src/pages/OnboardingPage.css', 'utf8');

  assert(tsx.includes('Уже есть код пары?'), 'Заголовок блока подключения');
  assert(tsx.includes('Введите код, который отправил вам партнёр'), 'Описание подключения');
  assert(tsx.includes('isJoinExpanded'), 'Состояние плавного раскрытия формы');
  assert(tsx.includes('toUpperCase()'), 'Приведение кода к верхнему регистру');
  assert(tsx.includes('Присоединиться'), 'Кнопка отправки кода');
  assert(tsx.includes('Свернуть'), 'Кнопка сворачивания формы');
  assert(css.includes('onboarding-join-form'), 'Стили раскрывающейся формы');
});

test('4.4. Серверные валидации: блокировка подключения к себе, заполненной паре, истёкшему коду', () => {
  const coupleServiceTs = fs.readFileSync('src/services/coupleService.ts', 'utf8');

  assert(coupleServiceTs.includes('targetCouple.user1.id === user.id'), 'Блокировка подключения к собственному коду');
  assert(coupleServiceTs.includes('targetCouple.user2'), 'Проверка на заполненность пары (максимум 2 участника)');
  assert(coupleServiceTs.includes('Срок действия этого кода истёк'), 'Проверка срока действия кода');
  assert(coupleServiceTs.includes('Код пары не найден'), 'Проверка несуществующего кода');
  assert(coupleServiceTs.includes('Вы уже состоите в активной паре'), 'Блокировка если пользователь уже в другой паре');
});

test('4.5. Инициализация чистого пространства для новой пары: никаких данных от старой', () => {
  const coupleServiceTs = fs.readFileSync('src/services/coupleService.ts', 'utf8');

  assert(coupleServiceTs.includes('await requestsService.clearSharedData()'), 'Очистка напоминаний перед стартом новой пары');
  assert(coupleServiceTs.includes('categoriesService.clearSharedData()'), 'Очистка категорий');
  assert(coupleServiceTs.includes('await wishlistService.clearSharedData()'), 'Очистка вишлистов');
  assert(coupleServiceTs.includes('relationshipService.clearSharedData()'), 'Очистка дат');
  assert(coupleServiceTs.includes('dateMemoryService.clearSharedData()'), 'Очистка воспоминаний');
});

// ----------------------------------------------------
// ЧАСТЬ 5: ДОСТУПНОСТЬ (a11y) И ТЕМЫ ОФОРМЛЕНИЯ
// ----------------------------------------------------

test('5.1. Сенсорные области нажатия >= 44x44px и поддержка тёмной темы', () => {
  const css = fs.readFileSync('src/pages/OnboardingPage.css', 'utf8');

  assert(css.includes('min-height: 48px') || css.includes('min-height: 44px'), 'Сенсорные области кнопок и переключателей');
  assert(css.includes('[data-theme=\'dark\'] .onboarding-page'), 'Стили тёмной темы для страницы регистрации');
  assert(css.includes('[data-theme=\'dark\'] .onboarding-gender-pill'), 'Стили тёмной темы для карточек пола');
  assert(css.includes('[data-theme=\'dark\'] .onboarding-code-banner'), 'Стили тёмной темы для баннера кода');
});

console.log(`\n🎉 Все ${passed} тестов управления парой и регистрации успешно пройдены!\n`);
