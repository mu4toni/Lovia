import React, { useEffect, useLayoutEffect, useId, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from '../IconButton/IconButton';
import { Icon } from '../Icon/Icon';
import { telegramService } from '../../../services/telegramService';
import { useSpaceMode } from '../../../hooks/useSpaceMode';
import './Modal.css';

const MODAL_BASE_Z_INDEX = 1000;
const MODAL_Z_STEP = 20;

interface ModalLayerEntry {
  id: string;
  zIndex: number;
}

const openModalLayers: ModalLayerEntry[] = [];
let savedBodyOverflow: string | null = null;

/**
 * Registers a modal/overlay layer in the global stack so nested modals always
 * receive strictly higher z-index values (1020, 1040, 1060, ...) and body scroll
 * remains locked until the last modal closes.
 */
export function registerModalLayer(id: string, explicitZIndex?: number): number {
  const existing = openModalLayers.find((entry) => entry.id === id);
  if (existing) {
    if (explicitZIndex !== undefined && existing.zIndex !== explicitZIndex) {
      existing.zIndex = explicitZIndex;
    }
    return existing.zIndex;
  }

  const topZ =
    openModalLayers.length > 0
      ? openModalLayers[openModalLayers.length - 1].zIndex
      : MODAL_BASE_Z_INDEX;
  const nextZ = explicitZIndex ?? topZ + MODAL_Z_STEP;

  if (openModalLayers.length === 0 && typeof document !== 'undefined') {
    savedBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  openModalLayers.push({ id, zIndex: nextZ });
  return nextZ;
}

export function unregisterModalLayer(id: string): void {
  const idx = openModalLayers.findIndex((entry) => entry.id === id);
  if (idx !== -1) {
    openModalLayers.splice(idx, 1);
  }
  if (openModalLayers.length === 0 && typeof document !== 'undefined') {
    document.body.style.overflow = savedBodyOverflow ?? '';
    savedBodyOverflow = null;
  }
}

export function isTopModalLayer(id: string): boolean {
  return openModalLayers.length > 0 && openModalLayers[openModalLayers.length - 1].id === id;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  hideHeader?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  zIndex?: number;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  hideHeader = false,
  children,
  footer,
  className = '',
  zIndex,
}) => {
  const titleId = useId();
  const layerId = useId();
  const { isFriendship } = useSpaceMode();
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [layerZIndex, setLayerZIndex] = useState<number>(
    () => zIndex ?? MODAL_BASE_Z_INDEX + MODAL_Z_STEP
  );
  const [isClosing, setIsClosing] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [closeFromY, setCloseFromY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const dragRef = useRef({
    isDragging: false,
    startY: 0,
    startTime: 0,
    currentY: 0,
    pointerId: -1,
  });

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const shouldRenderRef = useRef(shouldRender);
  shouldRenderRef.current = shouldRender;

  const isClosingRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runCloseAnimation = useCallback((notifyParent: boolean, fromY = 0) => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setCloseFromY(Math.max(0, fromY));
    setIsClosing(true);
    setIsDragging(false);
    setIsResetting(false);
    setDragOffset(0);

    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      // isClosingRef stays true until the modal is re-opened (inside `if (isOpen)`),
      // so the parent flipping isOpen=false cannot start a second close animation.
      setShouldRender(false);
      setIsClosing(false);
      setCloseFromY(0);
      if (notifyParent) {
        onCloseRef.current();
      }
    }, 280);
  }, []);

  const startCloseSequence = useCallback(() => {
    runCloseAnimation(true, 0);
  }, [runCloseAnimation]);

  // Sync with prop isOpen
  useEffect(() => {
    if (isOpen) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      isClosingRef.current = false;
      setShouldRender(true);
      setIsClosing(false);
      setCloseFromY(0);
      setDragOffset(0);
      setIsDragging(false);
      setIsResetting(false);
    } else if (shouldRenderRef.current && !isClosingRef.current) {
      runCloseAnimation(false, 0);
    }
  }, [isOpen, runCloseAnimation]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Register modal layer in global stack and handle Escape (topmost modal only)
  useLayoutEffect(() => {
    if (!shouldRender) return;
    const assignedZ = registerModalLayer(layerId, zIndex);
    setLayerZIndex(assignedZ);
    return () => {
      unregisterModalLayer(layerId);
    };
  }, [shouldRender, layerId, zIndex]);

  useEffect(() => {
    if (!shouldRender) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTopModalLayer(layerId)) {
        e.stopPropagation();
        startCloseSequence();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [shouldRender, layerId, startCloseSequence]);

  // Pointer drag gestures for Swipe-to-Dismiss
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if ((e.target as HTMLElement).closest('button, input, textarea, a, [role="button"]')) {
      return;
    }

    dragRef.current = {
      isDragging: true,
      startY: e.clientY,
      startTime: Date.now(),
      currentY: e.clientY,
      pointerId: e.pointerId,
    };

    setIsDragging(true);
    setIsResetting(false);

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture fails
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.isDragging || dragRef.current.pointerId !== e.pointerId) return;

    const dy = e.clientY - dragRef.current.startY;
    dragRef.current.currentY = e.clientY;

    if (dy < 0) {
      // Damped upward drag resistance (rubber-band)
      const damped = -Math.pow(Math.abs(dy), 0.72);
      setDragOffset(damped);
    } else {
      // 1:1 downward tracking with finger
      setDragOffset(dy);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current.isDragging || dragRef.current.pointerId !== e.pointerId) return;

    const { startY, startTime, currentY } = dragRef.current;
    const totalDy = currentY - startY;
    const elapsed = Math.max(1, Date.now() - startTime);
    const velocity = totalDy / elapsed; // px/ms

    dragRef.current.isDragging = false;
    setIsDragging(false);

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    // Dismiss threshold: dragged down > 80px OR quick downward swipe (> 0.45 px/ms with > 20px drag)
    if (totalDy > 80 || (velocity > 0.45 && totalDy > 20)) {
      telegramService.hapticImpact('light');
      runCloseAnimation(true, totalDy);
    } else {
      // Spring back to 0
      setIsResetting(true);
      setDragOffset(0);
      setTimeout(() => {
        setIsResetting(false);
      }, 260);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    if (!dragRef.current.isDragging || dragRef.current.pointerId !== e.pointerId) return;
    dragRef.current.isDragging = false;
    setIsDragging(false);
    setIsResetting(true);
    setDragOffset(0);
    setTimeout(() => {
      setIsResetting(false);
    }, 260);
  };

  if (!shouldRender) return null;

  // Calculate backdrop dynamic opacity & automatic stacking z-index
  const backdropStyle: React.CSSProperties = {
    zIndex: zIndex ?? layerZIndex,
    ...(isDragging && dragOffset > 0
      ? { opacity: Math.max(0.1, 1 - dragOffset / 320) }
      : {}),
  };

  // Calculate sheet transform during drag, reset, or swipe-close
  const sheetStyle: React.CSSProperties & { '--modal-close-from'?: string } = {};
  if (isDragging || dragOffset !== 0) {
    sheetStyle.transform = `translateY(${Math.max(-40, dragOffset)}px)`;
  }
  if (isClosing && closeFromY > 0) {
    sheetStyle['--modal-close-from'] = `${closeFromY}px`;
  }

  const sheetClasses = [
    'modal-sheet',
    className,
    isClosing ? 'modal-sheet--closing' : '',
    isDragging ? 'modal-sheet--dragging' : '',
    isResetting ? 'modal-sheet--resetting' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const modalContent = (
    <div
      className={`modal-backdrop ${isClosing ? 'modal-backdrop--closing' : ''}`}
      style={backdropStyle}
      onClick={startCloseSequence}
      role="presentation"
    >
      <div
        className={sheetClasses}
        style={sheetStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {!hideHeader && (
          <div
            className="modal-sheet__drag-zone"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            <div className="modal-sheet__handle" aria-hidden="true" />
            <div className="modal-sheet__header">
              {title && (
                <h2 id={titleId} className="modal-sheet__title">
                  <span>{title}</span>
                  <span className="modal-sheet__title-mark" aria-hidden="true">
                    {isFriendship ? '✦' : '♥'}
                  </span>
                </h2>
              )}
              <IconButton
                size="sm"
                variant="ghost"
                aria-label="Закрыть окно"
                icon={<Icon name="close" size={17} strokeWidth={2.2} />}
                onClick={startCloseSequence}
                className="modal-sheet__close"
              />
            </div>
          </div>
        )}
        <div className="modal-sheet__body">{children}</div>
        {footer && <div className="modal-sheet__footer">{footer}</div>}
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
