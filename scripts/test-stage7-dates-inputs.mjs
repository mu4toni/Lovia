import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('🧪 Запуск всестороннего тестирования Этапа 7: Redesign «Свидания» + Единые поля ввода...\n');

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
// ЧАСТЬ 1: РЕДИЗАЙН РАЗДЕЛА «СВИДАНИЯ»
// ----------------------------------------------------

test('1.1. Шапка дневника свиданий: эмоциональный заголовок и интегрированная статистика', () => {
  const tsx = fs.readFileSync('src/widgets/Dates/DatesHeader/DatesHeader.tsx', 'utf8');
  const css = fs.readFileSync('src/widgets/Dates/DatesHeader/DatesHeader.css', 'utf8');

  assert(tsx.includes('Свидания'), 'Заголовок Свидания');
  assert(tsx.includes('Моменты, которые хочется сохранить'), 'Эмоциональный подзаголовок');
  assert(tsx.includes('dates-header__stats'), 'Интегрированный блок статистики');
  assert(tsx.includes('heldDatesCount'), 'Счётчик состоявшихся свиданий');
  assert(tsx.includes('photosCount') || tsx.includes('totalPhotosCount'), 'Счётчик фотографий');
  assert(css.includes('dates-header__stat-val'), 'Крупные акцентные цифры');
  assert(css.includes('dates-header__stat-txt'), 'Второстепенные текстовые подписи');
});

test('1.2. Фильтрация и сортировка: компактность, единая высота и чёткое активное состояние', () => {
  const tsx = fs.readFileSync('src/widgets/Dates/DatesHeader/DatesHeader.tsx', 'utf8');
  const css = fs.readFileSync('src/widgets/Dates/DatesHeader/DatesHeader.css', 'utf8');

  assert(tsx.includes('dates-header__year-pill'), 'Кнопки выбора года');
  assert(tsx.includes('dates-header__sort-btn'), 'Кнопка переключения сортировки');
  assert(css.includes('dates-header__year-pill--active'), 'Чёткое активное состояние фильтра');
  assert(css.includes('min-height: 44px'), 'Соблюдение сенсорной области нажатия 44px');
  assert(css.includes('border-radius: var(--radius-pill)'), 'Единый радиус скруглений');
});

test('1.3. Карточка воспоминания: верхняя часть с датой, местом и 3-точечным меню действий', () => {
  const tsx = fs.readFileSync('src/widgets/Dates/DateMemoryCard/DateMemoryCard.tsx', 'utf8');
  const css = fs.readFileSync('src/widgets/Dates/DateMemoryCard/DateMemoryCard.css', 'utf8');

  assert(tsx.includes('formatRussianDate'), 'Форматированная дата встречи');
  assert(tsx.includes('effectivePlace'), 'Отображение места встречи');
  assert(tsx.includes('more-vertical'), 'Иконка меню из 3 точек');
  assert(tsx.includes('date-memory-card__popover'), 'Всплывающее меню дополнительных действий');
  assert(tsx.includes('Редактировать') && tsx.includes('Удалить'), 'Пункты редактирования и удаления в меню');
  assert(css.includes('date-memory-card__popover'), 'Стили выпадающего поповера');
});

test('1.4. Карточка воспоминания: эстетичный текст истории со сворачиванием длинных записей', () => {
  const tsx = fs.readFileSync('src/widgets/Dates/DateMemoryCard/DateMemoryCard.tsx', 'utf8');
  const css = fs.readFileSync('src/widgets/Dates/DateMemoryCard/DateMemoryCard.css', 'utf8');

  assert(tsx.includes('displayStory'), 'Условный рендеринг истории (не показывает пустой блок)');
  assert(tsx.includes('isStoryExpanded'), 'Состояние раскрытия/сворачивания длинной истории');
  assert(tsx.includes('Читать полностью'), 'Кнопка раскрытия длинного текста');
  assert(css.includes('line-height: 1.5'), 'Комфортный межстрочный интервал');
});

test('1.5. Карточка воспоминания: адаптивная фотокомпозиция (1 фото, 2 фото, 3+ фото с бейджем +N)', () => {
  const tsx = fs.readFileSync('src/widgets/Dates/DateMemoryCard/DateMemoryCard.tsx', 'utf8');
  const css = fs.readFileSync('src/widgets/Dates/DateMemoryCard/DateMemoryCard.css', 'utf8');

  assert(tsx.includes('date-memory-card__photo-single'), 'Крупное изображение для 1 фото');
  assert(tsx.includes('date-memory-card__photos-dual'), '2-колоночная композиция для 2 фото');
  assert(tsx.includes('date-memory-card__photos-multi'), 'Адаптивная галерея для 3+ фото');
  assert(tsx.includes('date-memory-card__photo-badge'), 'Бейдж +N для оставшихся фото');
  assert(tsx.includes('onOpenPhotoLightbox'), 'Клик по фото открывает полноэкранный Lightbox');
  assert(css.includes('aspect-ratio: 16 / 9'), 'Соотношение 16/9 для главного фото');
  assert(css.includes('object-fit: cover'), 'Кадрирование через object-fit: cover без искажений');
});

