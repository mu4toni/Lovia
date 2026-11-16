import fs from 'fs';
import assert from 'assert';

console.log('🧪 Запуск проверки полноразмерного заполнения плашек, редизайна Свиданий и переноса длинных слов...');

// 1. Проверка плашек пары: HomeHeader и CoupleInfoCard
test('HomeHeader: крупные круглые аватары 64px (56px), индикатор онлайна и сдержанная рамка', () => {
  const css = fs.readFileSync('src/components/home/HomeHeader/HomeHeader.css', 'utf8');
  const tsx = fs.readFileSync('src/components/home/HomeHeader/HomeHeader.tsx', 'utf8');

  // Крупные круглые аватары
  assert(css.includes('64px'), 'Размер круглого аватара 64px');
  assert(css.includes('56px'), 'Адаптивный размер круглого аватара 56px');
  assert(css.includes('border-radius: 50%'), 'Круглая форма аватаров border-radius: 50%');
  assert(css.includes('object-fit: cover'), 'Заполнение без искажения');
  assert(!css.includes('home-header__avatar-online-dot'), 'Селектор точки онлайна удален');

  // TSX структура сохранена
  assert(tsx.includes('home-header__avatar-side--user'), 'Зона пользователя в TSX');
  assert(tsx.includes('home-header__avatar-side--partner'), 'Зона партнера в TSX');
  assert(tsx.includes('home-header__center-zone'), 'Центральная зона в TSX');
  assert(!tsx.includes('home-header__avatar-online-dot'), 'Индикатор онлайна удален из TSX');
});

test('CoupleInfoCard: крупные круглые аватары 72px (64px), отсутствие онлайна и крупные иконки статистики', () => {
  const css = fs.readFileSync('src/widgets/Relationship/CoupleInfoCard/CoupleInfoCard.css', 'utf8');
  const tsx = fs.readFileSync('src/widgets/Relationship/CoupleInfoCard/CoupleInfoCard.tsx', 'utf8');

  // Круглые аватары 72px
  assert(css.includes('72px'), 'Размер круглого аватара 72px');
  assert(css.includes('64px'), 'Адаптивный размер круглого аватара 64px');
  assert(css.includes('border-radius: 50%'), 'Круглая форма аватаров border-radius: 50%');
  assert(!css.includes('relationship-hero-card__avatar-online-dot'), 'Селектор точки онлайна на аватаре удален');

  // Фоновые иконки статистики (на всю высоту плашки)
  assert(css.includes('height: 115%'), 'Иконка заполняет 115% высоты');
  assert(css.includes('filter: blur(2.5px)'), 'Легкое размытие 2.5px');
  assert(css.includes('opacity: 0.12'), 'Низкая прозрачность 0.12');
  assert(tsx.includes('size={100}'), 'Крупный размер иконки сердца');
  assert(tsx.includes('size={96}'), 'Крупный размер иконки календаря');
});

// 2. Редизайн раздела «Свидания»
test('DatesHeader: 2 мини-плашки статистики с размытыми фоновыми иконками и спокойные фильтры', () => {
  const tsx = fs.readFileSync('src/widgets/Dates/DatesHeader/DatesHeader.tsx', 'utf8');
  const css = fs.readFileSync('src/widgets/Dates/DatesHeader/DatesHeader.css', 'utf8');

  assert(tsx.includes('dates-header__stat-bg-icon'), 'Фоновые иконки в статистике');
  assert(css.includes('dates-header__stat-bg-icon'), 'Стили фоновых иконок статистики');
  assert(css.includes('filter: blur(2px)'), 'Легкое размытие фоновых иконок');
  assert(css.includes('opacity: 0.12'), 'Низкая прозрачность фоновых иконок 0.12');
  assert(tsx.includes('dates-header__year-pill'), 'Пилюли выбора года');
  assert(tsx.includes('dates-header__sort-btn'), 'Кнопка сортировки');
});

