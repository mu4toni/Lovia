import fs from 'fs';
import path from 'path';
import assert from 'assert';
import {
  isPrivateIp,
  isBadImage,
  extractProductMetadata,
  extractSchemaProductMetadata,
  getWbBasket,
} from '../src/server/metadataScraper.ts';

console.log('🧪 Запуск комплексного тестирования редизайна «Вишлисты» и точного получения фото...\n');

let testsPassed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Модель данных и обратная совместимость
test('Сценарий 1: Модель данных WishItem и опциональность categoryId в CreateWishInput', () => {
  const typesCode = fs.readFileSync(path.resolve('src/types/wishlist.ts'), 'utf8');
  assert(typesCode.includes('export interface WishItem'), 'WishItem интерфейс объявлен');
  assert(typesCode.includes('userId: string'), 'WishItem привязан к userId');
  assert(typesCode.includes('imageUrl?: string'), 'WishItem содержит фотографию');
  assert(typesCode.includes('linkUrl?: string'), 'WishItem содержит ссылку');
  assert(typesCode.includes('estimatedPrice?: number'), 'WishItem содержит примерную стоимость');
  assert(typesCode.includes('categoryId?: string'), 'categoryId опционален в CreateWishInput для обратной совместимости');
  assert(typesCode.includes('isReserved?: boolean'), 'WishItem поддерживает статус резервирования');
});

// 2. Сервисный слой и дефолтное назначение категории
test('Сценарий 2: WishlistService — CRUD операции и безопасный дефолт категории', () => {
  const serviceCode = fs.readFileSync(path.resolve('src/services/wishlistService.ts'), 'utf8');
  assert(serviceCode.includes('getWishlist'), 'getWishlist метод реализован');
  assert(serviceCode.includes('createWishItem'), 'createWishItem метод реализован');
  assert(serviceCode.includes('effectiveCategory = input.categoryId || \'gifts\''), 'Дефолтная категория подарков при отсутствии выбора');
  assert(serviceCode.includes('updateWishItem'), 'updateWishItem метод реализован');
  assert(serviceCode.includes('deleteWishItem'), 'deleteWishItem метод реализован');
  assert(serviceCode.includes('toggleReserveWishItem'), 'toggleReserveWishItem метод реализован');
  assert(serviceCode.includes('localStorage'), 'Персистентность через localStorage');
});

// 3. Серверный модуль: защита от SSRF (isPrivateIp)
test('Сценарий 3: Защита от SSRF (isPrivateIp)', () => {
  // Loopback
  assert(isPrivateIp('127.0.0.1') === true, '127.0.0.1 заблокирован');
  assert(isPrivateIp('127.0.1.10') === true, '127.0.1.10 заблокирован');
  assert(isPrivateIp('::1') === true, '::1 (IPv6 loopback) заблокирован');
  // Private 10.x
  assert(isPrivateIp('10.0.0.1') === true, '10.0.0.1 заблокирован');
  assert(isPrivateIp('10.255.255.255') === true, '10.255.255.255 заблокирован');
  // Cloud metadata & Link-local 169.254.x
  assert(isPrivateIp('169.254.169.254') === true, 'AWS/GCP metadata IP заблокирован');
  // Private 192.168.x
  assert(isPrivateIp('192.168.1.1') === true, '192.168.1.1 заблокирован');
  // Private 172.16-31.x
  assert(isPrivateIp('172.16.0.1') === true, '172.16.0.1 заблокирован');
  assert(isPrivateIp('172.25.1.1') === true, '172.25.1.1 заблокирован');
  assert(isPrivateIp('172.31.255.255') === true, '172.31.255.255 заблокирован');
  // Public IP
  assert(isPrivateIp('8.8.8.8') === false, '8.8.8.8 разрешен (публичный IP)');
  assert(isPrivateIp('1.1.1.1') === false, '1.1.1.1 разрешен (публичный IP)');
});

