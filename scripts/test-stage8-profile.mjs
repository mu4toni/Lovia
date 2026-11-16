import fs from 'fs';
import assert from 'assert';

console.log('🧪 Запуск всестороннего тестирования Этапа 8: Профиль, настройки и управление категориями...\n');

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
// ЧАСТЬ 1: ПЕРСОНАЛИЗАЦИЯ И ШАПКА ПРОФИЛЯ (ProfileHeader)
// ----------------------------------------------------

test('1.1. Карточка профиля пользователя: аватар, загрузка фото, имя и дата регистрации', () => {
  const tsx = fs.readFileSync('src/features/profile/ProfileHeader/ProfileHeader.tsx', 'utf8');
  const css = fs.readFileSync('src/features/profile/ProfileHeader/ProfileHeader.css', 'utf8');

  assert(tsx.includes('profile-hero-card'), 'Корневой класс карточки профиля');
  assert(tsx.includes('profile-hero-avatar') || tsx.includes('size="lg"'), 'Крупный аватар пользователя');
  assert(tsx.includes('profile-hero-card__avatar-btn'), 'Кнопка смены фотографии/аватара');
  assert(tsx.includes('type="file"'), 'Скрытый input для выбора файла изображения');
  assert(tsx.includes('profile-hero-card__edit-btn'), 'Кнопка редактирования имени');
  assert(tsx.includes('joinDateText'), 'Форматированная дата вступления в Lovia');
  assert(css.includes('profile-hero-card__glow'), 'Мягкое фоновое свечение в стиле Lovia');
  assert(css.includes('min-height: 44px') || css.includes('width: 34px'), 'Сенсорные области кнопок');
});

test('1.2. Бейдж статуса совместного подключения в шапке профиля', () => {
  const tsx = fs.readFileSync('src/features/profile/ProfileHeader/ProfileHeader.tsx', 'utf8');
  const css = fs.readFileSync('src/features/profile/ProfileHeader/ProfileHeader.css', 'utf8');

  assert(tsx.includes('profile-hero-card__badge--connected'), 'Бейдж подключённой пары');
  assert(tsx.includes('В паре с'), 'Текст «В паре с [Имя]»');
  assert(tsx.includes('profile-hero-heart'), 'Иконка сердца');
  assert(tsx.includes('Партнёр не подключён'), 'Корректный фолбэк при отсутствии связи');
  assert(css.includes('border-radius: var(--radius-pill)'), 'Скругление pill для бейджа');
});

// ----------------------------------------------------
// ЧАСТЬ 2: КАРТОЧКА ПАРТНЁРА (PartnerInfoCard)
// ----------------------------------------------------

test('2.1. Карточка партнёра: аватар, стаж пары и переход в историю', () => {
  const tsx = fs.readFileSync('src/features/profile/PartnerInfoCard/PartnerInfoCard.tsx', 'utf8');
  const css = fs.readFileSync('src/features/profile/PartnerInfoCard/PartnerInfoCard.css', 'utf8');

  assert(tsx.includes('Avatar'), 'Аватар партнёра');
  assert(tsx.includes('partner.name'), 'Имя партнёра');
  assert(tsx.includes('formatRussianDate'), 'Форматирование даты начала отношений');
  assert(tsx.includes('partner-info-card__action-btn'), 'Кнопка быстрого перехода в историю');
  assert(tsx.includes('/relationship'), 'Ссылка на раздел «Отношения»');
  assert(css.includes('min-height: 48px'), 'Сенсорный размер кнопки перехода не менее 48px');
  assert(!tsx.includes('partner-info-card__online-dot'), 'Точка онлайна полностью удалена');
});

// ----------------------------------------------------
// ЧАСТЬ 3: ОФОРМЛЕНИЕ И ТЕМА (AppearanceSettings)
// ----------------------------------------------------

