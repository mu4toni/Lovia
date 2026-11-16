import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const ARTIFACT_DIR = 'C:\\Users\\marsel\\.gemini\\antigravity\\brain\\aeddcfac-2076-46b4-8b9e-19dc8553ab5f';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const distCssFiles = fs.readdirSync('dist/assets').filter(f => f.endsWith('.css'));
const cssFileName = distCssFiles[0];
const cssFullPath = path.resolve('dist/assets', cssFileName).replace(/\\/g, '/');

function getHtml({ theme = 'dark', isAdvanced = false, hasCategories = true }) {
  const categoriesHtml = hasCategories
    ? `
      <div class="create-category-chips-row" role="radiogroup" aria-label="Выбор категории">
        <button type="button" class="create-cat-chip create-cat-chip--none create-cat-chip--active">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          <span>Без категории</span>
        </button>
        <button type="button" class="create-cat-chip" style="background-color: rgba(218, 0, 56, 0.14); border-color: #da0038; color: #da0038;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          <span class="create-cat-chip__label">Романтика</span>
        </button>
        <button type="button" class="create-cat-chip" style="background-color: rgba(78, 205, 196, 0.14); border-color: #4ecdc4; color: #4ecdc4;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          <span class="create-cat-chip__label">Дом и уют</span>
        </button>
        <button type="button" class="create-cat-chip" style="background-color: rgba(255, 209, 102, 0.14); border-color: #ffd166; color: #ffd166;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/></svg>
          <span class="create-cat-chip__label">Прогулка</span>
        </button>
      </div>
    `
    : `
      <div class="create-categories-empty-hint">
        Категорий пока нет — их можно создать в Профиле
      </div>
    `;

  const advancedHtml = isAdvanced
    ? `
      <div class="create-advanced-drawer">
        <div class="create-form-field">
          <div class="create-form-label-row">
            <label class="create-form-label" for="due-time-input">Точное время (необязательно)</label>
          </div>
          <div class="create-time-row">
            <input id="due-time-input" type="time" value="19:00" class="create-time-input" />
            <div class="create-time-presets">
              <button type="button" class="create-time-preset">10:00</button>
              <button type="button" class="create-time-preset">14:00</button>
              <button type="button" class="create-time-preset create-time-preset--active">19:00</button>
              <button type="button" class="create-time-preset">21:00</button>
            </div>
          </div>
        </div>

        <div class="create-form-field">
          <label class="create-form-label">Приоритет</label>
          <div class="create-urgency-row">
            <button type="button" class="create-urgency-btn">
              <span class="create-urgency-dot create-urgency-dot--low"></span>
              <span>Спокойно</span>
            </button>
            <button type="button" class="create-urgency-btn create-urgency-btn--active">
              <span class="create-urgency-dot create-urgency-dot--medium"></span>
              <span>Важно</span>
            </button>
            <button type="button" class="create-urgency-btn">
              <span class="create-urgency-dot create-urgency-dot--high"></span>
              <span>Срочно</span>
            </button>
          </div>
        </div>

        <div class="input-group">
          <label class="input-label">Подробности</label>
          <textarea class="textarea" rows="2" placeholder="Любые важные детали, пожелания или ссылка..."></textarea>
        </div>

        <div class="input-group">
          <label class="input-label">Приятная благодарность (по желанию)</label>
          <input class="input" type="text" placeholder="Например: С меня вкусный ужин и массаж" />
        </div>
      </div>
    `
    : '';

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
      background: #0d0d0d;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', system-ui, sans-serif;
      overflow: hidden;
    }
    .modal-backdrop {
      animation: none !important;
      position: absolute;
      inset: 0;
    }
    .modal-sheet {
      animation: none !important;
    }
  </style>
