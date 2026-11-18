import React, { useState } from 'react';
import { WishItem } from '../../../types/wishlist';
import { Icon } from '../../../components/ui/Icon/Icon';
import { WishCardButton } from './WishCardButton';
import { normalizeMediaUrl } from '../../../utils/media';
import './WishCard.css';

export interface WishCardProps {
  item: WishItem;
  isOwnList: boolean;
  onEdit: (item: WishItem) => void;
  onDelete: (item: WishItem) => void;
  onToggleReserve?: (id: string) => void;
  onClick?: (item: WishItem) => void;
  className?: string;
}

export const WishCard: React.FC<WishCardProps> = ({
  item,
  isOwnList,
  onEdit,
  onDelete,
  onToggleReserve,
  onClick,
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  // Format price
  const formattedPrice =
    item.estimatedPrice !== undefined
      ? `${item.estimatedPrice.toLocaleString('ru-RU')} ${item.currency || '₽'}`
      : null;

  // External link safe display
  const hasLink = Boolean(item.linkUrl && item.linkUrl.trim().length > 0);
  const safeLink = hasLink
    ? item.linkUrl?.startsWith('http://') || item.linkUrl?.startsWith('https://')
      ? item.linkUrl
      : `https://${item.linkUrl}`
    : undefined;

  return (
    <article
      className={`wish-card ${onClick ? 'wish-card--clickable' : ''} ${className}`}
      aria-labelledby={`wish-title-${item.id}`}
      onClick={() => onClick?.(item)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick(item);
        }
      }}
    >
      {/* 1. Media container: Photo (Hero) or Minimalist Lovia Mascot Placeholder */}
      <div className="wish-card__media">
        {item.imageUrl && !imageError ? (
          <img
            src={normalizeMediaUrl(item.imageUrl)}
            alt={item.title}
            className="wish-card__image"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="wish-card__placeholder" aria-hidden="true">
            <div className="wish-card__placeholder-icon">
              <Icon name="gift" size={26} strokeWidth={1.8} />
            </div>
          </div>
        )}

        {/* Owner actions (strictly only for own items!) */}
        {isOwnList && (
          <div
            className="wish-card__actions"
            role="toolbar"
            aria-label="Управление желанием"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="wish-card__action-btn"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(item);
              }}
              aria-label={`Редактировать желание: ${item.title}`}
              title="Редактировать желание"
            >
              <Icon name="edit" size={15} />
            </button>
            <button
              type="button"
              className="wish-card__action-btn wish-card__action-btn--delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item);
              }}
              aria-label={`Удалить желание: ${item.title}`}
              title="Удалить желание"
            >
              <Icon name="trash" size={15} />
            </button>
          </div>
        )}
      </div>

      {/* 2. Card Body */}
      <div className="wish-card__body">
        {/* Title with predictable 2-line height */}
        <div className="wish-card__title-row">
          <h3 id={`wish-title-${item.id}`} className="wish-card__title" title={item.title}>
            {item.title}
          </h3>
        </div>

        {/* Estimated Price */}
        <div className="wish-card__price-row">
          {formattedPrice ? (
            <span className="wish-card__price">{formattedPrice}</span>
          ) : (
            <span className="wish-card__price wish-card__price--empty">Цена не указана</span>
          )}
        </div>

        {/* 3. Footer Action Buttons */}
        <div className="wish-card__footer" onClick={(e) => e.stopPropagation()}>
          {isOwnList ? (
            /* Own List: «Где купить» button occupies full width */
            safeLink ? (
              <WishCardButton
                variant="secondary"
                iconName="external-link"
                line1="Где купить"
                href={safeLink}
                className="wish-btn--full"
                title="Перейти в магазин по ссылке"
              />
            ) : (
              <WishCardButton
                variant="disabled"
                iconName="external-link"
                line1="Где купить"
                disabled
                className="wish-btn--full"
                title="Ссылка на товар не указана"
              />
            )
          ) : (
            /* Partner's List: Pair of balanced buttons strictly on the same baseline */
            <>
              {/* Button 1: «Где купить» */}
              {safeLink ? (
                <WishCardButton
                  variant="secondary"
                  iconName="external-link"
                  line1="Где"
                  line2="купить"
                  href={safeLink}
                  title="Перейти в магазин по ссылке"
                />
              ) : (
                <WishCardButton
                  variant="disabled"
                  iconName="external-link"
                  line1="Где"
                  line2="купить"
                  disabled
                  title="Партнёр не прикрепил ссылку"
                />
              )}

              {/* Button 2: «Я подарю это!» (Secret Partner Reservation) */}
              <WishCardButton
                variant={item.isReserved ? 'reserved' : 'primary'}
                iconName={item.isReserved ? 'heart-filled' : 'gift'}
                line1={item.isReserved ? 'Вы дарите' : 'Я подарю'}
                line2={item.isReserved ? 'это' : 'это!'}
                onClick={() => onToggleReserve?.(item.id)}
                ariaPressed={item.isReserved}
                title={
                  item.isReserved
                    ? 'Вы зарезервировали этот подарок. Нажмите, чтобы отменить.'
                    : 'Зарезервировать тайно, чтобы не подарить то же самое.'
                }
              />
            </>
          )}
        </div>
      </div>
    </article>
  );
};
