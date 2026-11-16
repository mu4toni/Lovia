import React, { useMemo } from 'react';
import { DateMemory } from '../../../types/dates';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Icon } from '../../../components/ui/Icon/Icon';
import { formatRussianDate, pluralizeRu } from '../../../utils/dateCalculations';
import { telegramService } from '../../../services/telegramService';
import './AllDatesAlbumModal.css';

export interface AlbumPhotoItem {
  url: string;
  memoryId: string;
  memoryTitle: string;
  memoryDate: string;
}

export interface AllDatesAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: DateMemory[];
  onOpenPhotoLightbox: (photos: string[], index: number) => void;
}

export const AllDatesAlbumModal: React.FC<AllDatesAlbumModalProps> = ({
  isOpen,
  onClose,
  memories,
  onOpenPhotoLightbox,
}) => {
  const allPhotos = useMemo(() => {
    // Sort memories newest first
    const sorted = [...memories].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const list: AlbumPhotoItem[] = [];
    sorted.forEach((memory) => {
      if (memory.photos && memory.photos.length > 0) {
        memory.photos.forEach((photoUrl) => {
          list.push({
            url: photoUrl,
            memoryId: memory.id,
            memoryTitle: memory.title,
            memoryDate: memory.date,
          });
        });
      }
    });

    return list;
  }, [memories]);

  const countLabel = pluralizeRu(allPhotos.length, 'фотография', 'фотографии', 'фотографий');

  const handlePhotoClick = (index: number) => {
    telegramService.hapticImpact('light');
    const urls = allPhotos.map((p) => p.url);
    onOpenPhotoLightbox(urls, index);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Все фотографии свиданий"
      className="all-dates-album-modal"
    >
      <div className="all-dates-album">
        {allPhotos.length > 0 && (
          <div className="all-dates-album__header-meta">
            <span className="all-dates-album__count">
              Всего {allPhotos.length} {countLabel}
            </span>
          </div>
        )}

        {allPhotos.length === 0 ? (
          <div className="all-dates-album__empty">
            <div className="all-dates-album__empty-icon" aria-hidden="true">
              <Icon name="camera" size={32} />
            </div>
            <p className="all-dates-album__empty-title">Пока нет сохранённых фотографий</p>
            <p className="all-dates-album__empty-desc">
              Добавляйте фотографии к вашим воспоминаниям, и они появятся в этом общем фотоальбоме
            </p>
          </div>
        ) : (
          <div className="all-dates-album__grid" role="list" aria-label="Сетка фотографий">
            {allPhotos.map((item, index) => (
              <button
                key={`${item.memoryId}-${index}`}
                type="button"
                className="all-dates-album__item"
                onClick={() => handlePhotoClick(index)}
                title={`Фото из «${item.memoryTitle}» (${formatRussianDate(item.memoryDate)})`}
                aria-label={`Фото ${index + 1} из ${allPhotos.length}: свидание «${item.memoryTitle}», ${formatRussianDate(item.memoryDate)}`}
              >
                <img
                  src={item.url}
                  alt=""
                  className="all-dates-album__img"
                  loading="lazy"
                />
                <div className="all-dates-album__overlay" aria-hidden="true">
                  <Icon name="eye" size={16} className="all-dates-album__overlay-icon" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
