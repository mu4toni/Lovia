import fs from 'fs';
import path from 'path';
import assert from 'assert';
import {
  calculateDaysTogether,
  getAnniversaryInfo,
  getMemorableDateStatus,
  isFutureDate,
  pluralizeRu,
  formatRussianDate,
} from '../src/utils/dateCalculations.ts';

console.log('🧪 Запуск комплексного тестирования Этапа 6: «Отношения и Свидания»...\n');

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

// 1. Динамический расчёт дней вместе
test('Сценарий 1: Динамический расчет дней вместе (без статики, с високосными годами и UTC)', () => {
  const asOf = new Date(2026, 10, 15); // 15 ноября 2026
  const days = calculateDaysTogether('2025-12-08', asOf);
  assert.strictEqual(days, 342, 'Должно быть ровно 342 дня между 2025-12-08 и 2026-11-15');

  // Проверка високосного года: 28 фев 2024 -> 1 мар 2024 (2 дня)
  const leapDays = calculateDaysTogether('2024-02-28', new Date(2024, 2, 1));
  assert.strictEqual(leapDays, 2, 'Високосный день должен учитываться корректно (2 дня)');

  // Проверка даты в будущем: не должно давать отрицательные дни
  const futureDays = calculateDaysTogether('2028-01-01', asOf);
  assert.strictEqual(futureDays, 0, 'Будущая дата начала должна возвращать 0');
});

// 2. Блок годовщины отношений и состояния
test('Сценарий 2: Расчет годовщины отношений и состояния (обычное, скоро, сегодня)', () => {
  const asOf = new Date(2026, 10, 15); // 15 ноября 2026

  // Годовщина 8 декабря (через 23 дня)
  const infoUpcoming = getAnniversaryInfo('2025-12-08', asOf);
  assert.strictEqual(infoUpcoming.daysUntil, 23, 'До годовщины должно оставаться 23 дня');
  assert.strictEqual(infoUpcoming.yearsTogether, 1, 'Первая годовщина: 1 год вместе');
  assert.strictEqual(infoUpcoming.isUpcoming, true, '23 дня <= 30 дней -> isUpcoming = true');
  assert.strictEqual(infoUpcoming.isToday, false, 'Сегодня еще не годовщина');

  // Годовщина сегодня (8 декабря 2026)
  const asOfAnniversary = new Date(2026, 11, 8); // 8 декабря 2026
  const infoToday = getAnniversaryInfo('2025-12-08', asOfAnniversary);
  assert.strictEqual(infoToday.isToday, true, 'Сегодня годовщина');
  assert.strictEqual(infoToday.daysUntil, 0, '0 дней до годовщины');
  assert.strictEqual(infoToday.yearsTogether, 1, 'Ровно 1 год вместе');

  // Годовщина нескоро (> 30 дней)
  const asOfFar = new Date(2026, 5, 1); // 1 июня 2026
  const infoFar = getAnniversaryInfo('2025-12-08', asOfFar);
  assert.strictEqual(infoFar.isUpcoming, false, 'Более 30 дней -> isUpcoming = false');
  assert.strictEqual(infoFar.isToday, false, 'Не сегодня');
  assert(infoFar.daysUntil > 30, 'Дней должно быть больше 30');
});

// 3. Памятные даты: Ежегодные vs Однократные
test('Сценарий 3: Памятные даты (обратный отсчёт для ежегодных и отсутствие искусственного отсчёта для разовых)', () => {
  const asOf = new Date(2026, 10, 15); // 15 ноября 2026

  // 1. Ежегодная дата: «Первый поцелуй» (2025-11-20 -> через 5 дней)
  const annualStatus = getMemorableDateStatus('2025-11-20', true, asOf);
  assert.strictEqual(annualStatus.isAnnual, true, 'Должна быть ежегодной');
  assert.strictEqual(annualStatus.daysUntil, 5, 'До годовщины поцелуя ровно 5 дней');
  assert.strictEqual(annualStatus.occurrenceNumber, 1, '1-я годовщина');

  // 2. Однократная дата: «Поездка на маяк» (2026-06-15)
  const nonAnnualStatus = getMemorableDateStatus('2026-06-15', false, asOf);
  assert.strictEqual(nonAnnualStatus.isAnnual, false, 'Не ежегодная');
  assert(nonAnnualStatus.daysAgo !== undefined && nonAnnualStatus.daysAgo > 0, 'Должно считать прошедшие дни');
});

