import React, { useState, useEffect } from 'react';
import { CoupleReminder, CreateReminderInput } from '../../../types';
import { UserCategory, DEFAULT_BASE_CATEGORIES } from '../../../types/category';
import { UrgencyLevel } from '../../ui/Badge/Badge';
import { Modal } from '../../ui/Modal/Modal';
import { Button } from '../../ui/Button/Button';
import { Textarea } from '../../ui/Input/Textarea';
import { Input } from '../../ui/Input/Input';
import { Icon } from '../../ui/Icon/Icon';
import { getGenitivePartnerName, getContrastColor } from '../../../utils/categories';
import { categoriesService } from '../../../services/categoriesService';
import { DeadlineSelector, DeadlineValue } from './DeadlineSelector';
import './CreateRequestModal.css';

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateReminderInput) => void;
  onUpdate?: (id: string, input: Partial<CreateReminderInput>) => void;
  editingReminder?: CoupleReminder | null;
  partnerName: string;
  categories?: UserCategory[];
  onCategoryCreated?: (category?: UserCategory) => void;
}

export const CreateRequestModal: React.FC<CreateRequestModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onUpdate,
  editingReminder,
  partnerName,
  categories,
}) => {
  const [title, setTitle] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);

  const [deadline, setDeadline] = useState<DeadlineValue>({
    mode: 'none',
    dueLabel: 'Без срока',
  });
  const [dueTime, setDueTime] = useState<string>('');

  // Primary Block 4: Target recipient (on main screen)
  const [target, setTarget] = useState<'partner' | 'self' | 'common'>('partner');

  // Collapsed accordion «Дополнительные параметры»
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [urgency, setUrgency] = useState<UrgencyLevel>('medium');
  const [description, setDescription] = useState('');
  const [rewardNote, setRewardNote] = useState('');
  const [error, setError] = useState('');

  // Local synced categories from service
  const [savedCategories, setSavedCategories] = useState<UserCategory[]>(() =>
    categoriesService.getCategories()
  );

  useEffect(() => {
    const handleUpdate = () => {
      setSavedCategories(categoriesService.getCategories());
    };
    window.addEventListener('lovia_categories_updated', handleUpdate);
    return () => {
      window.removeEventListener('lovia_categories_updated', handleUpdate);
    };
  }, []);

  const activeCategories =
    (categories && categories.length > 0 ? categories : savedCategories).length > 0
      ? (categories && categories.length > 0 ? categories : savedCategories)
      : DEFAULT_BASE_CATEGORIES;

  // Prefill when editingReminder is present or reset when opening fresh
  useEffect(() => {
    if (!isOpen) return;

    if (editingReminder) {
      setTitle(editingReminder.title || '');
      setSelectedColor(editingReminder.categoryColor || null);
      setSelectedIcon(editingReminder.categoryIcon || (editingReminder.categoryColor ? 'heart' : null));
      setSelectedCategoryId(editingReminder.categoryId);
      setDescription(editingReminder.description || '');
      setRewardNote(editingReminder.rewardNote || '');

      if (editingReminder.targetId === 'all') {
        setTarget('common');
      } else if (editingReminder.targetId === 'user-self') {
        setTarget('self');
      } else {
        setTarget('partner');
      }

      setUrgency(editingReminder.urgency || 'medium');
      setDueTime(editingReminder.dueTime || '');

      if (editingReminder.dueDate) {
        const parsedDate = new Date(editingReminder.dueDate);
        const timePart =
          editingReminder.dueTime ||
          (editingReminder.dueDate.includes('T')
            ? editingReminder.dueDate.split('T')[1].substring(0, 5)
            : undefined);
        const now = new Date();
        const isEditingToday =
          !isNaN(parsedDate.getTime()) &&
          parsedDate.getFullYear() === now.getFullYear() &&
          parsedDate.getMonth() === now.getMonth() &&
          parsedDate.getDate() === now.getDate() &&
          !timePart;

        setDeadline({
          mode: isEditingToday ? 'today' : 'custom',
          date: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
          time: timePart,
          dueLabel: editingReminder.dueLabel || 'До даты',
        });
      } else {
        setDeadline({
          mode: 'none',
          dueLabel: editingReminder.dueLabel || 'Без срока',
        });
      }

      const hasAdvancedData = Boolean(
        editingReminder.description ||
          editingReminder.rewardNote ||
          editingReminder.urgency !== 'medium'
      );
      setIsAdvancedOpen(hasAdvancedData);
      setError('');
    } else {
      setTitle('');
      setSelectedIcon(null);
      setSelectedColor(null);
      setSelectedCategoryId(undefined);
      setDescription('');
      setRewardNote('');
      setDueTime('');
      setTarget('partner');
      setUrgency('medium');
      setDeadline({ mode: 'none', dueLabel: 'Без срока' });
      setIsAdvancedOpen(false);
      setError('');
    }
  }, [isOpen, editingReminder]);

  const targetPartnerDisplay = getGenitivePartnerName(partnerName);

  const handleSelectSavedCategory = (cat: UserCategory) => {
    if (selectedCategoryId === cat.id) {
      handleResetCategory();
    } else {
      setSelectedCategoryId(cat.id);
      setSelectedIcon(cat.icon || 'heart');
      setSelectedColor(cat.color);
    }
  };

  const handleResetCategory = () => {
    setSelectedCategoryId(undefined);
    setSelectedIcon(null);
    setSelectedColor(null);
  };

  const handleSetTime = (newTime: string) => {
    setDueTime(newTime);
    setDeadline((prev) => {
      const baseLabel = prev.dueLabel.includes('·') ? prev.dueLabel.split('·')[0].trim() : prev.dueLabel;
      return {
        ...prev,
        time: newTime || undefined,
        dueLabel: newTime ? `${baseLabel} · ${newTime}` : baseLabel,
      };
    });
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      setError('Пожалуйста, укажите название напоминания');
      return;
    }

    let isoDueDate = '';
    const isDateActive =
      deadline.mode === 'today' ||
      deadline.mode === 'custom' ||
      (deadline.mode as string) === 'date';

    if (isDateActive && deadline.date) {
      const d = new Date(deadline.date);
      const effectiveTime = deadline.time || dueTime;
      if (effectiveTime) {
        const [hours, minutes] = effectiveTime.split(':').map(Number);
        d.setHours(isNaN(hours) ? 0 : hours, isNaN(minutes) ? 0 : minutes, 0, 0);
      }
      isoDueDate = d.toISOString();
    }

    let targetId = 'user-partner';
    let targetName = `Для ${targetPartnerDisplay}`;
    if (target === 'self') {
      targetId = 'user-self';
      targetName = 'Для меня';
    } else if (target === 'common') {
      targetId = 'all';
      targetName = 'Для нас обоих';
    }

    const payload: CreateReminderInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      targetId,
      targetName,
      dueDate: isoDueDate,
      dueLabel: deadline.dueLabel,
      dueTime: (deadline.time || dueTime) || undefined,
      urgency,
      categoryId: selectedCategoryId,
      categoryColor: selectedColor || undefined,
      categoryIcon: selectedIcon || undefined,
      rewardNote: rewardNote.trim() || undefined,
    };

    if (editingReminder && onUpdate) {
      onUpdate(editingReminder.id, payload);
    } else {
      onSubmit(payload);
    }

    onClose();
  };

  const urgencies: { key: UrgencyLevel; label: string; dotClass: string }[] = [
    { key: 'low', label: 'Спокойно', dotClass: 'create-urgency-dot--low' },
    { key: 'medium', label: 'Важно', dotClass: 'create-urgency-dot--medium' },
    { key: 'high', label: 'Срочно', dotClass: 'create-urgency-dot--high' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingReminder ? 'Редактировать напоминание' : 'Новое напоминание'}
      footer={
        <div className="create-request-footer">
          <Button
            variant="primary"
            fullWidth
            onClick={() => handleSubmit()}
            type="button"
            className="create-request-submit-btn"
          >
            {editingReminder ? 'Сохранить изменения' : 'Создать напоминание'}
          </Button>
          <button
            type="button"
            className="create-request-cancel-link"
            onClick={onClose}
          >
            Отмена
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="create-request-form">
        {/* 1. Название напоминания («Что нужно сделать? *») */}
        <div className="create-form-field">
          <label className="create-form-label" htmlFor="request-title-input">
            Что нужно сделать? *
          </label>
          <input
            id="request-title-input"
            className={`create-request-title-input ${error ? 'create-request-title-input--error' : ''}`}
            placeholder="Например: Заказать столик на пятницу..."
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError('');
            }}
            autoFocus
            required
            aria-required="true"
            aria-invalid={Boolean(error)}
          />
          {error && <span className="create-input-error-msg">{error}</span>}
        </div>

        {/* 2. Дата напоминания (по умолчанию — «Без срока», 2 чипа на всю ширину) */}
        <div className="create-form-field">
          <DeadlineSelector
            value={deadline}
            onChange={setDeadline}
            dueTime={dueTime}
            onDueTimeChange={handleSetTime}
          />
        </div>

        {/* 3. Категория (готовые базовые категории + «Без категории») */}
        <div className="create-form-field">
          <div className="create-form-label-row">
            <label className="create-form-label">Категория</label>
            {selectedCategoryId && (
              <button
                type="button"
                className="create-category-reset-link"
                onClick={handleResetCategory}
              >
                Снять категорию
              </button>
            )}
          </div>

          <div className="create-category-chips-row" role="radiogroup" aria-label="Выбор категории">
            {/* Option: Без категории (reset) */}
            <button
              type="button"
              role="radio"
              aria-checked={!selectedCategoryId}
              className={`create-cat-chip create-cat-chip--none ${
                !selectedCategoryId ? 'create-cat-chip--active' : ''
              }`}
              onClick={handleResetCategory}
              title="Без категории"
              aria-label="Без категории"
            >
              <span className="create-cat-circle create-cat-circle--none" aria-hidden="true" />
              <span>Без категории</span>
            </button>

            {/* Ready standard base categories available immediately out of the box */}
            {activeCategories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              const contrastText = getContrastColor(cat.color);
              const hasName = Boolean(cat.name && cat.name.trim());
              const displayName = hasName && cat.name ? cat.name.trim() : 'Категория';

              return (
                <button
                  key={cat.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`create-cat-chip ${isSelected ? 'create-cat-chip--active' : ''}`}
                  style={{
                    backgroundColor: isSelected ? cat.color : `${cat.color}1e`,
                    borderColor: cat.color,
                    color: isSelected ? contrastText : 'var(--text-primary)',
                  }}
                  onClick={() => handleSelectSavedCategory(cat)}
                  title={displayName}
                  aria-label={displayName}
                >
                  <span
                    className="create-cat-circle"
                    style={{
                      backgroundColor: cat.color,
                      borderColor: isSelected ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
                    }}
                    aria-hidden="true"
                  />
                  {hasName && <span className="create-cat-chip__label">{displayName}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Для кого задача (на главном экране, компактный 3-сегментный переключатель) */}
        <div className="create-form-field">
          <label className="create-form-label">Для кого задача</label>
          <div className="create-target-toggle" role="radiogroup" aria-label="Получатель напоминания">
            <button
              type="button"
              role="radio"
              aria-checked={target === 'partner'}
              className={`create-target-btn ${
                target === 'partner' ? 'create-target-btn--active' : ''
              }`}
              onClick={() => setTarget('partner')}
            >
              Для {targetPartnerDisplay}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={target === 'self'}
              className={`create-target-btn ${
                target === 'self' ? 'create-target-btn--active' : ''
              }`}
              onClick={() => setTarget('self')}
            >
              Для меня
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={target === 'common'}
              className={`create-target-btn ${
                target === 'common' ? 'create-target-btn--active' : ''
              }`}
              onClick={() => setTarget('common')}
            >
              Для нас обоих
            </button>
          </div>
        </div>

        {/* Accordion: «Дополнительные параметры» (по умолчанию свёрнут) */}
        <div className="create-advanced-section">
          <button
            type="button"
            className="create-advanced-toggle"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            aria-expanded={isAdvancedOpen}
          >
            <span className="create-advanced-toggle__label">
              <Icon name="sparkles" size={14} className="create-advanced-toggle__icon" />
              <span>Дополнительные параметры</span>
            </span>
            <Icon
              name={isAdvancedOpen ? 'chevron-up' : 'chevron-down'}
              size={14}
              className="create-advanced-toggle__chevron"
            />
          </button>

          {isAdvancedOpen && (
            <div className="create-advanced-drawer">
              {/* Приоритет / Срочность */}
              <div className="create-form-field">
                <label className="create-form-label">Приоритет</label>
                <div className="create-urgency-row">
                  {urgencies.map((u) => (
                    <button
                      key={u.key}
                      type="button"
                      className={`create-urgency-btn ${
                        urgency === u.key ? 'create-urgency-btn--active' : ''
                      }`}
                      onClick={() => setUrgency(u.key)}
                    >
                      <span className={`create-urgency-dot ${u.dotClass}`} />
                      <span>{u.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Подробности / заметка */}
              <Textarea
                label="Подробности"
                placeholder="Любые важные детали, пожелания или ссылка..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />

              {/* Романтическая записка / награда */}
              <Input
                label="Приятная благодарность (по желанию)"
                placeholder="Например: С меня вкусный ужин и массаж"
                value={rewardNote}
                onChange={(e) => setRewardNote(e.target.value)}
              />
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};
