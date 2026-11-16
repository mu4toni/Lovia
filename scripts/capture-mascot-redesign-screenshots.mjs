import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const ARTIFACT_DIR = 'C:\\Users\\marsel\\.gemini\\antigravity\\brain\\aeddcfac-2076-46b4-8b9e-19dc8553ab5f';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const distCssFiles = fs.readdirSync('dist/assets').filter((f) => f.endsWith('.css'));
const cssFileName = distCssFiles[0];
const cssFullPath = path.resolve('dist/assets', cssFileName).replace(/\\/g, '/');

const peekImgPath = path.resolve('src/assets/mascots/bear-peek.png').replace(/\\/g, '/');
const sleepyImgPath = path.resolve('src/assets/mascots/bear-sleepy.png').replace(/\\/g, '/');
const loveImgPath = path.resolve('src/assets/mascots/bear-love.png').replace(/\\/g, '/');

function getHomeHtml(theme = 'light') {
  return `<!DOCTYPE html>
<html lang="ru" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Lovia - Home ${theme}</title>
  <link rel="stylesheet" href="file:///${cssFullPath}">
  <style>
    body {
      background: ${theme === 'dark' ? '#171717' : '#fbf6f0'};
      margin: 0;
      padding: 16px 16px 90px;
      font-family: 'Nunito', -apple-system, BlinkMacSystemFont, 'SF Pro Rounded', 'Segoe UI', Roboto, sans-serif;
      box-sizing: border-box;
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <!-- Header with Peeking Bear Mascot -->
  <header class="home-header" aria-label="Пространство пары">
    <div class="home-header__date-row">
      <svg class="lovia-icon home-header__date-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3.5" y="5" width="17" height="15.5" rx="3.5"></rect>
        <path d="M16 2.8v3.5"></path><path d="M8 2.8v3.5"></path><path d="M3.5 10.2h17"></path>
      </svg>
      <span class="home-header__date-text">Понедельник, 16 ноября</span>
    </div>

    <div class="home-header__card-wrapper">
      <div class="home-header__peeking-mascot">
        <div class="mascot mascot--peek mascot--peek-sway mascot--interactive" style="width: 62px; height: 62px;">
          <img src="file:///${peekImgPath}" alt="Мишка Lovia" class="mascot__img" style="width: 62px; height: 62px;" />
        </div>
      </div>

      <div class="home-header__couple-card" role="button" tabindex="0">
        <!-- Left Column: User Avatar -->
        <div class="home-header__avatar-side home-header__avatar-side--user">
          <div class="home-header__avatar-frame home-header__avatar-frame--user">
            <div class="avatar avatar--lg" style="width: 64px; height: 64px; border-radius: 50%; background: #e3a3b4; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; color: #fff;">
              А
            </div>
          </div>
        </div>

        <!-- Center Column: Couple Names & Progress -->
        <div class="home-header__center-zone">
          <div class="home-header__names-row">
            <span class="home-header__name-text">Алиса</span>
            <span class="home-header__heart-badge">
              <svg class="lovia-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 20.3s-7-4.4-9.2-8.3C1.2 9 2.4 5.5 5.5 4.5c2.4-.8 5 .3 6.5 2.2 1.5-1.9 4.1-3 6.5-2.2 3.1 1 4.3 4.5 2.7 7.5-2.2 3.9-9.2 8.3-9.2 8.3z"></path>
              </svg>
            </span>
            <span class="home-header__name-text">Марсель</span>
          </div>

          <div class="home-header__progress-container">
            <div class="anniversary-progress">
              <div class="anniversary-progress__track">
                <div class="anniversary-progress__fill" style="width: 78%;"></div>
              </div>
            </div>
            <div class="home-header__progress-labels">
              <span class="home-header__progress-year">0 лет</span>
              <span class="home-header__progress-year">1 год</span>
            </div>
          </div>
        </div>

        <!-- Right Column: Partner Avatar -->
        <div class="home-header__avatar-side home-header__avatar-side--partner">
          <div class="home-header__avatar-frame home-header__avatar-frame--partner">
            <div class="avatar avatar--lg" style="width: 64px; height: 64px; border-radius: 50%; background: #da0038; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; color: #fff;">
              М
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- Reminders Section with Sleepy Bear Empty State -->
  <section class="requests-list-section" style="margin-top: 24px;">
    <div class="requests-header">
      <h2 class="requests-title" style="font-size: 20px; font-weight: 700; margin-bottom: 12px; color: var(--text-primary);">Напоминания</h2>
    </div>

    <!-- Filter Tabs (3 in 1 row) -->
    <div class="requests-tabs" style="margin-bottom: 16px;">
      <button type="button" class="requests-tab requests-tab--active">Активные</button>
      <button type="button" class="requests-tab">Для меня</button>
      <button type="button" class="requests-tab">От меня</button>
    </div>

    <!-- Empty State with Sleepy Mascot -->
    <div class="glass-card" style="padding: 24px 16px; text-align: center; display: flex; flex-direction: column; align-items: center;">
      <div class="empty-state__mascot-wrap">
        <div class="mascot mascot--sleepy mascot--sleepy-breathe mascot--interactive" style="width: 120px; height: 120px;">
          <img src="file:///${sleepyImgPath}" alt="Спящий мишка" class="mascot__img" style="width: 120px; height: 120px;" />
        </div>
      </div>
      <h3 style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 8px 0 6px;">Всё сделано, можно отдыхать</h3>
      <p style="font-size: 14px; color: var(--text-secondary); max-width: 280px; margin: 0 auto; line-height: 1.4;">
        У вас пока нет активных напоминаний. Создайте приятное напоминание для партнёра!
      </p>
    </div>
  </section>

  <!-- Bottom Navigation Dock -->
  <nav class="bottom-nav">
    <div class="bottom-nav__dock">
      <a class="bottom-nav__item bottom-nav__item--active" href="#">
        <div class="bottom-nav__icon">
          <svg class="lovia-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 11.2a1.8 1.8 0 01.5-1.2l6-5.4a2.2 2.2 0 013 0l6 5.4a1.8 1.8 0 01.5 1.2V18.5a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 18.5V11.2z"></path>
          </svg>
        </div>
        <span class="bottom-nav__label">Дом</span>
      </a>
      <a class="bottom-nav__item" href="#">
        <div class="bottom-nav__icon">
          <svg class="lovia-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3.5" y="8.5" width="17" height="12" rx="3"></rect>
          </svg>
        </div>
        <span class="bottom-nav__label">Вишлисты</span>
      </a>
      <a class="bottom-nav__item bottom-nav__item--featured" href="#">
        <div class="bottom-nav__icon bottom-nav__icon--featured">
          <svg class="lovia-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
            <path d="M12 20.3s-7-4.4-9.2-8.3C1.2 9 2.4 5.5 5.5 4.5c2.4-.8 5 .3 6.5 2.2 1.5-1.9 4.1-3 6.5-2.2 3.1 1 4.3 4.5 2.7 7.5-2.2 3.9-9.2 8.3-9.2 8.3z"></path>
          </svg>
        </div>
        <span class="bottom-nav__label bottom-nav__label--featured">Отношения</span>
      </a>
      <a class="bottom-nav__item" href="#">
        <div class="bottom-nav__icon">
          <svg class="lovia-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3.5" y="5" width="17" height="15.5" rx="3.5"></rect>
          </svg>
        </div>
        <span class="bottom-nav__label">Свидания</span>
      </a>
      <a class="bottom-nav__item" href="#">
        <div class="bottom-nav__icon">
          <svg class="lovia-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="4.2"></circle>
            <path d="M5 19.5c0-3.6 3.1-5.8 7-5.8s7 2.2 7 5.8"></path>
          </svg>
        </div>
        <span class="bottom-nav__label">Профиль</span>
      </a>
    </div>
  </nav>
</body>
</html>`;
}