</head>
<body>
  <div class="modal-backdrop" role="presentation">
    <div class="modal-sheet" role="dialog" aria-modal="true">
      <div class="modal-sheet__drag-zone">
        <div class="modal-sheet__handle" aria-hidden="true"></div>
        <div class="modal-sheet__header">
          <h2 class="modal-sheet__title">Новое напоминание</h2>
          <button type="button" class="icon-btn icon-btn--ghost icon-btn--sm modal-sheet__close" aria-label="Закрыть">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <div class="modal-sheet__body">
        <form class="create-request-form">
          <div class="create-form-field">
            <label class="create-form-label" for="request-title-input">Что нужно сделать? *</label>
            <input id="request-title-input" class="create-request-title-input" placeholder="Например: Заказать столик на пятницу..." value="Забронировать билеты в театр" />
          </div>

          <div class="create-form-field">
            <div class="deadline-chips-selector">
              <div class="deadline-header-row">
                <label class="create-form-label">Срок выполнения</label>
                <div class="deadline-status-wrap"></div>
              </div>
              <div class="deadline-chips-row deadline-chips-row--two">
                <button type="button" class="deadline-chip">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="deadline-chip__icon"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <span>Сегодня</span>
                </button>
                <button type="button" class="deadline-chip deadline-chip--calendar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="deadline-chip__icon"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <span>Выбрать дату</span>
                </button>
              </div>
            </div>
          </div>

          <div class="create-form-field">
            <div class="create-form-label-row">
              <label class="create-form-label">Категория</label>
            </div>
            ${categoriesHtml}
          </div>

          <div class="create-form-field">
            <label class="create-form-label">Для кого задача</label>
            <div class="create-target-toggle">
              <button type="button" class="create-target-btn create-target-btn--active">Для Рената</button>
              <button type="button" class="create-target-btn">Для меня</button>
              <button type="button" class="create-target-btn">Для нас обоих</button>
            </div>
          </div>

          <div class="create-advanced-section">
            <button type="button" class="create-advanced-toggle">
              <span class="create-advanced-toggle__label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="create-advanced-toggle__icon"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                <span>Дополнительные параметры</span>
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="create-advanced-toggle__chevron"><path d="${isAdvanced ? 'm18 15-6-6-6 6' : 'm6 9 6 6 6-6'}"/></svg>
            </button>
            ${advancedHtml}
          </div>
        </form>
      </div>

      <div class="modal-sheet__footer">
        <div class="create-request-footer">
          <button type="button" class="btn btn--primary btn--full create-request-submit-btn">Создать напоминание</button>
          <button type="button" class="create-request-cancel-link">Отмена</button>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

const previewConfigs = [
  { name: 'modal-390x844-base.png', width: 390, height: 844, isAdvanced: false, hasCategories: true },
  { name: 'modal-390x844-expanded.png', width: 390, height: 844, isAdvanced: true, hasCategories: true },
  { name: 'modal-360x640-base.png', width: 360, height: 640, isAdvanced: false, hasCategories: true },
  { name: 'modal-360x640-expanded.png', width: 360, height: 640, isAdvanced: true, hasCategories: true },
  { name: 'modal-390x844-empty-cats.png', width: 390, height: 844, isAdvanced: false, hasCategories: false },
];

console.log('📸 Генерация скриншотов шторки напоминания в различных разрешениях...\n');

for (const cfg of previewConfigs) {
  const htmlContent = getHtml({ theme: 'dark', isAdvanced: cfg.isAdvanced, hasCategories: cfg.hasCategories });
  const tmpHtmlPath = path.resolve('scripts', `temp-${cfg.name}.html`);
  fs.writeFileSync(tmpHtmlPath, htmlContent, 'utf8');

  const outScreenshotPath = path.resolve(ARTIFACT_DIR, cfg.name);

  try {
    execFileSync(CHROME_PATH, [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--force-device-scale-factor=1',
      `--window-size=${cfg.width},${cfg.height}`,
      `--screenshot=${outScreenshotPath}`,
      `file:///${tmpHtmlPath.replace(/\\/g, '/')}`
    ]);
    console.log(`✅ Скриншот сохранён: ${cfg.name} (${cfg.width}x${cfg.height}) -> ${outScreenshotPath}`);
  } catch (err) {
    console.error(`❌ Ошибка генерации ${cfg.name}:`, err.message);
  } finally {
    if (fs.existsSync(tmpHtmlPath)) fs.unlinkSync(tmpHtmlPath);
  }
}

console.log('\n🎉 Все скриншоты успешно сгенерированы!');