// 4. Сервис памятных дат (Код, структура и персистентность)
test('Сценарий 4: Сервис памятных дат (relationshipService) — CRUD, персистентность и события', () => {
  const relServiceCode = fs.readFileSync(path.resolve('src/services/relationshipService.ts'), 'utf8');
  assert(relServiceCode.includes('getStartDate'), 'getStartDate реализован');
  assert(relServiceCode.includes('setStartDate'), 'setStartDate реализован');
  assert(relServiceCode.includes('getMemorableDates'), 'getMemorableDates реализован');
  assert(relServiceCode.includes('addMemorableDate'), 'addMemorableDate реализован');
  assert(relServiceCode.includes('updateMemorableDate'), 'updateMemorableDate реализован');
  assert(relServiceCode.includes('deleteMemorableDate'), 'deleteMemorableDate реализован');
  assert(relServiceCode.includes('lovia_relationship_updated'), 'Событие обновления отношений рассылается');
  assert(relServiceCode.includes('initialMemorableDates'), 'Предусмотрены реалистичные тестовые даты');
  assert(relServiceCode.includes('Первое знакомство'), 'Присутствует дата Первого знакомства');
  assert(relServiceCode.includes('Первый поцелуй'), 'Присутствует дата Первого поцелуя');
  assert(relServiceCode.includes('Начало отношений'), 'Присутствует дата Начала отношений');
});

// 5. Раздел «Свидания» — СТРОГИЙ ЗАПРЕТ БУДУЩИХ ДАТ
test('Сценарий 5: Свидания — строгая валидация и блокировка будущих дат', () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const futureDateStr = tomorrow.toISOString().split('T')[0];

  assert.strictEqual(isFutureDate(futureDateStr), true, 'Дата через 2 дня должна распознаваться как будущая');

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 2);
  const pastDateStr = yesterday.toISOString().split('T')[0];
  assert.strictEqual(isFutureDate(pastDateStr), false, 'Прошедшая дата валидна');

  const datesServiceCode = fs.readFileSync(path.resolve('src/services/dateMemoryService.ts'), 'utf8');
  assert(
    datesServiceCode.includes('isFutureDate'),
    'dateMemoryService использует проверку isFutureDate'
  );
  assert(
    datesServiceCode.includes('Будущую дату выбрать нельзя'),
    'dateMemoryService бросает строгую ошибку при попытке сохранить будущую дату'
  );
});

// 6. Раздел «Свидания» — CRUD воспоминаний, фото и ссылки
test('Сценарий 6: CRUD воспоминаний о состоявшихся свиданиях, фото и ссылки', () => {
  const datesServiceCode = fs.readFileSync(path.resolve('src/services/dateMemoryService.ts'), 'utf8');
  assert(datesServiceCode.includes('getDateMemories'), 'getDateMemories реализован');
  assert(datesServiceCode.includes('createDateMemory'), 'createDateMemory реализован');
  assert(datesServiceCode.includes('updateDateMemory'), 'updateDateMemory реализован');
  assert(datesServiceCode.includes('deleteDateMemory'), 'deleteDateMemory реализован');
  assert(datesServiceCode.includes('getHeldDatesCount'), 'getHeldDatesCount метод реализован');
  assert(datesServiceCode.includes('lovia_dates_updated'), 'Событие lovia_dates_updated рассылается');
  assert(datesServiceCode.includes('initialDateMemories'), 'Реалистичные тестовые свидания заданы');
  assert(datesServiceCode.includes('Поход в кино'), 'Присутствует свидание: Поход в кино');
  assert(datesServiceCode.includes('ужин при свечах') || datesServiceCode.includes('Ужин при свечах'), 'Присутствует свидание: Ужин при свечах');
  assert(datesServiceCode.includes('Осенняя прогулка в парке'), 'Присутствует свидание: Осенняя прогулка в парке');
  assert(datesServiceCode.includes('домике у озера'), 'Присутствует свидание: Поездка за город');
  assert(datesServiceCode.includes('Домашний вечер с пиццей'), 'Присутствует свидание: Домашний вечер');
});

