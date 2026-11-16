import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Button } from '../../../components/ui/Button/Button';
import { Icon } from '../../../components/ui/Icon/Icon';
import { UserCategory } from '../../../types/category';
import { requestsService } from '../../../services/requestsService';
import './CategoryDeleteDialog.css';

export interface CategoryDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  category: UserCategory | null;
  otherCategories: UserCategory[];
  affectedCount?: number;
  onConfirm: (reassignToId?: string) => void;
}

const getPrepositionalReminders = (count: number): string => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return 'напоминании';
  }
  return 'напоминаниях';
};

export const CategoryDeleteDialog: React.FC<CategoryDeleteDialogProps> = ({
  isOpen,
  onClose,
  category,
  otherCategories,
  affectedCount: propAffectedCount,
  onConfirm,
}) => {
  const [actionChoice, setActionChoice] = useState<'unlink' | 'reassign'>('unlink');
  const [selectedReassignId, setSelectedReassignId] = useState<string>(
    otherCategories[0]?.id || ''
  );

  if (!category) return null;

  const affectedCount =
    propAffectedCount !== undefined
      ? propAffectedCount
      : requestsService.getAffectedRemindersCount(category.id);

  const categoryDisplayName = (category.name && category.name.trim()) || 'Категория';
  const hasOtherCategories = otherCategories.length > 0;

  const handleDelete = () => {
    if (affectedCount > 0 && actionChoice === 'reassign' && selectedReassignId) {
      onConfirm(selectedReassignId);
    } else {
      onConfirm(undefined);
    }
  };

  // Case 1: 0 Reminders linked -> Simple Confirmation
  if (affectedCount === 0) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Удалить категорию?"
      >
        <div className="category-delete-dialog">
          <div className="category-delete-dialog__simple-box">
            <p className="category-delete-dialog__simple-desc">
              Вы уверены, что хотите удалить категорию <strong>«{categoryDisplayName}»</strong>?
            </p>
            <span className="category-delete-dialog__zero-hint">
              С этой категорией нет связанных напоминаний.
            </span>
          </div>

          <div className="category-delete-dialog__actions">
            <Button variant="ghost" type="button" onClick={onClose}>
              Отмена
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={handleDelete}
              style={{ background: 'var(--color-danger, #e53e3e)', borderColor: 'var(--color-danger, #e53e3e)' }}
            >
              Удалить категорию
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Case 2: N > 0 Reminders linked -> Safe Unlink vs Reassign Choice
  const pluralWord = getPrepositionalReminders(affectedCount);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Удаление категории"
    >
      <div className="category-delete-dialog">
        <div className="category-delete-dialog__warning-box">
          <Icon name="alert" size={20} className="category-delete-warning-icon" />
          <div className="category-delete-dialog__warning-text">
            <strong>
              Эта категория используется в {affectedCount} {pluralWord}. Что с ними сделать?
            </strong>
            <p>
              Сами напоминания останутся в сохранности. Выберите, как с ними поступить:
            </p>
          </div>
        </div>

        <div className="category-delete-dialog__options" role="radiogroup" aria-label="Действие с напоминаниями">
          {/* Option 1: Unlink (Default) */}
          <label className={`category-delete-option ${actionChoice === 'unlink' ? 'category-delete-option--active' : ''}`}>
            <input
              type="radio"
              name="delete-action"
              value="unlink"
              checked={actionChoice === 'unlink'}
              onChange={() => setActionChoice('unlink')}
              className="category-delete-radio"
            />
            <div className="category-delete-option__content">
              <span className="category-delete-option__title">Оставить без категории</span>
              <span className="category-delete-option__desc">
                Карточки напоминаний останутся в списке и вернутся к стандартному стилю
              </span>
            </div>
          </label>

          {/* Option 2: Reassign to another category (if any available) */}
          {hasOtherCategories && (
            <label className={`category-delete-option ${actionChoice === 'reassign' ? 'category-delete-option--active' : ''}`}>
              <input
                type="radio"
                name="delete-action"
                value="reassign"
                checked={actionChoice === 'reassign'}
                onChange={() => setActionChoice('reassign')}
                className="category-delete-radio"
              />
              <div className="category-delete-option__content">
                <span className="category-delete-option__title">Перенести в другую категорию</span>
                <span className="category-delete-option__desc">
                  Все напоминания получат цвет и иконку выбранной категории
                </span>

                {actionChoice === 'reassign' && (
                  <div className="category-delete-reassign-select-wrap" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={selectedReassignId}
                      onChange={(e) => setSelectedReassignId(e.target.value)}
                      className="category-delete-select"
                      aria-label="Выберите целевую категорию"
                    >
                      {otherCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {(c.name && c.name.trim()) || 'Категория'} ({c.color})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </label>
          )}
        </div>

        <div className="category-delete-dialog__actions">
          <Button variant="ghost" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant="primary"
            type="button"
            onClick={handleDelete}
            style={{ background: 'var(--color-danger, #e53e3e)', borderColor: 'var(--color-danger, #e53e3e)' }}
          >
            Удалить категорию
          </Button>
        </div>
      </div>
    </Modal>
  );
};
