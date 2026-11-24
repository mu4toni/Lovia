import type { VercelRequest, VercelResponse } from '@vercel/node';
import net from 'net';
import dns from 'dns/promises';

/**
 * Clean realistic desktop User-Agent WITHOUT any "Bot" or "Spider" tokens,
 * to prevent immediate blocking by WAF / Cloudflare / marketplace protections.
 */
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36';

const MAX_HTML_BYTES = 1536 * 1024; // 1.5 MB
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

export interface ScrapeProductResponse {
  success: boolean;
  imageUrl?: string;
  title?: string;
  error?: string;
  blockedByProtection?: boolean;
}

/**
 * Декодирование HTML-сущностей в строках и URL
 * (&amp; -> &, &quot; -> ", etc.), чтобы ссылки с query-параметрами (?w=800&q=80) не ломались.
 */
function decodeHtmlEntities(str?: string): string | undefined {
  if (!str || typeof str !== 'string') return undefined;
  const decoded = str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2F;/gi, '/')
    .replace(/&#x3D;/gi, '=')
    .replace(/&#x26;/gi, '&')
    .trim();
  return decoded || undefined;
}

/**
 * Проверка, является ли IP-адрес приватным, локальным или служебным (SSRF-защита)
 */
function isPrivateIp(ip: string): boolean {
  if (!net.isIP(ip)) return true;

  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    // 0.0.0.0/8
    if (parts[0] === 0) return true;
    // 10.0.0.0/8 (Private-Use Networks)
    if (parts[0] === 10) return true;
    // 100.64.0.0/10 (Carrier-Grade NAT)
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    // 169.254.0.0/16 (Link Local, Cloud metadata AWS/GCP 169.254.169.254)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (Private-Use Networks)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 224.0.0.0/4 (Multicast & reserved)
    if (parts[0] >= 224) return true;
    return false;
  }

  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // Unique local
    if (lower.startsWith('fe80')) return true; // Link local
    // IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1)
    if (lower.startsWith('::ffff:')) {
      const mapped = lower.slice(7);
      if (net.isIPv4(mapped)) return isPrivateIp(mapped);
      return true;
    }
    return false;
  }

  return true;
}

/**
 * Валидация безопасности URL перед выполнением сетевого запроса (SSRF)
 */
async function validateSafeUrl(rawUrl: string): Promise<URL> {
  let normalized = rawUrl.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `https://${normalized}`;
  }

  const url = new URL(normalized);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Поддерживаются только протоколы http и https');
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === '0.0.0.0'
  ) {
    throw new Error('Доступ к внутренним адресам запрещен (SSRF protection)');
  }

  // Проверка прямого IP-адреса
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error('Доступ к приватным IP-адресам запрещен');
    }
    return url;
  }

  // Разрешение DNS и проверка всех полученных IP
  try {
    const records = await dns.lookup(hostname, { all: true });
    if (!records || records.length === 0) {
      throw new Error('Не удалось разрешить имя хоста или адрес недоступен');
    }
    for (const rec of records) {
      if (isPrivateIp(rec.address)) {
        throw new Error(`Доступ к приватному IP (${rec.address}) запрещен`);
      }
    }
  } catch (err: any) {
    if (err.message && err.message.includes('запрещен')) throw err;
    throw new Error('Не удалось разрешить имя хоста или адрес недоступен');
  }

  return url;
}

/**
 * Безопасный fetch с ручной проверкой каждого редиректа через validateSafeUrl (SSRF-защита)
 */
async function fetchWithSafeRedirects(
  initialUrl: URL,
  init: Omit<RequestInit, 'redirect'>,
  maxRedirects = 5
): Promise<{ response: Response; finalUrl: URL }> {
  let currentUrl = initialUrl;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const response = await fetch(currentUrl.href, {
      ...init,
      redirect: 'manual',
    });

    if (
      response.status === 301 ||
      response.status === 302 ||
      response.status === 303 ||
      response.status === 307 ||
      response.status === 308
    ) {
      const location = response.headers.get('location');
      try {
        await response.body?.cancel();
      } catch {}

      if (!location || hop === maxRedirects) {
        return { response, finalUrl: currentUrl };
      }

      const nextUrlStr = new URL(location, currentUrl.href).href;
      currentUrl = await validateSafeUrl(nextUrlStr);
      continue;
    }

    return { response, finalUrl: currentUrl };
  }

  throw new Error('Слишком много перенаправлений');
}

/**
 * Подбор корректного Referer для защищённых CDN маркетплейсов
 */
function getSmartReferer(imageUrl: URL, explicitReferer?: string): string {
  if (explicitReferer) return explicitReferer;
  const host = imageUrl.hostname.toLowerCase();
  if (host.includes('wbbasket.ru') || host.includes('wbstatic.net') || host.includes('wildberries')) {
    return 'https://www.wildberries.ru/';
  }
  if (host.includes('ozone.ru') || host.includes('ozon.ru')) {
    return 'https://www.ozon.ru/';
  }
  if (host.includes('yandex.net') || host.includes('yandex.ru') || host.includes('yastatic.net')) {
    return 'https://market.yandex.ru/';
  }
  if (host.includes('goldapple')) {
    return 'https://goldapple.ru/';
  }
  if (host.includes('lamoda') || host.includes('lmcdn')) {
    return 'https://www.lamoda.ru/';
  }
  if (host.includes('detmir')) {
    return 'https://www.detmir.ru/';
  }
  return `https://${imageUrl.hostname}/`;
}

/**
 * Определение MIME типа по magic bytes (если CDN отдал application/octet-stream)
 */
function sniffImageMime(buf: Uint8Array): string | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  // GIF: GIF8
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif';
  // WebP: RIFF....WEBP
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'image/webp';
  }
  // AVIF / HEIC: ....ftypavif / ....ftypavis
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    const brand = String.fromCharCode(buf[8], buf[9], buf[10], buf[11]);
    if (brand === 'avif' || brand === 'avis' || brand === 'mif1') return 'image/avif';
  }
  return null;
}

