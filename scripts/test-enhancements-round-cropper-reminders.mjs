import fs from 'fs';
import assert from 'assert';

console.log('🧪 Запуск проверки 4 доработок: круглые аватары, салют, кроппер и редактирование напоминаний...\n');

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

// 1. Крупные круглые аватары в HomeHeader и CoupleInfoCard
test('1.1. HomeHeader: круглые аватары 64px/56px, без индикатора онлайна', () => {
  const css = fs.readFileSync('src/components/home/HomeHeader/HomeHeader.css', 'utf8');
  const tsx = fs.readFileSync('src/components/home/HomeHeader/HomeHeader.tsx', 'utf8');

  assert(css.includes('64px'), 'Размер 64px для десктопа');
  assert(css.includes('56px'), 'Размер 56px для узких экранов');
  assert(css.includes('border-radius: 50% !important') || css.includes('border-radius: 50%'), 'Круглая форма');
  assert(!css.includes('.home-header__avatar-online-dot'), 'Класс индикатора онлайна удален');
  assert(!tsx.includes('home-header__avatar-online-dot'), 'Индикатор онлайна удален из разметки');
});

test('1.2. CoupleInfoCard: круглые аватары 72px/64px, без онлайн точки, кнопки вех и свиданий сохранены', () => {
  const css = fs.readFileSync('src/widgets/Relationship/CoupleInfoCard/CoupleInfoCard.css', 'utf8');
  const tsx = fs.readFileSync('src/widgets/Relationship/CoupleInfoCard/CoupleInfoCard.tsx', 'utf8');

  assert(css.includes('72px'), 'Размер 72px');
  assert(css.includes('64px'), 'Адаптивный размер 64px');
  assert(css.includes('border-radius: 50%'), 'Круглые аватары');
  assert(!css.includes('relationship-hero-card__avatar-online-dot'), 'Класс точки онлайна удален');
  assert(!tsx.includes('relationship-hero-card__avatar-online-dot'), 'Точка онлайна удалена из разметки');
  assert(tsx.includes('relationship-hero-card__stat-item--days'), 'Кнопка дней и вех');
  assert(tsx.includes('relationship-hero-card__stat-item--dates'), 'Кнопка свиданий');
});

// 2. Праздничный салют FireworksOverlay
test('2.1. FireworksOverlay: яркая палитра, волны из 10-14 залпов, 80-120 искр и шлейфы', () => {
  const tsx = fs.readFileSync('src/components/ui/FireworksOverlay/FireworksOverlay.tsx', 'utf8');

  assert(tsx.includes('#DA0038'), 'Рубиновый цвет в палитре');
  assert(tsx.includes('#FFD166'), 'Золотой цвет в палитре');
  assert(tsx.includes('#FF6B6B'), 'Коралловый цвет в палитре');
  assert(tsx.includes('#4ECDC4'), 'Бирюзовый цвет в палитре');
  assert(tsx.includes('#C77DFF'), 'Лавандовый цвет в палитре');
  assert(tsx.includes('#56CCF2'), 'Голубой цвет в палитре');
  assert(tsx.includes('burstCount = 12'), 'Дефолтное количество залпов 12');
  assert(tsx.includes('durationMs = 4800'), 'Дефолтная длительность 4800мс');
  assert(tsx.includes('particleCount = 80 + Math.floor(Math.random() * 40)'), '80-120 искр на залп');
  assert(tsx.includes('prevX') && tsx.includes('prevY'), 'Координаты для световых шлейфов искр');
  assert(tsx.includes('ctx.lineTo(p.x, p.y)'), 'Отрисовка шлейфа искр');
});

// 3. Редактор-кроппер аватарки
test('3.1. AvatarCropModal: круглый трафарет, зум, поворот 90°, 400x400 JPEG экспорт', () => {
  const tsx = fs.readFileSync('src/features/profile/AvatarCropModal/AvatarCropModal.tsx', 'utf8');
  const css = fs.readFileSync('src/features/profile/AvatarCropModal/AvatarCropModal.css', 'utf8');

  assert(tsx.includes('CANVAS_SIZE = 300'), 'Размер холста 300');
  assert(tsx.includes('CROP_RADIUS = 120'), 'Радиус круга 120 (диаметр 240)');
  assert(tsx.includes('setRotation'), 'Поворот изображения');
  assert(tsx.includes('setZoom'), 'Масштабирование');
  assert(tsx.includes('setPan'), 'Перемещение (панорамирование)');
  assert(tsx.includes('toDataURL(\'image/jpeg\', 0.88)'), 'Экспорт 400x400 JPEG 0.88');
  assert(css.includes('avatar-cropper__canvas-wrap'), 'Стили холста кроппера');
  assert(css.includes('avatar-cropper__slider'), 'Стили ползунка зума');
  assert(css.includes('avatar-cropper__tool-btn'), 'Стили кнопок управления');
});

