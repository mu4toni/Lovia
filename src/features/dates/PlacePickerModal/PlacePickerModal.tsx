import React, { useState, useEffect, useRef } from 'react';
import { DatePlace } from '../../../types/dates';
import { mapsService } from '../../../services/mapsService';
import { InteractiveMap } from './InteractiveMap';
import { Icon } from '../../../components/ui/Icon/Icon';
import { Button } from '../../../components/ui/Button/Button';
import './PlacePickerModal.css';

export interface PlacePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlace: (place: DatePlace) => void;
  initialPlace?: DatePlace | null;
}

// Default center: Moscow center
const DEFAULT_LAT = 55.7522;
const DEFAULT_LNG = 37.6156;

export const PlacePickerModal: React.FC<PlacePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectPlace,
  initialPlace,
}) => {
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({
    lat: initialPlace?.latitude || DEFAULT_LAT,
    lng: initialPlace?.longitude || DEFAULT_LNG,
  });

  const [placeName, setPlaceName] = useState(initialPlace?.placeName || '');
  const [address, setAddress] = useState(initialPlace?.address || '');
  const [placeId, setPlaceId] = useState(initialPlace?.placeId || '');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DatePlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  const searchDebounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (initialPlace) {
      setSelectedCoords({
        lat: initialPlace.latitude,
        lng: initialPlace.longitude,
      });
      setPlaceName(initialPlace.placeName);
      setAddress(initialPlace.address || '');
      setPlaceId(initialPlace.placeId || '');
    } else {
      setSelectedCoords({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
      setPlaceName('Центр города');
      setAddress('Москва, Красная площадь');
      setPlaceId('');
    }
    setSearchQuery('');
    setSearchResults([]);
    setIsDropdownOpen(false);
    setGeoError(null);
  }, [initialPlace, isOpen]);

  // Handle Search Input Debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setGeoError(null);

    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current);
    }

    if (!val.trim() || val.trim().length < 2) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = window.setTimeout(async () => {
      try {
        const results = await mapsService.searchPlaces(val);
        setSearchResults(results);
        setIsDropdownOpen(results.length > 0);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  // Select item from search dropdown
  const handleSelectSearchResult = (item: DatePlace) => {
    setSelectedCoords({
      lat: item.latitude,
      lng: item.longitude,
    });
    setPlaceName(item.placeName);
    setAddress(item.address || '');
    setPlaceId(item.placeId || '');
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  // Click / tap on map to pick location
  const handleMapLocationChange = async (lat: number, lng: number) => {
    setSelectedCoords({ lat, lng });
    setIsReverseGeocoding(true);
    setGeoError(null);

    try {
      const info = await mapsService.reverseGeocode(lat, lng);
      setPlaceName(info.placeName);
      setAddress(info.address || '');
      setPlaceId(info.placeId || '');
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // GPS My Location
  const handleLocateMe = async () => {
    setIsLocating(true);
    setGeoError(null);
    try {
      const pos = await mapsService.getCurrentPosition();
      await handleMapLocationChange(pos.latitude, pos.longitude);
    } catch (err: any) {
      setGeoError(err.message || 'Не удалось определить местоположение');
    } finally {
      setIsLocating(false);
    }
  };

  // Confirm Selection
  const handleConfirm = () => {
    onSelectPlace({
      placeName: placeName.trim() || 'Выбранное место',
      address: address.trim() || undefined,
      latitude: selectedCoords.lat,
      longitude: selectedCoords.lng,
      placeId: placeId || undefined,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="place-picker-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Выбор места встречи"
    >
      <div className="place-picker-window">
        {/* Header with Search and GPS */}
        <header className="place-picker-header">
          <div className="place-picker-topbar">
            <h2 className="place-picker-title">Место встречи</h2>
            <button
              type="button"
              className="place-picker-close-btn"
              onClick={onClose}
              aria-label="Закрыть окно выбора места"
            >
              <Icon name="close" size={20} />
            </button>
          </div>

          <div className="place-picker-search-row">
            <div className="place-picker-search-field">
              <Icon name="search" size={17} className="place-picker-search-icon" />
              <input
                type="text"
                className="place-picker-search-input"
                placeholder="Поиск ресторана, парка, адреса..."
                value={searchQuery}
                onChange={handleSearchChange}
                aria-label="Поиск места"
              />
              {isSearching && (
                <span className="place-picker-search-spinner" aria-hidden="true" />
              )}
              {searchQuery && !isSearching && (
                <button
                  type="button"
                  className="place-picker-clear-search-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setIsDropdownOpen(false);
                  }}
                  aria-label="Очистить поиск"
                >
                  <Icon name="close" size={14} />
                </button>
              )}
            </div>

            <button
              type="button"
              className={`place-picker-gps-btn ${isLocating ? 'place-picker-gps-btn--loading' : ''}`}
              onClick={handleLocateMe}
              title={isLocating ? 'Определение координат...' : 'Определить моё местоположение'}
              aria-label="Определить моё местоположение"
              disabled={isLocating}
            >
              {isLocating ? (
                <span className="place-picker-search-spinner" aria-hidden="true" />
              ) : (
                <Icon name="pin" size={18} />
              )}
            </button>
          </div>

          {geoError && (
            <div className="place-picker-geo-error" role="alert">
              {geoError}
            </div>
          )}

          {/* Search Results Dropdown */}
          {isDropdownOpen && searchResults.length > 0 && (
            <div className="place-picker-dropdown" role="listbox">
              {searchResults.map((res) => (
                <div
                  key={res.placeId || `${res.latitude}-${res.longitude}`}
                  className="place-picker-dropdown-item"
                  role="option"
                  aria-selected="false"
                  onClick={() => handleSelectSearchResult(res)}
                >
                  <div className="place-picker-dropdown-icon" aria-hidden="true">
                    <Icon name="pin" size={16} />
                  </div>
                  <div className="place-picker-dropdown-texts">
                    <strong className="place-picker-dropdown-name">{res.placeName}</strong>
                    {res.address && (
                      <span className="place-picker-dropdown-address">{res.address}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </header>

        {/* Interactive Map Area */}
        <main className="place-picker-map-area">
          <InteractiveMap
            latitude={selectedCoords.lat}
            longitude={selectedCoords.lng}
            onLocationChange={handleMapLocationChange}
            zoom={15}
          />

          <div className="place-picker-map-hint" aria-hidden="true">
            Нажмите на карту, чтобы отметить точку
          </div>
        </main>

        {/* Footer with Selected Place Summary */}
        <footer className="place-picker-footer">
          <div className="place-picker-summary">
            <div className="place-picker-summary-icon" aria-hidden="true">
              <Icon name="pin" size={18} />
            </div>
            <div className="place-picker-summary-texts">
              <div className="place-picker-summary-name">
                {isReverseGeocoding ? 'Определение адреса...' : placeName}
              </div>
              {address && (
                <div className="place-picker-summary-address">{address}</div>
              )}
            </div>
          </div>

          <div className="place-picker-actions">
            <Button variant="ghost" onClick={onClose} style={{ minHeight: '44px' }}>
              Отмена
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              style={{ minHeight: '44px' }}
            >
              Подтвердить место
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
};
