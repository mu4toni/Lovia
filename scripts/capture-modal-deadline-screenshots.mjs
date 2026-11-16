import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const ARTIFACT_DIR = 'C:\\Users\\marsel\\.gemini\\antigravity\\brain\\aeddcfac-2076-46b4-8b9e-19dc8553ab5f';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const distCssFiles = fs.readdirSync('dist/assets').filter(f => f.endsWith('.css'));
const cssFileName = distCssFiles[0];
const cssFullPath = path.resolve('dist/assets', cssFileName).replace(/\\/g, '/');

function getModalHtml({ mode = 'none', time = '' }) {
  const isToday = mode === 'today';
  const isCustom = mode === 'custom';

  const statusHtml = mode === 'none'
    ? ''
    : mode === 'today'
    ? `
      <span class="deadline-status-pill deadline-status-pill--active">Срок: Сегодня</span>
      <button type="button" class="deadline-clear-btn" title="Сбросить срок">×</button>
    `
    : `
      <span class="deadline-status-pill deadline-status-pill--active">Срок: 25 декабря${time ? ` · ${time}` : ''}</span>
      <button type="button" class="deadline-clear-btn" title="Сбросить срок">×</button>
    `;

  const customWrapHtml = isCustom
    ? `
      <div class="deadline-custom-wrap">
        <div class="deadline-datepicker-wrap">
          <div class="date-picker date-picker--open">
            <input type="date" value="2026-12-25" class="date-picker__input" />
          </div>
        </div>

        <div class="deadline-time-block">
          <div class="deadline-time-label-row">
            <label class="deadline-time-label" for="deadline-due-time-input">Точное время (необязательно)</label>
            ${time ? '<button type="button" class="deadline-time-clear-btn">Сбросить время</button>' : ''}
          </div>
          <div class="deadline-time-row create-time-row">
            <input id="deadline-due-time-input" type="time" value="${time || '19:00'}" class="deadline-time-input create-time-input" />
            <div class="deadline-time-presets create-time-presets">
              <button type="button" class="deadline-time-preset create-time-preset">10:00</button>
              <button type="button" class="deadline-time-preset create-time-preset">14:00</button>
              <button type="button" class="deadline-time-preset create-time-preset create-time-preset--active deadline-time-preset--active">19:00</button>
              <button type="button" class="deadline-time-preset create-time-preset">21:00</button>
            </div>
          </div>
        </div>
      </div>
    `
    : '';

  return `<!DOCTYPE html>
<html lang="ru" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="file:///${cssFullPath}">
  <style>
    body, html {
      margin: 0; padding: 0; height: 100%; width: 100%;
      background: rgba(0, 0, 0, 0.7);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
  </style>
</head>
<body>
  <div class="modal-backdrop modal-backdrop--open">
    <div class="modal-sheet">
      <div class="modal-sheet__handle"></div>
      <div class="modal-sheet__header">
        <h2 class="modal-sheet__title">Новое напоминание</h2>
        <button type="button" class="modal-sheet__close" aria-label="Закрыть">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="modal-sheet__body">
        <form class="create-request-form">
          <div class="create-form-field">
            <label class="create-form-label" for="request-title-input">Что нужно сделать? *</label>
            <input id="request-title-input" class="create-request-title-input" value="Купить билеты в театр" />
          </div>

          <div class="create-form-field">
            <div class="deadline-chips-selector">
              <div class="deadline-header-row">
                <label class="create-form-label">Срок выполнения</label>
                <div class="deadline-status-wrap">${statusHtml}</div>
              </div>

              <div class="deadline-chips-row deadline-chips-row--two">
                <button type="button" class="deadline-chip ${isToday ? 'deadline-chip--active' : ''}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="deadline-chip__icon"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                  <span>Сегодня</span>
                </button>
                <button type="button" class="deadline-chip deadline-chip--calendar ${isCustom ? 'deadline-chip--active' : ''}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="deadline-chip__icon"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                  <span>${isCustom ? '25 декабря' : 'Выбрать дату'}</span>
                </button>
              </div>

              ${customWrapHtml}
            </div>
          </div>

          <div class="create-form-field">
            <div class="create-form-label-row">
              <label class="create-form-label">Категория</label>
            </div>
            <div class="create-category-chips-row">
              <button type="button" class="create-cat-chip create-cat-chip--none">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                <span>Без категории</span>
              </button>
              <button type="button" class="create-cat-chip create-cat-chip--active" style="background-color: #F4DDE2; border-color: #F4DDE2; color: #171717;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                <span class="create-cat-chip__label">Личное / Забота</span>
              </button>
              <button type="button" class="create-cat-chip" style="background-color: rgba(227, 235, 221, 0.14); border-color: #E3EBDD; color: #E3EBDD;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                <span class="create-cat-chip__label">Дела / Дом</span>
              </button>
              <button type="button" class="create-cat-chip" style="background-color: rgba(245, 234, 205, 0.14); border-color: #F5EACD; color: #F5EACD;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                <span class="create-cat-chip__label">Вместе / Свидания</span>
              </button>
            </div>
          </div>

          <div class="create-form-field">
            <label class="create-form-label">Для кого задача</label>
            <div class="create-target-toggle">
              <button type="button" class="create-target-btn create-target-btn--active">Для партнёра</button>
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="create-advanced-toggle__chevron"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
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

function capture(name, width, height, mode, time) {
  const tmpFile = path.resolve('tmp', `${name}.html`);
  fs.mkdirSync('tmp', { recursive: true });
  fs.writeFileSync(tmpFile, getModalHtml({ mode, time }));

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

capture('modal-deadline-today-390x844', 390, 844, 'today', '');
capture('modal-deadline-custom-390x844', 390, 844, 'custom', '19:00');