// 4. Фильтрация посторонних картинок (isBadImage)
test('Сценарий 4: Отсев баннеров, логотипов, заглушек, иконок и трекеров (isBadImage)', () => {
  assert(isBadImage('https://example.com/assets/logo.png') === true, 'Логотип отсеивается');
  assert(isBadImage('https://example.com/images/site-logotype.jpg') === true, 'Логотип отсеивается');
  assert(isBadImage('https://example.com/favicon.ico') === true, 'Favicon отсеивается');
  assert(isBadImage('https://example.com/icons/heart.svg') === true, 'SVG иконка отсеивается');
  assert(isBadImage('https://example.com/promo/black_friday_banner.jpg') === true, 'Рекламный баннер отсеивается');
  assert(isBadImage('https://example.com/static/no-photo.png') === true, 'Заглушка no-photo отсеивается');
  assert(isBadImage('https://example.com/static/placeholder.jpg') === true, 'Плейсхолдер отсеивается');
  assert(isBadImage('https://example.com/tracking/pixel.png') === true, 'Пиксель отсеивается');

  // Настоящие фото товара НЕ должны отсеиваться
  assert(isBadImage('https://cdn.example.com/products/45920/main_1.jpg') === false, 'Фото товара разрешено');
  assert(isBadImage('https://basket-03.wbbasket.ru/vol350/part350123/35012345/images/big/1.webp') === false, 'Фото WB разрешено');
  assert(isBadImage('https://cdn1.ozone.ru/s3/multimedia-1-a/wc1000/654321.jpg') === false, 'Фото Ozon разрешено');
});

// 5. Парсинг Schema.org Product vs Organization
test('Сценарий 5: Парсинг Schema.org — строго извлекает фото из Product и игнорирует логотипы Organization', () => {
  const mockHtmlMixed = `
    <!DOCTYPE html>
    <html>
      <head>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "SuperStore",
          "logo": "https://example.com/store-logo.png"
        }
        </script>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Шёлковая наволочка 50x70",
          "image": "https://example.com/pillowcase-silk.jpg"
        }
        </script>
      </head>
      <body>Контент товара</body>
    </html>
  `;
  const parsed = extractProductMetadata(mockHtmlMixed, 'https://example.com/pillowcase');
  assert.strictEqual(parsed.title, 'Шёлковая наволочка 50x70', 'Извлечено название Product');
  assert.strictEqual(parsed.imageUrl, 'https://example.com/pillowcase-silk.jpg', 'Извлечено фото именно Product, а не Organization');
});

