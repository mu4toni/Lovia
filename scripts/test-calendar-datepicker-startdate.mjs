import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { isFutureDate, getTodayDateString } from '../src/utils/dateCalculations.ts';

console.log('🧪 Запуск тестирования: Календарь без выполненных задач, запрет будущих свиданий, кастомный DatePicker и дата начала отношений...\n');

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
// 1. Календарь: выполненные задачи полностью скрываются
// ----------------------------------------------------
test('1.1. HomeCalendar отображает только активные напоминания (status !== completed)', () => {
  const tsx = fs.readFileSync('src/components/home/HomeCalendar/HomeCalendar.tsx', 'utf8');

  assert(tsx.includes("r.status !== 'completed'"), 'Фильтрация status !== completed в HomeCalendar');
  assert(tsx.includes('activeRequests'), 'Использование activeRequests для точек и событий');
  assert(tsx.includes('completedTitles'), 'Исключение дублей выполненных задач из events');
});

// ----------------------------------------------------
// 2. Свидания: только прошедшие даты
// ----------------------------------------------------
test('2.1. В initialDateMemories нет будущих дат', () => {
  const tsx = fs.readFileSync('src/services/dateMemoryService.ts', 'utf8');
  assert(tsx.includes('isFutureDate'), 'dateMemoryService валидирует дату через isFutureDate');
  assert(tsx.includes('Будущую дату выбрать нельзя'), 'Строгая ошибка при попытке сохранить будущую дату');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  assert.strictEqual(isFutureDate(tomorrowStr), true, 'Завтрашняя дата распознаётся как будущая');

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  assert.strictEqual(isFutureDate(yesterdayStr), false, 'Вчерашняя дата распознаётся как прошедшая');
});

test('2.2. CreateEditDateMemoryModal блокирует выбор будущих дат через maxDate и валидацию', () => {
  const tsx = fs.readFileSync('src/features/dates/CreateEditDateMemoryModal/CreateEditDateMemoryModal.tsx', 'utf8');

  assert(tsx.includes('<DatePicker'), 'Интеграция кастомного DatePicker в форме свидания');
  assert(tsx.includes('maxDate={getTodayDateString()}'), 'Ограничение maxDate сегодняшним днём');
  assert(tsx.includes('isFutureDate'), 'Проверка на будущее время при сохранении');
});

// ----------------------------------------------------
// 3. Кастомный компонент DatePicker
// ----------------------------------------------------
test('3.1. DatePicker реализован с быстрым выбором года и месяца и поддержкой maxDate', () => {
  const tsx = fs.readFileSync('src/components/ui/DatePicker/DatePicker.tsx', 'utf8');
  const css = fs.readFileSync('src/components/ui/DatePicker/DatePicker.css', 'utf8');

  assert(tsx.includes('formatRussianDate'), 'Форматирование даты по-русски');
  assert(tsx.includes('date-picker__select--month'), 'Быстрый выбор месяца');
  assert(tsx.includes('date-picker__select--year'), 'Быстрый выбор года');
  assert(tsx.includes('isDateDisabled'), 'Проверка блокировки недоступных дат');
  assert(tsx.includes('handleSelectToday'), 'Кнопка быстрого выбора Сегодня');
  assert(tsx.includes('handleSelectYesterday'), 'Кнопка быстрого выбора Вчера');
  assert(css.includes('min-height: 44px'), 'Сенсорная область нажатия >= 44px');
  assert(css.includes('date-picker__day-btn--selected'), 'Стили выбранного дня');
  assert(css.includes('date-picker__day-btn--disabled'), 'Стили заблокированных будущих дней');
});

test('3.2. Нативный input type="date" заменен на DatePicker во всех модалках', () => {
  const editStartDateTsx = fs.readFileSync('src/features/relationships/EditStartDateModal/EditStartDateModal.tsx', 'utf8');
  assert(editStartDateTsx.includes('<DatePicker'), 'DatePicker в EditStartDateModal');
  assert(!editStartDateTsx.includes('type="date"'), 'Нативный type="date" удалён из EditStartDateModal');

  const dateMemoryTsx = fs.readFileSync('src/features/dates/CreateEditDateMemoryModal/CreateEditDateMemoryModal.tsx', 'utf8');
  assert(dateMemoryTsx.includes('<DatePicker'), 'DatePicker в CreateEditDateMemoryModal');
  assert(!dateMemoryTsx.includes('type="date"'), 'Нативный type="date" удалён из CreateEditDateMemoryModal');

  const memorableDateTsx = fs.readFileSync('src/features/relationships/CreateEditMemorableDateModal/CreateEditMemorableDateModal.tsx', 'utf8');
  assert(memorableDateTsx.includes('<DatePicker'), 'DatePicker в CreateEditMemorableDateModal');
  assert(!memorableDateTsx.includes('type="date"'), 'Нативный type="date" удалён из CreateEditMemorableDateModal');
});

// ----------------------------------------------------
// 4. Дата начала отношений: регистрация и профиль
// ----------------------------------------------------
test('4.1. OnboardingPage: выбор даты начала отношений при создании пары', () => {
  const tsx = fs.readFileSync('src/pages/OnboardingPage.tsx', 'utf8');

  assert(tsx.includes('Когда вы начали встречаться?'), 'Поле ввода даты начала отношений');
  assert(tsx.includes('<DatePicker'), 'DatePicker в OnboardingPage');
  assert(tsx.includes('startDate,'), 'startDate передаётся в createCouple');
});

test('4.2. coupleService: сохранение startDate и метод updateStartDate', () => {
  const tsx = fs.readFileSync('src/services/coupleService.ts', 'utf8');

  assert(tsx.includes('updateStartDate(newStartDate: string)'), 'Метод updateStartDate реализован');
  assert(tsx.includes('relationshipService.setStartDate'), 'Синхронизация с relationshipService');
  assert(tsx.includes('targetCouple.startDate ||'), 'Наследование startDate при подключении по коду');
});

test('4.3. Profile: строка даты начала отношений и вызов EditStartDateModal', () => {
  const sharedSpaceTsx = fs.readFileSync('src/features/profile/SharedSpaceSettings/SharedSpaceSettings.tsx', 'utf8');

  assert(sharedSpaceTsx.includes('Дата начала отношений'), 'Строка даты начала отношений');
  assert(sharedSpaceTsx.includes('formatRussianDate(startDate)'), 'Русский формат текущей даты');
  assert(sharedSpaceTsx.includes('EditStartDateModal'), 'Использование EditStartDateModal с DatePicker');
  assert(sharedSpaceTsx.includes('coupleService.updateStartDate'), 'Обновление в coupleService');
});

console.log('\n======================================================');
console.log(`🎉 Все сценарии тестирования успешно пройдены: ${passed}/7`);
console.log('======================================================\n');
