import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const ARTIFACT_DIR = 'C:\\Users\\marsel\\.gemini\\antigravity\\brain\\aeddcfac-2076-46b4-8b9e-19dc8553ab5f';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const distCssFiles = fs.readdirSync('dist/assets').filter((f) => f.endsWith('.css'));
const cssFileName = distCssFiles[0];
const cssFullPath = path.resolve('dist/assets', cssFileName).replace(/\\/g, '/');

function getModalHtml({ theme = 'light', mode = 'custom', time = '19:00' }) {
  const isCustom = mode === 'custom';

  return `<!DOCTYPE html>
<html lang="ru" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Lovia - Modal ${theme}</title>
  <link rel="stylesheet" href="file:///${cssFullPath}">
  <style>
    body {
      background: ${theme === 'dark' ? '#171717' : '#f2f2f2'};
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
          <!-- Название -->
          <div class="create-form-field">
            <label class="create-form-label" for="req-title">Что нужно сделать?</label>
            <input id="req-title" type="text" class="create-request-title-input" value="Купить билеты в театр" />
          </div>

          <!-- Получатель -->
          <div class="create-form-field">
            <label class="create-form-label">Для кого</label>
            <div class="create-target-toggle" role="radiogroup" aria-label="Для кого">
              <button type="button" class="create-target-btn create-target-btn--active">Для Ренаты</button>
              <button type="button" class="create-target-btn">Для меня</button>
              <button type="button" class="create-target-btn">Для нас обоих</button>
            </div>
          </div>

          <!-- Срок выполнения -->
          <div class="create-form-field">
            <div class="deadline-chips-selector">
              <div class="deadline-header-row">
                <label class="create-form-label">Срок выполнения</label>
                <div class="deadline-status-wrap">
                  <span class="deadline-status-pill deadline-status-pill--active">Срок: 25 декабря · 19:00</span>
                  <button type="button" class="deadline-clear-btn" title="Сбросить срок">×</button>
                </div>
              </div>

              <div class="deadline-chips-row deadline-chips-row--two">
                <button type="button" class="deadline-chip">Сегодня</button>
                <button type="button" class="deadline-chip deadline-chip--active">Выбрать дату</button>
              </div>

              ${
                isCustom
                  ? `
              <div class="deadline-custom-wrap">
                <div class="deadline-datepicker-wrap">
                  <div class="date-picker date-picker--open">
                    <div class="date-picker__trigger date-picker__trigger--open">
                      <span class="date-picker__display-text">25 декабря 2026</span>
                    </div>
                  </div>
                </div>

                <div class="deadline-time-block">
                  <div class="deadline-time-label-row">
                    <label class="deadline-time-label" for="deadline-due-time-input">Точное время (необязательно)</label>
                    <button type="button" class="deadline-time-clear-btn">Сбросить время</button>
                  </div>
                  <div class="deadline-time-row">
                    <input id="deadline-due-time-input" type="time" value="${time}" class="deadline-time-input" />
                    <div class="deadline-time-presets">
                      <button type="button" class="deadline-time-preset">10:00</button>
                      <button type="button" class="deadline-time-preset">14:00</button>
                      <button type="button" class="deadline-time-preset deadline-time-preset--active">19:00</button>
                      <button type="button" class="deadline-time-preset">21:00</button>
                    </div>
                  </div>
                </div>
              </div>
              `
                  : ''
              }
            </div>
          </div>

          <!-- Приоритет -->
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
        </form>
      </div>

      <div class="modal-sheet__footer">
        <div class="create-request-footer">
          <button type="button" class="button button--primary button--full-width create-request-submit-btn">
            Создать напоминание
          </button>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function capture(name, theme, width, height) {
  const tmpFile = path.resolve('tmp', `${name}.html`);
  fs.mkdirSync('tmp', { recursive: true });
  fs.writeFileSync(tmpFile, getModalHtml({ theme, mode: 'custom', time: '19:00' }));

  const outPath = path.resolve(ARTIFACT_DIR, `${name}.png`);
  console.log(`📸 Захват ${name} (${theme}, ${width}x${height})...`);
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

capture('modal-light-contrast-390x844', 'light', 390, 844);
capture('modal-dark-contrast-390x844', 'dark', 390, 844);

console.log('\n🎉 Скриншоты светлой и тёмной тем успешно созданы!');