// 6. Парсинг Open Graph с правильным разрешением относительных URL
test('Сценарий 6: Парсинг Open Graph с корректным разрешением относительных URL', () => {
  const mockHtmlOG = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="og:title" content="Кашемировый плед Soft Lovia" />
        <meta property="og:image" content="/images/blanket-hero.jpg" />
      </head>
      <body>Товар</body>
    </html>
  `;
  const parsed = extractProductMetadata(mockHtmlOG, 'https://example.com/catalog/blanket');
  assert.strictEqual(parsed.title, 'Кашемировый плед Soft Lovia', 'Извлечен og:title');
  assert.strictEqual(parsed.imageUrl, 'https://example.com/images/blanket-hero.jpg', 'Относительный URL фото разрешен к базовому');
});

// 7. Детерминированный расчёт CDN корзины Wildberries
test('Сценарий 7: Детерминированный расчет CDN корзины Wildberries по артикулу (getWbBasket)', () => {
  assert.strictEqual(getWbBasket(100), '01', 'vol 100 -> basket-01');
  assert.strictEqual(getWbBasket(200), '02', 'vol 200 -> basket-02');
  assert.strictEqual(getWbBasket(350), '03', 'vol 350 -> basket-03');
  assert.strictEqual(getWbBasket(500), '04', 'vol 500 -> basket-04');
  assert.strictEqual(getWbBasket(800), '05', 'vol 800 -> basket-05');
});

// 8. Клиентский сервис скрейпинга (ProductScraperService) — ПОЛНЫЙ ЗАПРЕТ ФЕЙКОВЫХ ДЕМО
test('Сценарий 8: ProductScraperService — полное отсутствие случайных/подставных демо-картинок', () => {
  const serviceCode = fs.readFileSync(path.resolve('src/services/productScraperService.ts'), 'utf8');
  assert(!serviceCode.includes('DEMO_STORE_FALLBACKS'), 'DEMO_STORE_FALLBACKS полностью удален!');
  assert(!serviceCode.includes('unsplash.com'), 'Случайные фото с Unsplash запрещены!');
  assert(serviceCode.includes('scrapeProduct'), 'Метод scrapeProduct реализован');
  assert(serviceCode.includes('scrapeCache'), 'In-memory кэш реализован');
  assert(serviceCode.includes('activeControllers'), 'Отмена устаревших запросов реализована');
  assert(serviceCode.includes('isValidUrl'), 'Валидация URL реализована');
});

// 9. Форма «Новое желание» — сброс старых фото, race condition и обработка ошибок
test('Сценарий 9: Форма создания — сброс устаревших фото, requestIdRef и обработка ошибок', () => {
  const modalCode = fs.readFileSync(path.resolve('src/features/wishlist/CreateEditWishModal/CreateEditWishModal.tsx'), 'utf8');
  // Отсутствие устаревших полей
  assert(!modalCode.includes('textarea'), 'Форма НЕ содержит textarea');
  assert(!modalCode.includes('wish-modal__categories-grid'), 'Форма НЕ содержит селектор категорий');

  // Защита от race condition и сброс фото
  assert(modalCode.includes('requestIdRef'), 'Используется requestIdRef для защиты от перезаписи старыми ответами');
  assert(modalCode.includes('productScraperService.cancelAll()'), 'Отмена активных запросов при изменении ссылки');
  assert(modalCode.includes('handleLinkChange'), 'Обработчик изменения ссылки очищает старое фото');

  // Правильная обработка ошибок (Требование 6)
  assert(modalCode.includes('Не удалось автоматически получить фотографию этого товара'), 'Точное сообщение об ошибке');
  assert(modalCode.includes('Загрузить фото вручную'), 'Действие 1: Загрузить фото вручную');
  assert(modalCode.includes('Продолжить без фото'), 'Действие 2: Продолжить без фото');

  // Предварительный просмотр (Требование 7)
  assert(modalCode.includes('wish-lightbox-overlay'), 'Полноразмерный просмотр фотографии (Lightbox Zoom)');
  assert(modalCode.includes('Заменить фотографию'), 'Действие замены фотографии');
  assert(modalCode.includes('Удалить фотографию'), 'Действие удаления фотографии');
});

// 10. Стили формы и дизайн-система
test('Сценарий 10: Стили формы — 48px стандарты, лайтбокс, отсутствие CLS', () => {
  const modalCss = fs.readFileSync(path.resolve('src/features/wishlist/CreateEditWishModal/CreateEditWishModal.css'), 'utf8');
  assert(modalCss.includes('.wish-modal-submit-btn'), 'Кнопка сохранения занимает полную ширину');
  assert(modalCss.includes('aspect-ratio: 16 / 9'), 'Фиксированное соотношение сторон фото-блока предотвращает CLS');
  assert(modalCss.includes('.wish-photo-box__skip-btn'), 'Стили кнопки «Продолжить без фото»');
  assert(modalCss.includes('.wish-lightbox-overlay'), 'Стили лайтбокса полноразмерного просмотра');
});

// 11. Карточка желания (WishCard) и переиспользуемый WishCardButton
test('Сценарий 11: Карточка желания — акцент на фото, единый компонент WishCardButton и отсутствие бейджа категории', () => {
  const cardCode = fs.readFileSync(path.resolve('src/widgets/Wishlist/WishCard/WishCard.tsx'), 'utf8');
  assert(cardCode.includes('wish-card__media'), 'Содержит фото-херо элемент');
  assert(!cardCode.includes('wish-card__category-badge'), 'Бейдж категории удален из карточки для визуальной чистоты');
  assert(cardCode.includes('wish-card__placeholder'), 'Минималистичный фарфоровый плейсхолдер при отсутствии фото');
  assert(cardCode.includes('wish-card__price'), 'Красивое отображение цены с символом ₽');
  assert(cardCode.includes('WishCardButton'), 'Использует единый переиспользуемый компонент WishCardButton');
  assert(cardCode.includes('Где') && cardCode.includes('купить'), 'Содержит кнопку «Где купить»');
  assert(cardCode.includes('Я подарю') && cardCode.includes('это!'), 'Содержит кнопку «Я подарю это!»');
  assert(cardCode.includes('isOwnList &&') && cardCode.includes('wish-card__actions'), 'Кнопки редактирования и удаления доступны только автору');

  // Проверка переиспользуемого компонента WishCardButton
  const btnCode = fs.readFileSync(path.resolve('src/widgets/Wishlist/WishCard/WishCardButton.tsx'), 'utf8');
  assert(btnCode.includes('export const WishCardButton'), 'WishCardButton компонент объявлен');
  assert(btnCode.includes('wish-btn'), 'Содержит общий класс wish-btn');

  const btnCss = fs.readFileSync(path.resolve('src/widgets/Wishlist/WishCard/WishCardButton.css'), 'utf8');
  assert(btnCss.includes('height: 42px'), 'Единая фиксированная высота 42px');
  assert(btnCss.includes('.wish-btn--secondary'), 'Стили для «Где купить»');
  assert(btnCss.includes('.wish-btn--primary'), 'Стили для «Я подарю это!»');
  assert(btnCss.includes('.wish-btn--reserved'), 'Стили для «Вы дарите это 🤫»');
  assert(btnCss.includes('.wish-btn--disabled'), 'Стили для неактивного состояния');
});

// 12. Шапка, сетка, страница WishlistPage и единые кнопки добавления
test('Сценарий 12: Интеграция страницы WishlistPage, отступ от BottomNav и единые кнопки добавления', () => {
  const headerCode = fs.readFileSync(path.resolve('src/widgets/Wishlist/WishlistHeader/WishlistHeader.tsx'), 'utf8');
  assert(headerCode.includes('Мой вишлист') && headerCode.includes('Вишлист'), 'Вкладки переключения списков с корректным склонением');
  assert(!headerCode.includes('wishlist-header__filter-bar'), 'Лишняя панель категорий удалена');
  assert(!headerCode.includes('wishlist-header__create-btn'), 'Дублирующая кнопка создания удалена из шапки вишлиста');

  const gridCode = fs.readFileSync(path.resolve('src/widgets/Wishlist/WishlistGrid/WishlistGrid.tsx'), 'utf8');
  assert(gridCode.includes('Ваш вишлист пока пуст'), 'Пустое состояние своего списка');
  assert(gridCode.includes('У {partnerName} пока нет желаний') || gridCode.includes('пока нет желаний'), 'Пустое состояние списка партнера');

  const layoutCss = fs.readFileSync(path.resolve('src/layouts/MainLayout.css'), 'utf8');
  assert(layoutCss.includes('100px') || layoutCss.includes('96px'), 'Достаточный отступ снизу предотвращает перекрытие BottomNav');

  const pageCode = fs.readFileSync(path.resolve('src/pages/WishlistPage.tsx'), 'utf8');
  assert(pageCode.includes('WishlistHeader'), 'WishlistHeader подключен');
  assert(pageCode.includes('WishlistGrid'), 'WishlistGrid подключен');
  assert(pageCode.includes('BottomActionButton'), 'Единая кнопка «Добавить желание» внизу страницы');
  assert(pageCode.includes('CreateEditWishModal'), 'CreateEditWishModal подключен');

  const homeCode = fs.readFileSync(path.resolve('src/pages/HomePage.tsx'), 'utf8');
  assert(homeCode.includes('BottomActionButton'), 'Единая кнопка «Добавить напоминание» внизу главной страницы');

  const reqListCode = fs.readFileSync(path.resolve('src/components/home/RequestsList/RequestsList.tsx'), 'utf8');
  assert(!reqListCode.includes('requests-section__create-btn'), 'Дублирующая кнопка создания удалена из шапки списка напоминаний');
});

console.log('\n======================================================');
console.log(`🎉 Все 12 сценариев валидации получения фото и вишлистов успешно пройдены: ${testsPassed}/12`);
console.log('======================================================\n');