test('DateMemoryCard: главное фото во всю ширину с растворением вниз и компактная мета-строка', () => {
  const tsx = fs.readFileSync('src/widgets/Dates/DateMemoryCard/DateMemoryCard.tsx', 'utf8');
  const css = fs.readFileSync('src/widgets/Dates/DateMemoryCard/DateMemoryCard.css', 'utf8');

  assert(tsx.includes('date-memory-card__hero-photo-wrap'), 'Контейнер главного фото');
  assert(css.includes('mask-image: linear-gradient(to bottom'), 'Мягкое растворение фото книзу');
  assert(tsx.includes('date-memory-card__meta-line'), 'Компактная чистая мета-строка даты и места');
  assert(tsx.includes('date-memory-card__footer'), 'Лаконичный футер «Подробнее»');
  assert(tsx.includes('date-memory-card__stat-bg-icon'), 'Размытая иконка при отсутствии фото');
});

test('DatesPage: безопасный отступ снизу для скролла над плавающей кнопкой и BottomNav', () => {
  const css = fs.readFileSync('src/pages/DatesPage.css', 'utf8');
  assert(css.includes('padding-bottom: calc(184px'), 'Безопасный отступ снизу >= 180px');
});

// 3. Проверка переноса длинных слов без пробелов во всех компонентах
test('HomeCalendar: перенос длинных названий событий и времени/места', () => {
  const css = fs.readFileSync('src/components/home/HomeCalendar/HomeCalendar.css', 'utf8');
  assert(css.includes('overflow-wrap: anywhere'), 'overflow-wrap: anywhere в HomeCalendar');
  assert(css.includes('word-break: break-word'), 'word-break: break-word в HomeCalendar');
  assert(css.includes('.home-calendar__event-name'), 'Селектор event-name');
  assert(css.includes('.home-calendar__event-meta-item'), 'Селектор event-meta-item');
});

test('RequestsList: перенос заголовков, описаний и романтических заметок', () => {
  const css = fs.readFileSync('src/components/home/RequestsList/RequestsList.css', 'utf8');
  assert(css.includes('.request-card__title'), 'Селектор request-card__title');
  assert(css.includes('.request-card__desc'), 'Селектор request-card__desc');
  assert(css.includes('.request-card__reward'), 'Селектор request-card__reward');
  assert(css.includes('overflow-wrap: anywhere'), 'overflow-wrap: anywhere в RequestsList');
  assert(css.includes('word-break: break-word'), 'word-break: break-word в RequestsList');
});

test('Dates: перенос названий, историй и мест в карточке и модалке деталей', () => {
  const cardCss = fs.readFileSync('src/widgets/Dates/DateMemoryCard/DateMemoryCard.css', 'utf8');
  const modalCss = fs.readFileSync('src/features/dates/DateMemoryDetailModal/DateMemoryDetailModal.css', 'utf8');

  assert(cardCss.includes('.date-memory-card__title'), 'Селектор date-memory-card__title');
  assert(cardCss.includes('.date-memory-card__story'), 'Селектор date-memory-card__story');
  assert(cardCss.includes('.date-place-text'), 'Селектор date-place-text');
  assert(cardCss.includes('overflow-wrap: anywhere'), 'overflow-wrap в DateMemoryCard');

  assert(modalCss.includes('.date-memory-detail__title'), 'Селектор date-memory-detail__title');
  assert(modalCss.includes('.date-memory-detail__story-text'), 'Селектор date-memory-detail__story-text');
  assert(modalCss.includes('.date-memory-detail__place-badge'), 'Селектор date-memory-detail__place-badge');
  assert(modalCss.includes('overflow-wrap: anywhere'), 'overflow-wrap в DateMemoryDetailModal');
});

test('Wishlist: перенос заголовков, описаний и комментариев', () => {
  const css = fs.readFileSync('src/widgets/Wishlist/WishCard/WishCard.css', 'utf8');
  assert(css.includes('.wish-card__title'), 'Селектор wish-card__title');
  assert(css.includes('.wish-card__desc'), 'Селектор wish-card__desc');
  assert(css.includes('overflow-wrap: anywhere'), 'overflow-wrap в WishCard');
  assert(css.includes('word-break: break-word'), 'word-break в WishCard');
});

test('MemorableDatesList: перенос названий и описаний дат', () => {
  const css = fs.readFileSync('src/widgets/Relationship/MemorableDatesList/MemorableDatesList.css', 'utf8');
  assert(css.includes('.timeline-node__title'), 'Селектор timeline-node__title');
  assert(css.includes('.timeline-node__desc'), 'Селектор timeline-node__desc');
  assert(css.includes('overflow-wrap: anywhere'), 'overflow-wrap в MemorableDatesList');
  assert(css.includes('word-break: break-word'), 'word-break в MemorableDatesList');
});

