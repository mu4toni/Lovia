import React from 'react';
import { DatePlace } from '../../../types/dates';
import { Icon } from '../../../components/ui/Icon/Icon';
import { InteractiveMap } from '../PlacePickerModal/InteractiveMap';
import { mapsService } from '../../../services/mapsService';
import './PlaceCard.css';

export interface PlaceCardProps {
  place?: DatePlace | null;
  onSelectPlace?: () => void;
  onRemovePlace?: () => void;
  readonly?: boolean;
  className?: string;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({
  place,
  onSelectPlace,
  onRemovePlace,
  readonly = false,
  className = '',
}) => {
  // If no place is selected
  if (!place) {
    if (readonly) return null;

    return (
      <div className={`place-card-empty ${className}`} onClick={onSelectPlace}>
        <div className="place-card-empty__icon" aria-hidden="true">
          <Icon name="pin" size={20} />
        </div>
        <div className="place-card-empty__texts">
          <span className="place-card-empty__title">Выбрать место встречи</span>
          <span className="place-card-empty__desc">
            Найти кафе, ресторан, парк или отметить точку на карте
          </span>
        </div>
        <button
          type="button"
          className="place-card-empty__btn"
          onClick={onSelectPlace}
          aria-label="Выбрать место встречи"
        >
          <Icon name="plus" size={16} />
        </button>
      </div>
    );
  }

  const handleOpenExternal = () => {
    mapsService.openInExternalMaps(place.latitude, place.longitude, place.placeName);
  };

  if (readonly) {
    return (
      <article className={`place-card-compact ${className}`} aria-label={`Место: ${place.placeName}`}>
        <div className="place-card-compact__left">
          <div className="place-card-compact__pin" aria-hidden="true">
            <Icon name="pin" size={16} />
          </div>
          <div className="place-card-compact__names">
            <h4 className="place-card-compact__title">{place.placeName}</h4>
            {place.address && (
              <p className="place-card-compact__address">{place.address}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          className="place-card-compact__btn"
          onClick={handleOpenExternal}
          title="Открыть в Google Картах"
          aria-label="Открыть в Google Картах"
        >
          <Icon name="external-link" size={13} />
          <span>В Google Картах</span>
        </button>
      </article>
    );
  }

  return (
    <article className={`place-card-selected ${className}`} aria-label={`Место: ${place.placeName}`}>
      {/* Mini Google Map Preview */}
      <div className="place-card-selected__map-preview">
        <InteractiveMap
          latitude={place.latitude}
          longitude={place.longitude}
          onLocationChange={() => {}}
          interactive={false}
          zoom={14}
        />
        <div className="place-card-selected__map-overlay">
          <button
            type="button"
            className="place-card-selected__open-map-badge"
            onClick={handleOpenExternal}
            title="Открыть в Google Картах"
            aria-label="Открыть в Google Картах"
          >
            <Icon name="external-link" size={13} />
            <span>В Google Картах</span>
          </button>
        </div>
      </div>

      {/* Place Details */}
      <div className="place-card-selected__info">
        <div className="place-card-selected__header-row">
          <div className="place-card-selected__pin-icon" aria-hidden="true">
            <Icon name="pin" size={16} />
          </div>
          <div className="place-card-selected__names">
            <h4 className="place-card-selected__title">{place.placeName}</h4>
            {place.address && (
              <p className="place-card-selected__address">{place.address}</p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        {!readonly && (
          <div className="place-card-selected__actions">
            <button
              type="button"
              className="place-card-selected__action-btn"
              onClick={onSelectPlace}
              aria-label="Изменить выбранное место"
            >
              <Icon name="edit" size={14} />
              <span>Изменить</span>
            </button>
            <button
              type="button"
              className="place-card-selected__action-btn place-card-selected__action-btn--remove"
              onClick={onRemovePlace}
              aria-label="Удалить выбранное место"
            >
              <Icon name="trash" size={14} />
              <span>Удалить</span>
            </button>
          </div>
        )}
      </div>
    </article>
  );
};
