/**
 * Клиентское сжатие изображений через HTML5 <canvas> перед загрузкой на сервер.
 *
 * Пресеты:
 * - avatar: максимум 400×400 px, image/webp (fallback image/jpeg), качество 0.75 (~20–40 КБ)
 * - photo (по умолчанию): максимум 1080 px по длинной стороне, image/webp (fallback image/jpeg),
 *   качество 0.75 (если итоговый файл > 250 КБ — автоматическое снижение качества до 0.62, ~80–150 КБ)
 */

export type ImageCompressionPreset = 'avatar' | 'photo';

export interface EncodeCanvasOptions {
  quality?: number;
  fallbackQuality?: number;
  maxBytesBeforeDowngrade?: number;
  hardMaxBytes?: number;
}

export const AVATAR_MAX_DIMENSION = 400;
export const PHOTO_MAX_DIMENSION = 1080;
export const DEFAULT_IMAGE_QUALITY = 0.75;
export const DOWNGRADE_IMAGE_QUALITY = 0.62;
export const PHOTO_DOWNGRADE_THRESHOLD_BYTES = 250 * 1024; // 250 KB
const HARD_MAX_UPLOAD_BYTES = Math.floor(1.9 * 1024 * 1024); // Safety cap below 2 MB server limit

let cachedWebpSupport: boolean | null = null;

/**
 * Проверяет реальную поддержку кодирования image/webp в canvas.toDataURL.
 * В браузерах без поддержки WebP-кодирования (например, старый Safari/WebView)
 * canvas.toDataURL('image/webp') молча возвращает image/png — в этом случае используем image/jpeg.
 */
export function supportsWebpEncode(): boolean {
  if (cachedWebpSupport !== null) return cachedWebpSupport;
  if (typeof document === 'undefined') {
    cachedWebpSupport = false;
    return false;
  }
  try {
    const testCanvas = document.createElement('canvas');
    testCanvas.width = 2;
    testCanvas.height = 2;
    const dataUrl = testCanvas.toDataURL('image/webp');
    cachedWebpSupport = dataUrl.startsWith('data:image/webp');
  } catch {
    cachedWebpSupport = false;
  }
  return cachedWebpSupport;
}

/**
 * Точная оценка размера бинарного файла (в байтах) по base64 DataURL.
 */
export function estimateDataUrlBytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return dataUrl.length;
  const base64 = dataUrl.slice(commaIdx + 1);
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

/**
 * Кодирует <canvas> в WebP (с fallback на JPEG) с адаптивным снижением качества.
 */
export function encodeCanvasOptimized(
  canvas: HTMLCanvasElement,
  options: EncodeCanvasOptions = {}
): string {
  const {
    quality = DEFAULT_IMAGE_QUALITY,
    fallbackQuality = DOWNGRADE_IMAGE_QUALITY,
    maxBytesBeforeDowngrade = PHOTO_DOWNGRADE_THRESHOLD_BYTES,
    hardMaxBytes = HARD_MAX_UPLOAD_BYTES,
  } = options;

  const mime = supportsWebpEncode() ? 'image/webp' : 'image/jpeg';
  let dataUrl = canvas.toDataURL(mime, quality);

  // Если кодирование в WebP по какой-то причине вернуло не WebP (например, PNG) — fallback на JPEG
  const effectiveMime = dataUrl.startsWith(`data:${mime}`) ? mime : 'image/jpeg';
  if (effectiveMime !== mime) {
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  // Если фото всё ещё тяжелее порога (250 КБ) — снижаем качество до 0.62
  if (maxBytesBeforeDowngrade > 0 && estimateDataUrlBytes(dataUrl) > maxBytesBeforeDowngrade) {
    const downgraded = canvas.toDataURL(effectiveMime, fallbackQuality);
    if (downgraded.startsWith(`data:${effectiveMime}`)) {
      dataUrl = downgraded;
    }
  }

  // Аварийная страховка, чтобы файл гарантированно уложился в серверный лимит 2 МБ
  if (hardMaxBytes > 0 && estimateDataUrlBytes(dataUrl) > hardMaxBytes) {
    const extraCompressed = canvas.toDataURL(effectiveMime, 0.5);
    if (extraCompressed.startsWith(`data:${effectiveMime}`)) {
      dataUrl = extraCompressed;
    }
  }

  return dataUrl;
}

/**
 * Сжатие изображения из File с сохранением пропорций.
 * Поддерживает как пресет ('avatar' | 'photo'), так и явные параметры (maxWidth, maxHeight, quality).
 */
export async function compressImageFile(
  file: File,
  maxWidthOrPreset: number | ImageCompressionPreset = PHOTO_MAX_DIMENSION,
  maxHeightArg?: number,
  qualityArg?: number
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    return readFileAsDataUrl(file);
  }

  const isAvatarPreset = maxWidthOrPreset === 'avatar';
  const maxWidth =
    typeof maxWidthOrPreset === 'number'
      ? maxWidthOrPreset
      : isAvatarPreset
      ? AVATAR_MAX_DIMENSION
      : PHOTO_MAX_DIMENSION;
  const maxHeight = maxHeightArg ?? maxWidth;
  const quality = qualityArg ?? DEFAULT_IMAGE_QUALITY;
  const maxBytesBeforeDowngrade = isAvatarPreset ? 0 : PHOTO_DOWNGRADE_THRESHOLD_BYTES;

  return new Promise((resolve, reject) => {
    const objectUrl =
      typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
        ? URL.createObjectURL(file)
        : null;

    const cleanup = () => {
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // ignore
        }
      }
    };

    const loadIntoCanvas = (src: string, fallbackSrc?: string) => {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;

          // Масштабирование с сохранением пропорций (не увеличиваем мелкие фото)
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            cleanup();
            if (fallbackSrc) {
              resolve(fallbackSrc);
            } else {
              readFileAsDataUrl(file).then(resolve, reject);
            }
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          // Светлая подложка на случай прозрачных PNG при конвертации
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const compressedDataUrl = encodeCanvasOptimized(canvas, {
            quality,
            fallbackQuality: DOWNGRADE_IMAGE_QUALITY,
            maxBytesBeforeDowngrade,
          });
          cleanup();
          resolve(compressedDataUrl);
        } catch {
          cleanup();
          if (fallbackSrc) {
            resolve(fallbackSrc);
          } else {
            readFileAsDataUrl(file).then(resolve, reject);
          }
        }
      };

      img.onerror = () => {
        cleanup();
        if (fallbackSrc) {
          resolve(fallbackSrc);
        } else {
          readFileAsDataUrl(file).then(resolve, reject);
        }
      };

      img.src = src;
    };

    if (objectUrl) {
      loadIntoCanvas(objectUrl);
    } else {
      readFileAsDataUrl(file)
        .then((dataUrl) => loadIntoCanvas(dataUrl, dataUrl))
        .catch(reject);
    }
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
