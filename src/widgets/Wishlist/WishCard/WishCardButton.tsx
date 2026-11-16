import React from 'react';
import { Icon, IconName } from '../../../components/ui/Icon/Icon';
import './WishCardButton.css';

export type WishCardButtonVariant = 'secondary' | 'primary' | 'reserved' | 'disabled';

export interface WishCardButtonProps {
  variant: WishCardButtonVariant;
  iconName: IconName;
  line1: string;
  line2?: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
  ariaPressed?: boolean;
  className?: string;
}

/**
 * Reusable unified action button for WishCard.
 * Guarantees identical geometry, height, font sizing, and alignment.
 */
export const WishCardButton: React.FC<WishCardButtonProps> = ({
  variant,
  iconName,
  line1,
  line2,
  href,
  onClick,
  disabled = false,
  title,
  ariaLabel,
  ariaPressed,
  className = '',
}) => {
  const isLink = Boolean(href && !disabled);
  const effectiveVariant = disabled ? 'disabled' : variant;

  const fullAriaLabel = ariaLabel || (line2 ? `${line1} ${line2}` : line1);
  const fullTitle = title || fullAriaLabel;

  const content = (
    <>
      <span className="wish-btn__icon-wrap" aria-hidden="true">
        <Icon name={iconName} size={14} />
      </span>
      <span className="wish-btn__text">
        <span className="wish-btn__line wish-btn__line--1">{line1}</span>
        {line2 && <span className="wish-btn__line wish-btn__line--2">{line2}</span>}
      </span>
    </>
  );

  const buttonClasses = `wish-btn wish-btn--${effectiveVariant} ${className}`.trim();

  if (isLink && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClasses}
        title={fullTitle}
        aria-label={fullAriaLabel}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={buttonClasses}
      title={fullTitle}
      aria-label={fullAriaLabel}
      aria-pressed={ariaPressed}
    >
      {content}
    </button>
  );
};
