import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal/Modal';
import { Button } from '../ui/Button/Button';
import { Input } from '../ui/Input/Input';
import { Icon } from '../ui/Icon/Icon';
import { CategoryMarker } from '../ui/Category/CategoryMarker';
import { CategoryIconSelector } from '../ui/Category/CategoryIconSelector';
import { LOVIA_CATEGORY_PALETTE, UserCategory } from '../../types/category';
import { categoriesService } from '../../services/categoriesService';
import './CreateCategoryModal.css';

export interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (category: UserCategory) => void;
  categoryToEdit?: UserCategory | null;
}

export const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  categoryToEdit = null,
}) => {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(LOVIA_CATEGORY_PALETTE[0].hex);
  const [selectedIcon, setSelectedIcon] = useState('heart');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (categoryToEdit) {
        setName(categoryToEdit.name || '');
        setSelectedColor(categoryToEdit.color);
        setSelectedIcon(categoryToEdit.icon || 'heart');
      } else {
        setName('');
        setSelectedColor(LOVIA_CATEGORY_PALETTE[0].hex);
        setSelectedIcon('heart');
      }
      setError(null);
    }
  }, [isOpen, categoryToEdit]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length > 32) {
      setError('Название не должно превышать 32 символа');
      return;
    }

    if (categoryToEdit) {
      const updated = categoriesService.updateCategory(categoryToEdit.id, {
        name: trimmed || undefined,
        color: selectedColor,
        icon: selectedIcon,
      });
      if (updated) {
        onSaved(updated);
        onClose();
      }
    } else {
      const created = categoriesService.createCategory(trimmed || undefined, selectedColor, selectedIcon);
      onSaved(created);
      onClose();
    }
  };

  const isEditing = !!categoryToEdit;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Редактировать категорию' : 'Новая категория'}
      footer={
        <div className="create-category-modal__footer">
          <Button variant="ghost" size="md" onClick={onClose} type="button">
            Отмена
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => handleSubmit()}
            type="button"
          >
            {isEditing ? 'Сохранить изменения' : 'Создать категорию'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="create-category-modal__form">
        {/* 1. Icon Selector: 3 Base + 10 Extended */}
        <div className="create-category-modal__field">
          <label className="create-category-modal__label">
            Иконка категории
          </label>
          <CategoryIconSelector
            selectedIcon={selectedIcon}
            onSelectIcon={setSelectedIcon}
            selectedColor={selectedColor}
          />
        </div>

        {/* 2. Optional Name Field */}
        <div className="create-category-modal__field">
          <Input
            label="Название категории (необязательно)"
            placeholder="Например: Покупки, Здоровье, Планы..."
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            error={error || undefined}
            maxLength={32}
            helperText="Можно оставить пустым — категория отображается цветной иконкой"
          />
        </div>

        {/* 3. Color Palette */}
        <div className="create-category-modal__field">
          <label className="create-category-modal__label">
            Цвет категории
          </label>
          <div className="create-category-modal__palette" role="radiogroup" aria-label="Палитра цветов">
            {LOVIA_CATEGORY_PALETTE.map((swatch) => {
              const isSelected = selectedColor.toLowerCase() === swatch.hex.toLowerCase();
              return (
                <button
                  key={swatch.hex}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`${swatch.name} цвет`}
                  className={`create-category-modal__swatch ${isSelected ? 'create-category-modal__swatch--selected' : ''}`}
                  style={{ backgroundColor: swatch.hex }}
                  onClick={() => setSelectedColor(swatch.hex)}
                >
                  {isSelected && (
                    <Icon name="check" size={14} className="create-category-modal__swatch-check" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="create-category-modal__field">
          <label className="create-category-modal__label">
            Предпросмотр метки
          </label>
          <div className="create-category-modal__preview-box">
            <CategoryMarker
              name={name.trim() || 'Название категории'}
              color={selectedColor}
              variant="chip"
            />
            <CategoryMarker
              name={name.trim() || 'Название категории'}
              color={selectedColor}
              variant="tag"
            />
            <div className="create-category-modal__preview-dot-sample">
              <CategoryMarker
                name={name.trim() || 'Название категории'}
                color={selectedColor}
                variant="dot"
              />
              <span className="create-category-modal__preview-text">
                {name.trim() || 'Название категории'}
              </span>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
