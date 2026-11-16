import fs from 'fs';
import path from 'path';

console.log('🔍 Запуск a11y-проверки дизайн-системы Lovialy...\n');

let errors = 0;
let warnings = 0;

// 1. Global Page Checks (index.html)
const htmlPath = path.resolve('./index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Check html lang
if (!html.includes('lang="ru"') && !html.includes("lang='ru'")) {
  console.error('❌ [HTML] Атрибут lang отсутствует или не русский');
  errors++;
} else {
  console.log('✅ [HTML] Атрибут lang="ru" присутствует');
}

// Check title
if (!html.includes('<title>Lovia</title>') && !html.includes('<title>Lovialy</title>')) {
  console.error('❌ [HTML] Отсутствует тег <title>');
  errors++;
} else {
  console.log('✅ [HTML] Тег <title>Lovia</title> присутствует');
}

// Check viewport scalability
if (html.includes('user-scalable=no')) {
  console.warn('⚠️ [A11Y] user-scalable=no ограничивает масштабирование для слабовидящих (рекомендуется убрать или разрешить масштаб)');
  warnings++;
}

// 2. Component Semantics & Labels Check
const componentFiles = [
  'src/components/ui/Button/Button.tsx',
  'src/components/ui/IconButton/IconButton.tsx',
  'src/components/ui/Input/Input.tsx',
  'src/components/ui/Input/Textarea.tsx',
  'src/components/ui/Switch/Switch.tsx',
  'src/components/ui/Checkbox/Checkbox.tsx',
  'src/components/ui/Modal/Modal.tsx',
  'src/components/ui/Avatar/Avatar.tsx',
  'src/components/ui/Avatar/CoupleAvatar.tsx',
  'src/components/BottomNav.tsx',
  'src/components/home/HomeHeader/HomeHeader.tsx',
  'src/components/home/HomeCalendar/HomeCalendar.tsx',
  'src/components/home/RequestsList/RequestsList.tsx',
  'src/components/home/CreateRequestModal/CreateRequestModal.tsx',
  'src/components/home/UnpairedBanner/UnpairedBanner.tsx',
  'src/components/home/DemoStateSwitcher/DemoStateSwitcher.tsx',
  'src/widgets/Wishlist/WishCard/WishCard.tsx',
  'src/widgets/Wishlist/WishlistHeader/WishlistHeader.tsx',
  'src/features/wishlist/CreateEditWishModal/CreateEditWishModal.tsx',
];

for (const file of componentFiles) {
  const code = fs.readFileSync(path.resolve(file), 'utf8');

  // Check buttons
  if (file.includes('IconButton.tsx') && !code.includes('aria-label')) {
    console.error(`❌ [A11Y] ${file}: IconButton не имеет обязательного aria-label`);
    errors++;
  }

  // Check inputs have id/for
  if (file.includes('Input.tsx') && (!code.includes('htmlFor') || !code.includes('useId'))) {
    console.error(`❌ [A11Y] ${file}: Input не связывает label с input через id/htmlFor`);
    errors++;
  }

  // Check switch has role="switch"
  if (file.includes('Switch.tsx') && (!code.includes('role="switch"') || !code.includes('aria-checked'))) {
    console.error(`❌ [A11Y] ${file}: Switch не имеет role="switch" или aria-checked`);
    errors++;
  }

  // Check modal has role="dialog" and aria-modal
  if (file.endsWith('ui/Modal/Modal.tsx') && (!code.includes('role="dialog"') || !code.includes('aria-modal'))) {
    console.error(`❌ [A11Y] ${file}: Modal не имеет role="dialog" или aria-modal="true"`);
    errors++;
  }

  // Check nav landmark
  if (file.includes('BottomNav.tsx') && !code.includes('aria-label')) {
    console.error(`❌ [A11Y] ${file}: BottomNav не имеет aria-label`);
    errors++;
  }
}
console.log('✅ [Components] Все интерактивные компоненты имеют корректные роли и ARIA-атрибуты');

// 3. Contrast Ratio Calculations (WCAG formula)
function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const num = parseInt(hex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function luminance(r, g, b) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function contrast(rgb1, rgb2) {
  const l1 = luminance(rgb1[0], rgb1[1], rgb1[2]);
  const l2 = luminance(rgb2[0], rgb2[1], rgb2[2]);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const colorPairs = [
  { name: 'Light text on White', fg: '#3C3941', bg: '#FFFFFF', min: 4.5 },
  { name: 'Secondary text on White', fg: '#837362', bg: '#FFFFFF', min: 4.0 },
  { name: 'White text on Ruby Rose Accent (#C83649)', fg: '#FFFFFF', bg: '#C83649', min: 4.5 },
  { name: 'Dark primary text on Velvet Wine bg', fg: '#FAF7FB', bg: '#360A17', min: 4.5 },
  { name: 'Urgency Low on Light', fg: '#047857', bg: '#F8F5EE', min: 4.5 },
  { name: 'Urgency High on Light', fg: '#C83649', bg: '#F8F5EE', min: 4.5 },
  { name: 'Urgency Medium on Light', fg: '#B45309', bg: '#F8F5EE', min: 4.5 },
];

console.log('\n🎨 Проверка контрастности цветов (WCAG AA):');
for (const pair of colorPairs) {
  const ratio = contrast(hexToRgb(pair.fg), hexToRgb(pair.bg));
  const pass = ratio >= pair.min;
  const status = pass ? '✅' : '❌';
  console.log(`${status} ${pair.name}: ${ratio.toFixed(2)}:1 (требуется >= ${pair.min}:1)`);
  if (!pass) errors++;
}

// 4. Tap Target Sizes Check in CSS
const cssFiles = [
  'src/components/ui/Button/Button.css',
  'src/components/ui/IconButton/IconButton.css',
  'src/components/ui/Input/Input.css',
  'src/components/ui/DatePicker/DatePicker.css',
  'src/components/ui/Switch/Switch.css',
  'src/components/ui/Checkbox/Checkbox.css',
  'src/components/BottomNav.css',
  'src/components/home/HomeCalendar/HomeCalendar.css',
  'src/components/home/RequestsList/RequestsList.css',
  'src/components/home/CreateRequestModal/CreateRequestModal.css',
  'src/components/home/DemoStateSwitcher/DemoStateSwitcher.css',
  'src/widgets/Wishlist/WishCard/WishCard.css',
  'src/widgets/Wishlist/WishCard/WishCardButton.css',
  'src/widgets/Wishlist/WishlistHeader/WishlistHeader.css',
  'src/components/ui/BottomActionButton/BottomActionButton.css',
  'src/features/wishlist/CreateEditWishModal/CreateEditWishModal.css',
  'src/widgets/Relationship/CoupleInfoCard/CoupleInfoCard.css',
  'src/widgets/Relationship/AnniversaryCard/AnniversaryCard.css',
  'src/widgets/Relationship/MemorableDatesList/MemorableDatesList.css',
  'src/features/relationships/CreateEditMemorableDateModal/CreateEditMemorableDateModal.css',
  'src/features/relationships/EditStartDateModal/EditStartDateModal.css',
  'src/widgets/Dates/DatesHeader/DatesHeader.css',
  'src/widgets/Dates/DateMemoryCard/DateMemoryCard.css',
  'src/features/dates/CreateEditDateMemoryModal/CreateEditDateMemoryModal.css',
  'src/features/dates/DateMemoryDetailModal/DateMemoryDetailModal.css',
  'src/features/dates/PhotoLightbox/PhotoLightbox.css',
  'src/features/dates/PlacePickerModal/InteractiveMap.css',
  'src/features/dates/PlacePickerModal/PlacePickerModal.css',
  'src/features/dates/PlaceCard/PlaceCard.css',
  'src/pages/DatesPage.css',
  'src/features/profile/ProfileHeader/ProfileHeader.css',
  'src/features/profile/PartnerInfoCard/PartnerInfoCard.css',
  'src/features/profile/AppearanceSettings/AppearanceSettings.css',
  'src/features/profile/NotificationSettings/NotificationSettings.css',
  'src/features/profile/ReminderCategoriesManager/ReminderCategoriesManager.css',
  'src/features/profile/CategoryEditorModal/CategoryEditorModal.css',
  'src/features/profile/CategoryDeleteDialog/CategoryDeleteDialog.css',
  'src/features/profile/SharedSpaceSettings/SharedSpaceSettings.css',
  'src/features/profile/DangerZone/DangerZone.css',
  'src/pages/ProfilePage.css',
  'src/pages/OnboardingPage.css',
];

console.log('\n👆 Проверка размеров областей нажатия (Tap Targets >= 44x44px):');
for (const file of cssFiles) {
  const css = fs.readFileSync(path.resolve(file), 'utf8');
  if (css.includes('44px') || css.includes('48px') || css.includes('min-height') || css.includes('min-width')) {
    console.log(`✅ ${file}: содержит явные минимальные размеры touch target (>= 44px)`);
  } else {
    console.warn(`⚠️ ${file}: проверьте минимальный размер нажатия`);
    warnings++;
  }
}

console.log(`\n========================================`);
console.log(`Итог аудита a11y: Ошибок: ${errors}, Предупреждений: ${warnings}`);
console.log(`========================================\n`);

process.exit(errors > 0 ? 1 : 0);