/**
 * Режим безопасного проксирования изображений (GET /api/scrape-product?proxyImage=<encodedUrl>)
 * Помогает обойти hotlink/Referer защиту CDN при загрузке превью на клиенте.
 */
async function handleProxyImage(rawImageUrl: string, res: VercelResponse) {
  let safeUrl: URL;
  try {
    safeUrl = await validateSafeUrl(rawImageUrl);
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err?.message || 'Недопустимый URL изображения',
    });
  }

  const doFetch = async (withReferer: boolean) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const headers: Record<string, string> = {
      'User-Agent': BROWSER_USER_AGENT,
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      'Sec-Fetch-Dest': 'image',
      'Sec-Fetch-Mode': 'no-cors',
      'Sec-Fetch-Site': 'cross-site',
    };
    if (withReferer) {
      headers.Referer = getSmartReferer(safeUrl);
    }

    try {
      const result = await fetchWithSafeRedirects(safeUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return result.response;
    } catch (e) {
      clearTimeout(timeout);
      throw e;
    }
  };

  try {
    let upstream = await doFetch(true);
    if (!upstream.ok && (upstream.status === 401 || upstream.status === 403)) {
      try {
        await upstream.body?.cancel();
      } catch {}
      upstream = await doFetch(false);
    }

    if (!upstream.ok) {
      try {
        await upstream.body?.cancel();
      } catch {}
      return res.status(502).json({
        success: false,
        error: `Не удалось загрузить изображение (HTTP ${upstream.status})`,
      });
    }

    const declaredLength = parseInt(upstream.headers.get('content-length') || '0', 10);
    if (declaredLength > MAX_IMAGE_BYTES) {
      try {
        await upstream.body?.cancel();
      } catch {}
      return res.status(413).json({
        success: false,
        error: 'Изображение слишком большое',
      });
    }

    const rawContentType = (upstream.headers.get('content-type') || '').toLowerCase().split(';')[0].trim();
    if (rawContentType.includes('svg') || rawContentType.includes('html') || rawContentType.includes('javascript')) {
      try {
        await upstream.body?.cancel();
      } catch {}
      return res.status(415).json({
        success: false,
        error: 'Недопустимый тип содержимого',
      });
    }

    const reader = upstream.body?.getReader();
    let buffer: Buffer;

    if (!reader) {
      const ab = await upstream.arrayBuffer();
      if (ab.byteLength > MAX_IMAGE_BYTES) {
        return res.status(413).json({ success: false, error: 'Изображение слишком большое' });
      }
      buffer = Buffer.from(ab);
    } else {
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          total += value.length;
          if (total > MAX_IMAGE_BYTES) {
            try {
              await reader.cancel();
            } catch {}
            return res.status(413).json({ success: false, error: 'Изображение слишком большое' });
          }
          chunks.push(value);
        }
      }
      buffer = Buffer.concat(chunks, total);
    }

    const sniffedMime = sniffImageMime(buffer);
    const finalMime =
      rawContentType.startsWith('image/') && !rawContentType.includes('svg')
        ? rawContentType
        : sniffedMime;

    if (!finalMime) {
      return res.status(415).json({
        success: false,
        error: 'Ответ не является изображением',
      });
    }

    res.setHeader('Content-Type', finalMime);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(buffer);
  } catch {
    return res.status(502).json({
      success: false,
      error: 'Ошибка при проксировании изображения',
    });
  }
}

/**
 * Черный список шаблонов для отсева баннеров, логотипов, иконок и заглушек
 */
const BAD_IMAGE_PATTERNS: RegExp[] = [
  /logo/i,
  /logotype/i,
  /favicon/i,
  /icon[s\-_/.]/i,
  /apple-touch-icon/i,
  /banner/i,
  /promo/i,
  /adv[_\-/.]/i,
  /advert/i,
  /teaser/i,
  /placeholder/i,
  /no-photo/i,
  /no_photo/i,
  /no-image/i,
  /no_image/i,
  /stub/i,
  /not-found/i,
  /not_found/i,
  /empty[_\-/.]/i,
  /dummy/i,
  /avatar/i,
  /sprite/i,
  /pixel/i,
  /tracking/i,
  /spacer/i,
  /1x1/i,
  /spinner/i,
  /loading/i,
  /preloader/i,
  /captcha/i,
  /smartcaptcha/i,
  /badge[_\-/.]/i,
  /payment/i,
  /default[-_.]?(image|thumb|pic)?/i,
  /\.svg(\?.*)?$/i,
  /\.ico(\?.*)?$/i,
];

/**
 * Проверка изображения: не является ли оно логотипом, иконкой, заглушкой или баннером
 */
function isBadImage(url?: string): boolean {
  if (!url || typeof url !== 'string') return true;
  const clean = url.trim().toLowerCase();
  if (clean.length < 8) return true;
  if (clean.startsWith('data:') || clean.startsWith('javascript:')) return true;
  return BAD_IMAGE_PATTERNS.some((pattern) => pattern.test(clean));
}

/**
 * Безопасное приведение относительного URL к абсолютному с декодированием HTML-сущностей
 */
function resolveAbsoluteUrl(relOrAbs?: string, baseUrl?: string): string | undefined {
  if (!relOrAbs || typeof relOrAbs !== 'string') return undefined;
  const decoded = decodeHtmlEntities(relOrAbs);
  if (!decoded) return undefined;
  if (decoded.startsWith('data:') || decoded.startsWith('javascript:')) return undefined;
  try {
    const resolved = baseUrl ? new URL(decoded, baseUrl) : new URL(decoded);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return undefined;
    return resolved.href;
  } catch {
    return undefined;
  }
}

/**
 * Очистка заголовка от HTML-сущностей и лишних пробелов
 */
