import React, { useState } from 'react';
import { UserCategory } from '../../../types/category';
import { Icon } from '../../../components/ui/Icon/Icon';
import { Button } from '../../../components/ui/Button/Button';
import { CategoryEditorModal } from '../CategoryEditorModal/CategoryEditorModal';
import { CategoryDeleteDialog } from '../CategoryDeleteDialog/CategoryDeleteDialog';
import { categoriesService } from '../../../services/categoriesService';
import { requestsService } from '../../../services/requestsService';
import { getContrastColor } from '../../../utils/categories';
import './ReminderCategoriesManager.css';

export interface ReminderCategoriesManagerProps {
  categories: UserCategory[];
  onCategoriesChanged: () => void;
}

export const ReminderCategoriesManager: React.FC<ReminderCategoriesManagerProps> = ({
  categories,
  onCategoriesChanged,
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<UserCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<UserCategory | null>(null);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (cat: UserCategory) => {
    setEditingCategory(cat);
    setIsEditorOpen(true);
  };

  const handleConfirmDelete = async (reassignToId?: string) => {
    if (!deletingCategory) return;
    await categoriesService.deleteAndReassign(deletingCategory.id, reassignToId);
    setDeletingCategory(null);
    onCategoriesChanged();
  };

  return (
    <section className="categories-manager" aria-label="Управление категориями напоминаний">
      {/* 1. Header with Title, Subtitle and Add Button */}
      <div className="categories-manager__header">
        <div className="categories-manager__titles">
          <div className="categories-manager__title-row">
            <Icon name="tag" size={17} className="categories-manager__icon" />
            <h3 className="categories-manager__title">Категории напоминаний</h3>
            {categories.length > 0 && (
              <span className="categories-manager__count">{categories.length}</span>
            )}
          </div>
          <p className="categories-manager__subtitle">
            Создавайте собственные цвета для важных моментов
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleOpenCreate}
          className="categories-manager__add-btn"
          leftIcon={<Icon name="plus" size={15} />}
        >
          Добавить
        </Button>
      </div>

      {/* 2. Content: Empty State or Grid of Category Cards */}
      {categories.length === 0 ? (
        <div className="categories-manager__empty">
          <div className="categories-manager__empty-icon" aria-hidden="true">
            <Icon name="palette" size={24} />
          </div>
          <p className="categories-manager__empty-title">Пока нет созданных категорий</p>
          <p className="categories-manager__empty-desc">
            Выберите любимый оттенок из 18 цветов палитры Lovia. Напоминания в разделе «Дом» окрасятся в этот цвет.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            leftIcon={<Icon name="plus" size={15} />}
          >
            Создать первую категорию
          </Button>
        </div>
      ) : (
        <div className="categories-manager__list">
          {categories.map((cat) => {
            const hasName = Boolean(cat.name && cat.name.trim().length > 0);
            const displayName = hasName && cat.name ? cat.name.trim() : 'Категория';
            const contrastText = getContrastColor(cat.color);

            return (
              <div key={cat.id} className="category-item-card">
                <div className="category-item-card__left">
                  {/* Color Swatch Pill */}
                  <div
                    className="category-item-card__swatch"
                    style={{ backgroundColor: cat.color }}
                    aria-hidden="true"
                  >
                    <span style={{ color: contrastText }}>
                      <Icon name={(cat.icon || 'heart') as any} size={15} strokeWidth={1.8} />
                    </span>
                  </div>

                  <div className="category-item-card__info">
                    <span className="category-item-card__name">{displayName}</span>
                    <span className="category-item-card__color-hex">{cat.color}</span>
                  </div>
                </div>

                <div className="category-item-card__actions">
                  <button
                    type="button"
                    className="category-item-card__action-btn"
                    onClick={() => handleOpenEdit(cat)}
                    title="Редактировать категорию"
                    aria-label={`Редактировать категорию «${displayName}»`}
                  >
                    <Icon name="edit" size={15} />
                  </button>

                  <button
                    type="button"
                    className="category-item-card__action-btn category-item-card__action-btn--delete"
                    onClick={() => setDeletingCategory(cat)}
                    title="Удалить категорию"
                    aria-label={`Удалить категорию «${displayName}»`}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Category Editor Modal (Create or Edit) */}
      <CategoryEditorModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingCategory(null);
        }}
        categoryToEdit={editingCategory}
        onSaved={() => {
          setIsEditorOpen(false);
          setEditingCategory(null);
          onCategoriesChanged();
        }}
      />

      {/* Safe Category Deletion Dialog */}
      <CategoryDeleteDialog
        isOpen={Boolean(deletingCategory)}
        onClose={() => setDeletingCategory(null)}
        category={deletingCategory}
        otherCategories={categories.filter((c) => c.id !== deletingCategory?.id)}
        affectedCount={
          deletingCategory
            ? requestsService.getAffectedRemindersCount(deletingCategory.id)
            : 0
        }
        onConfirm={handleConfirmDelete}
      />
    </section>
  );
};
