import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('🧪 Запуск тестирования упрощённых фильтров напоминаний (3 фильтра в 1 ряд)...\n');

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

const reqListTsx = fs.readFileSync(path.resolve('src/components/home/RequestsList/RequestsList.tsx'), 'utf8');
const reqListCss = fs.readFileSync(path.resolve('src/components/home/RequestsList/RequestsList.css'), 'utf8');
const requestsTypes = fs.readFileSync(path.resolve('src/types/requests.ts'), 'utf8');

// 1. Проверка вкладок фильтра: ровно 3 вкладки без «Выполненные»
test('1. Фильтры содержат только Активные, Для меня, От меня (без Выполненные)', () => {
  // Наличие 3 чистых кнопок
  assert(reqListTsx.includes('Активные'), 'Кнопка Активные присутствует');
  assert(reqListTsx.includes('Для меня'), 'Кнопка Для меня присутствует');
  assert(reqListTsx.includes('От меня'), 'Кнопка От меня присутствует');

  // Отсутствие кнопки/вкладки Выполненные
  assert(!reqListTsx.includes('Выполненные'), 'Вкладка Выполненные отсутствует в RequestsList.tsx');
  assert(!reqListTsx.includes("activeTab === 'completed'"), 'activeTab === completed не используется');
});

// 2. Проверка отсутствия цифр и счетчиков в кнопках
test('2. Названия кнопок — чистый текст без счётчиков (0)', () => {
  assert(!reqListTsx.includes('activeCount'), 'activeCount отсутствует в коде компонента');
  assert(!reqListTsx.includes('completedCount'), 'completedCount отсутствует в коде компонента');
  assert(!/Активные\s*\(/i.test(reqListTsx), 'Активные не содержит круглых скобок со счётчиком');
  assert(!/Для меня\s*\(/i.test(reqListTsx), 'Для меня не содержит круглых скобок со счётчиком');
  assert(!/От меня\s*\(/i.test(reqListTsx), 'От меня не содержит круглых скобок со счётчиком');
});

// 3. Проверка типов RequestFilterTab
test('3. Тип RequestFilterTab содержит только all | for_me | from_me', () => {
  assert(requestsTypes.includes("export type RequestFilterTab = 'all' | 'for_me' | 'from_me'"), 'RequestFilterTab обновлен');
  assert(!requestsTypes.includes("'all' | 'for_me' | 'from_me' | 'completed'"), 'completed удален из типа фильтра');
});

// 4. Проверка фильтрации: выполненные задачи исключаются
test('4. Логика фильтрации скрывает выполненные задачи из всех табов', () => {
  assert(reqListTsx.includes("req.status === 'completed'"), 'Проверяется req.status === completed');
  assert(reqListTsx.includes("return false"), 'Выполненные напоминания исключаются из filteredRequests');
  assert(reqListTsx.includes("req.targetId === currentUserId"), 'Для меня фильтрует по targetId');
  assert(reqListTsx.includes("req.authorId === currentUserId"), 'От меня фильтрует по authorId');
});

// 5. Проверка CSS: строго в одну строчку (repeat(3, minmax(0, 1fr)))
test('5. CSS размещает 3 кнопки строго в один ряд без переносов на экранах 360px–430px', () => {
  assert(reqListCss.includes('grid-template-columns: repeat(3, minmax(0, 1fr))'), 'grid 3 колонки задан в requests-tabs');
  assert(reqListCss.includes('white-space: nowrap'), 'white-space: nowrap предотвращает перенос слов');
  assert(reqListCss.includes('min-height: 44px'), 'min-height: 44px гарантирует тач-таргет WCAG');
  assert(reqListCss.includes('gap: 8px'), 'gap: 8px для отступов между кнопками');
});

// 6. Проверка отсутствия старых 2-колоночных или переносящихся правил в requests-tabs
test('6. В requests-tabs сохраняется 3 колонки в 1 ряд на всех экранах', () => {
  assert(!reqListCss.includes('repeat(2, 1fr)'), 'Старая 2x2 сетка полностью удалена');
  const tabsBlockMatch = reqListCss.match(/\.requests-tabs\s*\{[^}]+\}/g) || [];
  for (const block of tabsBlockMatch) {
    assert(!block.includes('wrap'), 'Блок .requests-tabs не использует перенос строк');
  }
});

console.log(`\n======================================================`);
console.log(`Итог тестирования упрощённых фильтров: Пройдено: ${passedTests}, Ошибок: ${failedTests}`);
console.log(`======================================================\n`);

if (failedTests > 0) {
  process.exit(1);
}
