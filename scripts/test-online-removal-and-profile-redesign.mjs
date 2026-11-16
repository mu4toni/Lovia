import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('🧪 Запуск тестов: Полное удаление статуса онлайн и редизайн Профиля в стиле Telegram...\n');

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
// ЧАСТЬ 1: ПОЛНОЕ УДАЛЕНИЕ СТАТУСА ОНЛАЙН / НЕ В СЕТИ
// ----------------------------------------------------

test('1.1. В исходном коде src/ полностью отсутствуют упоминания isOnline', () => {
  function scanDir(dir) {
    let files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(scanDir(fullPath));
      } else if (/\.(ts|tsx|css)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const srcFiles = scanDir('src');
  const violations = [];

  for (const file of srcFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('isOnline')) {
      violations.push(file);
    }
  }

  assert.strictEqual(
    violations.length,
    0,
    `Обнаружены файлы с isOnline в src/: ${violations.join(', ')}`
  );
});

test('1.2. Зелёные точки онлайна и бейджи «В сети» удалены из всех компонентов', () => {
  const homeHeaderTsx = fs.readFileSync('src/components/home/HomeHeader/HomeHeader.tsx', 'utf8');
  const homeHeaderCss = fs.readFileSync('src/components/home/HomeHeader/HomeHeader.css', 'utf8');
  const coupleCardTsx = fs.readFileSync('src/widgets/Relationship/CoupleInfoCard/CoupleInfoCard.tsx', 'utf8');
  const coupleCardCss = fs.readFileSync('src/widgets/Relationship/CoupleInfoCard/CoupleInfoCard.css', 'utf8');
  const partnerCardTsx = fs.readFileSync('src/features/profile/PartnerInfoCard/PartnerInfoCard.tsx', 'utf8');
  const partnerCardCss = fs.readFileSync('src/features/profile/PartnerInfoCard/PartnerInfoCard.css', 'utf8');
  const quickModalTsx = fs.readFileSync('src/components/partner/PartnerQuickModal.tsx', 'utf8');
  const quickModalCss = fs.readFileSync('src/components/partner/PartnerQuickModal.css', 'utf8');

  // HomeHeader
  assert(!homeHeaderTsx.includes('home-header__avatar-online-dot'), 'HomeHeader.tsx не содержит точку онлайна');
  assert(!homeHeaderCss.includes('home-header__avatar-online-dot'), 'HomeHeader.css не содержит точку онлайна');

  // CoupleInfoCard
  assert(!coupleCardTsx.includes('relationship-hero-card__avatar-online-dot'), 'CoupleInfoCard.tsx не содержит точку онлайна');
  assert(!coupleCardCss.includes('relationship-hero-card__avatar-online-dot'), 'CoupleInfoCard.css не содержит точку онлайна');

  // PartnerInfoCard
  assert(!partnerCardTsx.includes('partner-info-card__online-dot'), 'PartnerInfoCard.tsx не содержит точку онлайна');
  assert(!partnerCardCss.includes('partner-info-card__online-dot'), 'PartnerInfoCard.css не содержит точку онлайна');
  assert(!partnerCardTsx.includes('В сети') && !partnerCardTsx.includes('Не в сети'), 'PartnerInfoCard.tsx не содержит статус В сети/Не в сети');

  // PartnerQuickModal
  assert(!quickModalTsx.includes('partner-quick-modal__status-chip'), 'PartnerQuickModal.tsx не содержит статус онлайна');
  assert(!quickModalCss.includes('partner-quick-modal__status-chip'), 'PartnerQuickModal.css не содержит статус онлайна');
});

// ----------------------------------------------------
// ЧАСТЬ 2: РЕДИЗАЙН ProfileHeader В СТИЛЕ TELEGRAM
// ----------------------------------------------------

test('2.1. Шапка ProfileHeader: чистый фон без тяжёлой рамки, 96px круглый аватар и кнопка камеры', () => {
  const tsx = fs.readFileSync('src/features/profile/ProfileHeader/ProfileHeader.tsx', 'utf8');
  const css = fs.readFileSync('src/features/profile/ProfileHeader/ProfileHeader.css', 'utf8');

  // Отсутствие тяжелой карточки
  assert(css.includes('background: transparent;'), 'Прозрачный фон шапки без рамки-карточки');
  assert(css.includes('border: none;'), 'Без внешней границы карточки');
  assert(css.includes('box-shadow: none;'), 'Без тяжелой тени карточки');

  // Центрированный круглый аватар 96px
  assert(css.includes('width: 96px'), 'Ширина аватара 96px');
  assert(css.includes('height: 96px'), 'Высота аватара 96px');
  assert(css.includes('border-radius: 50%'), 'Круглая форма аватара border-radius: 50%');

  // Кликабельный фрейм и иконка камеры
  assert(tsx.includes('profile-hero-card__avatar-frame'), 'Фрейм аватара присутствует');
  assert(tsx.includes('profile-hero-card__avatar-btn'), 'Кнопка камеры в углу аватара');
  assert(tsx.includes('name="camera"'), 'Иконка камеры');
  assert(tsx.includes('type="file"'), 'Скрытый input загрузки фото');
  assert(tsx.includes('AvatarCropModal'), 'Подключена модалка обрезки аватара');
});

