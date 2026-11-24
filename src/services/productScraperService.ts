/**
 * Client-side Product Scraper Service for Lovia
 *
 * Strict Rule:
 * The image must belong strictly to the exact product page provided by the user.
 * ZERO guesses, ZERO third-party search, ZERO random fallbacks, ZERO demo mockups.
 * If authentic photo cannot be scraped, honestly report error to user.
 */

export interface ScrapeProductResult {
  success: boolean;
  imageUrl?: string;
  title?: string;
  error?: string;
  blockedByProtection?: boolean;
}

// In-memory cache strictly for verified authentic product photos
const scrapeCache = new Map<string, ScrapeProductResult>();

class ProductScraperService {
  private activeControllers = new Map<string, AbortController>();

  /**
   * Проверка валидности URL ссылки
   */
  isValidUrl(rawUrl: string): boolean {
    if (!rawUrl || typeof rawUrl !== 'string') return false;
    let trimmed = rawUrl.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      trimmed = `https://${trimmed}`;
    }

    try {
      const parsed = new URL(trimmed);
      return (
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
        parsed.hostname.includes('.') &&
        !parsed.hostname.startsWith('.') &&
        !parsed.hostname.endsWith('.')
      );
    } catch {
      return false;
    }
  }

  /**
   * Получить метаданные товара непосредственно из страницы товара
   */
  async scrapeProduct(
    rawUrl: string,
    options?: { signal?: AbortSignal }
  ): Promise<ScrapeProductResult> {
    const trimmed = rawUrl.trim();
    if (!this.isValidUrl(trimmed)) {
      return {
        success: false,
        error: 'Пожалуйста, введите корректную ссылку на товар',
      };
    }

    let normalizedUrl = trimmed;
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // 1. Проверка кеша (только успешные проверенные результаты)
    if (scrapeCache.has(normalizedUrl)) {
      return scrapeCache.get(normalizedUrl)!;
    }

    // 2. Отмена предыдущего запроса по этому же URL
    if (this.activeControllers.has(normalizedUrl)) {
      this.activeControllers.get(normalizedUrl)?.abort();
    }
    const controller = new AbortController();
    this.activeControllers.set(normalizedUrl, controller);

    try {
      // 3. Запрос к безопасному серверному эндпоинту
      const response = await fetch(
        `/api/scrape-product?url=${encodeURIComponent(normalizedUrl)}`,
        {
          method: 'GET',
          signal: options?.signal || controller.signal,
        }
      );

      if (!response.ok) {
        let errorMsg = 'Не удалось автоматически получить фотографию этого товара';
        let blockedByProtection = false;
        try {
          const errData = await response.json();
          if (errData?.error) errorMsg = errData.error;
          if (errData?.blockedByProtection) blockedByProtection = true;
        } catch {}
        return {
          success: false,
          error: errorMsg,
          blockedByProtection,
        };
      }

      const data: ScrapeProductResult = await response.json();

      // Только если получен подлинный URL изображения — кэшируем его
      if (data.success && data.imageUrl) {
        scrapeCache.set(normalizedUrl, data);
      }

      return data;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, error: 'Запрос отменён' };
      }

      return {
        success: false,
        error: 'Не удалось автоматически получить фотографию этого товара',
      };
    } finally {
      this.activeControllers.delete(normalizedUrl);
    }
  }

  /**
   * Алиас для совместимости
   */
  async scrapeProductByUrl(
    rawUrl: string,
    options?: { signal?: AbortSignal }
  ): Promise<ScrapeProductResult> {
    return this.scrapeProduct(rawUrl, options);
  }

  /**
   * Отменить все активные запросы
   */
  cancelAll() {
    for (const controller of this.activeControllers.values()) {
      controller.abort();
    }
    this.activeControllers.clear();
  }

  /**
   * Очистить кэш
   */
  clearCache() {
    scrapeCache.clear();
  }
}

export const productScraperService = new ProductScraperService();