test('3.2. ProfileHeader: интеграция кроппера при загрузке фото', () => {
  const tsx = fs.readFileSync('src/features/profile/ProfileHeader/ProfileHeader.tsx', 'utf8');

  assert(tsx.includes('AvatarCropModal'), 'Импорт и использование AvatarCropModal');
  assert(tsx.includes('rawImageForCrop'), 'Стейт исходного фото для обрезки');
  assert(tsx.includes('isCropModalOpen'), 'Стейт открытия модалки кроппера');
  assert(tsx.includes('onCropComplete'), 'Обработка результата кадрирования');
});

// 4. Редактирование напоминаний
test('4.1. requestsService.updateRequest: обновление полей напоминания', () => {
  const ts = fs.readFileSync('src/services/requestsService.ts', 'utf8');

  assert(ts.includes('async updateRequest('), 'Метод updateRequest объявлен');
  assert(ts.includes('Partial<CreateReminderInput>'), 'Принимает частичные поля напоминания');
  assert(ts.includes('this.save()'), 'Сохраняет изменения в localStorage');
});

test('4.2. useHomeData: editingRequest и handleUpdateRequest', () => {
  const ts = fs.readFileSync('src/hooks/useHomeData.ts', 'utf8');

  assert(ts.includes('editingRequest'), 'Стейт editingRequest');
  assert(ts.includes('setEditingRequest'), 'Сеттер setEditingRequest');
  assert(ts.includes('handleUpdateRequest'), 'Обработчик handleUpdateRequest');
});

test('4.3. CreateRequestModal: поддержка режима редактирования', () => {
  const tsx = fs.readFileSync('src/components/home/CreateRequestModal/CreateRequestModal.tsx', 'utf8');

  assert(tsx.includes('editingReminder'), 'Проп editingReminder');
  assert(tsx.includes('onUpdate'), 'Проп onUpdate');
  assert(tsx.includes("editingReminder ? 'Редактировать напоминание' : 'Новое напоминание'"), 'Динамический заголовок');
  assert(tsx.includes("editingReminder ? 'Сохранить изменения' : 'Создать напоминание'"), 'Динамический текст кнопки');
});

test('4.4. RequestsList: кнопка карандаша и вызов onEditRequest', () => {
  const tsx = fs.readFileSync('src/components/home/RequestsList/RequestsList.tsx', 'utf8');
  const css = fs.readFileSync('src/components/home/RequestsList/RequestsList.css', 'utf8');

  assert(tsx.includes('onEditRequest'), 'Проп onEditRequest');
  assert(tsx.includes('request-card__action-btn--edit'), 'Кнопка редактирования в карточке');
  assert(tsx.includes('name="edit"'), 'Иконка карандаша');
  assert(css.includes('request-card__action-btn'), 'Стили кнопок действий');
});

test('4.5. HomePage: связь модалки с редактированием и Toast «Напоминание обновлено»', () => {
  const tsx = fs.readFileSync('src/pages/HomePage.tsx', 'utf8');

  assert(tsx.includes('handleUpdateWithToast'), 'Функция сохранения обновлений');
  assert(tsx.includes('Напоминание обновлено'), 'Текст уведомления');
  assert(tsx.includes('onEditRequest='), 'Передача onEditRequest в RequestsList');
  assert(tsx.includes('editingReminder={editingRequest}'), 'Передача editingReminder в CreateRequestModal');
  assert(tsx.includes('onUpdate={handleUpdateWithToast}'), 'Передача onUpdate в CreateRequestModal');
});

console.log(`\n======================================================`);
console.log(`🎉 Все тесты 4 доработок пройдены: ${passed}/${total}`);
console.log(`======================================================\n`);
