import fs from 'fs';
import path from 'path';
import assert from 'assert';
import {
  getWbBasket,
  getWbBasketCandidates,
  extractWildberriesArticle,
  decodeHtmlEntities,
  extractOpenGraphMetadata,
  extractProductMetadata,
} from '../src/server/metadataScraper.ts';

console.log('🧪 Запуск проверки улучшений серверного парсера товаров и адаптера WB...\n');

let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(err);
    failed++;
  }
}

// 1. Проверка User-Agent: отсутствие маркеров ботов
test('1. BROWSER_USER_AGENT: реалистичный браузерный UA без слова Bot / LoviaProductBot', () => {
  const code = fs.readFileSync(path.resolve('src/server/metadataScraper.ts'), 'utf8');
  assert(!code.includes('LoviaProductBot'), 'Не содержит LoviaProductBot');
  assert(!code.includes('Safari/604.1 LoviaProductBot'), 'Убран старый суффикс бота');
  assert(code.includes('BROWSER_USER_AGENT ='), 'BROWSER_USER_AGENT определен');
  
  // Проверяем, что в самой строке User-Agent нет слова "bot"
  const uaMatch = code.match(/const BROWSER_USER_AGENT\s*=\s*['"]([^'"]+)['"]/);
  assert(uaMatch, 'Константа BROWSER_USER_AGENT найдена');
  const ua = uaMatch[1];
  assert(!ua.toLowerCase().includes('bot'), 'В User-Agent нет слова bot');
  assert(!ua.toLowerCase().includes('spider'), 'В User-Agent нет слова spider');
  assert(ua.includes('Mozilla/5.0'), 'User-Agent имеет валидный префикс Mozilla/5.0');
});

// 2. Проверка корзин WB: 01..28+ и динамический расчет
test('2. getWbBasket: правильный расчет для всех корзин 01-28+ и свежих артикулов', () => {
  assert.strictEqual(getWbBasket(100), '01', 'vol 100 -> basket-01');
  assert.strictEqual(getWbBasket(200), '02', 'vol 200 -> basket-02');
  assert.strictEqual(getWbBasket(350), '03', 'vol 350 -> basket-03');
  assert.strictEqual(getWbBasket(2800), '17', 'vol 2800 -> basket-17');
  assert.strictEqual(getWbBasket(2900), '18', 'vol 2900 -> basket-18');
  assert.strictEqual(getWbBasket(3100), '19', 'vol 3100 -> basket-19');
  assert.strictEqual(getWbBasket(3300), '20', 'vol 3300 -> basket-20');
  assert.strictEqual(getWbBasket(3500), '21', 'vol 3500 -> basket-21');
  assert.strictEqual(getWbBasket(3800), '22', 'vol 3800 -> basket-22');
  assert.strictEqual(getWbBasket(4000), '23', 'vol 4000 -> basket-23');
  assert.strictEqual(getWbBasket(4200), '24', 'vol 4200 -> basket-24');
  assert.strictEqual(getWbBasket(4400), '25', 'vol 4400 -> basket-25');
  assert.strictEqual(getWbBasket(4600), '26', 'vol 4600 -> basket-26');
  assert.strictEqual(getWbBasket(4800), '27', 'vol 4800 -> basket-27');
  assert.strictEqual(getWbBasket(5100), '28', 'vol 5100 -> basket-28');
});

// 3. Проверка извлечения артикулов WB из разнообразных ссылок
test('3. extractWildberriesArticle: поддержка мобильных, коротких и query-ссылок WB', () => {
  // Полная ссылка на десктопе
  assert.strictEqual(
    extractWildberriesArticle(new URL('https://www.wildberries.ru/catalog/21123456/detail.aspx')),
    21123456
  );
  // Мобильная ссылка
  assert.strictEqual(
    extractWildberriesArticle(new URL('https://m.wildberries.ru/catalog/12345678/detail.aspx?targetUrl=GP')),
    12345678
  );
  // Короткая ссылка wb.ru
  assert.strictEqual(
    extractWildberriesArticle(new URL('https://wb.ru/catalog/87654321')),
    87654321
  );
  // Альтернативный путь product
  assert.strictEqual(
    extractWildberriesArticle(new URL('https://wildberries.ru/product/99887766')),
    99887766
  );
  // Поиск с параметром nm
  assert.strictEqual(
    extractWildberriesArticle(new URL('https://www.wildberries.ru/catalog/0/search.aspx?search=test&nm=55443322')),
    55443322
  );
  // Не-WB сайт
  assert.strictEqual(
    extractWildberriesArticle(new URL('https://ozon.ru/product/123456')),
    null
  );
});

// 4. Проверка кандидатов корзин (fallback перебор)
test('4. getWbBasketCandidates: перебор соседних корзин', () => {
  const candidates = getWbBasketCandidates(3100); // basket 19
  assert(candidates[0] === '19', 'Первой идет расчетная корзина');
  assert(candidates.includes('20') && candidates.includes('18'), 'Содержит соседние корзины 18 и 20');
  assert(candidates.includes('26') && candidates.includes('25'), 'Содержит актуальные новые корзины');
});