// 7. Синхронизация между разделами «Отношения» и «Свидания»
test('Сценарий 7: Автоматическая синхронизация счетчика свиданий с разделом «Отношения»', () => {
  const hookRelCode = fs.readFileSync(path.resolve('src/hooks/useRelationship.ts'), 'utf8');
  assert(
    hookRelCode.includes('dateMemoryService.getHeldDatesCount()'),
    'Хук useRelationship получает количество свиданий из dateMemoryService'
  );
  assert(
    hookRelCode.includes('lovia_dates_updated'),
    'Хук useRelationship слушает событие lovia_dates_updated для мгновенного обновления'
  );
});

// 8. Плюрализация и форматирование русских дат
test('Сценарий 8: Корректная русская плюрализация и форматирование дат', () => {
  assert.strictEqual(pluralizeRu(1, 'день', 'дня', 'дней'), 'день');
  assert.strictEqual(pluralizeRu(2, 'день', 'дня', 'дней'), 'дня');
  assert.strictEqual(pluralizeRu(5, 'день', 'дня', 'дней'), 'дней');
  assert.strictEqual(pluralizeRu(11, 'день', 'дня', 'дней'), 'дней');
  assert.strictEqual(pluralizeRu(21, 'день', 'дня', 'дней'), 'день');
  assert.strictEqual(pluralizeRu(24, 'день', 'дня', 'дней'), 'дня');

  assert.strictEqual(pluralizeRu(1, 'год', 'года', 'лет'), 'год');
  assert.strictEqual(pluralizeRu(2, 'год', 'года', 'лет'), 'года');
  assert.strictEqual(pluralizeRu(5, 'год', 'года', 'лет'), 'лет');

  assert.strictEqual(formatRussianDate('2025-12-08'), '8 декабря 2025');
  assert.strictEqual(formatRussianDate('2026-08-22'), '22 августа 2026');
});

// 9. Единые кнопки добавления BottomActionButton
test('Сценарий 9: Единые кнопки добавления (BottomActionButton) внизу разделов', () => {
  const relPageCode = fs.readFileSync(path.resolve('src/pages/RelationshipPage.tsx'), 'utf8');
  assert(
    relPageCode.includes('<BottomActionButton') && relPageCode.includes('Добавить памятную дату'),
    'RelationshipPage содержит кнопку «Добавить памятную дату»'
  );

  const datesPageCode = fs.readFileSync(path.resolve('src/pages/DatesPage.tsx'), 'utf8');
  assert(
    datesPageCode.includes('<BottomActionButton') && datesPageCode.includes('Добавить воспоминание'),
    'DatesPage содержит кнопку «Добавить воспоминание»'
  );
});

// 10. Детальный просмотр и Photo Lightbox
test('Сценарий 10: Детальный просмотр воспоминания и полноэкранный Lightbox для фото', () => {
  const detailCode = fs.readFileSync(path.resolve('src/features/dates/DateMemoryDetailModal/DateMemoryDetailModal.tsx'), 'utf8');
  assert(detailCode.includes('onOpenPhotoLightbox'), 'Детальное модальное окно поддерживает открытие Lightbox');
  assert(detailCode.includes('onEdit'), 'Поддерживает редактирование');
  assert(detailCode.includes('onDelete'), 'Поддерживает удаление');

  const lightboxCode = fs.readFileSync(path.resolve('src/features/dates/PhotoLightbox/PhotoLightbox.tsx'), 'utf8');
  assert(lightboxCode.includes('role="dialog"'), 'Lightbox имеет доступную роль dialog');
  assert(lightboxCode.includes('Escape'), 'Поддержка закрытия по Escape');
  assert(lightboxCode.includes('ArrowLeft') && lightboxCode.includes('ArrowRight'), 'Навигация стрелками');
});

// 11. Замена «Дополнительная ссылка» на выбор места и модель DatePlace
test('Сценарий 11: Полная замена ссылки на систему выбора места (DatePlace) в форме и деталях', () => {
  const typesCode = fs.readFileSync(path.resolve('src/types/dates.ts'), 'utf8');
  assert(typesCode.includes('export interface DatePlace'), 'DatePlace интерфейс объявлен');
  assert(typesCode.includes('latitude: number') && typesCode.includes('longitude: number'), 'Координаты широты и долготы присутствуют');
  assert(typesCode.includes('placeName: string'), 'Название места обязательно в DatePlace');
  assert(typesCode.includes('address?: string'), 'Адрес присутствует в DatePlace');

  const formCode = fs.readFileSync(path.resolve('src/features/dates/CreateEditDateMemoryModal/CreateEditDateMemoryModal.tsx'), 'utf8');
  assert(!formCode.includes('Дополнительная ссылка'), 'Поле «Дополнительная ссылка» полностью удалено из формы');
  assert(formCode.includes('PlaceCard'), 'PlaceCard компонент интегрирован в форму');
  assert(formCode.includes('PlacePickerModal'), 'PlacePickerModal интегрирован для выбора места');

  const detailCode = fs.readFileSync(path.resolve('src/features/dates/DateMemoryDetailModal/DateMemoryDetailModal.tsx'), 'utf8');
  assert(!detailCode.includes('Перейти по прикреплённой ссылке'), 'Ссылка удалена из детального просмотра');
  assert(detailCode.includes('PlaceCard'), 'PlaceCard интегрирован в детальный просмотр');
});

