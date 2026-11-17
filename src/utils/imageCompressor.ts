/**
 * Сжатие изображения через HTML5 <canvas> перед загрузкой.
 *
 * Масштабирует изображение до максимальных размеров maxWidth / maxHeight (по умолчанию 1280x1280),
 * конвертирует в JPEG с качеством 0.82, что снижает размер фото с 5–10 МБ до ~100–180 КБ
 * без видимой потери качества на мобильных экранах.
 */
export async function compressImageFile(
  file: File,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.82
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    return readFileAsDataUrl(file);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        return reject(new Error('Не удалось прочитать файл изображения'));
      }

      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;

          // Масштабирование с сохранением пропорций
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
            resolve(src);
            return;
          }

          // Белая подложка для прозрачных изображений при конвертации в JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch {
          // Фолбэк на оригинальный DataURL при ошибке canvas
          resolve(src);
        }
      };

      img.onerror = () => {
        // Фолбэк на оригинальный DataURL если Image не смог декодировать
        resolve(src);
      };

      img.src = src;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
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