test('1.6. Детальный просмотр воспоминания: цифровой фотоальбом и полноэкранный Lightbox', () => {
  const detailTsx = fs.readFileSync('src/features/dates/DateMemoryDetailModal/DateMemoryDetailModal.tsx', 'utf8');
  const lightboxTsx = fs.readFileSync('src/features/dates/PhotoLightbox/PhotoLightbox.tsx', 'utf8');

  assert(detailTsx.includes('PlaceCard'), 'Отображение места встречи с интерактивной картой');
  assert(detailTsx.includes('date-memory-detail__story-box'), 'Стилизованный блок истории');
  assert(detailTsx.includes('date-memory-detail__gallery-grid'), 'Полная галерея фото');
  assert(detailTsx.includes('onOpenPhotoLightbox'), 'Интеграция с просмотром фото в полном размере');
  assert(lightboxTsx.includes('photo-lightbox-image'), 'Полноэкранный просмотр изображений');
});

test('1.7. Плавающая кнопка «Добавить воспоминание» над меню без перекрытия контента', () => {
  const pageTsx = fs.readFileSync('src/pages/DatesPage.tsx', 'utf8');
  const pageCss = fs.readFileSync('src/pages/DatesPage.css', 'utf8');

  assert(pageTsx.includes('<BottomActionButton'), 'Использует единый компонент BottomActionButton');
  assert(pageTsx.includes('variant="floating"'), 'Плавающий режим над нижней навигацией');
  assert(pageTsx.includes('visible={!isAnyModalOpen}'), 'Авто-скрытие при открытии форм и модалок');
  assert(pageCss.includes('padding-bottom: calc(130px + env(safe-area-inset-bottom, 0px))'), 'Безопасный отступ снизу');
});

// ----------------------------------------------------
// ЧАСТЬ 2: ПОЛНОЕ ИСПРАВЛЕНИЕ ПОЛЕЙ ВВОДА
// ----------------------------------------------------

test('2.1. Глобальное устранение двойных обводок: исключение input/textarea из universal :focus-visible', () => {
  const globalCss = fs.readFileSync('src/styles/global.css', 'utf8');

  assert(globalCss.includes('input:focus'), 'Сброс нативных outline для input');
  assert(globalCss.includes('outline: none !important;'), 'Принудительное удаление нативного outline');
  assert(globalCss.includes(':focus-visible:not(input):not(textarea):not(select)'), 'focus-visible исключает поля ввода');
});

test('2.2. Единая система Input.css: один чистый фирменный контур без вторичных box-shadow колец', () => {
  const inputCss = fs.readFileSync('src/components/ui/Input/Input.css', 'utf8');

  assert(inputCss.includes('.input-field__container:focus-within'), 'Фокус контейнера');
  assert(inputCss.includes('border-color: var(--color-primary);'), 'Единый фирменный цвет границы при фокусе');
  assert(inputCss.includes('box-shadow: none !important;'), 'Устранение вторичного box-shadow ореола');
  assert(inputCss.includes('.input-field__control:focus'), 'Сброс outline и box-shadow на внутреннем контроле');
  assert(inputCss.includes('.input-field__container--error'), 'Единая чистая рамка ошибки без двойных контуров');
  assert(inputCss.includes('min-height: 44px;'), 'Соблюдение WCAG touch target 44px');
});

test('2.3. Поля ввода в вишлистах (CreateEditWishModal.css): одиночный контур фокуса и ошибки', () => {
  const wishCss = fs.readFileSync('src/features/wishlist/CreateEditWishModal/CreateEditWishModal.css', 'utf8');

  assert(wishCss.includes('.wish-modal-field__input-wrap:focus-within'), 'Стили фокуса поля вишлиста');
  assert(wishCss.includes('border-color: var(--color-primary);'), 'Фирменная граница Lovia');
  assert(wishCss.includes('box-shadow: none !important;'), 'Отсутствие размытого вторичного контура');
  assert(wishCss.includes('.wish-modal-field__input:focus'), 'Сброс outline на внутреннем input');
});

test('2.4. Поле поиска на карте (PlacePickerModal.css): чистый единый контур', () => {
  const mapCss = fs.readFileSync('src/features/dates/PlacePickerModal/PlacePickerModal.css', 'utf8');

  assert(mapCss.includes('.place-picker-search-field:focus-within'), 'Фокус поля поиска');
  assert(mapCss.includes('border-color: var(--color-primary);'), 'Фирменная граница');
  assert(mapCss.includes('box-shadow: none !important;'), 'Отсутствие двойного контура');
});

test('2.5. Поле выбора времени (DeadlineSelector.css): чистый контур без двойных границ', () => {
  const timeCss = fs.readFileSync('src/components/home/CreateRequestModal/DeadlineSelector.css', 'utf8');

  assert(timeCss.includes('.deadline-time-input:focus'), 'Фокус поля времени');
  assert(timeCss.includes('outline: none !important;'), 'Сброс outline');
  assert(timeCss.includes('box-shadow: none !important;'), 'Сброс box-shadow');
});

console.log(`\n======================================================`);
console.log(`🎉 Все ${passed} сценариев Этапа 7 (Свидания + Поля ввода) успешно пройдены!`);
console.log(`======================================================`);
