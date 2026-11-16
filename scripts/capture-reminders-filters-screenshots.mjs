import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const ARTIFACT_DIR = 'C:\\Users\\marsel\\.gemini\\antigravity\\brain\\aeddcfac-2076-46b4-8b9e-19dc8553ab5f';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const distCssFiles = fs.readdirSync('dist/assets').filter((f) => f.endsWith('.css'));
const cssFileName = distCssFiles[0];
const cssFullPath = path.resolve('dist/assets', cssFileName).replace(/\\/g, '/');

function getPageHtml({ activeTab = 'all' }) {
  return `<!DOCTYPE html>
<html lang="ru" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Lovia - Фильтры напоминаний</title>
  <link rel="stylesheet" href="file:///${cssFullPath}">
  <style>
    body {
      background-color: #171717;
      color: #EDEDED;
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .app-container {
      max-width: 480px;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <div class="app-container">
    <section class="requests-section" aria-label="Наши совместные напоминания">
      <div class="requests-section__header">
        <div class="requests-section__title-wrap">
          <div class="requests-section__title-row">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="requests-section__title-icon"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            <h2 class="requests-section__title">Напоминания</h2>
          </div>
          <span class="requests-section__subtitle">Забота друг о друге и совместные планы</span>
        </div>
      </div>

      <!-- Color Filter Swatches -->
      <div class="requests-color-filter-bar" role="toolbar" aria-label="Фильтрация напоминаний по цвету">
        <button type="button" class="requests-color-pill requests-color-pill--active">Все цвета</button>
        <button type="button" class="requests-color-swatch-btn" style="background-color: #F4DDE2;" aria-label="Личное / Забота"></button>
        <button type="button" class="requests-color-swatch-btn" style="background-color: #E3EBDD;" aria-label="Дела / Дом"></button>
        <button type="button" class="requests-color-swatch-btn" style="background-color: #F5EACD;" aria-label="Вместе / Свидания"></button>
      </div>

      <!-- 3 Filter Tabs Strictly in 1 Row -->
      <div class="requests-tabs" role="tablist" aria-label="Фильтр напоминаний">
        <button type="button" role="tab" class="requests-tab ${activeTab === 'all' ? 'requests-tab--active' : ''}">
          Активные
        </button>
        <button type="button" role="tab" class="requests-tab ${activeTab === 'for_me' ? 'requests-tab--active' : ''}">
          Для меня
        </button>
        <button type="button" role="tab" class="requests-tab ${activeTab === 'from_me' ? 'requests-tab--active' : ''}">
          От меня
        </button>
      </div>

      <!-- Reminders List -->
      <div class="requests-cards-list">
        <div class="request-card request-card--tinted" style="background-color: rgba(244, 221, 226, 0.12); border-color: rgba(244, 221, 226, 0.28); color: #EDEDED;">
          <button type="button" class="request-card__check-btn" style="border-color: rgba(244, 221, 226, 0.4); background-color: transparent;" aria-label="Отметить выполненным"></button>
          <div class="request-card__body">
            <div class="request-card__top">
              <span class="request-card__title" style="color: #EDEDED;">Купить любимый раф с лавандой</span>
              <span class="request-card__category-icon-pill" style="background-color: rgba(244, 221, 226, 0.18); color: #F4DDE2;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              </span>
            </div>
            <p class="request-card__desc" style="color: rgba(237, 237, 237, 0.8);">По дороге домой захвати тёплый кофе</p>
            <div class="request-card__meta-row">
              <span class="request-card__meta-item" style="color: rgba(237, 237, 237, 0.7);">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="request-card__meta-icon"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Алиса
              </span>
              <span class="request-card__meta-item" style="color: rgba(237, 237, 237, 0.7);">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="request-card__meta-icon"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                Для Марселя
              </span>
              <span class="request-card__meta-item" style="color: rgba(237, 237, 237, 0.7);">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="request-card__meta-icon"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Сегодня · 19:00
              </span>
            </div>
          </div>
        </div>

        <div class="request-card request-card--tinted" style="background-color: rgba(227, 235, 221, 0.12); border-color: rgba(227, 235, 221, 0.28); color: #EDEDED;">
          <button type="button" class="request-card__check-btn" style="border-color: rgba(227, 235, 221, 0.4); background-color: transparent;" aria-label="Отметить выполненным"></button>
          <div class="request-card__body">
            <div class="request-card__top">
              <span class="request-card__title" style="color: #EDEDED;">Забрать посылку из пункта выдачи</span>
              <span class="request-card__category-icon-pill" style="background-color: rgba(227, 235, 221, 0.18); color: #E3EBDD;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
              </span>
            </div>
            <div class="request-card__meta-row">
              <span class="request-card__meta-item" style="color: rgba(237, 237, 237, 0.7);">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="request-card__meta-icon"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Марсель
              </span>
              <span class="request-card__meta-item" style="color: rgba(237, 237, 237, 0.7);">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="request-card__meta-icon"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                Для Марселя
              </span>
              <span class="request-card__meta-item" style="color: rgba(237, 237, 237, 0.7);">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="request-card__meta-icon"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Завтра
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</body>
</html>`;
}

const viewports = [
  { name: '360x640', width: 360, height: 640 },
  { name: '390x844', width: 390, height: 844 },
  { name: '430x932', width: 430, height: 932 },
];

const tempDir = path.resolve('tmp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

for (const vp of viewports) {
  const html = getPageHtml({ activeTab: 'all' });
  const htmlFile = path.resolve(tempDir, `reminders-filters-${vp.name}.html`);
  fs.writeFileSync(htmlFile, html, 'utf8');

  const outImage = path.resolve(ARTIFACT_DIR, `reminders-filters-${vp.name}.png`);

  console.log(`📸 Захват скриншота ${vp.name}...`);
  execFileSync(CHROME_PATH, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    `--window-size=${vp.width},${vp.height}`,
    `--screenshot=${outImage}`,
    `file:///${htmlFile.replace(/\\/g, '/')}`,
  ]);
  console.log(`✅ Сохранено: ${outImage}`);
}

console.log('\n🎉 Все скриншоты успешно созданы!');
