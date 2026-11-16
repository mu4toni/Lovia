import { DatePlace } from '../types/dates';

export interface GeolocationCoords {
  latitude: number;
  longitude: number;
}

class MapsService {
  private googleMapsApiKey: string;

  constructor() {
    this.googleMapsApiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';
  }

  hasGoogleMapsKey(): boolean {
    return Boolean(this.googleMapsApiKey);
  }

  /**
   * Поиск мест по текстовому запросу (название, кафе, парк, адрес)
   */
  async searchPlaces(query: string): Promise<DatePlace[]> {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      return [];
    }

    try {
      // Запрос к Nominatim OpenStreetMap (бесплатный, легальный, не требует кредитных карт)
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        trimmed
      )}&addressdetails=1&limit=6&accept-language=ru`;

      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'ru,en;q=0.8',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) return [];

      return data.map((item: any) => {
        // Извлекаем аккуратное краткое название
        const name =
          item.namedetails?.name ||
          item.name ||
          item.display_name.split(',')[0].trim();

        // Формируем чистый адрес без дублирования названия
        const parts = item.display_name.split(',').map((p: string) => p.trim());
        const address = parts.length > 1 ? parts.slice(1).join(', ') : item.display_name;

        return {
          placeName: name,
          address: address || item.display_name,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          placeId: String(item.place_id || item.osm_id || Math.random()),
        };
      });
    } catch (err) {
      console.warn('MapsService: search error or offline fallback', err);
      return [];
    }
  }

  /**
   * Обратное геокодирование: получение адреса и названия по координатам
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<DatePlace> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ru`;
      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'ru,en;q=0.8',
        },
      });

      if (response.ok) {
        const item = await response.json();
        const name =
          item.namedetails?.name ||
          item.name ||
          item.address?.amenity ||
          item.address?.leisure ||
          item.address?.tourism ||
          item.address?.road ||
          'Отмеченная точка на карте';

        return {
          placeName: name,
          address: item.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          latitude,
          longitude,
          placeId: String(item.place_id || item.osm_id || `${latitude}-${longitude}`),
        };
      }
    } catch (err) {
      console.warn('MapsService: reverse geocode error', err);
    }

    return {
      placeName: 'Выбранная точка',
      address: `Координаты: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      latitude,
      longitude,
    };
  }

  /**
   * Определение текущего местоположения пользователя:
   * 1. Поддержка Telegram Mini App LocationManager (если доступен).
   * 2. Двухэтапный fallback: сначала GPS с коротким таймаутом (5с), затем Wi-Fi/IP (10с).
   */
  async getCurrentPosition(): Promise<GeolocationCoords> {
    // 1. Проверяем Telegram Mini App LocationManager
    if (typeof window !== 'undefined') {
      const tgLocManager = (window as any).Telegram?.WebApp?.LocationManager;
      if (tgLocManager && typeof tgLocManager.init === 'function') {
        try {
          const coords = await new Promise<GeolocationCoords | null>((resolve) => {
            tgLocManager.init(() => {
              if (tgLocManager.isLocationAvailable) {
                tgLocManager.getLocation((data: any) => {
                  if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
                    resolve({ latitude: data.latitude, longitude: data.longitude });
                  } else {
                    resolve(null);
                  }
                });
              } else {
                resolve(null);
              }
            });
          });
          if (coords) return coords;
        } catch (e) {
          console.warn('Telegram LocationManager failed, falling back to navigator.geolocation:', e);
        }
      }
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      throw new Error('Геолокация не поддерживается вашим браузером или устройством');
    }

    // 2. Этап 1: Пробуем точное GPS-определение (enableHighAccuracy: true, timeout: 5000)
    try {
      return await new Promise<GeolocationCoords>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
          },
          (err) => reject(err),
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 60000,
          }
        );
      });
    } catch (err: any) {
      // Если пользователь явно отклонил доступ (PERMISSION_DENIED = 1) — вторую попытку не делаем
      if (err?.code === 1) {
        throw new Error('Доступ к геолокации запрещен в настройках браузера или системы');
      }

      // Этап 2: Автоматическая вторая попытка по Wi-Fi/IP (enableHighAccuracy: false, timeout: 10000)
      return await new Promise<GeolocationCoords>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
          },
          (err2) => {
            let message = 'Не удалось определить местоположение';
            if (err2.code === 1) {
              message = 'Доступ к геолокации запрещен в настройках браузера или системы';
            } else if (err2.code === 2) {
              message = 'Данные о местоположении временно недоступны на этом устройстве';
            } else if (err2.code === 3) {
              message = 'Превышено время ожидания ответа спутников или сети';
            }
            reject(new Error(message));
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000,
          }
        );
      });
    }
  }

  /**
   * Открытие места в Google Картах (Google Maps)
   */
  openInExternalMaps(latitude: number, longitude: number, placeName?: string): void {
    const query = placeName
      ? `${latitude},${longitude} (${encodeURIComponent(placeName)})`
      : `${latitude},${longitude}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;

    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  /**
   * Ссылка на Google Maps Embed (работает без API-ключа)
   */
  getGoogleEmbedUrl(latitude: number, longitude: number, zoom = 15): string {
    return `https://maps.google.com/maps?q=${latitude},${longitude}&z=${zoom}&output=embed&hl=ru`;
  }
}

export const mapsService = new MapsService();
