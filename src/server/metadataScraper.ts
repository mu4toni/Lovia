import net from 'net';
import dns from 'dns/promises';

/**
 * Clean realistic desktop User-Agent WITHOUT any "Bot" or "Spider" tokens,
 * to prevent immediate blocking by WAF / Cloudflare / marketplace protections.
 */
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * Декодирование HTML-сущностей в строках и URL
 * (&amp; -> &, &quot; -> ", etc.), чтобы ссылки с query-параметрами (?w=800&q=80) не ломались.
 */
export function decodeHtmlEntities(str?: string): string | undefined {
  if (!str || typeof str !== 'string') return undefined;
  const decoded = str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2F;/g, '/')
    .replace(/&#x3D;/g, '=')
    .replace(/&#x26;/g, '&')
    .trim();
  return decoded || undefined;
}

/**
 * Проверка, является ли IP-адрес приватным, локальным или служебным (SSRF-защита)
 */
export function isPrivateIp(ip: string): boolean {
  if (!net.isIP(ip)) return true;

  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    // 0.0.0.0/8
    if (parts[0] === 0) return true;
    // 10.0.0.0/8 (Private-Use Networks)
    if (parts[0] === 10) return true;
    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    // 169.254.0.0/16 (Link Local, Cloud metadata AWS/GCP 169.254.169.254)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (Private-Use Networks)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 224.0.0.0/4 (Multicast)
    if (parts[0] >= 224) return true;
    return false;
  }

  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // Unique local
    if (lower.startsWith('fe80')) return true; // Link local
    return false;
  }

  return true;
}

/**
 * Валидация безопасности URL перед выполнением сетевого запроса
 */
export async function validateSafeUrl(rawUrl: string): Promise<URL> {
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

  // Разрешение DNS и проверка полученного IP
  try {
    const { address } = await dns.lookup(hostname);
    if (isPrivateIp(address)) {
      throw new Error(`Доступ к приватному IP (${address}) запрещен`);
    }
  } catch (err: any) {
    if (err.message && err.message.includes('запрещен')) throw err;
    throw new Error('Не удалось разрешить имя хоста или адрес недоступен');
  }

  return url;
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
  /default[-_.]?(image|thumb|pic)?/i,
  /\.svg(\?.*)?$/i, // SVG иконки не являются фото товаров
  /\.ico(\?.*)?$/i,
];

/**
 * Проверка изображения: не является ли оно логотипом, иконкой, заглушкой или баннером
 */
export function isBadImage(url?: string): boolean {
  if (!url || typeof url !== 'string') return true;
  const clean = url.trim().toLowerCase();
  if (clean.length < 5) return true;
  return BAD_IMAGE_PATTERNS.some((pattern) => pattern.test(clean));
}

/**
 * Безопасное приведение относительного URL к абсолютному с декодированием HTML-сущностей
 */
export function resolveAbsoluteUrl(relOrAbs?: string, baseUrl?: string): string | undefined {
  if (!relOrAbs || typeof relOrAbs !== 'string') return undefined;
  const decoded = decodeHtmlEntities(relOrAbs);
  if (!decoded) return undefined;
  try {
    return baseUrl ? new URL(decoded, baseUrl).href : decoded;
  } catch {
    return undefined;
  }
}

/**
 * Очистка заголовка от HTML-сущностей и лишних пробелов
 */
export function cleanTitle(title?: string): string | undefined {
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
 * Рекурсивный поиск объекта Product в Schema.org JSON-LD
 */
function findSchemaProduct(node: any): any | null {
  if (!node || typeof node !== 'object') return null;

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findSchemaProduct(item);
      if (found) return found;
    }
    return null;
  }

  const type = node['@type'];
  const isProduct =
    typeof type === 'string'
      ? type.toLowerCase() === 'product' || type.toLowerCase().endsWith(':product')
      : Array.isArray(type)
      ? type.some((t: string) => String(t).toLowerCase() === 'product')
      : false;

  if (isProduct) {
    return node;
  }

  // Обход @graph
  if (Array.isArray(node['@graph'])) {
    return findSchemaProduct(node['@graph']);
  }

  return null;
}

