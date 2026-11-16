import React, { useMemo } from 'react';
import { DateMemory } from '../../../types/dates';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Icon } from '../../../components/ui/Icon/Icon';
import { formatRussianDate, pluralizeRu } from '../../../utils/dateCalculations';
import { telegramService } from '../../../services/telegramService';
import { useSpaceMode } from '../../../hooks/useSpaceMode';
import './DatesQuickListModal.css';

export interface DatesQuickListModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: DateMemory[];
  onSelectMemory: (memory: DateMemory) => void;
}

export const DatesQuickListModal: React.FC<DatesQuickListModalProps> = ({
  isOpen,
  onClose,
  memories,
  onSelectMemory,
}) => {
  const { isFriendship } = useSpaceMode();
  const sortedMemories = useMemo(() => {
    return [...memories].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [memories]);

  const countLabel = isFriendship
    ? pluralizeRu(sortedMemories.length, 'встреча', 'встречи', 'встреч')
    : pluralizeRu(sortedMemories.length, 'свидание', 'свидания', 'свиданий');

  const handleItemClick = (memory: DateMemory) => {
    telegramService.hapticImpact('light');
    onSelectMemory(memory);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isFriendship ? 'Список встреч' : 'Список свиданий'}
      className="dates-quick-list-modal"
    >
      <div className="dates-quick-list">
        {sortedMemories.length > 0 && (
          <div className="dates-quick-list__header-meta">
            <span className="dates-quick-list__count">
              Всего {sortedMemories.length} {countLabel}
            </span>
          </div>
        )}

        {sortedMemories.length === 0 ? (
          <div className="dates-quick-list__empty">
            <div className="dates-quick-list__empty-icon" aria-hidden="true">
              <Icon name="calendar" size={32} />
            </div>
            <p className="dates-quick-list__empty-title">
              {isFriendship ? 'Пока нет сохранённых встреч' : 'Пока нет сохранённых свиданий'}
            </p>
            <p className="dates-quick-list__empty-desc">
              {isFriendship
                ? 'Добавляйте совместные встречи и прогулки, чтобы создать хронологию ваших моментов'
                : 'Добавляйте романтические встречи, чтобы создать красивую хронологию ваших моментов'}
            </p>
          </div>
        ) : (
          <div className="dates-quick-list__items" role="list">
            {sortedMemories.map((memory) => {
              const hasPhoto = Boolean(memory.photos && memory.photos.length > 0);
              const firstPhoto = hasPhoto && memory.photos ? memory.photos[0] : null;
              const placeName = memory.location?.placeName || memory.place;

              return (
                <button
                  key={memory.id}
                  type="button"
                  className="dates-quick-list__item"
                  onClick={() => handleItemClick(memory)}
                  title={
                    isFriendship
                      ? `Открыть встречу «${memory.title}»`
                      : `Открыть свидание «${memory.title}»`
                  }
                  aria-label={
                    isFriendship
                      ? `Встреча «${memory.title}», ${formatRussianDate(memory.date)}${
                          placeName ? `, место: ${placeName}` : ''
                        }`
                      : `Свидание «${memory.title}», ${formatRussianDate(memory.date)}${
                          placeName ? `, место: ${placeName}` : ''
                        }`
                  }
                >
                  <div className="dates-quick-list__thumb-wrap">
                    {firstPhoto ? (
                      <img
                        src={firstPhoto}
                        alt=""
                        className="dates-quick-list__thumb"
                        loading="lazy"
                      />
                    ) : (
                      <div className="dates-quick-list__thumb-fallback" aria-hidden="true">
                        <Icon name="calendar" size={18} />
                      </div>
                    )}
                  </div>

                  <div className="dates-quick-list__info">
                    <span className="dates-quick-list__date">
                      {formatRussianDate(memory.date)}
                    </span>
                    <span className="dates-quick-list__title">
                      {memory.title}
                    </span>
                    {placeName && (
                      <span className="dates-quick-list__place">
                        <Icon name="pin" size={11} className="dates-quick-list__place-icon" />
                        <span className="dates-quick-list__place-text">{placeName}</span>
                      </span>
                    )}
                  </div>

                  <div className="dates-quick-list__chevron" aria-hidden="true">
                    <Icon name="chevron-right" size={16} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};
