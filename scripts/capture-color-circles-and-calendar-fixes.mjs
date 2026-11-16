import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const ARTIFACT_DIR = 'C:\\Users\\marsel\\.gemini\\antigravity\\brain\\aeddcfac-2076-46b4-8b9e-19dc8553ab5f';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const distCssFiles = fs.readdirSync('dist/assets').filter((f) => f.endsWith('.css'));
const cssFileName = distCssFiles[0];
const cssFullPath = path.resolve('dist/assets', cssFileName).replace(/\\/g, '/');

function getModalHtml({ theme = 'light' }) {
  return `<!DOCTYPE html>
<html lang="ru" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Lovia - Modal Color Circles (${theme})</title>
  <link rel="stylesheet" href="file:///${cssFullPath}">
  <style>
    body {
      background: ${theme === 'dark' ? '#121212' : '#f0f2f5'};
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .modal-backdrop {
      position: static;
      display: flex;
      width: 100%;
      height: 100vh;
      align-items: flex-end;
      justify-content: center;
      background: ${theme === 'dark' ? 'rgba(0,0,0,0.65)' : 'rgba(23,23,23,0.35)'};
    }
    .modal-sheet {
      animation: none !important;
      transform: none !important;
      max-width: 420px;
    }
  </style>
</head>
<body>
  <div class="modal-backdrop">
    <div class="modal-sheet" role="dialog" aria-modal="true">
      <div class="modal-sheet__drag-zone">
        <div class="modal-sheet__handle"></div>
      </div>
      
      <div class="modal-sheet__header">
        <h2 class="modal-sheet__title">Новое напоминание</h2>
        <button type="button" class="modal-sheet__close" aria-label="Закрыть">✕</button>
      </div>

      <div class="modal-sheet__body">
        <form class="create-request-form">
          <!-- 1. Название -->
          <div class="create-form-field">
            <label class="create-form-label" for="req-title">Что нужно сделать? *</label>
            <input id="req-title" type="text" class="create-request-title-input" value="Купить билеты на выставку" />
          </div>

          <!-- 2. Срок -->
          <div class="create-form-field">
            <div class="deadline-header">
              <label class="create-form-label">Срок выполнения</label>
              <div class="deadline-status-pill">
                <span class="deadline-status-text">Сегодня · 19:30</span>
              </div>
            </div>
            <div class="deadline-quick-row">
              <button type="button" class="deadline-btn deadline-btn--active">Сегодня</button>
              <button type="button" class="deadline-btn">Выбрать дату</button>
            </div>
          </div>

          <!-- 3. Цвет карточки (только цветные кружки без текстовых названий) -->
          <div class="create-form-field">
            <label class="create-form-label">Цвет карточки</label>
            <div class="create-color-dots-row" role="radiogroup" aria-label="Выбор цвета карточки">
              <!-- Сброс / «Без цвета» -->
              <button type="button" role="radio" aria-checked="false" class="create-color-dot-btn create-color-dot-btn--none" title="Без цвета">
                <span class="create-color-dot-slash"></span>
              </button>
              <!-- Цвет 1 (активный с галочкой и акцентным кольцом) -->
              <button type="button" role="radio" aria-checked="true" class="create-color-dot-btn create-color-dot-btn--active" style="background-color: #F4DDE2;" title="Личное / Забота">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A1517" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" class="create-color-dot-check"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <!-- Цвет 2 -->
              <button type="button" role="radio" aria-checked="false" class="create-color-dot-btn" style="background-color: #E3EBDD;" title="Дела / Дом"></button>
              <!-- Цвет 3 -->
              <button type="button" role="radio" aria-checked="false" class="create-color-dot-btn" style="background-color: #F5EACD;" title="Вместе / Свидания"></button>
              <!-- Цвет 4 -->
              <button type="button" role="radio" aria-checked="false" class="create-color-dot-btn" style="background-color: #C83649;" title="Рубиновый"></button>
            </div>
          </div>

          <!-- 4. Для кого задача -->
          <div class="create-form-field">
            <label class="create-form-label">Для кого задача</label>
            <div class="create-target-toggle" role="radiogroup">
              <button type="button" class="create-target-btn create-target-btn--active">Для Алисы</button>
              <button type="button" class="create-target-btn">Для меня</button>
              <button type="button" class="create-target-btn">Для нас обоих</button>
            </div>
          </div>
        </form>
      </div>

      <div class="modal-sheet__footer">
        <div class="create-request-footer">
          <button type="button" class="button button--primary button--full-width create-request-submit-btn">
            Создать напоминание
          </button>
          <button type="button" class="create-request-cancel-link">Отмена</button>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function getHomeHtml({ theme = 'dark' }) {
  return `<!DOCTYPE html>
<html lang="ru" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Lovia - Clean Calendar & Reminders Filter (${theme})</title>
  <link rel="stylesheet" href="file:///${cssFullPath}">
  <style>
    body {
      background: ${theme === 'dark' ? '#171717' : '#F7F6F4'};
      color: ${theme === 'dark' ? '#EDEDED' : '#23191E'};
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .app-container {
      max-width: 420px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
  </style>
</head>
<body>
  <div class="app-container">
    <!-- 1. Shared Calendar (Clean & Compact without bulky filter bar) -->
    <section class="home-calendar" aria-label="Календарь событий">
      <div class="card card--solid home-calendar__card">
        <div class="home-calendar__header">
          <div class="home-calendar__month-wrap">
            <span class="home-calendar__month">Ноябрь 2026</span>
          </div>
          <div class="home-calendar__controls">
            <button type="button" class="home-calendar__nav-btn" aria-label="Предыдущая неделя">‹</button>
            <button type="button" class="home-calendar__today-btn">Сегодня</button>
            <button type="button" class="home-calendar__nav-btn" aria-label="Следующая неделя">›</button>
          </div>
        </div>

        <!-- Weekdays Grid -->
        <div class="home-calendar__grid home-calendar__grid--week">
          <div class="home-calendar__col"><span class="home-calendar__day-name">пн</span><span class="home-calendar__day-number">16</span></div>
          <div class="home-calendar__col home-calendar__col--selected home-calendar__col--today">
            <span class="home-calendar__day-name">вт</span>
            <span class="home-calendar__day-number">17</span>
            <div class="home-calendar__cell-dots"><span class="home-calendar__cell-dot" style="background:#F4DDE2;"></span></div>
          </div>
          <div class="home-calendar__col"><span class="home-calendar__day-name">ср</span><span class="home-calendar__day-number">18</span></div>
          <div class="home-calendar__col"><span class="home-calendar__day-name">чт</span><span class="home-calendar__day-number">19</span></div>
          <div class="home-calendar__col"><span class="home-calendar__day-name">пт</span><span class="home-calendar__day-number">20</span></div>
          <div class="home-calendar__col home-calendar__col--weekend"><span class="home-calendar__day-name">сб</span><span class="home-calendar__day-number">21</span></div>
          <div class="home-calendar__col home-calendar__col--weekend"><span class="home-calendar__day-name">вс</span><span class="home-calendar__day-number">22</span></div>
        </div>

        <!-- Events List for Selected Day (Immediately follows calendar grid) -->
        <div class="home-calendar__events-section">
          <div class="home-calendar__events-header">
            <span class="home-calendar__events-title">Планы на 17 ноября</span>
            <span class="home-calendar__events-count">1 событие</span>
          </div>
          <div class="home-calendar__events-list">
            <div class="home-calendar__event-card home-calendar__event-card--tinted" style="background-color: #F4DDE2; border-color: #e5cbd1; color: #1A1517;">
              <div class="home-calendar__event-info">
                <div class="home-calendar__event-title-row">
                  <span class="home-calendar__event-name" style="color: #1A1517;">Романтический ужин в Trattoria</span>
                </div>
                <div class="home-calendar__event-meta">
                  <span class="home-calendar__event-meta-item" style="color: #4a3b40;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    19:30
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 2. Reminders Section with Tabs + Compact 24-26px Color Dots Filter -->
    <section class="requests-section" aria-label="Напоминания">
      <div class="requests-section__header">
        <div class="requests-section__title-wrap">
          <div class="requests-section__title-row">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" class="requests-section__title-icon"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            <h2 class="requests-section__title">Напоминания</h2>
          </div>
        </div>
      </div>

      <!-- 3 Filter Tabs -->
      <div class="requests-tabs" role="tablist">
        <button type="button" class="requests-tab requests-tab--active">Активные</button>
        <button type="button" class="requests-tab">Для меня</button>
        <button type="button" class="requests-tab">От меня</button>
      </div>

      <!-- Compact 24-26px Color Circles Filter Bar (Harmoniously under tabs) -->
      <div class="requests-color-filter-bar" role="toolbar" aria-label="Фильтрация напоминаний по цвету">
        <button type="button" class="requests-color-all-btn">Все</button>
        <button type="button" class="requests-color-circle requests-color-circle--active" style="background-color: #F4DDE2;" aria-label="Личное / Забота">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1A1517" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <button type="button" class="requests-color-circle" style="background-color: #E3EBDD;" aria-label="Дела / Дом"></button>
        <button type="button" class="requests-color-circle" style="background-color: #F5EACD;" aria-label="Вместе / Свидания"></button>
      </div>

      <!-- Reminders List -->
      <div class="requests-cards-list">
        <div class="request-card request-card--tinted" style="background-color: #F4DDE2; border-color: #e5cbd1; color: #1A1517;">
          <div class="request-card__body">
            <div class="request-card__header-row">
              <span class="request-card__title" style="color: #1A1517;">Заказать столик на пятницу</span>
            </div>
            <div class="request-card__meta">
              <span class="request-card__meta-item" style="color: #4a3b40;">Срок: Сегодня · 19:30</span>
              <span class="request-card__meta-item" style="color: #4a3b40;">Для Алисы</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</body>
</html>`;
}

function captureScreenshot(htmlContent, outputPngName, width = 390, height = 844) {
  const tempHtmlPath = path.resolve(`tmp-${outputPngName}.html`);
  const outputPngPath = path.resolve(ARTIFACT_DIR, outputPngName);

  fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

  try {
    execFileSync(CHROME_PATH, [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      `--window-size=${width},${height}`,
      '--force-device-scale-factor=1',
      '--hide-scrollbars',
      `--screenshot=${outputPngPath}`,
      `file:///${tempHtmlPath.replace(/\\/g, '/')}`,
    ]);
    console.log(`📸 Saved screenshot: ${outputPngName}`);
  } finally {
    if (fs.existsSync(tempHtmlPath)) {
      fs.unlinkSync(tempHtmlPath);
    }
  }
}

console.log('🚀 Generating visual verification screenshots...');
captureScreenshot(getModalHtml({ theme: 'light' }), 'modal-color-circles-light-390x844.png');
captureScreenshot(getModalHtml({ theme: 'dark' }), 'modal-color-circles-dark-390x844.png');
captureScreenshot(getHomeHtml({ theme: 'dark' }), 'home-calendar-requests-dark-390x844.png');
captureScreenshot(getHomeHtml({ theme: 'light' }), 'home-calendar-requests-light-390x844.png');
console.log('✅ All screenshots generated successfully!');
