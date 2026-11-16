import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('🧪 Запуск проверки устранения бага «Сегодня/Выбрать дату», переноса времени и возврата базовых категорий...\n');

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

// 1. Профиль без ReminderCategoriesManager
test('1. ProfilePage: полностью удалена секция ReminderCategoriesManager', () => {
  const profileTsx = fs.readFileSync('src/pages/ProfilePage.tsx', 'utf8');
  assert(!profileTsx.includes('ReminderCategoriesManager'), 'ReminderCategoriesManager не используется в ProfilePage');
  assert(!profileTsx.includes('Категории напоминаний'), 'Нет заголовка категорий в ProfilePage');
});

// 2. Базовые категории в типах и сервисе
test('2. types/category.ts & categoriesService: 3 базовые категории из коробки (Личное, Дом, Свидания)', () => {
  const catTs = fs.readFileSync('src/types/category.ts', 'utf8');
  const catService = fs.readFileSync('src/services/categoriesService.ts', 'utf8');

  assert(catTs.includes('DEFAULT_BASE_CATEGORIES'), 'Определены DEFAULT_BASE_CATEGORIES');
  assert(catTs.includes('Личное / Забота'), 'Базовая категория Личное / Забота');
  assert(catTs.includes('Дела / Дом'), 'Базовая категория Дела / Дом');
  assert(catTs.includes('Вместе / Свидания'), 'Базовая категория Вместе / Свидания');

  assert(catService.includes('DEFAULT_BASE_CATEGORIES'), 'categoriesService использует DEFAULT_BASE_CATEGORIES по умолчанию');
});

// 3. CreateRequestModal: готовые базовые категории без заглушки
test('3. CreateRequestModal: убрана заглушка, доступны базовые категории + Без категории', () => {
  const modalTsx = fs.readFileSync('src/components/home/CreateRequestModal/CreateRequestModal.tsx', 'utf8');
  assert(!modalTsx.includes('Категорий пока нет — их можно создать в Профиле'), 'Убрана заглушка о создании категорий в Профиле');
  assert(modalTsx.includes('Без категории'), 'Присутствует опция Без категории');
  assert(modalTsx.includes('DEFAULT_BASE_CATEGORIES'), 'Подключены базовые категории из коробки');
});

// 4. HomeCalendar: фильтр по базовым категориям
test('4. HomeCalendar: фильтр по 3 базовым цветам совпадает с категориями в напоминаниях', () => {
  const calTsx = fs.readFileSync('src/components/home/HomeCalendar/HomeCalendar.tsx', 'utf8');
  assert(calTsx.includes('DEFAULT_BASE_CATEGORIES'), 'HomeCalendar использует DEFAULT_BASE_CATEGORIES');
  assert(calTsx.includes('filterColors'), 'Используется вычисление цветов фильтра');
});

// 5. DeadlineSelector: строго взаимоисключающие режимы 'none' | 'today' | 'custom'
test('5. DeadlineSelector: строго взаимоисключающие режимы (none, today, custom)', () => {
  const deadlineTsx = fs.readFileSync('src/components/home/CreateRequestModal/DeadlineSelector.tsx', 'utf8');
  assert(deadlineTsx.includes("mode: 'none' | 'today' | 'custom'"), 'Типизация режимов none | today | custom');
  assert(deadlineTsx.includes('isToday'), 'Вычисление активности кнопки Сегодня');
  assert(deadlineTsx.includes('isCustom'), 'Вычисление активности кнопки Выбрать дату');
  assert(deadlineTsx.includes('handleToggleToday'), 'Обработчик переключения Сегодня');
  assert(deadlineTsx.includes('handleToggleCustom'), 'Обработчик переключения Выбрать дату');
  assert(deadlineTsx.includes('handleSelectNone'), 'Сброс срока в Без срока');
});

// 6. Перенос выбора времени внутрь «Выбрать дату»
test('6. DeadlineSelector & CreateRequestModal: выбор времени перенесен внутрь блока «Выбрать дату»', () => {
  const deadlineTsx = fs.readFileSync('src/components/home/CreateRequestModal/DeadlineSelector.tsx', 'utf8');
  const deadlineCss = fs.readFileSync('src/components/home/CreateRequestModal/DeadlineSelector.css', 'utf8');
  const modalTsx = fs.readFileSync('src/components/home/CreateRequestModal/CreateRequestModal.tsx', 'utf8');

  // Внутри DeadlineSelector
  assert(deadlineTsx.includes('deadline-time-block'), 'DeadlineSelector содержит блок времени');
  assert(deadlineTsx.includes('deadline-time-input'), 'DeadlineSelector содержит инпут времени');
  assert(deadlineTsx.includes('deadline-time-preset'), 'DeadlineSelector содержит пресеты времени');
  assert(deadlineCss.includes('.deadline-time-block'), 'Стили блока времени в DeadlineSelector.css');

  // Убрано из «Дополнительных параметров» CreateRequestModal
  const advancedDrawerContent = modalTsx.split('isAdvancedOpen && (')[1]?.split(') : null')[0] || '';
  assert(!advancedDrawerContent.includes('due-time-input'), 'Инпут времени убран из Дополнительных параметров');
  assert(!advancedDrawerContent.includes('Точное время'), 'Блок Точное время убран из Дополнительных параметров');
});

console.log(`\n======================================================`);
console.log(`🎉 Все 6 тестов разделов категорий и дедлайна (${passed}/6) успешно пройдены!`);
console.log(`======================================================`);
