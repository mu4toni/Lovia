import React, { useState } from 'react';
import { Modal } from '../ui/Modal/Modal';
import { Button } from '../ui/Button/Button';
import { IconButton } from '../ui/IconButton/IconButton';
import { Icon } from '../ui/Icon/Icon';
import { CategoryMarker } from '../ui/Category/CategoryMarker';
import { UserCategory } from '../../types/category';
import { categoriesService } from '../../services/categoriesService';
import { requestsService } from '../../services/requestsService';
import { CreateCategoryModal } from './CreateCategoryModal';
import './ManageCategoriesModal.css';

export interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: UserCategory[];
  onCategoriesChanged: () => void;
}

export const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCategoriesChanged,
}) => {
  const [editingCategory, setEditingCategory] = useState<UserCategory | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<UserCategory | null>(null);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (category: UserCategory) => {
    setEditingCategory(category);
    setIsCreateOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;
    categoriesService.deleteCategory(deletingCategory.id);
    await requestsService.unlinkCategory(deletingCategory.id);
    setDeletingCategory(null);
    onCategoriesChanged();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Категории напоминаний"
        footer={
          <div className="manage-categories-modal__footer">
            <Button
              variant="primary"
              size="md"
              fullWidth
              leftIcon={<Icon name="plus" size={16} />}
              onClick={handleOpenCreate}
            >
              Новая категория
            </Button>
          </div>
        }
      >
        <div className="manage-categories-modal__content">
          <p className="manage-categories-modal__description">
            Создавайте свои категории для удобной организации напоминаний. Напоминания можно создавать и без категорий.
          </p>

          {categories.length === 0 ? (
            <div className="manage-categories-modal__empty">
              <div className="manage-categories-modal__empty-icon">
                <Icon name="tag" size={28} />
              </div>
              <h4 className="manage-categories-modal__empty-title">Категорий пока нет</h4>
              <p className="manage-categories-modal__empty-text">
                Добавьте свои категории, чтобы разделять напоминания на темы — например «Покупки», «Планы», «Свидания».
              </p>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Icon name="plus" size={14} />}
                onClick={handleOpenCreate}
              >
                Создать первую категорию
              </Button>
            </div>
          ) : (
            <ul className="manage-categories-modal__list" aria-label="Список ваших категорий">
              {categories.map((cat) => (
                <li key={cat.id} className="manage-categories-modal__item">
                  <div className="manage-categories-modal__item-info">
                    <CategoryMarker name={cat.name} color={cat.color} icon={cat.icon} variant="dot" />
                    <span className="manage-categories-modal__item-name">{cat.name || 'Категория'}</span>
                  </div>
                  <div className="manage-categories-modal__item-actions">
                    <IconButton
                      icon={<Icon name="edit" size={14} />}
                      aria-label={`Редактировать категорию ${cat.name}`}
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEdit(cat)}
                    />
                    <IconButton
                      icon={<Icon name="trash" size={14} />}
                      aria-label={`Удалить категорию ${cat.name}`}
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingCategory(cat)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {deletingCategory && (
            <div className="manage-categories-modal__delete-confirm" role="alert">
              <div className="manage-categories-modal__confirm-text">
                <strong>Удалить категорию «{deletingCategory.name}»?</strong>
                <span>
                  Все напоминания останутся в сохранности, просто будут отображаться без категории.
                </span>
              </div>
              <div className="manage-categories-modal__confirm-buttons">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeletingCategory(null)}
                >
                  Отмена
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmDelete}
                  style={{ background: 'var(--state-error)', borderColor: 'var(--state-error)' }}
                >
                  Удалить
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <CreateCategoryModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingCategory(null);
        }}
        categoryToEdit={editingCategory}
        onSaved={() => {
          setIsCreateOpen(false);
          setEditingCategory(null);
          onCategoriesChanged();
        }}
      />
    </>
  );
};
