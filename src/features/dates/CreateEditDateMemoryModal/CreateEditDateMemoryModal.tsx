import React, { useState, useEffect, useRef } from 'react';
import { DateMemory, CreateDateMemoryInput, DatePlace } from '../../../types/dates';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Button } from '../../../components/ui/Button/Button';
import { Input } from '../../../components/ui/Input/Input';
import { DatePicker } from '../../../components/ui/DatePicker/DatePicker';
import { Textarea } from '../../../components/ui/Input/Textarea';
import { Icon } from '../../../components/ui/Icon/Icon';
import { PlaceCard } from '../PlaceCard/PlaceCard';
import { PlacePickerModal } from '../PlacePickerModal/PlacePickerModal';
import { getTodayDateString, isFutureDate } from '../../../utils/dateCalculations';
import { useSpaceMode } from '../../../hooks/useSpaceMode';
import './CreateEditDateMemoryModal.css';

export interface CreateEditDateMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateDateMemoryInput) => void;
  initialMemory?: DateMemory | null;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const CreateEditDateMemoryModal: React.FC<CreateEditDateMemoryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialMemory,
}) => {
  const { isFriendship } = useSpaceMode();
  const isEditing = Boolean(initialMemory);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [place, setPlace] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<DatePlace | null>(null);
  const [isPlacePickerOpen, setIsPlacePickerOpen] = useState(false);
  const [story, setStory] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialMemory) {
      setTitle(initialMemory.title || '');
      setDate(initialMemory.date || '');
      setPlace(initialMemory.place || '');
      if (initialMemory.location) {
        setSelectedPlace(initialMemory.location);
      } else if (initialMemory.place) {
        setSelectedPlace({
          placeName: initialMemory.place,
          latitude: 55.7522,
          longitude: 37.6156,
        });
      } else {
        setSelectedPlace(null);
      }
      setStory(initialMemory.story || '');
      setPhotos(initialMemory.photos ? [...initialMemory.photos] : []);
      setError(null);
    } else {
      setTitle('');
      setDate(getTodayDateString());
      setPlace('');
      setSelectedPlace(null);
      setStory('');
      setPhotos([]);
      setError(null);
    }
  }, [initialMemory, isOpen]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setIsReadingFiles(true);

    const fileList = Array.from(files);
    let loadedCount = 0;
    const newPhotos: string[] = [];
    let hasSizeError = false;

    fileList.forEach((file) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        hasSizeError = true;
        loadedCount++;
        if (loadedCount === fileList.length) {
          setIsReadingFiles(false);
          if (newPhotos.length > 0) {
            setPhotos((prev) => [...prev, ...newPhotos]);
          }
          setError('Некоторые файлы превышают допустимый размер 5 МБ и не были добавлены');
        }
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          newPhotos.push(reader.result);
        }
        loadedCount++;
        if (loadedCount === fileList.length) {
          setIsReadingFiles(false);
          setPhotos((prev) => [...prev, ...newPhotos]);
          if (hasSizeError) {
            setError('Некоторые файлы превышают 5 МБ и не были загружены');
          }
        }
      };
      reader.onerror = () => {
        loadedCount++;
        if (loadedCount === fileList.length) {
          setIsReadingFiles(false);
        }
        setError('Произошла ошибка при чтении изображения');
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError(isFriendship ? 'Введите название встречи' : 'Введите название свидания');
      return;
    }

    if (!date) {
      setError(isFriendship ? 'Выберите дату встречи' : 'Выберите дату свидания');
      return;
    }

    if (isFutureDate(date)) {
      setError(
        isFriendship
          ? 'Можно сохранять только воспоминания о встречах, которые уже состоялись. Будущую дату выбрать нельзя.'
          : 'Можно сохранять только воспоминания о свиданиях, которые уже состоялись. Будущую дату выбрать нельзя.'
      );
      return;
    }

    setError(null);
    onSubmit({
      title: cleanTitle,
      date,
      place: selectedPlace?.placeName || place.trim() || undefined,
      location: selectedPlace || undefined,
      story: story.trim() || undefined,
      photos,
    });
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          isEditing
            ? isFriendship
              ? 'Редактировать встречу'
              : 'Редактировать свидание'
            : 'Новое воспоминание'
        }
      >
        <form onSubmit={handleSubmit} className="date-memory-form">
          {error && (
            <div className="date-memory-form__error" role="alert">
              {error}
            </div>
          )}

          <div className="date-memory-form__field">
            <Input
              label={isFriendship ? 'Название встречи *' : 'Название свидания *'}
              placeholder={
                isFriendship
                  ? 'Например: Прогулка в парке, Поездка за город...'
                  : 'Например: Наш первый поход в кино, Вечер у моря...'
              }
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              required
              autoFocus
            />
          </div>

          <div className="date-memory-form__field">
            <DatePicker
              label={isFriendship ? 'Дата встречи *' : 'Дата свидания *'}
              maxDate={getTodayDateString()}
              value={date}
              onChange={(newDate) => {
                setDate(newDate);
                if (isFutureDate(newDate)) {
                  setError(
                    isFriendship
                      ? 'Можно сохранять только воспоминания о встречах, которые уже состоялись. Будущую дату выбрать нельзя.'
                      : 'Можно сохранять только воспоминания о свиданиях, которые уже состоялись. Будущую дату выбрать нельзя.'
                  );
                } else if (error) {
                  setError(null);
                }
              }}
              required
            />
            <span className="date-memory-form__hint">
              Раздел предназначен только для уже состоявшихся встреч
            </span>
          </div>

          {/* Place Picker Section replacing plain link/text field */}
          <div className="date-memory-form__field">
            <label className="date-memory-form__label">Место встречи</label>
            <PlaceCard
              place={selectedPlace}
              onSelectPlace={() => setIsPlacePickerOpen(true)}
              onRemovePlace={() => {
                setSelectedPlace(null);
                setPlace('');
              }}
            />
          </div>

          <div className="date-memory-form__field">
            <Textarea
              label="История и впечатления"
              placeholder="Расскажите, как прошёл этот день, что запомнилось и какие эмоции остались..."
              value={story}
              onChange={(e) => setStory(e.target.value)}
              rows={4}
            />
          </div>

          {/* Photo Upload Section */}
          <div className="date-memory-form__field">
            <label className="date-memory-form__label">Фотографии с встречи</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
            />

            <div className="date-memory-form__photos-area">
              {photos.map((photoUrl, index) => (
                <div key={index} className="date-memory-form__photo-item">
                  <img
                    src={photoUrl}
                    alt={`Фото ${index + 1}`}
                    className="date-memory-form__photo-img"
                  />
                  <button
                    type="button"
                    className="date-memory-form__remove-photo-btn"
                    onClick={() => handleRemovePhoto(index)}
                    title="Удалить фото"
                    aria-label={`Удалить фото ${index + 1}`}
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                className="date-memory-form__add-photo-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isReadingFiles}
                aria-label="Прикрепить фотографии"
              >
                <Icon name="camera" size={20} />
                <span className="date-memory-form__add-photo-text">
                  {isReadingFiles ? 'Загрузка...' : 'Добавить фото'}
                </span>
              </button>
            </div>
            <span className="date-memory-form__hint">
              Можно выбрать одно или несколько фото с устройства (до 5 МБ каждое)
            </span>
          </div>

          <div className="date-memory-form__actions">
            <Button type="button" variant="ghost" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" variant="primary">
              Сохранить воспоминание
            </Button>
          </div>
        </form>
      </Modal>

      {/* Interactive Map Place Picker Modal */}
      <PlacePickerModal
        isOpen={isPlacePickerOpen}
        onClose={() => setIsPlacePickerOpen(false)}
        initialPlace={selectedPlace}
        onSelectPlace={(newPlace) => {
          setSelectedPlace(newPlace);
          setPlace(newPlace.placeName);
        }}
      />
    </>
  );
};
