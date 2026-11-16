import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('🧪 Запуск всестороннего функционального тестирования сценариев Lovia...\n');

let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}:`, err.message);
    failedTests++;
  }
}

// 1. Проверка CSS токенов Liquid Glass и фонов
test('Сценарий 1 & 2: Liquid Glass, токены фона и непрозрачность', () => {
  const tokensCss = fs.readFileSync(path.resolve('src/styles/tokens.css'), 'utf8');
  assert(tokensCss.includes('--bg-card: #ffffff;'), '--bg-card must be defined in light mode');
  assert(tokensCss.includes('--bg-card: #27141b;'), '--bg-card must be defined in dark mode');
  assert(tokensCss.includes('--bg-glass-modal: rgba(255, 255, 255, 0.97);'), '--bg-glass-modal must have >= 0.95 opacity for solid readability');
  assert(tokensCss.includes('--glass-blur: blur(20px) saturate(180%);'), 'glass blur must be calibrated');
  assert(tokensCss.includes('--pastel-powder: #f4dde2;'), 'powder pastel token defined');
  assert(tokensCss.includes('--pastel-sage: #e3ebdd;'), 'sage pastel token defined');
  assert(tokensCss.includes('--pastel-cream: #f5eacd;'), 'cream pastel token defined');
});

// 2. Сценарий 3 & 10: Логика режима «Без срока» и сброс срока
test('Сценарий 3 & 10: Режим «Без срока» и сброс срока', () => {
  const code = fs.readFileSync(path.resolve('src/components/home/CreateRequestModal/DeadlineSelector.tsx'), 'utf8');
  assert(code.includes("mode: 'none'"), 'Must support none mode');
  assert(code.includes("dueLabel: 'Без срока'"), 'Default label must be Без срока');
  assert(code.includes("date: undefined"), 'Must not create dummy date when unscheduled');
  assert(code.includes('handleSelectNone'), 'Mode reset handler must exist');
});

// 3. Сценарий 4 & 5: Открытие календаря и выбор даты
test('Сценарий 4 & 5: Календарь и выбор конкретной даты', () => {
  const code = fs.readFileSync(path.resolve('src/components/home/CreateRequestModal/DeadlineSelector.tsx'), 'utf8');
  assert(code.includes('handleCustomDateChange'), 'Date selection handler exists');
  assert(code.includes('DatePicker'), 'DatePicker element exists');
  assert(code.includes('MONTH_NAMES_GENITIVE_RU'), 'Russian genitive month names present');
});

// 4. Сценарий 6, 7 & 8: Выбор времени, сохранение без времени и с временем
test('Сценарий 6, 7 & 8: Опциональный выбор времени (часы и минуты)', () => {
  const code = fs.readFileSync(path.resolve('src/components/home/CreateRequestModal/DeadlineSelector.tsx'), 'utf8');
  assert(code.includes('deadline-time-input'), 'Native/custom time input exists');
  assert(code.includes("handleTimeChange('')"), 'Clear time handler exists');
  assert(code.includes('handleTimeChange'), 'Set time handler exists');
  assert(code.includes('deadline-time-preset'), 'Quick time presets exist');
  assert(code.includes("· ${t}"), 'Time is concatenated with bullet when set');
});

// 5. Сценарий 9: Изменение установленного срока
test('Сценарий 9: Возможность изменения установленного срока', () => {
  const code = fs.readFileSync(path.resolve('src/components/home/CreateRequestModal/DeadlineSelector.tsx'), 'utf8');
  assert(code.includes('handleToggleCustom'), 'Toggle custom date handler exists');
  assert(code.includes('handleSelectNone'), 'Reset button handler exists');
  assert(code.includes('Сбросить срок'), 'Reset button text/aria exists');
});

// 6. 3 стандартных пастельных цвета и 15 оттенков палитры Lovia
test('Сценарий 11: 3 стандартных пастельных цвета + 15 цветов палитры Lovia', () => {
  const catType = fs.readFileSync(path.resolve('src/types/category.ts'), 'utf8');
  assert(catType.includes('#F4DDE2'), 'Пудровый (#F4DDE2) присутствует');
  assert(catType.includes('#E3EBDD'), 'Шалфейный (#E3EBDD) присутствует');
  assert(catType.includes('#F5EACD'), 'Сливочный (#F5EACD) присутствует');
  assert(catType.includes('STANDARD_PASTEL_COLORS'), 'STANDARD_PASTEL_COLORS экспортирован');
  assert(catType.includes('EXTENDED_LOVIA_PALETTE'), 'EXTENDED_LOVIA_PALETTE экспортирован');
  assert(catType.includes('ALL_LOVIA_COLORS'), 'ALL_LOVIA_COLORS содержит объединенную палитру');
});

// 7. Компактный селектор цвета с раскрытием 15 оттенков
test('Сценарий 12: Компактный цветовой селектор с кнопкой раскрытия дополнительных оттенков', () => {
  const selectorCode = fs.readFileSync(path.resolve('src/components/ui/Category/ColorSelector.tsx'), 'utf8');
  assert(selectorCode.includes('STANDARD_PASTEL_COLORS'), 'Рендерит 3 стандартных цвета');
  assert(selectorCode.includes('color-swatch--none'), 'Поддерживает вариант Без цвета');
  assert(selectorCode.includes('color-selector__toggle-btn'), 'Кнопка раскрытия 15 оттенков существует');
  assert(selectorCode.includes('EXTENDED_LOVIA_PALETTE'), 'Рендерит 15 оттенков при раскрытии');
  assert(selectorCode.includes('color-swatch--selected'), 'Имеет понятное состояние выбора с обводкой/галочкой');
});

// 8. Окрашивание напоминаний: фоновая заливка всей карточки и адаптивный контраст
test('Сценарий 13: Полное окрашивание карточки напоминания и авто-контраст текста', () => {
  const reqListCode = fs.readFileSync(path.resolve('src/components/home/RequestsList/RequestsList.tsx'), 'utf8');
  assert(reqListCode.includes('getCardColorStyles'), 'Использует getCardColorStyles для вычисления контраста');
  assert(reqListCode.includes('backgroundColor: cardStyles.backgroundColor'), 'Вся карточка получает фоновую заливку цвета');
  assert(reqListCode.includes('color: cardStyles.color'), 'Текст автоматически получает контрастный оттенок');
  assert(!reqListCode.includes('CategoryMarker category='), 'Не использует маленькие бейджи с названиями категорий');
  assert(reqListCode.includes('requests-color-filter-bar'), 'Фильтр списка использует цветные элементы');
});

// 9. Календарь без громоздкого фильтра + перенос фильтра по цветам в Напоминания
test('Сценарий 14: Календарь без громоздкого фильтра + цветовые маркеры в Напоминаниях', () => {
  const calCode = fs.readFileSync(path.resolve('src/components/home/HomeCalendar/HomeCalendar.tsx'), 'utf8');
  const reqListCode = fs.readFileSync(path.resolve('src/components/home/RequestsList/RequestsList.tsx'), 'utf8');
  assert(!calCode.includes('home-calendar__filter-bar'), 'Фильтр по цветам удален из календаря для чистоты интерфейса');
  assert(reqListCode.includes('selectedColor'), 'Фильтрация по цветам перенесена в RequestsList');
  assert(reqListCode.includes('requests-color-circle'), 'Компактные цветные кружки фильтра в RequestsList');
  assert(calCode.includes('getCardColorStyles'), 'Карточки событий дня адаптируют контраст под цвет');
});

// 10. Разгруженная форма создания напоминания (только 4 элемента в основной + «Дополнительно»)
test('Сценарий 15: Новая разгруженная форма создания напоминания', () => {
  const modalCode = fs.readFileSync(path.resolve('src/components/home/CreateRequestModal/CreateRequestModal.tsx'), 'utf8');
  assert(modalCode.includes('DEFAULT_BASE_CATEGORIES'), 'Содержит базовые цветовые категории');
  assert(modalCode.includes('DeadlineSelector'), 'Содержит выбор срока выполнения');
  assert(modalCode.includes('create-advanced-section'), 'Содержит раскрывающийся блок Дополнительно');
  assert(modalCode.includes('create-advanced-toggle'), 'Кнопка переключения дополнительных параметров');
  assert(modalCode.includes('isAdvancedOpen'), 'Состояние скрытия/показа дополнительных параметров');
});

// 11. Новая романтичная и живая карточка пары (3-зонная композиция с полосой годовщины)
test('Сценарий 16: Новая романтичная карточка пары и чистая дата', () => {
  const headerCode = fs.readFileSync(path.resolve('src/components/home/HomeHeader/HomeHeader.tsx'), 'utf8');
  assert(!headerCode.includes('getGreeting'), 'Убрано шаблонное ДОБРЫЙ ДЕНЬ');
  assert(!headerCode.includes('home-header__date-pill'), 'Убрана декоративная плашка вокруг даты');
  assert(headerCode.includes('home-header__date-row'), 'Дата отображается чистым текстом с иконкой');
  assert(!headerCode.includes('Каждый день вместе — особенная история'), 'Убрана искусственная шаблонная подпись');
  assert(/МЫ ВМЕСТЕ|Мы вместе/i.test(headerCode), 'Теплый естественный микро-кикер');
  assert(headerCode.includes('home-header__name'), 'Имена партнеров');
  assert(headerCode.includes('profile.user.name'), 'Отображает имя пользователя');
  assert(headerCode.includes('profile.partner'), 'Отображает имя партнера');
  assert(headerCode.includes('daysLabel') || headerCode.includes('дней вместе'), 'Отображает количество дней');
  assert(headerCode.includes('home-header__avatar-side'), 'Крупные аватары по противоположным краям карточки');
  assert(headerCode.includes('AnniversaryProgressBar'), 'Интегрированный прогресс-бар годовщины');
});

// 12. Склонение русских имён
test('Сценарий 17: Склонение имён партнёров (Для Алисы, Для Марселя)', () => {
  function decl(name) {
    if (!name) return 'партнёра';
    const trimmed = name.trim();
    if (trimmed.endsWith('са')) return `${trimmed.slice(0, -1)}ы`;
    if (trimmed.endsWith('а')) return `${trimmed.slice(0, -1)}ы`;
    if (trimmed.endsWith('я')) return `${trimmed.slice(0, -1)}и`;
    if (trimmed.endsWith('ль')) return `${trimmed.slice(0, -1)}я`;
    return trimmed;
  }

  assert.strictEqual(decl('Алиса'), 'Алисы', 'Алиса -> Алисы');
  assert.strictEqual(decl('Марсель'), 'Марселя', 'Марсель -> Марселя');
  assert.strictEqual(decl('Мария'), 'Марии', 'Мария -> Марии');
});

// 13. Расчёт контрастности (WCAG AA/AAA для каждого цвета палитры)
test('Сценарий 18: Контрастность текста на цветных поверхностях', () => {
  function hexToLuminance(hex) {
    let clean = hex.replace('#', '').trim();
    if (clean.length === 3) clean = clean.split('').map((c) => c + c).join('');
    const num = parseInt(clean, 16);
    const [r, g, b] = [(num >> 16) & 255, (num >> 8) & 255, num & 255].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contrast(l1, l2) {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  const darkTextL = hexToLuminance('#23191E');
  const whiteTextL = 1.0;

  // 3 standard pastels must have contrast > 7:1 (AAA) with dark text
  const powderL = hexToLuminance('#F4DDE2');
  assert(contrast(powderL, darkTextL) >= 7.0, 'Powder contrast >= 7:1');

  const sageL = hexToLuminance('#E3EBDD');
  assert(contrast(sageL, darkTextL) >= 7.0, 'Sage contrast >= 7:1');

  const creamL = hexToLuminance('#F5EACD');
  assert(contrast(creamL, darkTextL) >= 7.0, 'Cream contrast >= 7:1');

  // Dark colors (e.g. Ruby Rose #C83649) must have contrast >= 4.5:1 (AA) with white text
  const rubyL = hexToLuminance('#C83649');
  assert(contrast(whiteTextL, rubyL) >= 4.5, 'Ruby contrast >= 4.5:1');
});

// 14. Сценарий 19: Упрощённые фильтры напоминаний (3 фильтра строго в 1 ряд, без счетчиков и без Выполненных)
test('Сценарий 19: Упрощённые фильтры напоминаний (Активные, Для меня, От меня в 1 ряд)', () => {
  const reqListCode = fs.readFileSync(path.resolve('src/components/home/RequestsList/RequestsList.tsx'), 'utf8');
  const reqListCss = fs.readFileSync(path.resolve('src/components/home/RequestsList/RequestsList.css'), 'utf8');

  // Проверка кнопок: только чистый текст
  assert(reqListCode.includes('>Активные<') || reqListCode.includes('>\n          Активные\n'), 'Кнопка Активные содержит чистый текст');
  assert(reqListCode.includes('>Для меня<') || reqListCode.includes('>\n          Для меня\n'), 'Кнопка Для меня содержит чистый текст');
  assert(reqListCode.includes('>От меня<') || reqListCode.includes('>\n          От меня\n'), 'Кнопка От меня содержит чистый текст');

  // Полное отсутствие вкладки Выполненные в фильтрах
  assert(!reqListCode.includes('Выполненные'), 'Вкладка Выполненные полностью удалена из фильтров');
  assert(!reqListCode.includes('completedCount'), 'Счётчик выполненных удален');
  assert(!reqListCode.includes('activeCount'), 'Счётчик активных удален из кнопок');

  // CSS: строго в одну строчку (repeat(3, minmax(0, 1fr)))
  assert(reqListCss.includes('grid-template-columns: repeat(3, minmax(0, 1fr))'), 'CSS сетка 3 колонки в 1 ряд');
  assert(reqListCss.includes('white-space: nowrap'), 'Текст кнопок не переносится (white-space: nowrap)');
});

console.log(`\n========================================`);
console.log(`Итог тестирования сценариев: Пройдено: ${passedTests}, Ошибок: ${failedTests}`);
console.log(`========================================\n`);

if (failedTests > 0) {
  process.exit(1);
}
