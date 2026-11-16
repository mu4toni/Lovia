import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const ARTIFACT_DIR = 'C:\\Users\\marsel\\.gemini\\antigravity\\brain\\aeddcfac-2076-46b4-8b9e-19dc8553ab5f';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const distCssFiles = fs.readdirSync('dist/assets').filter(f => f.endsWith('.css'));
const cssFileName = distCssFiles[0];
const cssFullPath = path.resolve('dist/assets', cssFileName).replace(/\\/g, '/');

export function getDatesHtml({
  theme = 'dark',
  isBefore = false,
  hasMemories = false,
}) {
  const statsHtml = isBefore
    ? `
      <div class="dates-header__stats" aria-label="Статистика дневника">
        <button type="button" class="dates-header__stat-pill dates-header__stat-pill--dates">
          <div class="dates-header__stat-bg-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="dates-header__stat-pill-icon"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          <span class="dates-header__stat-val">0</span>
          <span class="dates-header__stat-txt">свиданий</span>
        </button>

        <button type="button" class="dates-header__stat-pill dates-header__stat-pill--photos">
          <div class="dates-header__stat-bg-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="dates-header__stat-pill-icon"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
          <span class="dates-header__stat-val">0</span>
          <span class="dates-header__stat-txt">фотографий</span>
        </button>
      </div>
    `
    : `
      <div class="dates-header__stats" aria-label="Статистика дневника">
        <div class="dates-header__stats-card">
          <button type="button" class="dates-header__stat-pill dates-header__stat-pill--dates">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="dates-header__stat-pill-icon"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            <span class="dates-header__stat-val">0</span>
            <span class="dates-header__stat-txt">свиданий</span>
          </button>
          <div class="dates-header__stat-divider" aria-hidden="true"></div>
          <button type="button" class="dates-header__stat-pill dates-header__stat-pill--photos">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="dates-header__stat-pill-icon"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
            <span class="dates-header__stat-val">0</span>
            <span class="dates-header__stat-txt">фотографий</span>
          </button>
        </div>
      </div>
    `;

  const emptyStateHtml = isBefore
    ? `
      <section class="dates-empty-state" aria-label="Нет сохранённых свиданий">
        <div class="dates-empty-state__icon-box" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        </div>
        <h2 class="dates-empty-state__title">Здесь будут храниться ваши маленькие истории</h2>
        <p class="dates-empty-state__desc">Сохраняйте воспоминания о прошедших встречах, прогулках, ужинах и путешествиях</p>
        <button type="button" class="dates-empty-state__btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Сохранить первое воспоминание</span>
        </button>
      </section>
    `
    : `
      <section class="dates-empty-state" aria-label="Нет сохранённых свиданий">
        <div class="dates-empty-state__icon-box" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        </div>
        <h2 class="dates-empty-state__title">Здесь будут храниться ваши маленькие истории</h2>
        <p class="dates-empty-state__desc">Нажмите «+», чтобы сохранить первое воспоминание</p>
      </section>
    `;

  const memoriesHtml = hasMemories
    ? `
      <section class="dates-list" aria-label="Список прошедших свиданий">
        <article class="date-memory-card">
          <div class="date-memory-card__header">
            <div class="date-memory-card__header-left">
              <span class="date-memory-card__date-badge">14 февраля 2026</span>
              <span class="date-memory-card__place-badge">Панорамный ресторан 360</span>
            </div>
            <button type="button" class="date-memory-card__menu-trigger" aria-label="Действия">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
          </div>
          <div class="date-memory-card__content">
            <h3 class="date-memory-card__title">Романтический ужин при свечах</h3>
            <p class="date-memory-card__story">Удивительный вечер с видом на ночной город. Говорили часами, пили кофе и строили планы на весну.</p>
          </div>
          <div class="date-memory-card__footer">
            <span class="date-memory-card__more-link">Подробнее</span>
          </div>
        </article>

        <article class="date-memory-card">
          <div class="date-memory-card__header">
            <div class="date-memory-card__header-left">
              <span class="date-memory-card__date-badge">1 января 2026</span>
              <span class="date-memory-card__place-badge">Заснеженный парк</span>
            </div>
            <button type="button" class="date-memory-card__menu-trigger" aria-label="Действия">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
          </div>
          <div class="date-memory-card__content">
            <h3 class="date-memory-card__title">Первая прогулка нового года</h3>
            <p class="date-memory-card__story">Тихий морозный вечер, горячий чай в термосе и скрип снега под ногами.</p>
          </div>
          <div class="date-memory-card__footer">
            <span class="date-memory-card__more-link">Подробнее</span>
          </div>
        </article>
      </section>
    `
    : emptyStateHtml;

  return `<!DOCTYPE html>
<html lang="ru" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="file:///${cssFullPath}">
  <style>
    body, html {
      margin: 0;
      padding: 0;
      height: 100%;
      width: 100%;
      background: var(--bg-page, #171717);
      color: var(--text-primary, #ffffff);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      overflow-x: hidden;
    }
  </style>
</head>
<body>
  <div class="main-layout">
    <main class="main-content">
      <div class="dates-page">
        <header class="dates-header" aria-label="Шапка дневника свиданий">
          <div class="dates-header__hero">
            <div class="dates-header__titles">
              <div class="dates-header__kicker">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                <span>ДНЕВНИК ИСТОРИИ</span>
              </div>
              <h1 class="dates-header__title">Свидания</h1>
              <p class="dates-header__subtitle">Моменты, которые хочется сохранить</p>
            </div>
            ${statsHtml}
          </div>

          <div class="dates-header__controls">
            <div class="dates-header__years-scroll" role="tablist" aria-label="Фильтр по годам">
              <button type="button" class="dates-header__year-pill dates-header__year-pill--active">Все годы</button>
              <button type="button" class="dates-header__year-pill">2026</button>
            </div>
            <button type="button" class="dates-header__sort-btn" title="Сначала новые">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>
              <span>Сначала новые</span>
            </button>
          </div>
        </header>

        ${memoriesHtml}
      </div>
    </main>

    <!-- Floating Action Button -->
    <div class="bottom-action-wrapper bottom-action-wrapper--floating">
      <button type="button" class="bottom-action-btn bottom-action-btn--floating">
        <span class="bottom-action-btn__icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </span>
        <span class="bottom-action-btn__label">Добавить воспоминание</span>
      </button>
    </div>

    <!-- Bottom Navigation Dock -->
    <nav class="bottom-nav" aria-label="Основная навигация">
      <div class="bottom-nav__dock">
        <a class="bottom-nav__item" href="#home">
          <span class="bottom-nav__icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></span>
          <span class="bottom-nav__label">Дом</span>
        </a>
        <a class="bottom-nav__item" href="#wishlist">
          <span class="bottom-nav__icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/></svg></span>
          <span class="bottom-nav__label">Вишлисты</span>
        </a>
        <a class="bottom-nav__item bottom-nav__item--featured" href="#rel">
          <span class="bottom-nav__icon bottom-nav__icon--featured"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg></span>
          <span class="bottom-nav__label bottom-nav__label--featured">Отношения</span>
        </a>
        <a class="bottom-nav__item bottom-nav__item--active" href="#dates">
          <span class="bottom-nav__icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg></span>
          <span class="bottom-nav__label">Свидания</span>
        </a>
        <a class="bottom-nav__item" href="#profile">
          <span class="bottom-nav__icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
          <span class="bottom-nav__label">Профиль</span>
        </a>
      </div>
    </nav>
  </div>
</body>
</html>`;
}

function capture(name, width, height, isBefore, hasMemories = false) {
  const tmpFile = path.resolve('tmp', `${name}.html`);
  fs.mkdirSync('tmp', { recursive: true });
  fs.writeFileSync(tmpFile, getDatesHtml({ theme: 'dark', isBefore, hasMemories }));

  const outPath = path.resolve(ARTIFACT_DIR, `${name}.png`);
  console.log(`📸 Снимаем ${name} (${width}x${height})...`);
  execFileSync(CHROME_PATH, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    `--window-size=${width},${height}`,
    `--screenshot=${outPath}`,
    `file:///${tmpFile.replace(/\\/g, '/')}`,
  ]);
  console.log(`✅ Сохранено в ${outPath}`);
}

capture('dates-390x844-after', 390, 844, false, false);
capture('dates-360x640-after', 360, 640, false, false);
capture('dates-430x932-after', 430, 932, false, false);
capture('dates-390x844-list-after', 390, 844, false, true);
