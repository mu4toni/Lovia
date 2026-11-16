import React, { useState } from 'react';
import { Icon, IconName } from '../Icon/Icon';
import {
  BASE_CATEGORY_ICONS,
  EXTENDED_CATEGORY_ICONS,
  CategoryIconName,
} from '../../../types/category';
import { getContrastColor } from '../../../utils/categories';
import './CategoryIconSelector.css';

export interface CategoryIconSelectorProps {
  selectedIcon: string;
  onSelectIcon: (iconName: string) => void;
  selectedColor?: string;
  className?: string;
}

export const CategoryIconSelector: React.FC<CategoryIconSelectorProps> = ({
  selectedIcon,
  onSelectIcon,
  selectedColor,
  className = '',
}) => {
  const isExtendedSelected = EXTENDED_CATEGORY_ICONS.some((i) => i.id === selectedIcon);
  const [isExpanded, setIsExpanded] = useState<boolean>(isExtendedSelected);

  const activeColor = selectedColor || 'var(--color-primary)';
  const activeContrastText = selectedColor ? getContrastColor(selectedColor) : '#ffffff';

  const renderIconButton = (iconId: CategoryIconName, label: string) => {
    const isSelected = selectedIcon === iconId;

    return (
      <button
        key={iconId}
        type="button"
        role="radio"
        aria-checked={isSelected}
        aria-label={label}
        title={label}
        onClick={() => onSelectIcon(iconId)}
        className={`category-icon-btn ${isSelected ? 'category-icon-btn--selected' : ''}`}
        style={
          isSelected
            ? {
                backgroundColor: activeColor,
                borderColor: activeColor,
                color: activeContrastText,
              }
            : undefined
        }
      >
        <Icon name={iconId as IconName} size={18} strokeWidth={1.8} />
      </button>
    );
  };

  return (
    <div className={`category-icon-selector ${className}`} role="radiogroup" aria-label="Выбор иконки категории">
      {/* 3 Main Icons Row + Expand Button */}
      <div className="category-icon-selector__base-row">
        {BASE_CATEGORY_ICONS.map((item) => renderIconButton(item.id, item.name))}

        <button
          type="button"
          className={`category-icon-expand-btn ${isExpanded ? 'category-icon-expand-btn--active' : ''}`}
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          title={isExpanded ? 'Скрыть дополнительные иконки' : 'Ещё 10 иконок'}
        >
          <span className="category-icon-expand-btn__label">
            {isExpanded ? 'Меньше' : '+10 иконок'}
          </span>
          <Icon
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={13}
            className="category-icon-expand-btn__icon"
          />
        </button>
      </div>

      {/* 10 Extended Icons Grid */}
      {isExpanded && (
        <div className="category-icon-selector__extended-grid" aria-label="Дополнительные иконки">
          {EXTENDED_CATEGORY_ICONS.map((item) => renderIconButton(item.id, item.name))}
        </div>
      )}
    </div>
  );
};
