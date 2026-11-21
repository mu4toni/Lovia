import React, { useEffect, useId, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from '../IconButton/IconButton';
import { Icon } from '../Icon/Icon';
import { telegramService } from '../../../services/telegramService';
import { useSpaceMode } from '../../../hooks/useSpaceMode';
import './Modal.css';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className = '',
}) => {
  const titleId = useId();
  const { isFriendship } = useSpaceMode();
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const dragRef = useRef({
    isDragging: false,
    startY: 0,
    startTime: 0,
    currentY: 0,
    pointerId: -1,
  });

  const isClosingRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startCloseSequence = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);
    setIsDragging(false);
    setIsResetting(false);
    setDragOffset(0);

    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
      isClosingRef.current = false;
      onClose();
    }, 280);
  }, [onClose]);

  // Sync with prop isOpen
  useEffect(() => {
    if (isOpen) {
      isClosingRef.current = false;
      setShouldRender(true);
      setIsClosing(false);
      setDragOffset(0);
      setIsDragging(false);
      setIsResetting(false);
    } else if (shouldRender && !isClosingRef.current) {
      startCloseSequence();
    }
  }, [isOpen, shouldRender, startCloseSequence]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Lock body scroll and handle Escape
  useEffect(() => {
    if (!shouldRender) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        startCloseSequence();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [shouldRender, startCloseSequence]);

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
      startCloseSequence();
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

  // Calculate backdrop dynamic opacity during drag
  const backdropOpacityStyle =
    isDragging && dragOffset > 0
      ? { opacity: Math.max(0.1, 1 - dragOffset / 320) }
      : undefined;

  // Calculate sheet transform during drag or reset
  const sheetStyle: React.CSSProperties = {};
  if (isDragging || dragOffset !== 0) {
    sheetStyle.transform = `translateY(${Math.max(-40, dragOffset)}px)`;
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
      style={backdropOpacityStyle}
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
        <div className="modal-sheet__body">{children}</div>
        {footer && <div className="modal-sheet__footer">{footer}</div>}
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
