import React, { useState } from 'react';
import { Icon } from '../../../components/ui/Icon/Icon';
import { mapsService } from '../../../services/mapsService';
import './InteractiveMap.css';

export interface InteractiveMapProps {
  latitude: number;
  longitude: number;
  onLocationChange?: (lat: number, lng: number) => void;
  className?: string;
  zoom?: number;
  interactive?: boolean;
}

// Web Mercator standard projection math (preserved for coordinates mapping and testing)
export function project(lat: number, lng: number, zoom: number) {
  const d = Math.PI / 180;
  const max = 85.0511287798;
  const latRad = Math.max(Math.min(max, lat), -max) * d;
  const n = Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * n * 256;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n * 256;
  return { x, y };
}

export function unproject(x: number, y: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const lng = (x / (n * 256)) * 360 - 180;
  const yRad = (1 - (2 * y) / (n * 256)) * Math.PI;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(yRad) - Math.exp(-yRad)));
  return { lat, lng };
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  latitude,
  longitude,
  onLocationChange,
  className = '',
  zoom: initialZoom = 15,
  interactive = true,
}) => {
  const [zoom, setZoom] = useState(initialZoom);
  void onLocationChange;

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (zoom < 19) setZoom((z) => z + 1);
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (zoom > 3) setZoom((z) => z - 1);
  };

  const handleOpenGoogle = (e: React.MouseEvent) => {
    e.stopPropagation();
    mapsService.openInExternalMaps(latitude, longitude);
  };

  const embedUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&z=${zoom}&output=embed&hl=ru`;

  return (
    <div
      className={`interactive-map ${interactive ? 'interactive-map--active' : ''} ${className}`}
      role={interactive ? 'region' : 'img'}
      aria-label="Интерактивная карта Google Карты"
    >
      {/* Official Google Maps Embed iframe */}
      <iframe
        title="Google Maps"
        src={embedUrl}
        className="interactive-map__iframe"
        loading="lazy"
        allowFullScreen={false}
        referrerPolicy="no-referrer-when-downgrade"
      />

      {/* Floating Controls Overlay */}
      {interactive && (
        <div className="interactive-map__controls" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="interactive-map__ctrl-btn"
            onClick={handleZoomIn}
            aria-label="Приблизить карту"
            title="Приблизить"
          >
            +
          </button>
          <button
            type="button"
            className="interactive-map__ctrl-btn"
            onClick={handleZoomOut}
            aria-label="Отдалить карту"
            title="Отдалить"
          >
            &minus;
          </button>
          <button
            type="button"
            className="interactive-map__ctrl-btn interactive-map__ctrl-btn--recenter"
            onClick={handleOpenGoogle}
            aria-label="Открыть в приложении Google Карт"
            title="Открыть в Google Картах"
          >
            <Icon name="external-link" size={15} />
          </button>
        </div>
      )}
    </div>
  );
};
