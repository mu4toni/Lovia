import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Icon, IconName } from '../Icon/Icon';
import './BottomActionButton.css';

export interface BottomActionButtonProps {
  label: string;
  onClick: () => void;
  iconName?: IconName;
  className?: string;
  ariaLabel?: string;
  variant?: 'inline' | 'floating';
  floating?: boolean;
  visible?: boolean;
}

/**
 * Unified action button for primary section actions.
 * Supports both standard inline and floating above BottomNav modes.
 * Features smart auto-hide on downward scroll (>16px) and auto-show on upward scroll (>10px) or page top.
 */
export const BottomActionButton: React.FC<BottomActionButtonProps> = ({
  label,
  onClick,
  iconName = 'plus',
  className = '',
  ariaLabel,
  variant,
  floating = false,
  visible = true,
}) => {
  const isFloating = variant === 'floating' || floating;
  const location = useLocation();
  const [isScrollHidden, setIsScrollHidden] = useState(false);
  const lastScrollYRef = useRef(0);

  // Auto-hide floating button on scroll down, reveal on scroll up or top
  useEffect(() => {
    if (!isFloating) return;

    // Reset visibility state on route change
    setIsScrollHidden(false);
    lastScrollYRef.current = typeof window !== 'undefined' ? window.scrollY : 0;

    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        ticking = false;
        const currentY = window.scrollY;
        const delta = currentY - lastScrollYRef.current;

        // If at the very top of the page (<= 60px), always show
        if (currentY <= 60) {
          setIsScrollHidden(false);
          lastScrollYRef.current = currentY;
          return;
        }

        // Scrolling DOWN by > 16px from last recorded position
        if (delta > 16) {
          setIsScrollHidden(true);
          lastScrollYRef.current = currentY;
        }
        // Scrolling UP by > 10px from last recorded position
        else if (delta < -10) {
          setIsScrollHidden(false);
          lastScrollYRef.current = currentY;
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isFloating, location.pathname]);

  const isEffectivelyVisible = visible && !isScrollHidden;

  const content = (
    <div
      className={`bottom-action-wrapper ${
        isFloating ? 'bottom-action-wrapper--floating' : ''
      } ${!isEffectivelyVisible ? 'bottom-action-wrapper--hidden' : ''} ${className}`}
      aria-hidden={!isEffectivelyVisible}
    >
      <button
        type="button"
        onClick={onClick}
        className={`bottom-action-btn ${isFloating ? 'bottom-action-btn--floating' : ''}`}
        aria-label={ariaLabel || label}
        tabIndex={isEffectivelyVisible ? 0 : -1}
      >
        <span className="bottom-action-btn__icon" aria-hidden="true">
          <Icon name={iconName} size={18} strokeWidth={2.4} />
        </span>
        <span className="bottom-action-btn__label">{label}</span>
      </button>
    </div>
  );

  if (isFloating && typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
};
