import React, { useState, useEffect, useRef } from 'react';
import { MemorableDate, CreateMemorableDateInput } from '../../../types/relationship';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Button } from '../../../components/ui/Button/Button';
import { Input } from '../../../components/ui/Input/Input';
import { DatePicker } from '../../../components/ui/DatePicker/DatePicker';
import { Textarea } from '../../../components/ui/Input/Textarea';
import { Switch } from '../../../components/ui/Switch/Switch';
import { Icon } from '../../../components/ui/Icon/Icon';
import { getTodayDateString } from '../../../utils/dateCalculations';
import { compressImageFile } from '../../../utils/imageCompressor';
import { normalizeMediaUrl } from '../../../utils/media';
import './CreateEditMemorableDateModal.css';

const MAX_MEMORABLE_PHOTOS = 2;

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [isAnnual, setIsAnnual] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsSubmitting(false);
    if (initialDate) {
      setTitle(initialDate.title || '');
      setDate(initialDate.date || '');
      setDescription(initialDate.description || '');
      setIsAnnual(initialDate.isAnnual ?? true);
      setPhotos(initialDate.photos ? initialDate.photos.slice(0, MAX_MEMORABLE_PHOTOS) : []);
      setError(null);
    } else {
      setTitle('');
      setDate(getTodayDateString());
      setDescription('');
      setIsAnnual(true);
      setPhotos([]);
      setError(null);
    }
  }, [initialDate, isOpen]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = MAX_MEMORABLE_PHOTOS - photos.length;
    if (remainingSlots <= 0) {
      e.target.value = '';
      return;
    }

    setError(null);
    setIsReadingFiles(true);
    const fileList = Array.from(files).slice(0, remainingSlots);

    try {
      const compressed = await Promise.all(
        fileList.map(async (file) => {
          try {
            return await compressImageFile(file, 1280, 1280, 0.82);
          } catch {
            return null;
          }
        })
      );
      const valid = compressed.filter(Boolean) as string[];
      if (valid.length > 0) {
        setPhotos((prev) => [...prev, ...valid].slice(0, MAX_MEMORABLE_PHOTOS));
      } else {
        setError('Не удалось обработать выбранные изображения');
      }
    } catch {
      setError('Произошла ошибка при обработке изображений');
    } finally {
      setIsReadingFiles(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

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
        photos: photos.slice(0, MAX_MEMORABLE_PHOTOS),
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

        <div className="memorable-date-form__field">
          <div className="memorable-date-form__photos-head">
            <span className="memorable-date-form__photos-label">Фотографии (до 2)</span>
            {photos.length >= MAX_MEMORABLE_PHOTOS && (
              <span className="memorable-date-form__photos-limit">Максимум 2 фото</span>
            )}
          </div>
          <div className="memorable-date-form__photos-grid">
            {photos.map((photoUrl, idx) => (
              <div key={`${idx}-${photoUrl.slice(-12)}`} className="memorable-date-form__photo-item">
                <img
                  src={normalizeMediaUrl(photoUrl)}
                  alt={`Фото ${idx + 1}`}
                  className="memorable-date-form__photo-img"
                />
                <button
                  type="button"
                  className="memorable-date-form__photo-remove"
                  onClick={() => handleRemovePhoto(idx)}
                  aria-label={`Удалить фото ${idx + 1}`}
                >
                  ×
                </button>
              </div>
            ))}

            {photos.length < MAX_MEMORABLE_PHOTOS && (
              <button
                type="button"
                className="memorable-date-form__photo-add"
                onClick={() => fileInputRef.current?.click()}
                disabled={isReadingFiles}
              >
                <Icon name="camera" size={18} />
                <span>{isReadingFiles ? 'Сжимаем…' : '+ Добавить фото'}</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="memorable-date-form__file-input"
            onChange={handlePhotoUpload}
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