// 5. Проверка декодирования HTML-сущностей в URL картинок
test('5. decodeHtmlEntities: декодирование &amp; -> & и других сущностей', () => {
  const rawUrl = 'https://images.example.com/item.jpg?w=800&amp;q=80&amp;fit=crop';
  const decoded = decodeHtmlEntities(rawUrl);
  assert.strictEqual(decoded, 'https://images.example.com/item.jpg?w=800&q=80&fit=crop');
});

// 6. Проверка извлечения метаданных из og:image:url, link image_src, itemprop image
test('6. extractOpenGraphMetadata: поддержка og:image:url, link rel=image_src, itemprop=image', () => {
  // Тест og:image:url с &amp;
  const htmlOgUrl = `
    <html>
      <head>
        <meta property="og:image:url" content="https://example.com/photo.jpg?size=big&amp;v=2" />
        <meta property="og:title" content="Тестовый товар" />
      </head>
    </html>
  `;
  const res1 = extractProductMetadata(htmlOgUrl, 'https://example.com/product');
  assert.strictEqual(res1.imageUrl, 'https://example.com/photo.jpg?size=big&v=2');
  assert.strictEqual(res1.title, 'Тестовый товар');

  // Тест link rel=image_src
  const htmlLink = `
    <html>
      <head>
        <link rel="image_src" href="/images/item-hero.jpg" />
        <title>Товар из магазина</title>
      </head>
    </html>
  `;
  const res2 = extractProductMetadata(htmlLink, 'https://example.com/shop/item');
  assert.strictEqual(res2.imageUrl, 'https://example.com/images/item-hero.jpg');

  // Тест itemprop="image"
  const htmlItemprop = `
    <html>
      <head>
        <meta itemprop="image" content="https://example.com/itemprop-photo.webp" />
      </head>
    </html>
  `;
  const res3 = extractProductMetadata(htmlItemprop, 'https://example.com/item');
  assert.strictEqual(res3.imageUrl, 'https://example.com/itemprop-photo.webp');
});

// 7. Проверка verifyImageAccessible: отказ от Range и использование HEAD/GET
test('7. verifyImageAccessible: проверка метода HEAD и отсутствия жесткого Range', () => {
  const code = fs.readFileSync(path.resolve('src/server/metadataScraper.ts'), 'utf8');
  assert(!code.includes("Range: 'bytes=0-1024'"), 'Убран жесткий Range header');
  assert(code.includes("method: 'HEAD'"), 'Используется метод HEAD');
  assert(code.includes("method: 'GET'"), 'Используется fallback на GET');
  assert(code.includes('Referer:'), 'Передается Referer');
});

// 8. Проверка vite.config.ts: поддержка configureServer И configurePreviewServer
test('8. vite.config.ts: подключение скрейпера в configureServer и configurePreviewServer', () => {
  const viteCode = fs.readFileSync(path.resolve('vite.config.ts'), 'utf8');
  assert(viteCode.includes('configureServer(server)'), 'configureServer подключен');
  assert(viteCode.includes('configurePreviewServer(server)'), 'configurePreviewServer подключен');
  assert(viteCode.includes('/api/scrape-product'), 'Эндпоинт /api/scrape-product обрабатывается');
});

// 9. Проверка CreateEditWishModal: onPaste, кнопка «Загрузить фото по ссылке» и ручной ввод URL
test('9. CreateEditWishModal: обработка onPaste, кнопка «Загрузить фото по ссылке» и ручной ввод URL', () => {
  const modalCode = fs.readFileSync(path.resolve('src/features/wishlist/CreateEditWishModal/CreateEditWishModal.tsx'), 'utf8');
  assert(modalCode.includes('onPaste={handleLinkPaste}'), 'Инпут ссылки поддерживает onPaste');
  assert(modalCode.includes('wish-fetch-link-btn'), 'Кнопка «Загрузить фото по ссылке» присутствует');
  assert(modalCode.includes('Загрузить фото по ссылке'), 'Текст «Загрузить фото по ссылке» присутствует');
  assert(modalCode.includes('isManualUrlOpen'), 'Поддерживается состояние ручного ввода URL картинки');
  assert(modalCode.includes('Вставить URL картинки') || modalCode.includes('Вставить URL'), 'Кнопка вставки URL картинки присутствует');
  assert(modalCode.includes('handleApplyManualImageUrl'), 'Обработчик применения ручного URL реализован');
});

console.log('\n======================================================');
if (failed === 0) {
  console.log('🎉 Все тесты улучшений парсера товаров успешно пройдены!');
  process.exit(0);
} else {
  console.error(`💥 Провалено тестов: ${failed}`);
  process.exit(1);
}
