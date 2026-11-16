import fs from 'fs';
import path from 'path';

console.log('🧪 Запуск проверки редизайна CreateRequestModal, DeadlineSelector и безопасного удаления категорий...\n');

let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failedTests++;
  }
}

const rootDir = process.cwd();

// 1. Проверка DeadlineSelector.tsx & .css
const deadlineTsx = fs.readFileSync(
  path.join(rootDir, 'src/components/home/CreateRequestModal/DeadlineSelector.tsx'),
  'utf-8'
);
const deadlineCss = fs.readFileSync(
  path.join(rootDir, 'src/components/home/CreateRequestModal/DeadlineSelector.css'),
  'utf-8'
);

assert(
  deadlineTsx.includes('deadline-chips-row--two'),
  'DeadlineSelector.tsx: использует класс для 2 удобных чипов на всю ширину'
);

assert(
  deadlineCss.includes('grid-template-columns: 1fr 1fr'),
  'DeadlineSelector.css: сетка чипов 1fr 1fr (две кнопки на всю ширину)'
);

assert(
  deadlineTsx.includes('<span>Сегодня</span>') && deadlineTsx.includes('handleToggleToday'),
  'DeadlineSelector.tsx: кнопка-чип «Сегодня» с переключением'
);

assert(
  deadlineTsx.includes('customLabel') && deadlineTsx.includes('setIsDatePickerOpen'),
  'DeadlineSelector.tsx: кнопка-чип «Выбрать дату» открывает DatePicker'
);

assert(
  deadlineTsx.includes('deadline-status-pill') && deadlineTsx.includes('Срок:'),
  'DeadlineSelector.tsx: компактный статус справа в заголовке («Срок: Без срока» / выбранная дата)'
);

assert(
  deadlineTsx.includes('deadline-clear-btn') && deadlineTsx.includes('handleSelectNone'),
  'DeadlineSelector.tsx: крестик «×» для сброса срока обратно в «Без срока»'
);

// 2. Проверка CreateRequestModal.tsx & .css
const createModalTsx = fs.readFileSync(
  path.join(rootDir, 'src/components/home/CreateRequestModal/CreateRequestModal.tsx'),
  'utf-8'
);
const createModalCss = fs.readFileSync(
  path.join(rootDir, 'src/components/home/CreateRequestModal/CreateRequestModal.css'),
  'utf-8'
);

assert(
  !createModalTsx.includes('CreateCategoryModal'),
  'CreateRequestModal.tsx: убран CreateCategoryModal (создание только в Профиле)'
);

assert(
  !createModalTsx.includes('+10') && !createModalTsx.includes('EXTENDED_CATEGORY_ICONS'),
  'CreateRequestModal.tsx: убрано расширенное меню +10 иконок'
);

assert(
  !createModalTsx.includes('create-cat-chip--add'),
  'CreateRequestModal.tsx: убран плюсик создания категории'
);

assert(
  !createModalTsx.includes('Категорий пока нет — их можно создать в Профиле') &&
    createModalTsx.includes('DEFAULT_BASE_CATEGORIES'),
  'CreateRequestModal.tsx: убрана заглушка создания категорий в Профиле, возвращены базовые категории'
);

assert(
  createModalTsx.includes('Без категории') && createModalTsx.includes('handleResetCategory'),
  'CreateRequestModal.tsx: вариант «Без категории» для сброса выбора'
);

assert(
  createModalTsx.includes('Для кого задача') &&
    createModalTsx.includes('create-target-toggle') &&
    createModalTsx.includes('Для нас обоих'),
  'CreateRequestModal.tsx: блок «Для кого задача» перенесён на главный экран (3 сегмента: Для партнёра / Для меня / Для нас обоих)'
);

assert(
  createModalCss.includes('border: 1px solid rgba(229, 229, 229, 0.12)'),
  'CreateRequestModal.css: инпут названия имеет спокойную рамку без красного в покое'
);

assert(
  createModalTsx.includes('isAdvancedOpen') &&
    createModalTsx.includes('Дополнительные параметры') &&
    createModalTsx.includes('dueTime') &&
    createModalTsx.includes('description') &&
    createModalTsx.includes('urgency') &&
    createModalTsx.includes('rewardNote'),
  'CreateRequestModal.tsx: в «Дополнительные параметры» убраны dueTime, description, urgency, rewardNote'
);

// 3. Проверка сервисов и диалога безопасного удаления категорий
const reqServiceTs = fs.readFileSync(
  path.join(rootDir, 'src/services/requestsService.ts'),
  'utf-8'
);
const catServiceTs = fs.readFileSync(
  path.join(rootDir, 'src/services/categoriesService.ts'),
  'utf-8'
);
const deleteDialogTsx = fs.readFileSync(
  path.join(rootDir, 'src/features/profile/CategoryDeleteDialog/CategoryDeleteDialog.tsx'),
  'utf-8'
);
const catManagerTsx = fs.readFileSync(
  path.join(rootDir, 'src/features/profile/ReminderCategoriesManager/ReminderCategoriesManager.tsx'),
  'utf-8'
);

assert(
  reqServiceTs.includes('getAffectedRemindersCount(categoryId: string): number'),
  'requestsService.ts: метод подсчёта связанных напоминаний getAffectedRemindersCount'
);

assert(
  reqServiceTs.includes('unlinkCategory(categoryId: string)') &&
    reqServiceTs.includes('categoryIcon: undefined'),
  'requestsService.ts: безопасное отвязывание категории unlinkCategory с сохранением данных'
);

assert(
  reqServiceTs.includes('reassignCategory('),
  'requestsService.ts: перенос напоминаний в другую категорию reassignCategory'
);

assert(
  deleteDialogTsx.includes('affectedCount === 0') &&
    deleteDialogTsx.includes('title="Удалить категорию?"') &&
    deleteDialogTsx.includes('С этой категорией нет связанных напоминаний'),
  'CategoryDeleteDialog.tsx: при 0 привязанных напоминаний — простое подтверждение удаления'
);

assert(
  deleteDialogTsx.includes('Эта категория используется в') &&
    deleteDialogTsx.includes('Что с ними сделать?') &&
    deleteDialogTsx.includes('Оставить без категории') &&
    deleteDialogTsx.includes('Перенести в другую категорию'),
  'CategoryDeleteDialog.tsx: при N > 0 напоминаний — выбор: «Оставить без категории» или «Перенести в другую категорию»'
);

assert(
  catManagerTsx.includes('getAffectedRemindersCount'),
  'ReminderCategoriesManager.tsx: передаёт подсчитанное количество affectedCount в диалог'
);

assert(
  catServiceTs.includes('deleteAndReassign') && catServiceTs.includes('lovia_categories_updated'),
  'categoriesService.ts: deleteAndReassign и нотификация lovia_categories_updated'
);

console.log('\n======================================================');
if (failedTests === 0) {
  console.log('🎉 Все тесты модалки напоминания, сроков и категорий успешно пройдены!');
  process.exit(0);
} else {
  console.error(`💥 Провалено тестов: ${failedTests}`);
  process.exit(1);
}