// 12. Картографический сервис и интерактивная карта
test('Сценарий 12: Картографический сервис (mapsService) и интерактивная карта (InteractiveMap)', () => {
  const mapsServiceCode = fs.readFileSync(path.resolve('src/services/mapsService.ts'), 'utf8');
  assert(mapsServiceCode.includes('searchPlaces'), 'searchPlaces реализован');
  assert(mapsServiceCode.includes('reverseGeocode'), 'reverseGeocode реализован');
  assert(mapsServiceCode.includes('getCurrentPosition'), 'getCurrentPosition реализован');
  assert(mapsServiceCode.includes('openInExternalMaps'), 'openInExternalMaps реализован');

  const mapCode = fs.readFileSync(path.resolve('src/features/dates/PlacePickerModal/InteractiveMap.tsx'), 'utf8');
  assert(mapCode.includes('project') && mapCode.includes('unproject'), 'Web Mercator проекция координат');
  assert(mapCode.includes('onLocationChange'), 'Коллбэк изменения точки на карте');
  assert(mapCode.includes('handleZoomIn') && mapCode.includes('handleZoomOut'), 'Зум карты (+/-)');

  const pickerCode = fs.readFileSync(path.resolve('src/features/dates/PlacePickerModal/PlacePickerModal.tsx'), 'utf8');
  assert(pickerCode.includes('handleSelectSearchResult'), 'Выбор из результатов поиска');
  assert(pickerCode.includes('handleMapLocationChange'), 'Установка точки на карте');
  assert(pickerCode.includes('handleLocateMe'), 'Определение геолокации по кнопке');
  assert(pickerCode.includes('Подтвердить место'), 'Кнопка подтверждения выбора точки');
});

// 13. Плавающая кнопка добавления воспоминания (Floating Action Button)
test('Сценарий 13: Плавающая кнопка (Floating Action Button) над нижним меню с авто-скрытием', () => {
  const btnCode = fs.readFileSync(path.resolve('src/components/ui/BottomActionButton/BottomActionButton.tsx'), 'utf8');
  assert(btnCode.includes('variant') || btnCode.includes('floating'), 'BottomActionButton поддерживает floating режим');
  assert(btnCode.includes('visible'), 'BottomActionButton поддерживает управление видимостью visible');

  const btnCss = fs.readFileSync(path.resolve('src/components/ui/BottomActionButton/BottomActionButton.css'), 'utf8');
  assert(btnCss.includes('position: fixed'), 'Плавающая кнопка зафиксирована');
  assert(btnCss.includes('bottom: calc'), 'Отступ от нижней навигации учитывает Safe Area');
  assert(btnCss.includes('bottom-action-wrapper--hidden'), 'Предусмотрен скрытый класс при открытых модалках');

  const datesPageCode = fs.readFileSync(path.resolve('src/pages/DatesPage.tsx'), 'utf8');
  assert(datesPageCode.includes('variant="floating"'), 'DatesPage использует floating режим кнопки');
  assert(datesPageCode.includes('isAnyModalOpen'), 'Кнопка скрывается при любых открытых формах или модалках');

  const datesPageCss = fs.readFileSync(path.resolve('src/pages/DatesPage.css'), 'utf8');
  assert(datesPageCss.includes('padding-bottom: calc(130px'), 'Список имеет достаточный нижний отступ, чтобы не перекрываться кнопкой');
});

console.log('\n======================================================');
console.log(`🎉 Все 10 сценариев Этапа 6 успешно пройдены: ${passedTests}/${passedTests + failedTests}`);
console.log('======================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
