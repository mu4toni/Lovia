import React, { useCallback, useEffect, useRef, useState } from 'react';
import { coupleService } from '../../services/coupleService';
import { compressImageFile } from '../../utils/imageCompressor';
import { AvatarCropModal } from '../profile/AvatarCropModal/AvatarCropModal';
import { useToast } from '../../components/ui/Toast/ToastContext';

/** Current shared couple/friends photo URL; stays in sync with couple updates. */
export function useCouplePhotoUrl(): string | undefined {
  const [url, setUrl] = useState<string | undefined>(
    () => coupleService.getCurrentCouple()?.couplePhotoUrl
  );

  useEffect(() => {
    const sync = () => setUrl(coupleService.getCurrentCouple()?.couplePhotoUrl);
    sync();
    window.addEventListener('lovia_couple_connected', sync);
    window.addEventListener('lovia_couple_updated', sync);
    window.addEventListener('lovia_couple_dissolved', sync);
    return () => {
      window.removeEventListener('lovia_couple_connected', sync);
      window.removeEventListener('lovia_couple_updated', sync);
      window.removeEventListener('lovia_couple_dissolved', sync);
    };
  }, []);

  return url;
}

/**
 * Photo picker for the shared couple photo: file select -> compression -> square crop -> upload.
 * Render `picker` once in the component tree and call `openPicker()` from any click handler.
 */
export function useCouplePhotoPicker(): { openPicker: () => void; picker: React.ReactNode } {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 1280, 1280, 0.85);
      setRawImage(compressed);
      setIsCropOpen(true);
    } catch {
      showToast({
        title: 'Не удалось открыть фото',
        message: 'Выберите другое изображение',
        type: 'warning',
      });
    }
  };

  const handleCropped = async (dataUrl: string) => {
    setIsCropOpen(false);
    setRawImage(null);
    try {
      await coupleService.updateCouplePhoto(dataUrl);
      showToast({ title: 'Сохранено', message: 'Совместное фото обновлено', type: 'love' });
    } catch (err: unknown) {
      showToast({
        title: 'Ошибка загрузки фото',
        message: err instanceof Error ? err.message : 'Не удалось сохранить совместное фото',
        type: 'warning',
      });
    }
  };

  const picker = (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
      />
      {rawImage && (
        <AvatarCropModal
          isOpen={isCropOpen}
          imageSrc={rawImage}
          shape="square"
          outputSize={640}
          title="Совместное фото"
          hint="Перемещайте и масштабируйте фото. На главной отобразится квадратная область."
          onClose={() => {
            setIsCropOpen(false);
            setRawImage(null);
          }}
          onCropComplete={handleCropped}
        />
      )}
    </>
  );

  return { openPicker, picker };
}
