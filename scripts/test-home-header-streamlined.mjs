import fs from 'fs';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${message}`);
}

console.log('🧪 Запуск проверки упрощенной плашки пары в HomeHeader...\n');

const tsx = fs.readFileSync('src/components/home/HomeHeader/HomeHeader.tsx', 'utf8');
const css = fs.readFileSync('src/components/home/HomeHeader/HomeHeader.css', 'utf8');
const progressTsx = fs.readFileSync('src/components/ui/AnniversaryProgress/AnniversaryProgressBar.tsx', 'utf8');

// 1. Убрано лишнее
assert(!tsx.includes('className="home-header__kicker-caption"'), 'Лейбл МЫ ВМЕСТЕ удален из разметки');
assert(!tsx.includes('className="home-header__counter-hero"'), 'Крупный счетчик 0 дней удален из разметки');
assert(!tsx.includes('className="home-header__avatar-label"'), 'Подписи имен под аватарами удалены из разметки');
assert(!tsx.includes('className="home-header__online-dot"'), 'Дублирующая точка онлайна у имени партнера удалена');
assert(!tsx.includes('className="home-header__chevron"'), 'Стрелка chevron справа удалена');

// 2. Аватары
assert(css.includes('64px'), 'Размер круглых аватаров 64px');
assert(!tsx.includes('home-header__avatar-online-dot'), 'Точка онлайна на аватаре партнера полностью удалена');
assert(!css.includes('.home-header__avatar-online-dot'), 'CSS точки онлайна на аватаре партнера удален');

// 3. Центральная колонка
assert(tsx.includes('home-header__names-row'), 'Строка имен пары присутствует');
assert(tsx.includes('home-header__heart-badge'), 'Иконка сердца между именами');
assert(tsx.includes('hideCaption'), 'AnniversaryProgressBar вызван с hideCaption для скрытия старых подписей и процентов');
assert(progressTsx.includes('hideCaption'), 'AnniversaryProgressBar поддерживает hideCaption');

// 4. Подписи годов под полосой прогресса
assert(tsx.includes('home-header__progress-labels'), 'Контейнер подписей под прогресс-баром');
assert(tsx.includes('currentYearsLabel'), 'Вычисление текущего числа полных лет');
assert(tsx.includes('nextYearsLabel'), 'Вычисление следующего года отношений');
assert(
  css.includes('display: flex') &&
  css.includes('justify-content: space-between') &&
  css.includes('.home-header__progress-labels'),
  'CSS строка подписей использует display: flex; justify-content: space-between;'
);

// 5. Кликабельность
assert(tsx.includes("navigate('/relationship')"), 'Клик по плашке/центру открывает /relationship');
assert(tsx.includes("navigate('/profile')"), 'Клик по левому аватару открывает /profile');
assert(tsx.includes('setIsPartnerModalOpen(true)'), 'Клик по правому аватару открывает PartnerQuickModal');

console.log('\n======================================================');
console.log('🎉 Все тесты упрощенной плашки HomeHeader успешно пройдены!');
console.log('======================================================');
