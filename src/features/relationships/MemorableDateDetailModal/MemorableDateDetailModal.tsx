import React, { useEffect, useRef, useState } from 'react';
import { MemorableDate } from '../../../types/relationship';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Icon } from '../../../components/ui/Icon/Icon';
import { SwipeablePhotoGallery } from '../../../components/ui/SwipeablePhotoGallery/SwipeablePhotoGallery';
import {
  formatRussianDate,
  getMemorableDateStatus,
  pluralizeRu,
} from '../../../utils/dateCalculations';
import { getDateContextIcon } from '../../../utils/dateContextIcon';
import { normalizeMediaUrl } from '../../../utils/media';
import { telegramService } from '../../../services/telegramService';
import './MemorableDateDetailModal.css';

export interface MemorableDateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  memorableDate: MemorableDate | null;
  onEdit: (date: MemorableDate) => void;
  onDelete: (date: MemorableDate) => void;
  onOpenLightbox: (photos: string[], index: number) => void;
}

export const MemorableDateDetailModal: React.FC<MemorableDateDetailModalProps> = ({
  isOpen,
  onClose,
  memorableDate,
  onEdit,
  onDelete,
  onOpenLightbox,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [coverIndex, setCoverIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMenuOpen(false);
    setCoverIndex(0);
  }, [memorableDate?.id, isOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('click', handleOutside);
    return () => document.removeEventListener('click', handleOutside);
  }, [isMenuOpen]);

  if (!memorableDate) return null;

  const photos = (memorableDate.photos || []).slice(0, 2);
  const hasPhotos = photos.length > 0;
  const contextIcon = getDateContextIcon(memorableDate.title, memorableDate.description);
  const status = getMemorableDateStatus(memorableDate.date, memorableDate.isAnnual);
  const daysLabel = pluralizeRu(status.daysUntil, 'день', 'дня', 'дней');
  const daysAgoLabel =
    status.daysAgo !== undefined ? pluralizeRu(status.daysAgo, 'день', 'дня', 'дней') : '';

  const renderHeaderControls = (isOverPhoto: boolean) => (
    <div className={`memorable-detail__controls ${isOverPhoto ? 'memorable-detail__controls--photo' : ''}`}>
      <div className="memorable-detail__menu-wrap" ref={menuRef}>
        <button
          type="button"
          className={`memorable-detail__ctrl-btn ${
            isOverPhoto ? 'memorable-detail__ctrl-btn--photo' : ''
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen((prev) => !prev);
          }}
          aria-label="Действия с памятной датой"
          aria-haspopup="true"
          aria-expanded={isMenuOpen}
        >
          <Icon name="more-vertical" size={17} />
        </button>

        {isMenuOpen && (
          <div className="memorable-detail__popover" role="menu">
            <button
              type="button"
              className="memorable-detail__popover-item"
              onClick={() => {
                setIsMenuOpen(false);
                onClose();
                onEdit(memorableDate);
              }}
            >
              <Icon name="edit" size={14} />
              <span>Редактировать</span>
            </button>
            <button
              type="button"
              className="memorable-detail__popover-item memorable-detail__popover-item--delete"
              onClick={() => {
                setIsMenuOpen(false);
                onClose();
                onDelete(memorableDate);
              }}
            >
              <Icon name="trash" size={14} />
              <span>Удалить</span>
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        className={`memorable-detail__ctrl-btn ${
          isOverPhoto ? 'memorable-detail__ctrl-btn--photo' : ''
        }`}
        onClick={onClose}
        aria-label="Закрыть окно"
      >
        <Icon name="close" size={17} strokeWidth={2.2} />
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      hideHeader
      className="memorable-detail-modal"
    >
      <div className="memorable-detail">
        {/* Top Cover (when photos exist) OR Clean Scrapbook Header (no photos) */}
        {hasPhotos ? (
          <div className="memorable-detail__cover">
            <SwipeablePhotoGallery
              photos={photos}
              altPrefix={memorableDate.title}
              onActiveIndexChange={setCoverIndex}
            />
            <div className="memorable-detail__cover-scrim" aria-hidden="true" />
            <div className="memorable-detail__cover-handle" aria-hidden="true" />
            {renderHeaderControls(true)}
          </div>
        ) : (
          <div className="memorable-detail__plain-header">
            <div className="memorable-detail__plain-handle" aria-hidden="true" />
            <div className="memorable-detail__plain-top">
              <span className="memorable-detail__plain-tag paper-tag">
                <Icon name={contextIcon} size={13} />
                <span>Памятная дата</span>
              </span>
              {renderHeaderControls(false)}
            </div>
          </div>
        )}

        {/* Main Content Body */}
        <div className="memorable-detail__body">
          {/* Context Icon Badge + Date Pill + Annual Badge */}
          <div className="memorable-detail__meta-row">
            <span className="memorable-detail__context-badge" aria-hidden="true">
              <Icon name={contextIcon} size={16} />
            </span>
            <span className="memorable-detail__date-pill">
              {formatRussianDate(memorableDate.date)}
            </span>
            {memorableDate.isAnnual && (
              <span className="memorable-detail__annual-pill">Ежегодно</span>
            )}
          </div>

          {/* Large Handwritten Title */}
          <h2 className="memorable-detail__title">{memorableDate.title}</h2>

          {/* Countdown / Elapsed Info */}
          <div className="memorable-detail__status-line">
            {memorableDate.isAnnual ? (
              status.isToday ? (
                <span className="memorable-detail__status--today">
                  <Icon name="sparkles" size={13} />
                  <span>Сегодня годовщина!</span>
                </span>
              ) : (
                <span>
                  До следующей годовщины — <strong>{status.daysUntil}</strong> {daysLabel}
                </span>
              )
            ) : (
              status.daysAgo !== undefined &&
              status.daysAgo > 0 && (
                <span>
                  Состоялось {status.daysAgo} {daysAgoLabel} назад
                </span>
              )
            )}
          </div>

          <div className="memorable-detail__divider" aria-hidden="true" />

          {/* Full Description */}
          {memorableDate.description?.trim() ? (
            <p className="memorable-detail__desc">{memorableDate.description}</p>
          ) : (
            <p className="memorable-detail__desc memorable-detail__desc--empty">
              Добавьте пару тёплых слов об этом дне, чтобы сохранить детали в памяти.
            </p>
          )}

          {/* Horizontal Photo Cards Strip when multiple photos exist */}
          {photos.length > 1 && (
            <div className="memorable-detail__gallery-section">
              <div className="memorable-detail__gallery-label">
                Фотографии ({photos.length})
              </div>
              <div className="memorable-detail__photos-strip">
                {photos.map((photoUrl, idx) => (
                  <button
                    key={`${idx}-${photoUrl.slice(-14)}`}
                    type="button"
                    className={`memorable-detail__photo-thumb ${
                      idx === coverIndex ? 'memorable-detail__photo-thumb--active' : ''
                    }`}
                    onClick={() => {
                      telegramService.hapticImpact('light');
                      onOpenLightbox(photos, idx);
                    }}
                    aria-label={`Открыть фото ${idx + 1} на весь экран`}
                  >
                    <img
                      src={normalizeMediaUrl(photoUrl)}
                      alt={`${memorableDate.title} — фото ${idx + 1}`}
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Quick Action Buttons */}
          <div className="memorable-detail__actions">
            <button
              type="button"
              className="memorable-detail__btn memorable-detail__btn--secondary sketch-pill"
              onClick={() => {
                telegramService.hapticImpact('light');
                onClose();
                onEdit(memorableDate);
              }}
            >
              <Icon name="edit" size={15} />
              <span>Редактировать</span>
            </button>

            {hasPhotos ? (
              <button
                type="button"
                className="memorable-detail__btn memorable-detail__btn--primary sketch-pill"
                onClick={() => {
                  telegramService.hapticImpact('light');
                  onOpenLightbox(photos, coverIndex);
                }}
              >
                <Icon name="image" size={15} />
                <span>Смотреть все фото</span>
              </button>
            ) : (
              <button
                type="button"
                className="memorable-detail__btn memorable-detail__btn--primary sketch-pill"
                onClick={() => {
                  telegramService.hapticImpact('light');
                  onClose();
                  onEdit(memorableDate);
                }}
              >
                <Icon name="camera" size={15} />
                <span>Добавить фото</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