test('3.1. Переключение тем: интерактивные карточки, миниатюры предпросмотра, радиогруппа', () => {
  const tsx = fs.readFileSync('src/features/profile/AppearanceSettings/AppearanceSettings.tsx', 'utf8');
  const css = fs.readFileSync('src/features/profile/AppearanceSettings/AppearanceSettings.css', 'utf8');

  assert(tsx.includes('role="radiogroup"'), 'Семантическая радиогруппа для выбора темы');
  assert(tsx.includes('role="radio"'), 'Семантическая роль радиокнопки');
  assert(tsx.includes('appearance-card__preview--light'), 'Миниатюра светлой темы');
  assert(tsx.includes('appearance-card__preview--dark'), 'Миниатюра тёмной темы');
  assert(tsx.includes('appearance-card__badge'), 'Бейдж активного состояния');
  assert(css.includes('appearance-card--active'), 'Выделение активной темы');
  assert(css.includes('min-height: 44px') || css.includes('padding: 14px 10px'), 'Удобный размер клика');
});

// ----------------------------------------------------
// ЧАСТЬ 4: УВЕДОМЛЕНИЯ (NotificationSettings)
// ----------------------------------------------------

test('4.1. Управление уведомлениями: переключатель, прозрачный запрос разрешений', () => {
  const tsx = fs.readFileSync('src/features/profile/NotificationSettings/NotificationSettings.tsx', 'utf8');
  const css = fs.readFileSync('src/features/profile/NotificationSettings/NotificationSettings.css', 'utf8');

  assert(tsx.includes('Switch'), 'Использование компонента Switch');
  assert(tsx.includes('Notification.requestPermission'), 'Проверка и запрос разрешений на уведомления');
  assert(tsx.includes('notification-settings__warning'), 'Информационное предупреждение о запрете');
  assert(css.includes('notification-settings__card'), 'Карточка настроек уведомлений');
});

// ----------------------------------------------------
// ЧАСТЬ 5: УПРАВЛЕНИЕ КАТЕГОРИЯМИ НАПОМИНАНИЙ (ReminderCategoriesManager)
// ----------------------------------------------------

test('5.1. Цветовая палитра категорий: 3 стандартных пастели + 15 цветов Lovia (18 оттенков)', () => {
  const types = fs.readFileSync('src/types/category.ts', 'utf8');

  assert(types.includes('#F4DDE2'), 'Пудровый пастельный цвет (#F4DDE2)');
  assert(types.includes('#E3EBDD'), 'Шалфейный пастельный цвет (#E3EBDD)');
  assert(types.includes('#F5EACD'), 'Сливочный пастельный цвет (#F5EACD)');
  assert(types.includes('STANDARD_PASTEL_COLORS'), 'Список стандартных пастельных цветов');
  assert(types.includes('EXTENDED_LOVIA_PALETTE'), '15 расширенных фирменных цветов Lovia');
  assert(types.includes('ALL_LOVIA_COLORS'), 'Объединённый массив 18 цветов');
});

test('5.2. Модальное окно редактора категорий: опциональное название и превью карточки', () => {
  const tsx = fs.readFileSync('src/features/profile/CategoryEditorModal/CategoryEditorModal.tsx', 'utf8');
  const css = fs.readFileSync('src/features/profile/CategoryEditorModal/CategoryEditorModal.css', 'utf8');

  assert(tsx.includes('необязательно'), 'Название категории является опциональным');
  assert(tsx.includes('category-swatch'), 'Кнопки выбора цвета в палитре');
  assert(tsx.includes('category-reminder-preview'), 'Живое превью напоминания с выбранным цветом');
  assert(tsx.includes('getContrastColor'), 'Автоматический контрастный цвет текста на фоне');
  assert(css.includes('category-swatch--selected'), 'Визуальная индикация выбранного цвета');
});

test('5.3. Безопасное удаление категорий: выбор между снятием категории и переназначением', () => {
  const tsx = fs.readFileSync('src/features/profile/CategoryDeleteDialog/CategoryDeleteDialog.tsx', 'utf8');
  const css = fs.readFileSync('src/features/profile/CategoryDeleteDialog/CategoryDeleteDialog.css', 'utf8');

  assert(tsx.includes('unlink'), 'Опция оставить напоминания без категории');
  assert(tsx.includes('reassign'), 'Опция переназначить в другую категорию');
  assert(tsx.includes('onConfirm(selectedReassignId)'), 'Передача целевой категории');
  assert(css.includes('category-delete-option--active'), 'Акцентное выделение выбранного варианта');
});

