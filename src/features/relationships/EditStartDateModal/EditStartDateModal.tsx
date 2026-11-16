import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Button } from '../../../components/ui/Button/Button';
import { DatePicker } from '../../../components/ui/DatePicker/DatePicker';
import { Icon } from '../../../components/ui/Icon/Icon';
import { getTodayDateString, isFutureDate } from '../../../utils/dateCalculations';
import { useSpaceMode } from '../../../hooks/useSpaceMode';
import './EditStartDateModal.css';

export interface EditStartDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStartDate: string;
  onSave: (newDate: string) => void;
}

export const EditStartDateModal: React.FC<EditStartDateModalProps> = ({
  isOpen,
  onClose,
  currentStartDate,
  onSave,
}) => {
  const { isFriendship } = useSpaceMode();
  const [date, setDate] = useState(currentStartDate);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDate(currentStartDate);
    setError(null);
  }, [currentStartDate, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setError(isFriendship ? 'Выберите дату начала дружбы' : 'Выберите дату начала отношений');
      return;
    }
    if (isFutureDate(date)) {
      setError(isFriendship ? 'Дата начала дружбы не может быть в будущем' : 'Дата начала отношений не может быть в будущем');
      return;
    }
    onSave(date);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isFriendship ? 'Дата начала дружбы' : 'Дата начала отношений'}
    >
      <form onSubmit={handleSubmit} className="edit-start-date-form">
        <div className="edit-start-date-form__note">
          <div className="edit-start-date-form__note-icon" aria-hidden="true">
            <Icon name={isFriendship ? 'sparkles' : 'heart-filled'} size={18} />
          </div>
          <p className="edit-start-date-form__note-text">
            {isFriendship
              ? 'Дата начала дружбы фиксируется при регистрации, но вы можете скорректировать её здесь, если вы подружились раньше.'
              : 'Дата начала отношений фиксируется автоматически в момент регистрации вашей пары, но вы можете скорректировать её здесь, если ваша история началась раньше.'}
          </p>
        </div>

        {error && (
          <div className="edit-start-date-form__error" role="alert">
            {error}
          </div>
        )}

        <div className="edit-start-date-form__field">
          <DatePicker
            label="Когда вы стали парой? *"
            value={date}
            maxDate={getTodayDateString()}
            onChange={(newDate) => {
              setDate(newDate);
              if (error) setError(null);
            }}
            required
            autoFocus
          />
        </div>

        <div className="edit-start-date-form__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" variant="primary">
            Сохранить дату
          </Button>
        </div>
      </form>
    </Modal>
  );
};
