import assert from 'assert';
import fs from 'fs';

console.log('🧪 Starting test-mascot-calendar-friendship-fixes.mjs...');

// 1. Verify CSS background for mascot containers (Dark & Light)
console.log('Test 1: Verify Mascot background transparency in CSS');
const datesCss = fs.readFileSync('src/pages/DatesPage.css', 'utf8');
assert(
  !datesCss.includes('rgba(200, 54, 73, 0.2)'),
  'FAIL: DatesPage.css still contains burgundy/red rgba(200, 54, 73, 0.2) background!'
);
assert(
  datesCss.includes('.dates-empty-state__icon-box') &&
  datesCss.includes('background: transparent !important'),
  'FAIL: DatesPage.css missing explicit transparent background on .dates-empty-state__icon-box'
);

const mascotCss = fs.readFileSync('src/components/ui/Mascot/Mascot.css', 'utf8');
assert(
  mascotCss.includes('background: transparent !important'),
  'FAIL: Mascot.css missing background: transparent !important on .lovia-mascot'
);

const emptyStateCss = fs.readFileSync('src/components/ui/EmptyState/EmptyState.css', 'utf8');
assert(
  emptyStateCss.includes('background: transparent !important'),
  'FAIL: EmptyState.css missing background: transparent !important on .empty-state__mascot-wrap'
);

const wishlistGridCss = fs.readFileSync('src/widgets/Wishlist/WishlistGrid/WishlistGrid.css', 'utf8');
assert(
  wishlistGridCss.includes('background: transparent !important'),
  'FAIL: WishlistGrid.css missing background: transparent !important on .wishlist-empty-icon'
);
console.log('✅ Test 1 PASSED: Mascot background transparency confirmed in CSS');

// 2. Verify dateMemoryService.ts handles both location_data and location, string & object
console.log('Test 2: Verify dateMemoryService.ts Supabase location mapping');
const dateMemoryServiceCode = fs.readFileSync('src/services/dateMemoryService.ts', 'utf8');
assert(
  dateMemoryServiceCode.includes('location_data ?? row.location'),
  'FAIL: dateMemoryService.ts must support both location_data and location columns'
);
assert(
  dateMemoryServiceCode.includes('JSON.parse(rawLoc)'),
  'FAIL: dateMemoryService.ts must safely parse stringified location_data JSONB'
);
assert(
  dateMemoryServiceCode.includes('location_data: newEntry.location || null'),
  'FAIL: dateMemoryService.ts must save location_data in Supabase'
);
console.log('✅ Test 2 PASSED: dateMemoryService.ts location/location_data mapping verified');

// 3. Verify Calendar Design & Grid
console.log('Test 3: Verify HomeCalendar & DatePicker 7-column layout and styling');
const homeCalendarCss = fs.readFileSync('src/components/home/HomeCalendar/HomeCalendar.css', 'utf8');
assert(
  homeCalendarCss.includes('grid-template-columns: repeat(7, minmax(0, 1fr))') ||
  homeCalendarCss.includes('grid-template-columns: repeat(7, 1fr)'),
  'FAIL: HomeCalendar.css missing 7-column repeat grid'
);
assert(
  homeCalendarCss.includes('calendar-day--selected') && homeCalendarCss.includes('color: #ffffff !important'),
  'FAIL: HomeCalendar.css missing white text on selected day'
);

const datePickerCss = fs.readFileSync('src/components/ui/DatePicker/DatePicker.css', 'utf8');
assert(
  datePickerCss.includes('grid-template-columns: repeat(7, 1fr)'),
  'FAIL: DatePicker.css missing 7-column repeat grid'
);
assert(
  datePickerCss.includes('date-picker__day-btn--selected') && datePickerCss.includes('color: #ffffff !important'),
  'FAIL: DatePicker.css missing white text on selected day'
);
console.log('✅ Test 3 PASSED: Calendar grid and selection styles verified');

// 4. Verify Friendship Mode
console.log('Test 4: Verify Friendship Space Mode implementation');
const coupleTypeCode = fs.readFileSync('src/types/couple.ts', 'utf8');
assert(
  coupleTypeCode.includes("export type SpaceType = 'relationship' | 'friendship'"),
  'FAIL: SpaceType definition missing in types/couple.ts'
);

const coupleServiceCode = fs.readFileSync('src/services/coupleService.ts', 'utf8');
assert(
  coupleServiceCode.includes('spaceType?: SpaceType'),
  'FAIL: CoupleSpace missing spaceType'
);
assert(
  coupleServiceCode.includes('getSpaceType(): SpaceType'),
  'FAIL: coupleService missing getSpaceType()'
);

const useSpaceModeCode = fs.readFileSync('src/hooks/useSpaceMode.ts', 'utf8');
assert(
  useSpaceModeCode.includes('isFriendship: spaceType === \'friendship\''),
  'FAIL: useSpaceMode hook missing isFriendship check'
);

const onboardingCode = fs.readFileSync('src/pages/OnboardingPage.tsx', 'utf8');
assert(
  onboardingCode.includes("Формат пространства"),
  'FAIL: OnboardingPage missing format space selector'
);
assert(
  onboardingCode.includes("Когда вы начали дружить?"),
  'FAIL: OnboardingPage missing friendly date prompt'
);
assert(
  onboardingCode.includes("Создать код дружбы"),
  'FAIL: OnboardingPage missing friendly create code label'
);

const bottomNavCode = fs.readFileSync('src/components/BottomNav.tsx', 'utf8');
assert(
  bottomNavCode.includes("isFriendship ? 'Дружба' : 'Отношения'"),
  'FAIL: BottomNav missing dynamic friendship label'
);
assert(
  bottomNavCode.includes("isFriendship ? 'Встречи' : 'Свидания'"),
  'FAIL: BottomNav missing dynamic encounters label'
);

const schemaSql = fs.readFileSync('supabase/schema.sql', 'utf8');
assert(
  schemaSql.includes('space_type TEXT NOT NULL DEFAULT \'relationship\''),
  'FAIL: supabase/schema.sql missing space_type column'
);

console.log('✅ Test 4 PASSED: Friendship space mode and adaptations verified');

console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