function cleanTitle(title?: string): string | undefined {
  if (!title) return undefined;
  const decoded = decodeHtmlEntities(title);
  if (!decoded) return undefined;
  const res = decoded
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return res || undefined;
}

/**
 * Детектор страниц антибот-защиты / капчи (Cloudflare, Ozon, Яндекс SmartCaptcha, Qrator, DDoS-Guard и т.д.)
 */
function detectAntiBotProtection(
  status: number,
  headers: Headers,
  finalUrl: string,
  html: string
): boolean {
  if (status === 401 || status === 403 || status === 429 || status === 451 || status === 503) {
    return true;
  }

  const cfMitigated = (headers.get('cf-mitigated') || '').toLowerCase();
  if (cfMitigated.includes('challenge')) return true;
  if (headers.get('x-datadome') || headers.get('x-qrator-request-id')) return true;

  const lowerUrl = finalUrl.toLowerCase();
  if (
    lowerUrl.includes('/showcaptcha') ||
    lowerUrl.includes('/captcha') ||
    lowerUrl.includes('/abt/challenge') ||
    lowerUrl.includes('/cdn-cgi/challenge') ||
    lowerUrl.includes('fabrika')
  ) {
    return true;
  }

  const snippet = html.slice(0, 60000).toLowerCase();
  const titleMatch = snippet.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const titleText = (titleMatch?.[1] || '').trim();

  const challengeTitlePatterns = [
    /just a moment/i,
    /attention required/i,
    /access denied/i,
    /antibot/i,
    /доступ ограничен/i,
    /вы не робот/i,
    /подтвердите.*не робот/i,
    /проверка браузера/i,
    /ddos-guard/i,
    /qrator/i,
    /ошибка 403/i,
    /captcha/i,
    /ой!.*робот/i,
  ];
  if (titleText && challengeTitlePatterns.some((re) => re.test(titleText))) {
    return true;
  }

  const challengeBodyPatterns = [
    /\/cdn-cgi\/challenge-platform/i,
    /cf-browser-verification/i,
    /smartcaptcha\.yandexcloud/i,
    /captcha\.yandex/i,
    /abt-challenge/i,
    /ozon\.ru\/abt/i,
    /__qrator/i,
    /ddos-guard\.net/i,
    /px-captcha/i,
    /_incapsula_resource/i,
    /challenges\.cloudflare\.com\/turnstile/i,
    /подтвердите, что запросы отправляли вы/i,
    /мы заметили подозрительную активность/i,
    /включите javascript и cookies/i,
    /checking your browser before accessing/i,
  ];

  return challengeBodyPatterns.some((re) => re.test(snippet));
}

/**
 * Помощник для чтения атрибута внутри HTML-тега
 */
