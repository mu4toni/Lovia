import React from 'react';
import { TaskCategory } from '../Badge/Badge';
import { getCategoryMeta, getContrastColor } from '../../../utils/categories';
import { Icon } from '../Icon/Icon';
import './CategoryMarker.css';

export interface CategoryMarkerProps {
  category?: TaskCategory | string;
  name?: string;
  color?: string;
  icon?: string;
  variant?: 'dot' | 'tag' | 'chip';
  selected?: boolean;
  onClick?: () => void;
  showIcon?: boolean;
  className?: string;
}

export const CategoryMarker: React.FC<CategoryMarkerProps> = ({
  category,
  name,
  color,
  icon,
  variant = 'tag',
  selected = false,
  onClick,
  showIcon = false,
  className = '',
}) => {
  const meta = category ? getCategoryMeta(category as TaskCategory) : null;
  const label = name || meta?.label || 'Категория';
  const dotColor = color || meta?.colorVar || 'var(--accent-rose)';
  const bg = color ? `${color}18` : meta?.bgVar || 'var(--accent-rose-dim)';
  const border = color ? `${color}35` : meta?.borderVar || 'var(--border-subtle)';
  const textCol = color || meta?.colorVar || 'var(--accent-rose)';
  const activeIcon = icon || (showIcon ? meta?.icon : undefined);

  if (variant === 'dot') {
    if (activeIcon) {
      return (
        <span
          className={`category-icon-dot ${className}`}
          style={{
            backgroundColor: dotColor,
            color: getContrastColor(dotColor),
          }}
          title={`Категория: ${label}`}
          aria-label={`Категория: ${label}`}
        >
          <Icon name={activeIcon as any} size={11} strokeWidth={2} />
        </span>
      );
    }
    return (
      <span
        className={`category-dot ${className}`}
        style={{ backgroundColor: dotColor }}
        title={`Категория: ${label}`}
        aria-label={`Категория: ${label}`}
      />
    );
  }

  if (variant === 'chip') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={`category-chip ${selected ? 'category-chip--selected' : ''} ${className}`}
        style={
          selected
            ? {
                backgroundColor: bg,
                borderColor: dotColor,
                color: textCol,
              }
            : undefined
        }
      >
        {activeIcon ? (
          <span
            className="category-chip__icon-badge"
            style={{ backgroundColor: dotColor, color: getContrastColor(dotColor) }}
          >
            <Icon name={activeIcon as any} size={11} strokeWidth={2} />
          </span>
        ) : (
          <span
            className="category-chip__dot"
            style={{ backgroundColor: dotColor }}
            aria-hidden="true"
          />
        )}
        <span className="category-chip__label">{label}</span>
      </button>
    );
  }

  // 'tag' (default) — minimal, elegant, non-intrusive
  if (variant === 'tag') {
    return (
      <span
        className={`category-tag ${className}`}
        style={{
          backgroundColor: bg,
          borderColor: border,
          color: textCol,
        }}
        title={`Категория: ${label}`}
      >
        {activeIcon ? (
          <span
            className="category-tag__icon-badge"
            style={{ backgroundColor: dotColor, color: getContrastColor(dotColor) }}
          >
            <Icon name={activeIcon as any} size={10} strokeWidth={2} />
          </span>
        ) : (
          <span
            className="category-tag__dot"
            style={{ backgroundColor: dotColor }}
            aria-hidden="true"
          />
        )}
        <span className="category-tag__label">{label}</span>
      </span>
    );
  }

  return (
    <span
      className={`category-tag ${className}`}
      style={{
        backgroundColor: bg,
        borderColor: border,
        color: textCol,
      }}
      title={`Категория: ${label}`}
    >
      <span
        className="category-tag__dot"
        style={{ backgroundColor: dotColor }}
        aria-hidden="true"
      />
      {showIcon && meta?.icon && <Icon name={meta.icon} size={11} className="category-tag__icon" />}
      <span className="category-tag__label">{label}</span>
    </span>
  );
};