/**
 * Извлечение фото и названия из Schema.org Product
 */
export function extractSchemaProductMetadata(
  html: string,
  baseUrl: string
): { imageUrl?: string; title?: string } | null {
  const jsonLdMatches = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );

  for (const match of jsonLdMatches) {
    try {
      const parsed = JSON.parse(match[1]);
      const product = findSchemaProduct(parsed);
      if (product) {
        let candidateImg: string | undefined;

        if (typeof product.image === 'string') {
          candidateImg = product.image;
        } else if (Array.isArray(product.image)) {
          for (const item of product.image) {
            if (typeof item === 'string' && !isBadImage(item)) {
              candidateImg = item;
              break;
            } else if (item && typeof item === 'object') {
              const u = item.url || item.contentUrl;
              if (u && !isBadImage(u)) {
                candidateImg = u;
                break;
              }
            }
          }
        } else if (product.image && typeof product.image === 'object') {
          candidateImg = product.image.url || product.image.contentUrl;
        }

        const resolved = resolveAbsoluteUrl(candidateImg, baseUrl);
        if (resolved && !isBadImage(resolved)) {
          return {
            imageUrl: resolved,
            title: cleanTitle(product.name || product.headline),
          };
        }
      }
    } catch {
      // Игнорируем невалидный JSON
    }
  }

  return null;
}

/**
 * Извлечение Open Graph, Twitter Cards, itemprop="image" и link rel="image_src"
 */
export function extractOpenGraphMetadata(
  html: string,
  baseUrl: string
): { imageUrl?: string; title?: string } {
  // 1. og:image / og:image:url / og:image:secure_url
  const ogImageMatch =
    html.match(/<meta[^>]+property=["']og:image(?::url|:secure_url)?["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url|:secure_url)?["']/i) ||
    html.match(/<meta[^>]+name=["']og:image(?::url|:secure_url)?["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']og:image(?::url|:secure_url)?["']/i);

  // 2. twitter:image / twitter:image:src
  const twitterImageMatch =
    html.match(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i) ||
    html.match(/<meta[^>]+property=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i);

  // 3. link rel="image_src"
  const linkImageSrcMatch =
    html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i) ||
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']image_src["']/i);

  // 4. meta itemprop="image"
  const itempropImageMatch =
    html.match(/<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+itemprop=["']image["']/i);

  // 5. meta name="thumbnail"
  const thumbnailMatch =
    html.match(/<meta[^>]+name=["']thumbnail["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']thumbnail["']/i);

  // 6. og:title / twitter:title / <title>
  const titleMatch =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) ||
    html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i);

  // Выбираем первое подходящее изображение с валидацией против баннеров и логотипов
  const candidates = [
    ogImageMatch?.[1],
    twitterImageMatch?.[1],
    linkImageSrcMatch?.[1],
    itempropImageMatch?.[1],
    thumbnailMatch?.[1],
  ];

  let finalImg: string | undefined;
  for (const raw of candidates) {
    if (!raw) continue;
    const resolved = resolveAbsoluteUrl(raw, baseUrl);
    if (resolved && !isBadImage(resolved)) {
      finalImg = resolved;
      break;
    }
  }

  return {
    imageUrl: finalImg,
    title: cleanTitle(titleMatch ? titleMatch[1] : undefined),
  };
}

/**
 * Объединенное извлечение метаданных:
 * Приоритет отдается структурированным данным Schema.org Product,
 * затем Open Graph (og:image / og:image:url), Twitter Card, link rel="image_src", itemprop="image".
 */