function getAttr(tag: string, attrName: string): string | undefined {
  const re = new RegExp(`(?:^|\\s)${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = tag.match(re);
  return match ? match[1] ?? match[2] ?? match[3] : undefined;
}

/**
 * Извлечение мета-тегов по атрибуту property/name/itemprop
 */
function extractMetaValues(html: string, attrName: 'property' | 'name' | 'itemprop', expectedValues: string[]): string[] {
  const results: string[] = [];
  const lowerExpected = expectedValues.map((v) => v.toLowerCase());
  const metaRegex = /<meta\b[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = metaRegex.exec(html)) !== null) {
    const tag = match[0];
    const key = getAttr(tag, attrName)?.trim().toLowerCase();
    if (!key || !lowerExpected.includes(key)) continue;
    const content = getAttr(tag, 'content');
    if (content && content.trim()) {
      results.push(content.trim());
    }
  }

  return results;
}

/**
 * Рекурсивный поиск объекта Product в Schema.org JSON-LD
 */
function findSchemaProducts(node: any, acc: any[] = []): any[] {
  if (!node || typeof node !== 'object') return acc;

  if (Array.isArray(node)) {
    for (const item of node) {
      findSchemaProducts(item, acc);
    }
    return acc;
  }

  const type = node['@type'];
  const isProduct =
    typeof type === 'string'
      ? type.toLowerCase() === 'product' || type.toLowerCase().endsWith(':product') || type.toLowerCase() === 'productgroup'
      : Array.isArray(type)
      ? type.some((t: any) => String(t).toLowerCase() === 'product' || String(t).toLowerCase() === 'productgroup')
      : false;

  if (isProduct) {
    acc.push(node);
  }

  if (Array.isArray(node['@graph'])) {
    findSchemaProducts(node['@graph'], acc);
  }
  if (node.mainEntity && typeof node.mainEntity === 'object') {
    findSchemaProducts(node.mainEntity, acc);
  }
  if (node.item && typeof node.item === 'object') {
    findSchemaProducts(node.item, acc);
  }

  return acc;
}

/**
 * Извлечение изображений и названия из JSON-LD (@type: Product)
 */
function extractJsonLdProduct(
  html: string,
  baseUrl: string
): { images: string[]; title?: string } {
  const images: string[] = [];
  let title: string | undefined;

  const jsonLdMatches = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );

  for (const match of jsonLdMatches) {
    try {
      const rawJson = match[1].trim();
      if (!rawJson) continue;
      const parsed = JSON.parse(rawJson);
      const products = findSchemaProducts(parsed);

      for (const product of products) {
        if (!title && (product.name || product.headline)) {
          title = cleanTitle(String(product.name || product.headline));
        }

        const rawImages: string[] = [];
        const pushImageField = (field: any) => {
          if (!field) return;
          if (typeof field === 'string') {
            rawImages.push(field);
          } else if (Array.isArray(field)) {
            for (const item of field) {
              pushImageField(item);
            }
          } else if (typeof field === 'object') {
            const u = field.url || field.contentUrl || field.thumbnailUrl;
            if (typeof u === 'string') rawImages.push(u);
          }
        };

        pushImageField(product.image);
        if (product.offers && typeof product.offers === 'object') {
          pushImageField(product.offers.image);
        }

        for (const raw of rawImages) {
          const resolved = resolveAbsoluteUrl(raw, baseUrl);
          if (resolved && !isBadImage(resolved) && !images.includes(resolved)) {
            images.push(resolved);
          }
        }
      }
    } catch {
      // Игнорируем невалидный JSON-LD блок
    }
  }

  return { images, title };
}

/**
 * Выбор URL с наибольшим разрешением из атрибута srcset
 */
function pickBestSrcsetUrl(srcset?: string): string | undefined {
  if (!srcset) return undefined;
  const entries = srcset
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const pieces = part.split(/\s+/);
      const url = pieces[0];
      const descriptor = pieces[1] || '';
      let score = 1;
      if (descriptor.endsWith('w')) {
        score = parseInt(descriptor, 10) || 1;
      } else if (descriptor.endsWith('x')) {
        score = Math.round((parseFloat(descriptor) || 1) * 500);
      }
      return { url, score };
    })
    .filter((entry) => entry.url && !entry.url.startsWith('data:'));

  if (entries.length === 0) return undefined;
  entries.sort((a, b) => b.score - a.score);
  return entries[0].url;
}

/**
 * Извлечение крупных <img> товара из HTML (последний уровень приоритета)
 */
function extractLargeProductImages(html: string, baseUrl: string): string[] {
  const scored: Array<{ url: string; score: number }> = [];
  const seen = new Set<string>();
  const imgRegex = /<img\b[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = imgRegex.exec(html)) !== null) {
    const tag = match[0];
    const widthVal = parseInt(getAttr(tag, 'width') || '0', 10);
    const heightVal = parseInt(getAttr(tag, 'height') || '0', 10);

    // Пропускаем заведомо мелкие картинки (иконки, пиксели, аватары)
    if ((widthVal > 0 && widthVal < 150) || (heightVal > 0 && heightVal < 150)) {
      continue;
    }

    const rawCandidate =
      getAttr(tag, 'data-zoom-image') ||
      getAttr(tag, 'data-large-image') ||
      getAttr(tag, 'data-original') ||
      pickBestSrcsetUrl(getAttr(tag, 'data-srcset')) ||
      pickBestSrcsetUrl(getAttr(tag, 'srcset')) ||
      getAttr(tag, 'data-src') ||
      getAttr(tag, 'data-lazy-src') ||
      getAttr(tag, 'src');

    const resolved = resolveAbsoluteUrl(rawCandidate, baseUrl);
    if (!resolved || isBadImage(resolved) || seen.has(resolved)) continue;
    seen.add(resolved);

    let score = 0;
    if (widthVal >= 300 || heightVal >= 300) score += 45;
    else if (widthVal >= 200 || heightVal >= 200) score += 25;

    const lowerTag = tag.toLowerCase();
    const lowerUrl = resolved.toLowerCase();

    if (/itemprop=["']image["']/.test(lowerTag)) score += 60;
    if (/(product|gallery|goods|pdp|card|slider|carousel|main-image|photo|zoom|picture)/.test(lowerTag)) {
      score += 35;
    }
    if (/(wc1000|wc800|orig|big|large|1000x|800x|1200x|product|goods|catalog|multimedia)/.test(lowerUrl)) {
      score += 25;
    }
    if (/\.(webp|jpe?g|png|avif)(\?|$)/i.test(lowerUrl)) {
      score += 10;
    }
    if (/(thumb|small|mini|tiny|xs_|50x50|64x64|100x100)/.test(lowerUrl)) {
      score -= 30;
    }

    if (score >= 10) {
      scored.push({ url: resolved, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 6).map((item) => item.url);
}

interface ImageCandidate {
  url: string;
  highConfidence: boolean;
}

/**
 * Извлечение кандидатов картинок в строгом порядке приоритета:
 * 1. og:image:secure_url
 * 2. og:image (и og:image:url)
 * 3. twitter:image (и twitter:image:src)
 * 4. JSON-LD (@type: Product -> image)
 * 5. link[rel="image_src"]
 * 6. itemprop="image" (<meta>, <link>, <img>)
 * 7. Крупный <img> товара
 */
function extractProductMetadata(
  html: string,
  baseUrl: string
): { candidates: ImageCandidate[]; title?: string } {
  const candidates: ImageCandidate[] = [];
  const seen = new Set<string>();

  const addRawCandidate = (raw: string | undefined, highConfidence: boolean) => {
    if (!raw) return;
    const resolved = resolveAbsoluteUrl(raw, baseUrl);
    if (!resolved || isBadImage(resolved) || seen.has(resolved)) return;
    seen.add(resolved);
    candidates.push({ url: resolved, highConfidence });
  };

  // 1. og:image:secure_url
  for (const val of [
    ...extractMetaValues(html, 'property', ['og:image:secure_url']),
    ...extractMetaValues(html, 'name', ['og:image:secure_url']),
  ]) {
    addRawCandidate(val, true);
  }

  // 2. og:image / og:image:url
  for (const val of [
    ...extractMetaValues(html, 'property', ['og:image', 'og:image:url']),
    ...extractMetaValues(html, 'name', ['og:image', 'og:image:url']),
  ]) {
    addRawCandidate(val, true);
  }

  // 3. twitter:image / twitter:image:src
  for (const val of [
    ...extractMetaValues(html, 'name', ['twitter:image', 'twitter:image:src']),
    ...extractMetaValues(html, 'property', ['twitter:image', 'twitter:image:src']),
  ]) {
    addRawCandidate(val, true);
  }

  // 4. JSON-LD (@type: Product -> image)
  const jsonLd = extractJsonLdProduct(html, baseUrl);
  for (const img of jsonLd.images) {
    if (!seen.has(img)) {
      seen.add(img);
      candidates.push({ url: img, highConfidence: true });
    }
  }

  // 5. link[rel="image_src"]
  const linkRegex = /<link\b[^>]*>/gi;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const tag = linkMatch[0];
    const rel = getAttr(tag, 'rel')?.toLowerCase() || '';
    if (rel === 'image_src') {
      addRawCandidate(getAttr(tag, 'href'), true);
    }
  }

  // 6. itemprop="image" (<meta>, <link>, <img>)
  for (const val of extractMetaValues(html, 'itemprop', ['image'])) {
    addRawCandidate(val, true);
  }
  const itempropTagRegex = /<(?:link|img)\b[^>]*itemprop\s*=\s*["']image["'][^>]*>/gi;
  let itemMatch: RegExpExecArray | null;
  while ((itemMatch = itempropTagRegex.exec(html)) !== null) {
    const tag = itemMatch[0];
    const val =
      getAttr(tag, 'href') ||
      getAttr(tag, 'content') ||
      getAttr(tag, 'data-src') ||
      pickBestSrcsetUrl(getAttr(tag, 'srcset')) ||
      getAttr(tag, 'src');
    addRawCandidate(val, true);
  }

  // 7. Крупный <img> товара
  const largeImgs = extractLargeProductImages(html, baseUrl);
  for (const img of largeImgs) {
    if (!seen.has(img)) {
      seen.add(img);
      candidates.push({ url: img, highConfidence: false });
    }
  }

  // Заголовок товара
  const ogTitle =
    extractMetaValues(html, 'property', ['og:title'])[0] ||
    extractMetaValues(html, 'name', ['twitter:title'])[0];
  const htmlTitleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = cleanTitle(jsonLd.title || ogTitle || htmlTitleMatch?.[1]);

  return { candidates, title };
}

/**
 * Актуальная таблица диапазонов vol -> basket-XX.wbbasket.ru для Wildberries
 */
function getWbBasket(vol: number): string {
  if (vol >= 0 && vol <= 143) return '01';
  if (vol >= 144 && vol <= 287) return '02';
  if (vol >= 288 && vol <= 431) return '03';
  if (vol >= 432 && vol <= 719) return '04';
  if (vol >= 720 && vol <= 1007) return '05';
  if (vol >= 1008 && vol <= 1061) return '06';
  if (vol >= 1062 && vol <= 1115) return '07';
  if (vol >= 1116 && vol <= 1169) return '08';
  if (vol >= 1170 && vol <= 1313) return '09';
  if (vol >= 1314 && vol <= 1601) return '10';
  if (vol >= 1602 && vol <= 1655) return '11';
  if (vol >= 1656 && vol <= 1919) return '12';
  if (vol >= 1920 && vol <= 2045) return '13';
  if (vol >= 2046 && vol <= 2189) return '14';
  if (vol >= 2190 && vol <= 2405) return '15';
  if (vol >= 2406 && vol <= 2621) return '16';
  if (vol >= 2622 && vol <= 2837) return '17';
  if (vol >= 2838 && vol <= 3053) return '18';
  if (vol >= 3054 && vol <= 3269) return '19';
  if (vol >= 3270 && vol <= 3485) return '20';
  if (vol >= 3486 && vol <= 3701) return '21';
  if (vol >= 3702 && vol <= 3917) return '22';
  if (vol >= 3918 && vol <= 4133) return '23';
  if (vol >= 4134 && vol <= 4349) return '24';
  if (vol >= 4350 && vol <= 4565) return '25';
  if (vol >= 4566 && vol <= 4877) return '26';
  if (vol >= 4878 && vol <= 5189) return '27';
  if (vol >= 5190 && vol <= 5501) return '28';
  if (vol >= 5502 && vol <= 5813) return '29';
  if (vol >= 5814 && vol <= 6125) return '30';
  if (vol >= 6126 && vol <= 6437) return '31';
  if (vol >= 6438 && vol <= 6749) return '32';
  if (vol >= 6750 && vol <= 7061) return '33';
  if (vol >= 7062 && vol <= 7373) return '34';
  if (vol >= 7374 && vol <= 7685) return '35';
  if (vol >= 7686 && vol <= 7997) return '36';
  if (vol >= 7998 && vol <= 8309) return '37';
  if (vol >= 8310 && vol <= 8621) return '38';

  const basketNum = Math.floor((vol - 4566) / 312) + 26;
  return String(Math.max(1, basketNum)).padStart(2, '0');
}

/**
 * Список корзин-кандидатов для быстрого резервного перебора Wildberries
 * (покрывает и 312-шаговую, и 216-шаговую формулу, плюс ближайших соседей)
 */
function getWbBasketCandidates(vol: number): string[] {
  const primary = parseInt(getWbBasket(vol), 10);
  const alt216 = vol > 4565 ? Math.floor((vol - 2838) / 216) + 18 : primary;

  const order: number[] = [
    primary,
    alt216,
    primary + 1,
    primary - 1,
    primary + 2,
    primary - 2,
    alt216 + 1,
    alt216 - 1,
    primary + 3,
    primary - 3,
    primary + 4,
    primary - 4,
    primary + 5,
    primary - 5,
    primary + 6,
    primary - 6,
  ];

  // Добавляем верхние актуальные корзины на случай сдвига границ у свежих товаров
  if (vol > 4500) {
    for (let n = 26; n <= 45; n++) {
      order.push(n);
    }
  } else {
    for (let n = 1; n <= 26; n++) {
      order.push(n);
    }
  }

  const candidates: string[] = [];
  for (const n of order) {
    if (n >= 1 && n <= 60) {
      const pad = String(n).padStart(2, '0');
      if (!candidates.includes(pad)) {
        candidates.push(pad);
      }
    }
  }

  return candidates;
}

function isWildberriesHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === 'wb.ru' ||
    h.endsWith('.wb.ru') ||
    h.includes('wildberries.ru') ||
    h.includes('wildberries.by') ||
    h.includes('wildberries.kz') ||
    h.includes('wildberries.am') ||
    h.includes('wildberries.kg') ||
    h.includes('wildberries.uz')
  );
}

/**
 * Извлечение артикула Wildberries из URL
 */
function extractWildberriesArticle(url: URL): number | null {
  if (!isWildberriesHost(url.hostname)) return null;

  const pathMatch = url.pathname.match(/\/(?:catalog|product|item|c)\/(\d{5,12})/i);
  if (pathMatch) {
    const id = parseInt(pathMatch[1], 10);
    if (!isNaN(id) && id > 0) return id;
  }

  // Короткий путь вида /123456789 или /123456789/detail.aspx
  const directPathMatch = url.pathname.match(/^\/(\d{6,12})(?:\/|$)/);
  if (directPathMatch) {
    const id = parseInt(directPathMatch[1], 10);
    if (!isNaN(id) && id > 0) return id;
  }

  const queryNm =
    url.searchParams.get('nm') ||
    url.searchParams.get('article') ||
    url.searchParams.get('card') ||
    url.searchParams.get('id');
  if (queryNm && /^\d{5,12}$/.test(queryNm)) {
    const id = parseInt(queryNm, 10);
    if (!isNaN(id) && id > 0) return id;
  }

  return null;
}

/**
 * Разворачивание коротких ссылок Wildberries (wb.ru / wildberries.ru/s/...) до артикула nmId
 */
async function resolveWildberriesArticle(url: URL): Promise<number | null> {
  const direct = extractWildberriesArticle(url);
  if (direct) return direct;
  if (!isWildberriesHost(url.hostname)) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const { response, finalUrl } = await fetchWithSafeRedirects(
      url,
      {
        method: 'GET',
        headers: {
          'User-Agent': BROWSER_USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
          'Accept-Language': 'ru-RU,ru;q=0.9',
        },
        signal: controller.signal,
      },
      6
    );
    clearTimeout(timeout);

    const fromFinalUrl = extractWildberriesArticle(finalUrl);
    if (fromFinalUrl) {
      try {
        await response.body?.cancel();
      } catch {}
      return fromFinalUrl;
    }

    // Иногда короткая ссылка делает JS/meta-редирект в теле HTML
    const text = (await response.text()).slice(0, 64 * 1024);
    const htmlMatch =
      text.match(/wildberries\.[a-z]+\/catalog\/(\d{5,12})/i) ||
      text.match(/["']nmId["']\s*:\s*(\d{5,12})/i);
    if (htmlMatch) {
      const id = parseInt(htmlMatch[1], 10);
      if (!isNaN(id) && id > 0) return id;
    }
  } catch {}

  return null;
}

type VerifyStatus = 'ok' | 'blocked' | 'not_found';

/**
 * Проверка доступности изображения по HTTP.
 * Возвращает 'ok', 'blocked' (403/429 от CDN датацентра) или 'not_found'.
 */
async function verifyImageAccessible(imageUrl: string, referer?: string): Promise<VerifyStatus> {
  try {
    const safeUrl = await validateSafeUrl(imageUrl);
    const effectiveReferer = getSmartReferer(safeUrl, referer);

    const makeHeaders = (withReferer: boolean): Record<string, string> => {
      const h: Record<string, string> = {
        'User-Agent': BROWSER_USER_AGENT,
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
      };
      if (withReferer) h.Referer = effectiveReferer;
      return h;
    };

    const looksLikeImageResponse = (res: Response) => {
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (ct.includes('text/html') || ct.includes('application/json') || ct.includes('svg')) {
        return false;
      }
      return (
        ct.startsWith('image/') ||
        ct.includes('octet-stream') ||
        /\.(jpe?g|png|webp|avif|gif)(\?.*)?$/i.test(safeUrl.pathname)
      );
    };

    // 1. Быстрый HEAD с Referer
    const headCtrl = new AbortController();
    const headTimeout = setTimeout(() => headCtrl.abort(), 2800);
    let shouldTryGet = false;
    let sawBlocked = false;

    try {
      const { response: headRes } = await fetchWithSafeRedirects(safeUrl, {
        method: 'HEAD',
        headers: makeHeaders(true),
        signal: headCtrl.signal,
      });
      clearTimeout(headTimeout);

      if (headRes.ok) {
        return looksLikeImageResponse(headRes) ? 'ok' : 'not_found';
      }
      if (headRes.status === 404 || headRes.status === 410) {
        return 'not_found';
      }
      if (headRes.status === 401 || headRes.status === 403 || headRes.status === 429) {
        sawBlocked = true;
        shouldTryGet = true;
      } else if (headRes.status === 405 || headRes.status === 501 || headRes.status === 400) {
        shouldTryGet = true;
      }
    } catch {
      clearTimeout(headTimeout);
      shouldTryGet = true;
    }

    if (!shouldTryGet) {
      return sawBlocked ? 'blocked' : 'not_found';
    }

    // 2. Fallback GET (сначала с Referer, при 403 — без Referer)
    for (const withRef of [true, false]) {
      const getCtrl = new AbortController();
      const getTimeout = setTimeout(() => getCtrl.abort(), 3200);
      try {
        const { response: getRes } = await fetchWithSafeRedirects(safeUrl, {
          method: 'GET',
          headers: {
            ...makeHeaders(withRef),
            Range: 'bytes=0-1023',
          },
          signal: getCtrl.signal,
        });
        clearTimeout(getTimeout);

        try {
          await getRes.body?.cancel();
        } catch {}

        if (getRes.ok || getRes.status === 206) {
          return looksLikeImageResponse(getRes) ? 'ok' : 'not_found';
        }
        if (getRes.status === 404 || getRes.status === 410) {
          return 'not_found';
        }
        if (getRes.status === 401 || getRes.status === 403 || getRes.status === 429) {
          sawBlocked = true;
          continue;
        }
      } catch {
        clearTimeout(getTimeout);
      }
    }

    return sawBlocked ? 'blocked' : 'not_found';
  } catch {
    return 'not_found';
  }
}

/**
 * Прямой запрос card.json с wbbasket.ru без зависимости от рендера HTML
 */
async function probeWbCardJson(
  basket: string,
  vol: number,
  part: number,
  nmId: number
): Promise<{ basket: string; title?: string; photoCount: number } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2400);

  try {
    const cardUrl = `https://basket-${basket}.wbbasket.ru/vol${vol}/part${part}/${nmId}/info/ru/card.json`;
    const res = await fetch(cardUrl, {
      method: 'GET',
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        Accept: 'application/json',
        Referer: `https://www.wildberries.ru/catalog/${nmId}/detail.aspx`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      try {
        await res.body?.cancel();
      } catch {}
      return null;
    }

    const data: any = await res.json();
    const rawName =
      data?.imt_name ||
      [data?.selling?.brand_name, data?.subj_name].filter(Boolean).join(' — ') ||
      data?.subj_name;
    const photoCount = Number(data?.media?.photo_count ?? 1);

    return {
      basket,
      title: cleanTitle(typeof rawName === 'string' ? rawName : undefined),
      photoCount: isNaN(photoCount) ? 1 : photoCount,
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

/**
 * Получение резервного названия товара Wildberries через card.wb.ru
 */
async function fetchWbDetailTitle(nmId: number): Promise<string | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2800);
  try {
    const apiUrl = `https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=-1257786&spp=30&nm=${nmId}`;
    const apiRes = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (apiRes.ok) {
      const json: any = await apiRes.json();
      const product = json?.data?.products?.[0];
      if (product && Number(product.id) === nmId) {
        return cleanTitle(product.name);
      }
    }
  } catch {
    clearTimeout(timeout);
  }
  return undefined;
}

/**
 * Специализированный адаптер для Wildberries:
 * 1. Разворачивает короткие ссылки wb.ru / wildberries.ru
 * 2. Ищет точную корзину через card.json (таблица диапазонов + параллельный перебор соседей)
 * 3. Возвращает проверенное фото и название товара без рендера HTML
 */
async function tryWildberriesDirect(url: URL): Promise<ScrapeProductResponse | null> {
  const nmId = await resolveWildberriesArticle(url);
  if (!nmId) return null;

  const vol = Math.floor(nmId / 100000);
  const part = Math.floor(nmId / 1000);
  const pageReferer = `https://www.wildberries.ru/catalog/${nmId}/detail.aspx`;
  const candidates = getWbBasketCandidates(vol);

  // Параллельно запускаем получение резервного заголовка из card.wb.ru
  const fallbackTitlePromise = fetchWbDetailTitle(nmId);

  // 1. Сначала пробуем основную корзину через card.json
  let foundCard = await probeWbCardJson(candidates[0], vol, part, nmId);

  // 2. Если основная корзина не подошла — параллельный поиск по соседним корзинам батчами по 6
  if (!foundCard) {
    const remaining = candidates.slice(1, 25);
    const batchSize = 6;
    for (let i = 0; i < remaining.length; i += batchSize) {
      const batch = remaining.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((basket) => probeWbCardJson(basket, vol, part, nmId))
      );
      const hit = batchResults.find((item) => item !== null);
      if (hit) {
        foundCard = hit;
        break;
      }
    }
  }

  if (foundCard) {
    const title = foundCard.title || (await fallbackTitlePromise);
    const imageVariants = [
      `https://basket-${foundCard.basket}.wbbasket.ru/vol${vol}/part${part}/${nmId}/images/big/1.webp`,
      `https://basket-${foundCard.basket}.wbbasket.ru/vol${vol}/part${part}/${nmId}/images/big/1.jpg`,
      `https://basket-${foundCard.basket}.wbbasket.ru/vol${vol}/part${part}/${nmId}/images/c516x688/1.webp`,
    ];

    for (const imgUrl of imageVariants) {
      const status = await verifyImageAccessible(imgUrl, pageReferer);
      if (status === 'ok' || status === 'blocked') {
        return {
          success: true,
          imageUrl: imgUrl,
          title,
        };
      }
    }

    // Если card.json подтвердил наличие фото, возвращаем big/1.webp даже при строгом CDN
    if (foundCard.photoCount > 0) {
      return {
        success: true,
        imageUrl: imageVariants[0],
        title,
      };
    }
  }

  // 3. Резерв: если card.json недоступен, проверяем images/big/1.webp напрямую батчами
  const title = await fallbackTitlePromise;
  const directCandidates = candidates.slice(0, 12);
  const batchSize = 6;

  for (let i = 0; i < directCandidates.length; i += batchSize) {
    const batch = directCandidates.slice(i, i + batchSize);
    const checks = await Promise.all(
      batch.map(async (basket) => {
        const webp = `https://basket-${basket}.wbbasket.ru/vol${vol}/part${part}/${nmId}/images/big/1.webp`;
        const status = await verifyImageAccessible(webp, pageReferer);
        if (status === 'ok') return webp;
        const jpg = `https://basket-${basket}.wbbasket.ru/vol${vol}/part${part}/${nmId}/images/big/1.jpg`;
        const jpgStatus = await verifyImageAccessible(jpg, pageReferer);
        if (jpgStatus === 'ok') return jpg;
        return null;
      })
    );
    const hitUrl = checks.find((u) => u !== null);
    if (hitUrl) {
      return {
        success: true,
        imageUrl: hitUrl,
        title,
      };
    }
  }

  return null;
}

/**
 * Чтение HTML с ограничением объёма памяти
 */
async function readHtmlBounded(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    return text.slice(0, MAX_HTML_BYTES);
  }

  const chunks: Uint8Array[] = [];
  let bytesReceived = 0;

  while (bytesReceived < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      bytesReceived += value.length;
    }
  }

  try {
    await reader.cancel();
  } catch {}

  const decoder = new TextDecoder('utf-8');
  const totalBuffer = new Uint8Array(bytesReceived);
  let offset = 0;
  for (const chunk of chunks) {
    totalBuffer.set(chunk, offset);
    offset += chunk.length;
  }
  return decoder.decode(totalBuffer);
}

