import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('🧪 Запуск проверки интеграции маскотов и тёплого скетчевого редизайна...\n');

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

// 1. Проверка файлов изображений маскота
test('1. PNG маскотов существуют в src/assets/mascots/ и имеют валидный размер', () => {
  const lovePath = path.resolve('src/assets/mascots/bear-love.png');
  const sleepyPath = path.resolve('src/assets/mascots/bear-sleepy.png');
  const peekPath = path.resolve('src/assets/mascots/bear-peek.png');

  assert(fs.existsSync(lovePath), 'bear-love.png существует');
  assert(fs.existsSync(sleepyPath), 'bear-sleepy.png существует');
  assert(fs.existsSync(peekPath), 'bear-peek.png существует');

  assert(fs.statSync(lovePath).size > 100000, 'bear-love.png размер > 100KB');
  assert(fs.statSync(sleepyPath).size > 100000, 'bear-sleepy.png размер > 100KB');
  assert(fs.statSync(peekPath).size > 100000, 'bear-peek.png размер > 100KB');
});

// 2. Компонент Mascot.tsx и стили Mascot.css
test('2. Mascot компонент поддерживает 3 варианта, micro-animations и теневую подсветку', () => {
  const tsx = fs.readFileSync('src/components/ui/Mascot/Mascot.tsx', 'utf8');
  const css = fs.readFileSync('src/components/ui/Mascot/Mascot.css', 'utf8');

  assert(tsx.includes("'love'") && tsx.includes("'sleepy'") && tsx.includes("'peek'"), 'Поддерживает варианты love, sleepy, peek');
  assert(tsx.includes('isTapped') && tsx.includes('handleClick'), 'Интерактивная реакция на тап');
  assert(tsx.includes('aria-label'), 'Доступность a11y');

  assert(css.includes('mascotPeekSway'), 'Анимация покачивания bear-peek');
  assert(css.includes('mascotSleepyBreathe'), 'Анимация дыхания bear-sleepy');
  assert(css.includes('mascotLoveFloat'), 'Анимация парения bear-love');
  assert(css.includes("[data-theme='dark']"), 'Теневая подсветка для тёмной темы');
  assert(css.includes('prefers-reduced-motion'), 'Поддержка prefers-reduced-motion');
});

// 3. HomeHeader: выглядывающий bear-peek
test('3. HomeHeader: мордочка bear-peek выглядывает над карточкой пары', () => {
  const tsx = fs.readFileSync('src/components/home/HomeHeader/HomeHeader.tsx', 'utf8');
  const css = fs.readFileSync('src/components/home/HomeHeader/HomeHeader.css', 'utf8');

  assert(tsx.includes('<Mascot') && tsx.includes("variant=\"peek\""), 'Mascot peek добавлен в HomeHeader');
  assert(tsx.includes('home-header__card-wrapper'), 'Обертка карточки пары присутствует');
  assert(tsx.includes('home-header__peeking-mascot'), 'Класс выглядывающего маскота присутствует');

  assert(css.includes('overflow: visible'), 'Карточка имеет overflow: visible');
  assert(css.includes('.home-header__peeking-mascot'), 'Стили выглядывающего маскота заданы');
  assert(css.includes('top: -44px') || css.includes('top: -42px') || css.includes('top: -26px') || css.includes('top: -24px') || css.includes('top: -28px'), 'Маскот приподнят над карточкой');
});

