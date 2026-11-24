import React, { useState, useEffect } from 'react';
import { WishItem } from '../../../types/wishlist';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Icon } from '../../../components/ui/Icon/Icon';
import { normalizeMediaUrl, getProxyImageUrl } from '../../../utils/media';
import './WishDetailModal.css';

export interface WishDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: WishItem | null;
  isOwnList: boolean;
  onEdit?: (item: WishItem) => void;
  onDelete?: (item: WishItem) => void;
  onToggleReserve?: (id: string) => void;
}

export const WishDetailModal: React.FC<WishDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  isOwnList,
  onEdit,
  onDelete,
  onToggleReserve,
}) => {
  const [imageError, setImageError] = useState(false);
  const [useProxyFallback, setUseProxyFallback] = useState(false);

  useEffect(() => {
    setImageError(false);
    setUseProxyFallback(false);
  }, [item?.id, item?.imageUrl]);

  if (!item) return null;

  const resolvedImageSrc = item.imageUrl
    ? useProxyFallback
      ? getProxyImageUrl(item.imageUrl) || normalizeMediaUrl(item.imageUrl)
      : normalizeMediaUrl(item.imageUrl)
    : '';

  const handleImageError = () => {
    if (!useProxyFallback && getProxyImageUrl(item.imageUrl)) {
      setUseProxyFallback(true);
      return;
    }
    setImageError(true);
  };

  const formattedPrice =
    item.estimatedPrice !== undefined
      ? `${item.estimatedPrice.toLocaleString('ru-RU')} ${item.currency || '₽'}`
      : null;

  const hasLink = Boolean(item.linkUrl && item.linkUrl.trim().length > 0);
  const safeLink = hasLink
    ? item.linkUrl?.startsWith('http://') || item.linkUrl?.startsWith('https://')
      ? item.linkUrl
      : `https://${item.linkUrl}`
    : undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Детали желания"
      className="wish-detail-modal"
    >
      <div className="wish-detail-modal__container">
        {/* Large Media Header */}
        <div className="wish-detail-modal__media">
          {resolvedImageSrc && !imageError ? (
            <img
              src={resolvedImageSrc}
              alt={item.title}
              className="wish-detail-modal__image"
              referrerPolicy="no-referrer"
              onError={handleImageError}
            />
          ) : (
            <div className="wish-detail-modal__placeholder" aria-hidden="true">
              <div className="wish-detail-modal__placeholder-icon">
                <Icon name="gift" size={48} strokeWidth={1.7} />
              </div>
            </div>
          )}

          {/* Reserved Status Overlay Badge */}
          {!isOwnList && item.isReserved && (
            <div className="wish-detail-modal__reserved-badge">
              <Icon name="heart-filled" size={14} />
              <span>Вы дарите этот подарок</span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="wish-detail-modal__content">
          <h2 className="wish-detail-modal__title">{item.title}</h2>

          <div className="wish-detail-modal__price-row">
            {formattedPrice ? (
              <span className="wish-detail-modal__price">{formattedPrice}</span>
            ) : (
              <span className="wish-detail-modal__price wish-detail-modal__price--empty">
                Цена не указана
              </span>
            )}
          </div>

          {/* Description / Comment */}
          {item.description && (
            <div className="wish-detail-modal__desc-block">
              <span className="wish-detail-modal__desc-label">Пожелания и комментарии</span>
              <p className="wish-detail-modal__desc">{item.description}</p>
            </div>
          )}

          {/* External Link button */}
          {safeLink && (
            <a
              href={safeLink}
              target="_blank"
              rel="noopener noreferrer"
              className="wish-detail-modal__store-btn"
            >
              <Icon name="external-link" size={16} />
              <span>Открыть в магазине</span>
            </a>
          )}
        </div>

        {/* Action Controls */}
        <div className="wish-detail-modal__actions">
          {isOwnList ? (
            <div className="wish-detail-modal__own-actions">
              <button
                type="button"
                className="wish-detail-modal__btn wish-detail-modal__btn--edit"
                onClick={() => {
                  onClose();
                  onEdit?.(item);
                }}
              >
                <Icon name="edit" size={16} />
                <span>Редактировать</span>
              </button>
              <button
                type="button"
                className="wish-detail-modal__btn wish-detail-modal__btn--delete"
                onClick={() => {
                  onClose();
                  onDelete?.(item);
                }}
              >
                <Icon name="trash" size={16} />
                <span>Удалить</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={`wish-detail-modal__btn wish-detail-modal__btn--reserve ${
                item.isReserved ? 'wish-detail-modal__btn--reserved' : ''
              }`}
              onClick={() => onToggleReserve?.(item.id)}
            >
              <Icon name={item.isReserved ? 'heart-filled' : 'gift'} size={18} />
              <span>
                {item.isReserved
                  ? 'Отменить бронь подарка'
                  : 'Я подарю это! 🤫 (тайно)'}
              </span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