/**
 * Безопасный серверный скрейпинг страницы товара
 */
async function scrapeProductUrl(rawUrl: string): Promise<ScrapeProductResponse> {
  try {
    const initialSafeUrl = await validateSafeUrl(rawUrl);

    // 1. Быстрый прямой путь для Wildberries (включая короткие ссылки wb.ru)
    try {
      const wbResult = await tryWildberriesDirect(initialSafeUrl);
      if (wbResult && wbResult.success && wbResult.imageUrl) {
        return wbResult;
      }
    } catch {}

    // 2. Загрузка страницы с реалистичными заголовками браузера и проверкой SSRF на редиректах
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const headers: Record<string, string> = {
      'User-Agent': BROWSER_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
      'Sec-Ch-Ua': '"Chromium";v="134", "Not:A-Brand";v="24"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    };

    let response: Response;
    let finalSafeUrl: URL;
    try {
      const fetched = await fetchWithSafeRedirects(initialSafeUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      response = fetched.response;
      finalSafeUrl = fetched.finalUrl;
    } catch {
      clearTimeout(timeoutId);
      return {
        success: false,
        error: 'Не удалось загрузить страницу товара (сервер не ответил или ограничил доступ)',
      };
    }

    clearTimeout(timeoutId);

    // Если сторонняя короткая ссылка (clck.ru / t.me / и т.д.) перенаправила на Wildberries —
    // сразу используем прямой WB-адаптер вместо SPA-HTML
    if (isWildberriesHost(finalSafeUrl.hostname)) {
      try {
        await response.body?.cancel();
      } catch {}
      const wbAfterRedirect = await tryWildberriesDirect(finalSafeUrl);
      if (wbAfterRedirect && wbAfterRedirect.success && wbAfterRedirect.imageUrl) {
        return wbAfterRedirect;
      }
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();

    // Прямая ссылка на изображение
    if (response.ok && contentType.startsWith('image/') && !contentType.includes('svg')) {
      try {
        await response.body?.cancel();
      } catch {}
      if (!isBadImage(finalSafeUrl.href)) {
        return {
          success: true,
          imageUrl: finalSafeUrl.href,
        };
      }
      return {
        success: false,
        error: 'Не удалось автоматически получить фотографию этого товара',
      };
    }

    // Если магазин вернул 401/403/429/451/503 — проверяем защиту и честно сообщаем пользователю
    if (!response.ok) {
      let errHtml = '';
      try {
        if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) {
          errHtml = await readHtmlBounded(response);
        } else {
          await response.body?.cancel();
        }
      } catch {}

      const isProtected = detectAntiBotProtection(
        response.status,
        response.headers,
        finalSafeUrl.href,
        errHtml
      );

      if (isProtected) {
        return {
          success: false,
          blockedByProtection: true,
          error:
            'Магазин защищён от автозагрузки фото (антибот/капча). Нажмите «Загрузить фото с устройства» ниже.',
        };
      }

      return {
        success: false,
        error: `Магазин вернул статус ${response.status}. Попробуйте загрузить фото с устройства.`,
      };
    }

    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      try {
        await response.body?.cancel();
      } catch {}
      return {
        success: false,
        error: 'Не удалось автоматически получить фотографию этого товара',
      };
    }

    const html = await readHtmlBounded(response);
    const { candidates, title } = extractProductMetadata(html, finalSafeUrl.href);

    if (candidates.length === 0) {
      const isProtected = detectAntiBotProtection(
        response.status,
        response.headers,
        finalSafeUrl.href,
        html
      );

      if (isProtected) {
        return {
          success: false,
          blockedByProtection: true,
          error:
            'Сайт защищён от автозагрузки (антибот/капча). Нажмите «Загрузить фото с устройства» ниже.',
        };
      }

      return {
        success: false,
        title,
        error: 'Не удалось автоматически найти фото товара на странице',
      };
    }

    // Проверяем кандидатов в строгом порядке приоритета
    let blockedHighConfidenceFallback: string | undefined;

    for (const candidate of candidates.slice(0, 6)) {
      const status = await verifyImageAccessible(candidate.url, finalSafeUrl.href);
      if (status === 'ok') {
        return {
          success: true,
          imageUrl: candidate.url,
          title,
        };
      }
      if (status === 'blocked' && candidate.highConfidence && !blockedHighConfidenceFallback) {
        blockedHighConfidenceFallback = candidate.url;
      }
    }

    // Если CDN заблокировал серверный IP (403), но это достоверное og:image/JSON-LD фото —
    // отдаём URL клиенту (браузер с no-referrer часто загружает его напрямую или через fallback)
    if (blockedHighConfidenceFallback) {
      return {
        success: true,
        imageUrl: blockedHighConfidenceFallback,
        title,
      };
    }

    return {
      success: false,
      title,
      blockedByProtection: true,
      error:
        'Фото найдено, но магазин ограничил доступ к нему. Нажмите «Загрузить фото с устройства» ниже.',
    };
  } catch {
    return {
      success: false,
      error: 'Не удалось автоматически получить фотографию этого товара',
    };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Режим проксирования защищённых картинок: GET /api/scrape-product?proxyImage=<encodedUrl>
  if (req.method === 'GET' && typeof req.query.proxyImage === 'string' && req.query.proxyImage.trim()) {
    return handleProxyImage(req.query.proxyImage, res);
  }

  let targetUrl: string | undefined;

  if (req.method === 'GET') {
    targetUrl = typeof req.query.url === 'string' ? req.query.url : undefined;
  } else if (req.method === 'POST') {
    targetUrl = req.body?.url;
  }

  if (!targetUrl) {
    return res.status(400).json({
      success: false,
      error: 'Параметр url обязателен',
    });
  }

  try {
    const result = await scrapeProductUrl(targetUrl);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Ошибка обработки ссылки товара',
    });
  }
}