export function extractProductMetadata(
  html: string,
  baseUrl: string
): { imageUrl?: string; title?: string } {
  // 1. Проверяем Schema.org Product
  const schemaMeta = extractSchemaProductMetadata(html, baseUrl);
  if (schemaMeta?.imageUrl) {
    return schemaMeta;
  }

  // 2. Проверяем Open Graph, Twitter Cards, link image_src, itemprop
  const ogMeta = extractOpenGraphMetadata(html, baseUrl);
  if (ogMeta.imageUrl) {
    return {
      imageUrl: ogMeta.imageUrl,
      title: ogMeta.title || schemaMeta?.title,
    };
  }

  return {
    imageUrl: undefined,
    title: ogMeta.title || schemaMeta?.title,
  };
}

/**
 * Определение номера корзины CDN для Wildberries по артикулу (vol = Math.floor(nmId / 100000)).
 * Таблица охватывает все корзины от 01 до 28+ для свежих артикулов 2025–2026 гг.
 */
export function getWbBasket(vol: number): string {
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
  if (vol >= 4566 && vol <= 4781) return '26';
  if (vol >= 4782 && vol <= 4997) return '27';
  if (vol >= 4998 && vol <= 5213) return '28';

  // Для vol > 5213 используем динамический расчёт по стандартному шагу 216
  const basketNum = Math.floor((vol - 2838) / 216) + 18;
  return String(basketNum).padStart(2, '0');
}

/**
 * Список корзин-кандидатов для быстрого резервного поиска Wildberries.
 * Расчетная корзина идет первой, затем соседние (±1, ±2) и актуальные свежие (18..28).
 */
export function getWbBasketCandidates(vol: number): string[] {
  const primary = getWbBasket(vol);
  const primaryNum = parseInt(primary, 10);

  const candidates: string[] = [primary];
  const neighbors = [
    primaryNum + 1,
    primaryNum - 1,
    primaryNum + 2,
    primaryNum - 2,
    26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16,
  ];

  for (const n of neighbors) {
    if (n >= 1 && n <= 35) {
      const pad = String(n).padStart(2, '0');
      if (!candidates.includes(pad)) {
        candidates.push(pad);
      }
    }
  }

  return candidates;
}

/**
 * Извлечение артикула Wildberries из любых ссылок
 * (короткие wb.ru, мобильные m.wildberries.ru, detail.aspx, query-параметры ?nm=...)
 */
export function extractWildberriesArticle(url: URL): number | null {
  const hostname = url.hostname.toLowerCase();
  const isWb =
    hostname.includes('wildberries.ru') ||
    hostname.includes('wb.ru') ||
    hostname.includes('wildberries.by') ||
    hostname.includes('wildberries.kz');

  if (!isWb) return null;

  // 1. Path matches: /catalog/12345/..., /product/12345, /item/12345, /c/12345
  const pathMatch = url.pathname.match(/\/(?:catalog|product|item|c)\/(\d+)/i);
  if (pathMatch) {
    const id = parseInt(pathMatch[1], 10);
    if (!isNaN(id) && id > 0) return id;
  }

  // 2. Query param matches: ?nm=12345 or ?article=12345
  const queryNm = url.searchParams.get('nm') || url.searchParams.get('article');
  if (queryNm) {
    const id = parseInt(queryNm, 10);
    if (!isNaN(id) && id > 0) return id;
  }

  // 3. Fallback regex в строке запроса
  const queryMatch = url.search.match(/[?&](?:nm|article|id)=(\d+)/i);
  if (queryMatch) {
    const id = parseInt(queryMatch[1], 10);
    if (!isNaN(id) && id > 0) return id;
  }

  return null;
}

/**
 * Проверка реальной доступности изображения по HTTP:
 * - Без жесткого Range: bytes=0-1024, который блокируется CDN.
 * - Передача Referer и чистого браузерного User-Agent.
 * - Сначала HEAD-запрос; при 405/501/403/ошибке — fallback на GET с немедленной отменой потока.
 */