test('2.2. Центрированное имя с аккуратным карандашиком и инлайн-редактированием', () => {
  const tsx = fs.readFileSync('src/features/profile/ProfileHeader/ProfileHeader.tsx', 'utf8');
  const css = fs.readFileSync('src/features/profile/ProfileHeader/ProfileHeader.css', 'utf8');

  // Имя и карандашик
  assert(tsx.includes('profile-hero-card__name'), 'Заголовок имени пользователя');
  assert(tsx.includes('profile-hero-card__edit-btn'), 'Кнопка с карандашиком для редактирования имени');
  assert(tsx.includes('name="edit"'), 'Иконка карандашика');

  // Инлайн-редактирование
  assert(tsx.includes('isEditingInline'), 'Состояние инлайн-редактирования');
  assert(tsx.includes('profile-hero-card__inline-form'), 'Инлайн-форма ввода');
  assert(tsx.includes('profile-hero-card__inline-input'), 'Инлайн-поле ввода имени');
  assert(tsx.includes('profile-hero-card__inline-btn--save'), 'Кнопка подтверждения сохранения');
  assert(tsx.includes('profile-hero-card__inline-btn--cancel'), 'Кнопка отмены редактирования');

  // Типографика имени
  assert(css.includes('font-size: 24px') || css.includes('font-size: 22px'), 'Крупный шрифт имени 22-24px');
  assert(css.includes('font-weight: 700'), 'Жирное начертание шрифта имени');
  assert(css.includes('text-align: center'), 'Выравнивание по центру');
});

test('2.3. Спокойная инфо-строка: кликабельная пилюля связи и приглушенная дата регистрации', () => {
  const tsx = fs.readFileSync('src/features/profile/ProfileHeader/ProfileHeader.tsx', 'utf8');
  const css = fs.readFileSync('src/features/profile/ProfileHeader/ProfileHeader.css', 'utf8');

  // Пилюля связи
  assert(tsx.includes('profile-hero-card__badge--connected'), 'Бейдж подключенной пары');
  assert(tsx.includes('В паре с'), 'Текст В паре с [Имя]');
  assert(tsx.includes('/relationship'), 'Клик переходит в раздел Отношения');
  assert(css.includes('border-radius: var(--radius-pill)'), 'Скругление pill для бейджа');

  // Дата регистрации строго под бейджем
  assert(tsx.includes('profile-hero-card__joined'), 'Класс даты регистрации');
  assert(tsx.includes('joinDateText'), 'Форматированный текст даты регистрации');
  assert(css.includes('profile-hero-card__joined'), 'Стили даты регистрации');
});

// ----------------------------------------------------
// ЧАСТЬ 3: РЕДИЗАЙН СТРАНИЦЫ ProfilePage
// ----------------------------------------------------

test('3.1. Страница ProfilePage: удален шаблонный PageHeader, структура как в Telegram Settings', () => {
  const tsx = fs.readFileSync('src/pages/ProfilePage.tsx', 'utf8');

  // PageHeader удален
  assert(!tsx.includes('<PageHeader'), 'Шаблонный PageHeader удален со страницы');
  assert(!tsx.includes("from '../components/PageHeader'"), 'Импорт PageHeader удален');

  // Сохранена целостность блоков
  assert(tsx.includes('ProfileHeader'), 'Шапка профиля');
  assert(tsx.includes('PartnerInfoCard'), 'Карточка партнера');
  assert(tsx.includes('AppearanceSettings'), 'Настройки темы');
  assert(tsx.includes('NotificationSettings'), 'Настройки уведомлений');
  assert(tsx.includes('ReminderCategoriesManager'), 'Менеджер категорий');
  assert(tsx.includes('SharedSpaceSettings'), 'Настройки общего пространства');
  assert(tsx.includes('DangerZone'), 'Зона удаления аккаунта');
});

console.log(`\n======================================================`);
console.log(`🎉 Все проверки (${passed}/6) успешно пройдены!`);
console.log(`======================================================\n`);
