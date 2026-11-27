import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Button } from '../../../components/ui/Button/Button';
import { Icon } from '../../../components/ui/Icon/Icon';
import {
  AVATAR_MAX_DIMENSION,
  DEFAULT_IMAGE_QUALITY,
  DOWNGRADE_IMAGE_QUALITY,
  PHOTO_DOWNGRADE_THRESHOLD_BYTES,
  encodeCanvasOptimized,
  type ImageCompressionPreset,
} from '../../../utils/imageCompressor';
import './AvatarCropModal.css';

export interface AvatarCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
  /** Stencil shape shown while cropping. Output is always a square WebP/JPEG. */
  shape?: 'circle' | 'square';
  /** Output size in px (square). */
  outputSize?: number;
  /** Compression preset: 'avatar' (400px, q=0.75) or 'photo' (<=1080px, q=0.75 -> 0.62 if >250KB). */
  compressionPreset?: ImageCompressionPreset;
  title?: string;
  hint?: string;
}

const CANVAS_SIZE = 300;
const CROP_RADIUS = 120; // 240px diameter

export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  shape = 'circle',
  outputSize = AVATAR_MAX_DIMENSION,
  compressionPreset = 'avatar',
  title = 'Редактирование фото',
  hint,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });

  // Reset transforms whenever new image is provided
  useEffect(() => {
    if (!isOpen || !imageSrc) {
      setIsImageLoaded(false);
      return;
    }

    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setIsImageLoaded(true);
    };
    img.src = imageSrc;
  }, [isOpen, imageSrc]);

  // Redraw canvas on transforms change
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !isImageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    ctx.clearRect(0, 0, W, H);

    // 1. Draw image with pan, zoom, rotation
    const baseScale = Math.max((2 * CROP_RADIUS) / img.width, (2 * CROP_RADIUS) / img.height);
    const totalScale = baseScale * zoom;

    ctx.save();
    ctx.translate(cx + pan.x, cy + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(totalScale, totalScale);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

    // 2. Darken area outside the circular stencil
    ctx.save();
    ctx.fillStyle = 'rgba(15, 15, 15, 0.68)';
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    if (shape === 'square') {
      ctx.rect(cx - CROP_RADIUS, cy - CROP_RADIUS, CROP_RADIUS * 2, CROP_RADIUS * 2);
      ctx.fill('evenodd');
    } else {
      ctx.arc(cx, cy, CROP_RADIUS, 0, Math.PI * 2, true);
      ctx.fill();
    }

    // 3. Circular guide ring with subtle glow
    ctx.strokeStyle = 'rgba(229, 229, 229, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (shape === 'square') {
      ctx.rect(cx - CROP_RADIUS, cy - CROP_RADIUS, CROP_RADIUS * 2, CROP_RADIUS * 2);
    } else {
      ctx.arc(cx, cy, CROP_RADIUS, 0, Math.PI * 2);
    }
    ctx.stroke();

    // 4. Subtle center guidelines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Horizontal guide
    ctx.moveTo(cx - 14, cy);
    ctx.lineTo(cx + 14, cy);
    // Vertical guide
    ctx.moveTo(cx, cy - 14);
    ctx.lineTo(cx, cy + 14);
    ctx.stroke();
    ctx.restore();
  }, [zoom, rotation, pan, isImageLoaded, shape]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Pointer drag events for canvas
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setIsDragging(false);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setZoom((prev) => {
      const delta = -e.deltaY * 0.0015;
      return Math.min(3, Math.max(1, prev + delta));
    });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  const handleSave = () => {
    const img = imgRef.current;
    if (!img) return;

    // Render cropped image to capped square canvas (<= 400px for avatars, <= 1080px for photos)
    const maxCap = compressionPreset === 'avatar' ? AVATAR_MAX_DIMENSION : 1080;
    const OUTPUT_SIZE = Math.min(outputSize, maxCap);
    const outCanvas = document.createElement('canvas');
    outCanvas.width = OUTPUT_SIZE;
    outCanvas.height = OUTPUT_SIZE;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return;

    const baseScale = Math.max((2 * CROP_RADIUS) / img.width, (2 * CROP_RADIUS) / img.height);
    const totalScale = baseScale * zoom;
    const exportRatio = OUTPUT_SIZE / (2 * CROP_RADIUS);

    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';
    outCtx.fillStyle = '#171717';
    outCtx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    outCtx.save();
    outCtx.translate(
      OUTPUT_SIZE / 2 + pan.x * exportRatio,
      OUTPUT_SIZE / 2 + pan.y * exportRatio
    );
    outCtx.rotate((rotation * Math.PI) / 180);
    outCtx.scale(totalScale * exportRatio, totalScale * exportRatio);
    outCtx.drawImage(img, -img.width / 2, -img.height / 2);
    outCtx.restore();

    const dataUrl = encodeCanvasOptimized(outCanvas, {
      quality: DEFAULT_IMAGE_QUALITY,
      fallbackQuality: DOWNGRADE_IMAGE_QUALITY,
      maxBytesBeforeDowngrade:
        compressionPreset === 'avatar' ? 0 : PHOTO_DOWNGRADE_THRESHOLD_BYTES,
    });
    onCropComplete(dataUrl);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="avatar-cropper">
        <p className="avatar-cropper__hint">
          {hint ?? 'Перемещайте и масштабируйте фото. В профиле отобразится круглая область.'}
        </p>

        {/* Canvas Workspace */}
        <div className="avatar-cropper__canvas-wrap">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className={`avatar-cropper__canvas ${isDragging ? 'avatar-cropper__canvas--dragging' : ''}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            aria-label="Область кадрирования фотографии"
          />
        </div>

        {/* Controls: Zoom slider & Rotate / Reset buttons */}
        <div className="avatar-cropper__controls">
          <div className="avatar-cropper__zoom-row">
            <span className="avatar-cropper__zoom-label" id="zoom-label">
              Масштаб
            </span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="avatar-cropper__slider"
              aria-labelledby="zoom-label"
              aria-valuemin={1}
              aria-valuemax={3}
              aria-valuenow={Math.round(zoom * 100)}
            />
            <span className="avatar-cropper__zoom-val">{Math.round(zoom * 100)}%</span>
          </div>

          <div className="avatar-cropper__btn-row">
            <button
              type="button"
              className="avatar-cropper__tool-btn"
              onClick={handleRotate}
              title="Повернуть на 90°"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.99 6.57 2.57L21 8" />
                <polyline points="21 3 21 8 16 8" />
              </svg>
              <span>Повернуть</span>
            </button>

            <button
              type="button"
              className="avatar-cropper__tool-btn avatar-cropper__tool-btn--reset"
              onClick={handleReset}
              title="Сбросить масштаб и положение"
            >
              <span>Сбросить</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="avatar-cropper__actions">
          <Button variant="ghost" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" type="button" onClick={handleSave} disabled={!isImageLoaded}>
            <Icon name="check" size={16} />
            <span>Применить</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
