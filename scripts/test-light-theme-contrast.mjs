import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('🧪 Запуск проверки контрастности активных элементов в светлой теме...\n');

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

const tokensCss = fs.readFileSync(path.resolve('src/styles/tokens.css'), 'utf8');
const deadlineCss = fs.readFileSync(path.resolve('src/components/home/CreateRequestModal/DeadlineSelector.css'), 'utf8');
const modalCss = fs.readFileSync(path.resolve('src/components/home/CreateRequestModal/CreateRequestModal.css'), 'utf8');
const iconSelectorCss = fs.readFileSync(path.resolve('src/components/ui/Category/CategoryIconSelector.css'), 'utf8');

// 1. Проверка токена --bg-surface-elevated в tokens.css
test('1. tokens.css определяет --bg-surface-elevated для светлой и тёмной тем', () => {
  assert(tokensCss.includes('--bg-surface-elevated: #ffffff;'), ':root содержит --bg-surface-elevated: #ffffff;');
  assert(tokensCss.includes('--bg-surface-elevated: #262626;'), '[data-theme=dark] содержит --bg-surface-elevated: #262626;');
});

// 2. DeadlineSelector: активная кнопка срока в светлой теме
test('2. DeadlineSelector: активная кнопка срока (Сегодня/Выбрать дату) в светлой теме имеет светлый фон и контрастный текст', () => {
  // Находим правило .deadline-chip--active вне [data-theme='dark']
  const lightActiveMatch = deadlineCss.match(/\.deadline-chip--active\s*\{([^}]+)\}/);
  assert(lightActiveMatch, 'Найдено правило .deadline-chip--active');
  const lightActiveBody = lightActiveMatch[1];
  assert(!lightActiveBody.includes('#262626'), 'Светлый .deadline-chip--active не содержит тёмный фон #262626');
  assert(!lightActiveBody.includes('#1f1f1f'), 'Светлый .deadline-chip--active не содержит тёмный фон #1f1f1f');
  assert(lightActiveBody.includes('background: #ffffff') || lightActiveBody.includes('background: var(--bg-card)'), 'Светлый фон задан');
  assert(lightActiveBody.includes('--color-primary'), 'Использует акцентную рамку');

  // Проверяем тёмную тему
  const darkActiveMatch = deadlineCss.match(/\[data-theme='dark'\]\s+\.deadline-chip--active\s*\{([^}]+)\}/);
  assert(darkActiveMatch, 'Найдено правило [data-theme=dark] .deadline-chip--active');
  assert(darkActiveMatch[1].includes('#262626'), 'Тёмная тема использует фон #262626');
  assert(darkActiveMatch[1].includes('#ffffff'), 'Тёмная тема использует контрастный белый текст #ffffff');
});

// 3. CreateRequestModal: переключатель получателя (Для Ренаты / Для меня) в светлой теме
test('3. CreateRequestModal: переключатель получателя в светлой теме имеет светлый активный фон и тёмный текст', () => {
  const lightTargetMatch = modalCss.match(/\.create-target-btn--active\s*\{([^}]+)\}/);
  assert(lightTargetMatch, 'Найдено правило .create-target-btn--active');
  const lightTargetBody = lightTargetMatch[1];
  assert(!lightTargetBody.includes('#262626'), 'Светлый .create-target-btn--active не содержит тёмный фон #262626');
  assert(lightTargetBody.includes('background: #ffffff'), 'Светлый .create-target-btn--active использует #ffffff');
  assert(lightTargetBody.includes('color: var(--text-primary)'), 'Светлый .create-target-btn--active использует контрастный текст');

  // Тёмная тема
  const darkTargetMatch = modalCss.match(/\[data-theme='dark'\]\s+\.create-target-btn--active\s*\{([^}]+)\}/);
  assert(darkTargetMatch, 'Найдено правило [data-theme=dark] .create-target-btn--active');
  assert(darkTargetMatch[1].includes('#262626'), 'Тёмная тема использует #262626');
  assert(darkTargetMatch[1].includes('#ffffff'), 'Тёмная тема использует контрастный белый текст');
});

// 4. CreateRequestModal: переключатель срочности / приоритета в светлой теме
test('4. CreateRequestModal: кнопки приоритета в светлой теме имеют светлый фон', () => {
  const lightUrgencyMatch = modalCss.match(/\.create-urgency-btn--active\s*\{([^}]+)\}/);
  assert(lightUrgencyMatch, 'Найдено правило .create-urgency-btn--active');
  const lightUrgencyBody = lightUrgencyMatch[1];
  assert(!lightUrgencyBody.includes('#262626'), 'Светлая кнопка приоритета не содержит тёмный фон #262626');
  assert(lightUrgencyBody.includes('background: #ffffff'), 'Светлая кнопка приоритета использует #ffffff');
  assert(lightUrgencyBody.includes('color: var(--text-primary)'), 'Светлая кнопка приоритета использует контрастный текст');

  // Тёмная тема
  const darkUrgencyMatch = modalCss.match(/\[data-theme='dark'\]\s+\.create-urgency-btn--active\s*\{([^}]+)\}/);
  assert(darkUrgencyMatch, 'Найдено правило [data-theme=dark] .create-urgency-btn--active');
  assert(darkUrgencyMatch[1].includes('#262626'), 'Тёмная кнопка приоритета использует #262626');
});

// 5. Поиск утечек захардкоженных тёмных фонов в общих стилях DeadlineSelector и CreateRequestModal
test('5. Отсутствие тёмных фонов (#262626, #1f1f1f, #171717) без селектора [data-theme=dark]', () => {
  // Разбиваем DeadlineSelector по правилам: правила до первого [data-theme='dark'] должны не содержать #262626 в background
  const deadlineLightSection = deadlineCss.split("[data-theme='dark']")[0];
  assert(!/background:\s*#262626/i.test(deadlineLightSection), 'DeadlineSelector: нет background #262626 в светлой теме');
  assert(!/background:\s*#1f1f1f/i.test(deadlineLightSection), 'DeadlineSelector: нет background #1f1f1f в светлой теме');

  const modalLightSection = modalCss.split("[data-theme='dark']")[0];
  assert(!/background:\s*#262626/i.test(modalLightSection), 'CreateRequestModal: нет background #262626 в светлой теме');
  assert(!/background:\s*#1f1f1f/i.test(modalLightSection), 'CreateRequestModal: нет background #1f1f1f в светлой теме');
});

console.log(`\n======================================================`);
console.log(`Итог проверки контрастности: Пройдено: ${passedTests}, Ошибок: ${failedTests}`);
console.log(`======================================================\n`);

if (failedTests > 0) {
  process.exit(1);
}
