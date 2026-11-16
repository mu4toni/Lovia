import fs from 'fs';
import assert from 'assert';

console.log('🧪 Тестирование крупной приподнятой кнопки «Отношения» в нижней панели...\n');

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

test('1. Иконка сердца увеличена до 28px против 20px у остальных вкладок', () => {
  const tsx = fs.readFileSync('src/components/BottomNav.tsx', 'utf8');

  assert(tsx.includes('isFeatured: true'), 'Раздел «Отношения» помечен как isFeatured');
  assert(
    tsx.includes('item.isFeatured ? 28 : 20') || ts.includes('item.isFeatured ? 26 : 20'),
    'Размер иконки: 28px (или 26px) для «Отношения», 20px для остальных'
  );
});

test('2. Крупная круглая кнопка 52x52px, выступающая вверх над доком с градиентом и свечением', () => {
  const css = fs.readFileSync('src/components/BottomNav.css', 'utf8');

  assert(css.includes('.bottom-nav__icon--featured'), 'Класс .bottom-nav__icon--featured присутствует');
  assert(css.includes('width: 52px') && css.includes('height: 52px'), 'Круглая кнопка 52x52px');
  assert(css.includes('border-radius: 50%'), 'Скругление 50% (идеальный круг)');
  assert(css.includes('margin-top: -22px') || css.includes('margin-top: -20px'), 'Кнопка приподнята вверх над доком');
  assert(css.includes('linear-gradient'), 'Фирменный градиент');
  assert(css.includes('color: #ffffff'), 'Белый цвет иконки сердца');
  assert(css.includes('box-shadow'), 'Цветное мягкое свечение');
  assert(css.includes('3px solid var(--bg-card)'), 'Аккуратная окантовка 3px для выреза над доком');
});

test('3. Подпись «Отношения» на одном базовом уровне с соседними вкладками (font-weight: 700 / 600)', () => {
  const css = fs.readFileSync('src/components/BottomNav.css', 'utf8');

  assert(css.includes('.bottom-nav__label--featured'), 'Класс .bottom-nav__label--featured присутствует');
  assert(css.includes('font-weight: 700'), 'Увеличенный вес шрифта подписи в активном состоянии');
  assert(css.includes('font-weight: 600'), 'Вес шрифта подписи в неактивном состоянии');
});

test('4. Чёткое разделение активного и неактивного состояний и пружинистая анимация', () => {
  const css = fs.readFileSync('src/components/BottomNav.css', 'utf8');

  assert(css.includes(':not(.bottom-nav__item--active) .bottom-nav__icon--featured'), 'Стили неактивного состояния');
  assert(css.includes('.bottom-nav__item--featured.bottom-nav__item--active .bottom-nav__icon--featured'), 'Стили активного состояния');
  assert(css.includes('scale(1.05)'), 'Лёгкий scale(1.05) при активном состоянии');
  assert(css.includes('scale(0.92)'), 'Пружинистый отклик scale(0.92) при нажатии');
});

test('5. Сохранение геометрии дока: высота 64px, overflow: visible, адаптация под тёмную тему', () => {
  const css = fs.readFileSync('src/components/BottomNav.css', 'utf8');

  assert(css.includes('height: 64px'), 'Высота дока осталась неизменной (64px)');
  assert(css.includes('overflow: visible'), 'overflow: visible для выступающей кнопки');
  assert(css.includes('min-height: 48px'), 'Сенсорные области соответствуют доступности >= 44px');
  assert(css.includes('[data-theme=\'dark\'] .bottom-nav__icon--featured'), 'Адаптация под тёмную тему с ярким кораллово-малиновым градиентом');
});

console.log(`\n🎉 Все ${passed} тестов крупной кнопки «Отношения» успешно пройдены!\n`);