// 4. Проверка компактных пилюль и модалок мини-списка и общего альбома
test('DatesHeader: компактные кликабельные плашки-пилюли для мини-списка и фотоальбома', () => {
  const tsx = fs.readFileSync('src/widgets/Dates/DatesHeader/DatesHeader.tsx', 'utf8');
  const css = fs.readFileSync('src/widgets/Dates/DatesHeader/DatesHeader.css', 'utf8');

  assert(tsx.includes('onOpenQuickList'), 'Коллбэк onOpenQuickList в TSX');
  assert(tsx.includes('onOpenAlbum'), 'Коллбэк onOpenAlbum в TSX');
  assert(tsx.includes('dates-header__stat-pill--dates'), 'Пилюля списка свиданий');
  assert(tsx.includes('dates-header__stat-pill--photos'), 'Пилюля общего фотоальбома');
  assert(css.includes('dates-header__stat-pill'), 'Стили пилюль');
  assert(css.includes('height: 34px') || css.includes('min-height: 34px'), 'Компактная высота пилюли ~34px');
  assert(css.includes('border-radius: var(--radius-pill)'), 'Скругление pill');
});

test('DatesQuickListModal: упорядоченный список свиданий с миниатюрами и переходом в детали', () => {
  const tsx = fs.readFileSync('src/features/dates/DatesQuickListModal/DatesQuickListModal.tsx', 'utf8');
  const css = fs.readFileSync('src/features/dates/DatesQuickListModal/DatesQuickListModal.css', 'utf8');

  assert(tsx.includes('formatRussianDate'), 'Русский формат даты');
  assert(tsx.includes('onSelectMemory'), 'Коллбэк выбора свидания');
  assert(tsx.includes('dates-quick-list__thumb'), 'Миниатюра фото');
  assert(css.includes('width: 38px'), 'Ширина миниатюры 38px');
  assert(css.includes('height: 38px'), 'Высота миниатюры 38px');
  assert(css.includes('border-radius: 8px'), 'Скругление миниатюры 8px');
  assert(css.includes('overflow-wrap: anywhere'), 'Перенос длинных слов в названии и месте');
});

test('AllDatesAlbumModal: общий фотоальбом всех свиданий с 3-колоночной квадратной сеткой и Lightbox', () => {
  const tsx = fs.readFileSync('src/features/dates/AllDatesAlbumModal/AllDatesAlbumModal.tsx', 'utf8');
  const css = fs.readFileSync('src/features/dates/AllDatesAlbumModal/AllDatesAlbumModal.css', 'utf8');

  assert(tsx.includes('onOpenPhotoLightbox'), 'Интеграция с PhotoLightbox');
  assert(tsx.includes('all-dates-album__grid'), 'Сетка фотоальбома');
  assert(css.includes('grid-template-columns: repeat(3, 1fr)'), 'Сетка из 3 колонок');
  assert(css.includes('aspect-ratio: 1 / 1'), 'Квадратное соотношение фото 1/1');
  assert(css.includes('object-fit: cover'), 'Кадрирование cover');
  assert(css.includes('border-radius: 10px'), 'Радиус скругления 10px');
  assert(css.includes('gap: 6px'), 'Отступ между фото 6px');
});

test('DatesPage: подключение мини-списка, общего альбома и передача полного списка allMemories', () => {
  const tsx = fs.readFileSync('src/pages/DatesPage.tsx', 'utf8');

  assert(tsx.includes('DatesQuickListModal'), 'Импорт и рендеринг DatesQuickListModal');
  assert(tsx.includes('AllDatesAlbumModal'), 'Импорт и рендеринг AllDatesAlbumModal');
  assert(tsx.includes('isQuickListOpen'), 'Состояние открытия мини-списка');
  assert(tsx.includes('isAlbumOpen'), 'Состояние открытия фотоальбома');
  assert(tsx.includes('allMemories'), 'Использование allMemories для полной статистики и альбома');
});

console.log('\n======================================================');
console.log('🎉 Все сценарии валидации заполнения фото, редизайна Свиданий и переносов успешно пройдены!');
console.log('======================================================');

function test(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`❌ [FAIL] ${name}:`, err.message);
    process.exit(1);
  }
}
