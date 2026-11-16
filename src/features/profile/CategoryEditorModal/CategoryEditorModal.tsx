import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Button } from '../../../components/ui/Button/Button';
import { Input } from '../../../components/ui/Input/Input';
import { Icon } from '../../../components/ui/Icon/Icon';
import {
  UserCategory,
  STANDARD_PASTEL_COLORS,
  EXTENDED_LOVIA_PALETTE,
} from '../../../types/category';
import { categoriesService } from '../../../services/categoriesService';
import { getContrastColor } from '../../../utils/categories';
import { CategoryIconSelector } from '../../../components/ui/Category/CategoryIconSelector';
import './CategoryEditorModal.css';

export interface CategoryEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: UserCategory | null;
  onSaved: (category: UserCategory) => void;
}

export const CategoryEditorModal: React.FC<CategoryEditorModalProps> = ({
  isOpen,
  onClose,
  categoryToEdit = null,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(STANDARD_PASTEL_COLORS[0].hex);
  const [selectedIcon, setSelectedIcon] = useState('heart');

  useEffect(() => {
    if (isOpen) {
      if (categoryToEdit) {
        setName(categoryToEdit.name || '');
        setSelectedColor(categoryToEdit.color);
        setSelectedIcon(categoryToEdit.icon || 'heart');
      } else {
        setName('');
        setSelectedColor(STANDARD_PASTEL_COLORS[0].hex);
        setSelectedIcon('heart');
      }
    }
  }, [isOpen, categoryToEdit]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = name.trim();

    if (categoryToEdit) {
      const updated = categoriesService.updateCategory(categoryToEdit.id, {
        name: cleanName || undefined,
        color: selectedColor,
        icon: selectedIcon,
      });
      if (updated) {
        onSaved(updated);
        onClose();
      }
    } else {
      const created = categoriesService.createCategory(cleanName || undefined, selectedColor, selectedIcon);
      onSaved(created);
      onClose();
    }
  };

  const isEditing = Boolean(categoryToEdit);
  const previewTextColor = getContrastColor(selectedColor);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Редактировать категорию' : 'Новая категория напоминаний'}
    >
      <form onSubmit={handleSubmit} className="category-editor-form">
        {/* 1. Icon Selector: 3 Base + 10 Extended */}
        <div className="category-editor-field">
          <label className="category-editor-label">Иконка категории</label>
          <CategoryIconSelector
            selectedIcon={selectedIcon}
            onSelectIcon={setSelectedIcon}
            selectedColor={selectedColor}
          />
        </div>

        {/* 2. Optional Name Field */}
        <div className="category-editor-field">
          <Input
            label="Название категории (необязательно)"
            placeholder="Например: Покупки, Здоровье, Планы..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            helperText="Можно оставить пустым — категория отображается цветной иконкой"
          />
        </div>

        {/* 3. Color Palette Selection */}
        <div className="category-editor-field">
          <label className="category-editor-label">3 стандартных пастельных оттенка</label>
          <div className="category-editor-palette" role="radiogroup" aria-label="Стандартные цвета">
            {STANDARD_PASTEL_COLORS.map((swatch) => {
              const isSelected = selectedColor.toLowerCase() === swatch.hex.toLowerCase();
              return (
                <button
                  key={swatch.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`${swatch.name} (${swatch.hex})`}
                  className={`category-swatch ${isSelected ? 'category-swatch--selected' : ''}`}
                  style={{ backgroundColor: swatch.hex }}
                  onClick={() => setSelectedColor(swatch.hex)}
                >
                  {isSelected && (
                    <span className="category-swatch__check" style={{ color: previewTextColor }}>
                      <Icon name="check" size={16} strokeWidth={2.8} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="category-editor-field">
          <label className="category-editor-label">15 дополнительных цветов Lovia</label>
          <div className="category-editor-palette" role="radiogroup" aria-label="Палитра Lovia">
            {EXTENDED_LOVIA_PALETTE.map((swatch) => {
              const isSelected = selectedColor.toLowerCase() === swatch.hex.toLowerCase();
              return (
                <button
                  key={swatch.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`${swatch.name} (${swatch.hex})`}
                  className={`category-swatch ${isSelected ? 'category-swatch--selected' : ''}`}
                  style={{ backgroundColor: swatch.hex }}
                  onClick={() => setSelectedColor(swatch.hex)}
                >
                  {isSelected && (
                    <span
                      className="category-swatch__check"
                      style={{ color: getContrastColor(swatch.hex) }}
                    >
                      <Icon name="check" size={16} strokeWidth={2.8} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Live Reminder Preview with this Category Color */}
        <div className="category-editor-field">
          <label className="category-editor-label">Пример карточки напоминания в «Доме»</label>
          <div
            className="category-reminder-preview"
            style={{
              backgroundColor: selectedColor,
              color: previewTextColor,
            }}
          >
            <div className="category-reminder-preview__top">
              <span className="category-reminder-preview__badge">
                <Icon name={selectedIcon as any} size={13} style={{ marginRight: 4 }} />
                {name.trim() || 'Категория'}
              </span>
              <span className="category-reminder-preview__time">до 19:30</span>
            </div>
            <div className="category-reminder-preview__title">
              Купить круассаны к завтраку
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="category-editor-actions">
          <Button variant="ghost" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" type="submit">
            {isEditing ? 'Сохранить изменения' : 'Создать категорию'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