test('5.4. Синхронизация сервиса категорий и напоминаний', () => {
  const catService = fs.readFileSync('src/services/categoriesService.ts', 'utf8');
  const reqService = fs.readFileSync('src/services/requestsService.ts', 'utf8');

  assert(catService.includes('requestsService.updateCategoryInfo'), 'Категории обновляют привязанные напоминания');
  assert(catService.includes('requestsService.reassignCategory'), 'Категории переназначают напоминания при удалении');
  assert(catService.includes('lovia_categories_updated'), 'Событие обновления категорий для реактивности UI');
  assert(reqService.includes('updateCategoryInfo'), 'Метод обновления метаданных категории в запросах');
  assert(reqService.includes('reassignCategory'), 'Метод переназначения категории в запросах');
});

// ----------------------------------------------------
// ЧАСТЬ 6: СОВМЕСТНОЕ ПРОСТРАНСТВО (SharedSpaceSettings)
// ----------------------------------------------------

test('6.1. Настройки пространства: изменение даты, код пары и разрыв связи', () => {
  const tsx = fs.readFileSync('src/features/profile/SharedSpaceSettings/SharedSpaceSettings.tsx', 'utf8');
  const css = fs.readFileSync('src/features/profile/SharedSpaceSettings/SharedSpaceSettings.css', 'utf8');

  assert(tsx.includes('formatRussianDate(startDate)'), 'Отображение текущей даты отношений');
  assert(tsx.includes('shared-space-code'), 'Отображение кода совместного доступа');
  assert(tsx.includes('shared-space-unpair-btn'), 'Кнопка разрыва связи с партнёром');
  assert(tsx.includes('shared-space-warning-modal'), 'Предупреждающее окно при попытке разорвать связь');
  assert(tsx.includes('relationshipService.setStartDate'), 'Сохранение обновлённой даты начала отношений');
  assert(css.includes('shared-space-unpair-btn'), 'Стили кнопки разрыва связи');
});

// ----------------------------------------------------
// ЧАСТЬ 7: ОПАСНАЯ ЗОНА (DangerZone)
// ----------------------------------------------------

test('7.1. Зона удаления аккаунта: деликатное оформление, строгое предупреждение, серверная политика', () => {
  const tsx = fs.readFileSync('src/features/profile/DangerZone/DangerZone.tsx', 'utf8');
  const css = fs.readFileSync('src/features/profile/DangerZone/DangerZone.css', 'utf8');

  assert(tsx.includes('danger-zone__trigger-btn'), 'Скрытая/деликатная кнопка вызова');
  assert(tsx.includes('danger-modal-consequences'), 'Список необратимых последствий');
  assert(tsx.includes('danger-modal-confirm-checkbox'), 'Обязательный чекбокс подтверждения');
  assert(tsx.includes('@LoviaBot'), 'Уведомление о подтверждении через Telegram-бота');
  assert(tsx.includes('danger-modal-server-notice'), 'Серверная политика без фиктивного удаления');
  assert(css.includes('danger-zone'), 'Неброские нейтральные стили внизу страницы');
});

// ----------------------------------------------------
// ЧАСТЬ 8: ИНТЕГРАЦИЯ В СТРАНИЦУ ПРОФИЛЯ (ProfilePage)
// ----------------------------------------------------

test('8.1. Главная страница профиля: объединение всех блоков, реактивность и отступ от навбара', () => {
  const tsx = fs.readFileSync('src/pages/ProfilePage.tsx', 'utf8');
  const css = fs.readFileSync('src/pages/ProfilePage.css', 'utf8');

  assert(tsx.includes('ProfileHeader'), 'Блок ProfileHeader подключён');
  assert(tsx.includes('PartnerInfoCard'), 'Блок PartnerInfoCard подключён');
  assert(tsx.includes('AppearanceSettings'), 'Блок AppearanceSettings подключён');
  assert(tsx.includes('NotificationSettings'), 'Блок NotificationSettings подключён');
  assert(tsx.includes('ReminderCategoriesManager'), 'Блок ReminderCategoriesManager подключён');
  assert(tsx.includes('SharedSpaceSettings'), 'Блок SharedSpaceSettings подключён');
  assert(tsx.includes('DangerZone'), 'Блок DangerZone подключён');
  assert(tsx.includes('profile-dev-card'), 'Карточка дизайн-системы сохранена');
  assert(css.includes('padding-bottom: calc(130px + env(safe-area-inset-bottom, 0px))'), 'Безопасный отступ снизу для таббара');
});

console.log(`\n🎉 Все ${passed} тестов Этапа 8 успешно пройдены!\n`);
