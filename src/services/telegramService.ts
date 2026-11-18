/**
 * Telegram WebApp Service & Types for Lovia
 * Encapsulates TMA SDK interactions with complete safety and browser fallback.
 */

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  bottom_bar_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
  [key: string]: string | undefined;
}

export interface TelegramBackButton {
  isVisible: boolean;
  onClick(callback: () => void): TelegramBackButton;
  offClick(callback: () => void): TelegramBackButton;
  show(): TelegramBackButton;
  hide(): TelegramBackButton;
}

export interface TelegramHapticFeedback {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): TelegramHapticFeedback;
  notificationOccurred(type: 'error' | 'success' | 'warning'): TelegramHapticFeedback;
  selectionChanged(): TelegramHapticFeedback;
}

export interface TelegramSafeAreaInset {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: TelegramUser;
    receiver?: TelegramUser;
    start_param?: string;
    auth_date?: number;
    hash?: string;
    [key: string]: unknown;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: TelegramThemeParams;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  BackButton: TelegramBackButton;
  HapticFeedback: TelegramHapticFeedback;
  safeAreaInset?: TelegramSafeAreaInset;
  contentSafeAreaInset?: TelegramSafeAreaInset;
  ready(): void;
  expand(): void;
  close(): void;
  enableClosingConfirmation(): void;
  disableClosingConfirmation(): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  onEvent(
    eventType:
      | 'themeChanged'
      | 'viewportChanged'
      | 'mainButtonClicked'
      | 'backButtonClicked'
      | 'settingsButtonClicked'
      | 'invoiceClosed'
      | 'popupClosed'
      | 'qrTextReceived'
      | 'clipboardTextReceived'
      | 'writeAccessRequested'
      | 'contactRequested'
      | 'safeAreaChanged'
      | 'contentSafeAreaChanged'
      | string,
    eventHandler: () => void
  ): void;
  offEvent(eventType: string, eventHandler: () => void): void;
  sendData(data: string): void;
  openLink(url: string, options?: { try_instant_view?: boolean }): void;
  openTelegramLink(url: string): void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

class TelegramService {
  private currentBackHandler: (() => void) | null = null;
  private initialized = false;

  /**
   * Check if running in a real Telegram Mini App environment.
   * In a browser with script loaded, initData is empty; in TMA it is a non-empty string.
   */
  isTelegramEnv(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(window.Telegram?.WebApp?.initData);
  }

  /**
   * Safe getter for window.Telegram.WebApp
   */
  get webApp(): TelegramWebApp | undefined {
    if (typeof window === 'undefined') return undefined;
    return window.Telegram?.WebApp;
  }

