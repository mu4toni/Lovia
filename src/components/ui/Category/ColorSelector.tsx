import React, { useState } from 'react';
import {
  STANDARD_PASTEL_COLORS,
  EXTENDED_LOVIA_PALETTE,
  CategoryPaletteOption,
} from '../../../types/category';
import { Icon } from '../Icon/Icon';
import { getRelativeLuminance } from '../../../utils/colorContrast';
import './ColorSelector.css';

export interface ColorSelectorProps {
  selectedColor?: string | null;
  onChange: (colorHex: string | null) => void;
  className?: string;
}

export const ColorSelector: React.FC<ColorSelectorProps> = ({
  selectedColor = null,
  onChange,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if selected color is one of the extended colors
  const isExtendedSelected =
    !!selectedColor &&
    EXTENDED_LOVIA_PALETTE.some(
      (c) => c.hex.toLowerCase() === selectedColor.toLowerCase()
    );

  const renderSwatch = (opt: CategoryPaletteOption) => {
    const isSelected =
      selectedColor?.toLowerCase() === opt.hex.toLowerCase();
    const isLight = getRelativeLuminance(opt.hex) > 0.42;
    const checkColor = isLight ? '#171717' : '#FFFFFF';

    return (
      <button
        key={opt.hex}
        type="button"
        role="radio"
        aria-checked={isSelected}
        aria-label={`Выбрать цвет ${opt.name}`}
        title={opt.name}
        className={`color-swatch ${isSelected ? 'color-swatch--selected' : ''}`}
        style={{ backgroundColor: opt.hex }}
        onClick={() => onChange(isSelected ? null : opt.hex)}
      >
        {isSelected && (
          <Icon
            name="check"
            size={14}
            strokeWidth={2.8}
            className="color-swatch__check"
            style={{ color: checkColor }}
          />
        )}
      </button>
    );
  };

  const isNoneSelected = !selectedColor;

  return (
    <div
      className={`color-selector ${className}`}
      role="radiogroup"
      aria-label="Выбор цвета напоминания"
    >
      <div className="color-selector__main-row">
        {/* 1. Neutral / None option */}
        <button
          type="button"
          role="radio"
          aria-checked={isNoneSelected}
          aria-label="Без цвета (нейтральный фон)"
          title="Без цвета"
          className={`color-swatch color-swatch--none ${
            isNoneSelected ? 'color-swatch--selected' : ''
          }`}
          onClick={() => onChange(null)}
        >
          {isNoneSelected ? (
            <Icon
              name="check"
              size={13}
              strokeWidth={2.6}
              className="color-swatch__check"
              style={{ color: 'var(--text-primary)' }}
            />
          ) : (
            <span className="color-swatch__slash" aria-hidden="true" />
          )}
        </button>

        {/* 2. 3 Standard Pastel Colors */}
        {STANDARD_PASTEL_COLORS.map(renderSwatch)}

        {/* 3. Toggle button for 15 extended colors */}
        <button
          type="button"
          className={`color-selector__toggle-btn ${
            isExpanded || isExtendedSelected ? 'color-selector__toggle-btn--active' : ''
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-label={
            isExpanded
              ? 'Скрыть дополнительные цвета'
              : 'Показать все 15 оттенков палитры Lovia'
          }
          title="Ещё 15 оттенков"
        >
          <Icon name="palette" size={15} />
          <span className="color-selector__toggle-text">Ещё</span>
          <Icon
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={12}
            className="color-selector__toggle-chevron"
          />
        </button>
      </div>

      {/* Expanded grid of 15 curated Lovia colors */}
      {isExpanded && (
        <div
          className="color-selector__extended-drawer"
          aria-label="Дополнительные оттенки Lovia"
        >
          <div className="color-selector__extended-grid">
            {EXTENDED_LOVIA_PALETTE.map(renderSwatch)}
          </div>
        </div>
      )}
    </div>
  );
};