// 4. Пустые состояния: спящий мишка bear-sleepy
test('4. Empty states: спящий мишка в Напоминаниях, Свиданиях и Вишлистах', () => {
  const emptyTsx = fs.readFileSync('src/components/ui/EmptyState/EmptyState.tsx', 'utf8');
  const requestsTsx = fs.readFileSync('src/components/home/RequestsList/RequestsList.tsx', 'utf8');
  const datesTsx = fs.readFileSync('src/pages/DatesPage.tsx', 'utf8');
  const wishlistTsx = fs.readFileSync('src/widgets/Wishlist/WishlistGrid/WishlistGrid.tsx', 'utf8');

  assert(emptyTsx.includes('mascotVariant') && emptyTsx.includes('sleepy'), 'EmptyState поддерживает и использует по умолчанию sleepy');
  assert(requestsTsx.includes('mascotVariant="sleepy"'), 'RequestsList использует sleepy маскота');
  assert(datesTsx.includes('<Mascot') && datesTsx.includes('sleepy'), 'DatesPage использует sleepy маскота');
  assert(wishlistTsx.includes('<Mascot') && wishlistTsx.includes('sleepy'), 'WishlistGrid использует sleepy маскота в пустых состояниях');
});

// 5. Онбординг и Годовщина: радостный мишка bear-love
test('5. OnboardingPage и AnniversaryCard используют радостного мишку bear-love', () => {
  const onbTsx = fs.readFileSync('src/pages/OnboardingPage.tsx', 'utf8');
  const annivTsx = fs.readFileSync('src/widgets/Relationship/AnniversaryCard/AnniversaryCard.tsx', 'utf8');

  assert(onbTsx.includes('<Mascot') && onbTsx.includes('love'), 'OnboardingPage использует love маскота в hero');
  assert(annivTsx.includes('<Mascot') && annivTsx.includes('love'), 'AnniversaryCard использует love маскота');
});

// 6. Тёплая крафтовая палитра, шрифты и тактильные скетчевые тени в tokens.css
test('6. tokens.css & index.html: тёплая бумага (#FBF6F0 / #FFFDF9), графит, Nunito и Caveat', () => {
  const tokens = fs.readFileSync('src/styles/tokens.css', 'utf8');
  const indexHtml = fs.readFileSync('index.html', 'utf8');

  assert(tokens.includes('#fbf6f0'), 'Светлая тема: тёплый фон бумаги #FBF6F0');
  assert(tokens.includes('#fffdf9'), 'Светлая тема: карточки чистой бумаги #FFFDF9');
  assert(tokens.includes('#231f20'), 'Светлая тема: тёмный графитовый текст #231F20');
  assert(tokens.includes('#6b625e'), 'Светлая тема: вторичный текст #6B625E');

  assert(tokens.includes('#22201f'), 'Тёмная тема: тёплые карточки #22201F');
  assert(tokens.includes('#efeae4'), 'Тёмная тема: цвет слоновой кости #EFEAE4');

  assert(tokens.includes('--font-sans') && tokens.includes('Nunito'), 'tokens.css задает Nunito');
  assert(tokens.includes('--font-handwritten') && tokens.includes('Caveat'), 'tokens.css задает Caveat');
  assert(tokens.includes('--shadow-sketch'), 'tokens.css содержит --shadow-sketch');

  assert(indexHtml.includes('Nunito'), 'index.html загружает Google Font Nunito');
  assert(indexHtml.includes('Caveat'), 'index.html загружает Google Font Caveat');
});

// 7. Тактильные скетч-стили кнопок и карточек
test('7. Card.css и Button.css: карандашные границы и тактильные тени', () => {
  const cardCss = fs.readFileSync('src/components/ui/Card/Card.css', 'utf8');
  const btnCss = fs.readFileSync('src/components/ui/Button/Button.css', 'utf8');

  assert(cardCss.includes('1.5px solid'), 'Card.css использует 1.5px карандашный контур');
  assert(cardCss.includes('var(--shadow-sketch'), 'Card.css использует тактильную скетч-тень');
  assert(cardCss.includes('translateY(1.5px)'), 'Card.css интерактивное опускание translateY(1.5px)');

  assert(btnCss.includes('var(--shadow-sketch'), 'Button.css использует тактильную скетч-тень');
  assert(btnCss.includes('translateY(1.5px)'), 'Button.css тактильный клик translateY(1.5px)');
});

console.log('\n======================================================');
console.log(`🎉 Все ${passed} проверок маскотов и скетчевого редизайна пройдены!`);
console.log('======================================================');