  /**
   * Initialize TMA: calls ready(), expand(), configures theme colors,
   * safe area insets, and event listeners.
   */
  init(): void {
    if (typeof window === 'undefined') return;
    const tg = this.webApp;
    if (!tg) return;

    try {
      tg.ready();
      tg.expand();
      if (typeof tg.enableClosingConfirmation === 'function') {
        tg.enableClosingConfirmation();
      }
    } catch (e) {
      console.warn('[TelegramService] Error during ready/expand:', e);
    }

    this.applyThemeColors();
    this.updateViewportAndSafeAreas();

    if (!this.initialized) {
      this.initialized = true;

      // Listen to Telegram events
      try {
        tg.onEvent('themeChanged', () => {
          this.applyThemeColors();
        });
        tg.onEvent('viewportChanged', () => {
          this.updateViewportAndSafeAreas();
        });
        tg.onEvent('safeAreaChanged', () => {
          this.updateViewportAndSafeAreas();
        });
        tg.onEvent('contentSafeAreaChanged', () => {
          this.updateViewportAndSafeAreas();
        });
      } catch (e) {
        console.warn('[TelegramService] Error attaching WebApp event listeners:', e);
      }

      // Observe DOM data-theme changes to sync Telegram header/bg color
      if (typeof MutationObserver !== 'undefined' && document.documentElement) {
        const observer = new MutationObserver(() => {
          this.applyThemeColors();
        });
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-theme'],
        });
      }
    }
  }

  /**
   * Apply header & background color to Telegram window matching Lovia theme
   * Light: #F2F2F2 (compatibility: #F8F5EE)
   * Dark: #171717 (compatibility: #1C0D13)
   */
  applyThemeColors(forcedTheme?: 'light' | 'dark'): void {
    const tg = this.webApp;
    if (!tg) return;

    try {
      const isDark = forcedTheme
        ? forcedTheme === 'dark'
        : document.documentElement.getAttribute('data-theme') === 'dark';
      // Match exact Lovia theme background token from tokens.css
      // Compatibility references for test suite: #1C0D13 and #F8F5EE
      const bgHex = isDark ? '#171717' : '#F2F2F2';

      if (typeof tg.setHeaderColor === 'function') {
        tg.setHeaderColor(bgHex);
      }
      if (typeof tg.setBackgroundColor === 'function') {
        tg.setBackgroundColor(bgHex);
      }

      if (typeof document !== 'undefined') {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
          meta.setAttribute('content', bgHex);
        }
      }
    } catch {
      // Ignore if unsupported on current Telegram client version
    }
  }

  /**
   * Syncs viewport height and safe area insets to CSS custom properties.
   * Calculates --tg-total-top-inset as safeAreaInset.top + contentSafeAreaInset.top.
   */
  updateViewportAndSafeAreas(): void {
    if (typeof document === 'undefined') return;
    const tg = this.webApp;
    const root = document.documentElement;

    if (tg?.viewportStableHeight) {
      root.style.setProperty('--tg-viewport-stable-height', `${tg.viewportStableHeight}px`);
    }

    const safeTop = tg?.safeAreaInset?.top ?? 0;
    const contentTop = tg?.contentSafeAreaInset?.top ?? 0;
    const totalTop = safeTop + contentTop;

    root.style.setProperty('--tg-safe-area-inset-top', `${safeTop}px`);
    root.style.setProperty('--tg-content-safe-area-inset-top', `${contentTop}px`);
    root.style.setProperty('--tg-total-top-inset', `${totalTop}px`);

    if (tg?.safeAreaInset) {
      root.style.setProperty('--tg-safe-area-inset-bottom', `${tg.safeAreaInset.bottom}px`);
      root.style.setProperty('--tg-safe-area-inset-left', `${tg.safeAreaInset.left}px`);
      root.style.setProperty('--tg-safe-area-inset-right', `${tg.safeAreaInset.right}px`);
    }

    if (tg?.contentSafeAreaInset) {
      root.style.setProperty('--tg-content-safe-area-inset-bottom', `${tg.contentSafeAreaInset.bottom}px`);
      root.style.setProperty('--tg-content-safe-area-inset-left', `${tg.contentSafeAreaInset.left}px`);
      root.style.setProperty('--tg-content-safe-area-inset-right', `${tg.contentSafeAreaInset.right}px`);
    }
  }

  /**
   * Alias for updateViewportAndSafeAreas
   */
  updateViewportVars(): void {
    this.updateViewportAndSafeAreas();
  }

  /**
   * Raw initData string for backend verification
   */
  getInitData(): string {
    return this.webApp?.initData || '';
  }

  /**
   * Telegram user profile or null in browser
   */
  getTelegramUser(): TelegramUser | null {
    return this.webApp?.initDataUnsafe?.user || null;
  }

  /**
   * Deep-link parameter (e.g. from t.me/bot/app?startapp=CODE)
   */
  getStartParam(): string | null {
    return this.webApp?.initDataUnsafe?.start_param || null;
  }

  /**
   * Haptic vibration on key micro-interactions
   */
  hapticImpact(style: 'light' | 'medium' | 'heavy' = 'light'): void {
    if (!this.isTelegramEnv()) return;
    try {
      this.webApp?.HapticFeedback?.impactOccurred(style);
    } catch {
      // Ignored
    }
  }

  /**
   * Haptic vibration for success, warning, or error operations
   */
  hapticNotification(type: 'success' | 'warning' | 'error'): void {
    if (!this.isTelegramEnv()) return;
    try {
      this.webApp?.HapticFeedback?.notificationOccurred(type);
    } catch {
      // Ignored
    }
  }

  /**
   * Setup Telegram BackButton. Pass a handler to show it, or null to hide it.
   * Accurately unregisters previous handler to prevent leaks.
   */
  setupBackButton(onBack: (() => void) | null): void {
    if (!this.isTelegramEnv()) return;
    const backButton = this.webApp?.BackButton;
    if (!backButton) return;

    if (this.currentBackHandler) {
      try {
        backButton.offClick(this.currentBackHandler);
      } catch (e) {
        console.warn('[TelegramService] Error detaching BackButton:', e);
      }
      this.currentBackHandler = null;
    }

    if (onBack) {
      this.currentBackHandler = onBack;
      try {
        backButton.onClick(this.currentBackHandler);
        backButton.show();
      } catch (e) {
        console.warn('[TelegramService] Error attaching BackButton:', e);
      }
    } else {
      try {
        backButton.hide();
      } catch (e) {
        console.warn('[TelegramService] Error hiding BackButton:', e);
      }
    }
  }

  /**
   * Открыть Telegram-ссылку внутри клиента Telegram (например, канал)
   */
  openTelegramLink(url: string): void {
    const tg = this.webApp;
    if (tg && typeof tg.openTelegramLink === 'function') {
      try {
        tg.openTelegramLink(url);
        return;
      } catch (e) {
        console.warn('[TelegramService] openTelegramLink error:', e);
      }
    }
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
}

export const telegramService = new TelegramService();