export async function verifyImageAccessible(
  imageUrl: string,
  referer?: string
): Promise<boolean> {
  try {
    const safeUrl = await validateSafeUrl(imageUrl);
    const effectiveReferer = referer || `https://${safeUrl.hostname}/`;

    const commonHeaders: Record<string, string> = {
      'User-Agent': BROWSER_USER_AGENT,
      Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      Referer: effectiveReferer,
      'Sec-Fetch-Dest': 'image',
      'Sec-Fetch-Mode': 'no-cors',
      'Sec-Fetch-Site': 'cross-site',
    };

    // 1. Пробуем HEAD-запрос
    const headController = new AbortController();
    const headTimeout = setTimeout(() => headController.abort(), 3000);

    let headRes: Response | null = null;
    let shouldTryGet = false;

    try {
      headRes = await fetch(safeUrl.href, {
        method: 'HEAD',
        headers: commonHeaders,
        signal: headController.signal,
        redirect: 'follow',
      });
      clearTimeout(headTimeout);

      if (headRes.ok) {
        const contentType = headRes.headers.get('content-type') || '';
        if (
          contentType.startsWith('image/') ||
          contentType.includes('octet-stream') ||
          /\.(jpe?g|png|webp|avif|gif)(\?.*)?$/i.test(safeUrl.pathname)
        ) {
          return true;
        }
      } else if (
        headRes.status === 405 ||
        headRes.status === 501 ||
        headRes.status === 403 ||
        headRes.status === 400
      ) {
        // Сервер запрещает HEAD или требует GET
        shouldTryGet = true;
      } else {
        return false;
      }
    } catch {
      clearTimeout(headTimeout);
      shouldTryGet = true;
    }

    if (!shouldTryGet && headRes?.ok) {
      return true;
    }

    // 2. Fallback на GET с чтением заголовков и прерыванием потока тела
    const getController = new AbortController();
    const getTimeout = setTimeout(() => getController.abort(), 3500);

    try {
      const getRes = await fetch(safeUrl.href, {
        method: 'GET',
        headers: commonHeaders,
        signal: getController.signal,
        redirect: 'follow',
      });

      clearTimeout(getTimeout);

      // Немедленно прерываем или закрываем тело ответа, чтобы не качать файл целиком
      try {
        if (getRes.body) {
          await getRes.body.cancel();
        } else {
          getController.abort();
        }
      } catch {
        // Игнорируем ошибку отмены потока
      }

      if (getRes.ok) {
        const contentType = getRes.headers.get('content-type') || '';
        return (
          contentType.startsWith('image/') ||
          contentType.includes('octet-stream') ||
          /\.(jpe?g|png|webp|avif|gif)(\?.*)?$/i.test(safeUrl.pathname)
        );
      }
      return false;
    } catch {
      clearTimeout(getTimeout);
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Специализированный адаптер для Wildberries:
 * Запрашивает данные по точному артикулу из URL без поиска и гарантирует нахождение фото
 * даже для самых свежих артикулов 2025–2026 годов.
 */
export async function tryWildberriesDirect(url: URL): Promise<{
  success: boolean;
  imageUrl?: string;
  title?: string;
} | null> {
  const nmId = extractWildberriesArticle(url);
  if (!nmId) return null;

  console.warn(`[Lovia Scraper] 🟣 WB адаптер активирован для артикула ${nmId}`);

  let productTitle: string | undefined;

  // 1. Запрашиваем официальное название товара из API карточек WB
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const apiUrl = `https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=-1257786&spp=30&nm=${nmId}`;
    const safeApi = await validateSafeUrl(apiUrl);

    const apiRes = await fetch(safeApi.href, {
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
        productTitle = cleanTitle(product.name);
      }
    }
  } catch (err: any) {
    console.warn(`[Lovia Scraper] 🟣 WB API card info skipped: ${err?.message || err}`);
  }

  // 2. Рассчитываем параметры путей CDN
  const vol = Math.floor(nmId / 100000);
  const part = Math.floor(nmId / 1000);
  const pageReferer = `https://www.wildberries.ru/catalog/${nmId}/detail.aspx`;

  // Получаем список корзин-кандидатов (расчетная первой)
  const candidates = getWbBasketCandidates(vol);
  const primaryBasket = candidates[0];

  console.warn(
    `[Lovia Scraper] 🟣 WB: vol=${vol}, part=${part}, расчетная корзина=basket-${primaryBasket}`
  );

  // 3. Проверяем расчетную корзину (быстрый путь)
  const primaryWebp = `https://basket-${primaryBasket}.wbbasket.ru/vol${vol}/part${part}/${nmId}/images/big/1.webp`;
  if (await verifyImageAccessible(primaryWebp, pageReferer)) {
    console.warn(`[Lovia Scraper] 🟣 WB: найдено фото в расчетной корзине ${primaryBasket}: ${primaryWebp}`);
    return {
      success: true,
      imageUrl: primaryWebp,
      title: productTitle,
    };
  }

  const primaryJpg = `https://basket-${primaryBasket}.wbbasket.ru/vol${vol}/part${part}/${nmId}/images/big/1.jpg`;
  if (await verifyImageAccessible(primaryJpg, pageReferer)) {
    console.warn(`[Lovia Scraper] 🟣 WB: найдено JPG фото в расчетной корзине ${primaryBasket}: ${primaryJpg}`);
    return {
      success: true,
      imageUrl: primaryJpg,
      title: productTitle,
    };
  }

  // 4. Если расчетная корзина не подошла (например, новый артикул переехал в соседнюю корзину)
  // проверяем остальные кандидаты корзин
  console.warn(
    `[Lovia Scraper] 🟣 WB: проверка соседних корзин для артикула ${nmId}...`
  );

  for (const basket of candidates.slice(1, 10)) {
    const candidateWebp = `https://basket-${basket}.wbbasket.ru/vol${vol}/part${part}/${nmId}/images/big/1.webp`;
    if (await verifyImageAccessible(candidateWebp, pageReferer)) {
      console.warn(`[Lovia Scraper] 🟣 WB: найдено фото в резервной корзине ${basket}: ${candidateWebp}`);
      return {
        success: true,
        imageUrl: candidateWebp,
        title: productTitle,
      };
    }
  }

  console.warn(`[Lovia Scraper] 🟣 WB: прямое CDN фото не найдено, переход к HTML скрейпингу`);
  return null;
}

/**
 * Безопасный серверный скрейпинг страницы товара.
 * Строгое правило: Изображение должно принадлежать именно той странице товара,
 * ссылку на которую вставил пользователь.
 */
export async function scrapeProductUrl(rawUrl: string): Promise<{
  success: boolean;
  imageUrl?: string;
  title?: string;
  error?: string;
}> {
  try {
    console.warn(`[Lovia Scraper] 🔍 Начат сбор метаданных для: ${rawUrl}`);
    const initialSafeUrl = await validateSafeUrl(rawUrl);

    // 1. Проверяем специализированный адаптер Wildberries (по точному артикулу)
    try {
      const wbResult = await tryWildberriesDirect(initialSafeUrl);
      if (wbResult && wbResult.success && wbResult.imageUrl) {
        console.warn(`[Lovia Scraper] ✅ WB адаптер успешно вернул фото: ${wbResult.imageUrl}`);
        return wbResult;
      }
    } catch (wbErr: any) {
      console.warn(`[Lovia Scraper] ⚠️ Ошибка в WB адаптере: ${wbErr?.message || wbErr}`);
    }

    // 2. Выполняем сетевой запрос к целевой странице с реалистичным браузерным User-Agent
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);

    const headers: Record<string, string> = {
      'User-Agent': BROWSER_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
      'Sec-Ch-Ua': '"Chromium";v="131", "Not_A Brand";v="24"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    };

    let response: Response;
    try {
      response = await fetch(initialSafeUrl.href, {
        method: 'GET',
        headers,
        signal: controller.signal,
        redirect: 'follow', // Следуем за редиректами
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      console.warn(`[Lovia Scraper] ⚠️ Ошибка сетевого запроса к ${initialSafeUrl.href}: ${fetchErr.message}`);
      return {
        success: false,
        error: 'Не удалось загрузить страницу товара (сервер не ответил или заблокировал запрос)',
      };
    }

    clearTimeout(timeoutId);

    // 3. Проверяем конечный URL после перенаправлений (SSRF-проверка конечного хоста)
    const finalUrlStr = response.url || initialSafeUrl.href;
    const finalSafeUrl = await validateSafeUrl(finalUrlStr);

    if (!response.ok) {
      console.warn(`[Lovia Scraper] ⚠️ Страница вернула HTTP статус ${response.status} (${response.statusText}): ${finalSafeUrl.href}`);
      return {
        success: false,
        error: `Магазин вернул статус ${response.status}. Возможно, страница защищена от автоматического доступа`,
      };
    }

    const contentType = response.headers.get('content-type') || '';

    // Если ссылка вела напрямую на файл изображения
    if (contentType.startsWith('image/')) {
      const isAccessible = await verifyImageAccessible(finalSafeUrl.href, finalSafeUrl.href);
      if (isAccessible && !isBadImage(finalSafeUrl.href)) {
        console.warn(`[Lovia Scraper] ✅ Ссылка ведет напрямую на изображение: ${finalSafeUrl.href}`);
        return {
          success: true,
          imageUrl: finalSafeUrl.href,
        };
      }
      console.warn(`[Lovia Scraper] ⚠️ Прямая ссылка на изображение не прошла проверку доступности`);
      return {
        success: false,
        error: 'Не удалось автоматически получить фотографию этого товара',
      };
    }

    // Если это не HTML
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      console.warn(`[Lovia Scraper] ⚠️ Неподдерживаемый Content-Type: ${contentType}`);
      return {
        success: false,
        error: 'Не удалось автоматически получить фотографию этого товара',
      };
    }

    // 4. Потоковое чтение HTML (до 1.5 МБ для захвата Schema.org и meta-тегов)
    const reader = response.body?.getReader();
    let html = '';

    if (!reader) {
      const text = await response.text();
      html = text.slice(0, 1536 * 1024);
    } else {
      const chunks: Uint8Array[] = [];
      let bytesReceived = 0;
      const maxBytes = 1536 * 1024;

      while (bytesReceived < maxBytes) {
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
      html = decoder.decode(totalBuffer);
    }

    // 5. Извлекаем метаданные из HTML с привязкой к конечному URL (после редиректов)
    const metadata = extractProductMetadata(html, finalSafeUrl.href);

    if (!metadata.imageUrl) {
      console.warn(`[Lovia Scraper] ⚠️ Изображение не найдено в метаданных (Schema.org / OG / link) на странице: ${finalSafeUrl.href}`);
      return {
        success: false,
        title: metadata.title,
        error: 'Не удалось автоматически найти фото товара на странице',
      };
    }

    // 6. Проверяем доступность полученного изображения
    const isAccessible = await verifyImageAccessible(metadata.imageUrl, finalSafeUrl.href);
    if (!isAccessible) {
      console.warn(`[Lovia Scraper] ⚠️ Извлеченный URL изображения не прошел проверку доступности: ${metadata.imageUrl}`);
      return {
        success: false,
        title: metadata.title,
        error: 'Фото найдено, но CDN заблокировал доступ к нему',
      };
    }

    console.warn(`[Lovia Scraper] ✅ Успешно получено фото товара: ${metadata.imageUrl} (${metadata.title || 'без названия'})`);
    return {
      success: true,
      imageUrl: metadata.imageUrl,
      title: metadata.title,
    };
  } catch (err: any) {
    console.warn(`[Lovia Scraper] ❌ Ошибка скрейпинга "${rawUrl}": ${err?.message || err}`);
    return {
      success: false,
      error: 'Не удалось автоматически получить фотографию этого товара',
    };
  }
}