function getOnboardingHtml(theme = 'light') {
  return `<!DOCTYPE html>
<html lang="ru" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Lovia - Onboarding ${theme}</title>
  <link rel="stylesheet" href="file:///${cssFullPath}">
  <style>
    body {
      background: ${theme === 'dark' ? '#171717' : '#fbf6f0'};
      margin: 0;
      padding: 24px 16px;
      font-family: 'Nunito', -apple-system, BlinkMacSystemFont, 'SF Pro Rounded', 'Segoe UI', Roboto, sans-serif;
      box-sizing: border-box;
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <div class="onboarding-page" style="padding: 0; background: transparent;">
    <div class="onboarding-container">
      <header class="onboarding-hero">
        <div class="onboarding-hero__mascot">
          <div class="mascot mascot--love mascot--love-breathe mascot--interactive" style="width: 110px; height: 110px;">
            <img src="file:///${loveImgPath}" alt="Радостный мишка с сердечком" class="mascot__img" style="width: 110px; height: 110px;" />
          </div>
        </div>
        <div class="onboarding-hero__badge">
          <span class="onboarding-hero__logo-icon">
            <svg class="lovia-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 20.3s-7-4.4-9.2-8.3C1.2 9 2.4 5.5 5.5 4.5c2.4-.8 5 .3 6.5 2.2 1.5-1.9 4.1-3 6.5-2.2 3.1 1 4.3 4.5 2.7 7.5-2.2 3.9-9.2 8.3-9.2 8.3z"></path>
            </svg>
          </span>
          <span class="onboarding-hero__brand">Lovia</span>
        </div>
        <h1 class="onboarding-hero__title" style="margin-top: 10px; font-size: 24px; font-weight: 800; color: var(--text-primary);">Давайте знакомиться</h1>
        <p class="onboarding-hero__subtitle" style="font-size: 15px; color: var(--text-secondary); margin-top: 4px;">Создадим ваше маленькое общее пространство</p>
      </header>

      <div class="glass-card" style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
        <div>
          <label style="display: block; font-size: 13.5px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">Как вас зовут?</label>
          <div class="input-wrap">
            <input type="text" class="input" value="Алиса" style="width: 100%; height: 48px; border-radius: var(--radius-md); padding: 0 16px; border: 1.5px solid var(--border-subtle); background: var(--bg-surface-elevated); color: var(--text-primary); font-size: 16px;" />
          </div>
        </div>

        <button type="button" class="btn btn--primary btn--full-width" style="height: 50px; font-size: 16px; font-weight: 700;">Создать пространство для двоих</button>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// Generate HTML and capture screenshots with Chrome
const tmpLightHome = path.resolve('tmp_home_light.html');
const tmpDarkHome = path.resolve('tmp_home_dark.html');
const tmpOnbLight = path.resolve('tmp_onb_light.html');

fs.writeFileSync(tmpLightHome, getHomeHtml('light'), 'utf8');
fs.writeFileSync(tmpDarkHome, getHomeHtml('dark'), 'utf8');
fs.writeFileSync(tmpOnbLight, getOnboardingHtml('light'), 'utf8');

const screenshots = [
  { html: tmpLightHome, out: path.join(ARTIFACT_DIR, 'mascot-home-light-390x844.png') },
  { html: tmpDarkHome, out: path.join(ARTIFACT_DIR, 'mascot-home-dark-390x844.png') },
  { html: tmpOnbLight, out: path.join(ARTIFACT_DIR, 'mascot-onboarding-light-390x844.png') },
];

for (const sc of screenshots) {
  const url = `file:///${sc.html.replace(/\\/g, '/')}`;
  console.log(`📸 Снятие скриншота: ${sc.out}`);
  execFileSync(CHROME_PATH, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--window-size=390,844',
    '--force-device-scale-factor=1',
    '--hide-scrollbars',
    `--screenshot=${sc.out}`,
    url,
  ]);
  console.log(`✅ Сохранено: ${sc.out}`);
}

// Clean up temporary HTML files
fs.unlinkSync(tmpLightHome);
fs.unlinkSync(tmpDarkHome);
fs.unlinkSync(tmpOnbLight);

console.log('\n🎉 Все скриншоты успешно созданы в артефактах!');
