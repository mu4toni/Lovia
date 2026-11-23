import React, { useState, useEffect } from 'react';
import { MemorableDate, CreateMemorableDateInput } from '../../../types/relationship';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Button } from '../../../components/ui/Button/Button';
import { Input } from '../../../components/ui/Input/Input';
import { DatePicker } from '../../../components/ui/DatePicker/DatePicker';
import { Textarea } from '../../../components/ui/Input/Textarea';
import { Switch } from '../../../components/ui/Switch/Switch';
import { getTodayDateString } from '../../../utils/dateCalculations';
import './CreateEditMemorableDateModal.css';

export interface CreateEditMemorableDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateMemorableDateInput) => void | Promise<void>;
  initialDate?: MemorableDate | null;
}

export const CreateEditMemorableDateModal: React.FC<CreateEditMemorableDateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialDate,
}) => {
  const isEditing = Boolean(initialDate);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [isAnnual, setIsAnnual] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsSubmitting(false);
    if (initialDate) {
      setTitle(initialDate.title || '');
      setDate(initialDate.date || '');
      setDescription(initialDate.description || '');
      setIsAnnual(initialDate.isAnnual ?? true);
      setError(null);
    } else {
      setTitle('');
      setDate(getTodayDateString());
      setDescription('');
      setIsAnnual(true);
      setError(null);
    }
  }, [initialDate, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Введите название памятной даты');
      return;
    }
    if (!date) {
      setError('Выберите дату события');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: cleanTitle,
        date,
        description: description.trim() || undefined,
        isAnnual,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Редактировать дату' : 'Памятная дата'}
    >
      <form onSubmit={handleSubmit} className="memorable-date-form">
        {error && (
          <div className="memorable-date-form__error" role="alert">
            {error}
          </div>
        )}

        <div className="memorable-date-form__field">
          <Input
            label="Название события *"
            placeholder="Например: Первый поцелуй, Знакомство..."
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError(null);
            }}
            required
            autoFocus
          />
        </div>

        <div className="memorable-date-form__field">
          <DatePicker
            label="Дата события *"
            value={date}
            onChange={(newDate) => {
              setDate(newDate);
              if (error) setError(null);
            }}
            required
          />
        </div>

        <div className="memorable-date-form__field">
          <Textarea
            label="Описание или воспоминание"
            placeholder="Что особенного произошло в этот день?.."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="memorable-date-form__switch-wrap">
          <Switch
            checked={isAnnual}
            onChange={setIsAnnual}
            label="Повторяется каждый год"
            description="Приложение будет вести обратный отсчёт до следующей годовщины"
          />
        </div>

        <div className="memorable-date-form__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isEditing ? 'Сохранить изменения' : 'Добавить дату'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
