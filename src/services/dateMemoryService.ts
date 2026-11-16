import type {
  DateMemory,
  CreateDateMemoryInput,
  UpdateDateMemoryInput,
} from '../types/dates';
import { isFutureDate } from '../utils/dateCalculations';
import { coupleService } from './coupleService';
import { isLocalDevHost } from '../utils/env';

const STORAGE_DATE_MEMORIES_KEY = 'lovia_date_memories_v1';

export const initialDateMemories: DateMemory[] = [
  {
    id: 'memory-1',
    title: 'Поход в кино на ночной сеанс',
    date: '2026-11-08',
    place: 'Кинотеатр «Художественный»',
    location: {
      placeName: 'Кинотеатр «Художественный»',
      address: 'Арбатская площадь, 14с1, Москва',
      latitude: 55.7523,
      longitude: 37.5996,
      placeId: 'cinema-hudozh',
    },
    story:
      'Смотрели старую французскую романтическую классику на последнем ряду. На улице шёл лёгкий дождь, а внутри пахло кофе и тёплым попкорном. Держались за руки весь сеанс.',
    photos: [
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80',
    ],
    createdAt: '2026-11-08T23:30:00.000Z',
  },
  {
    id: 'memory-2',
    title: 'Уютный ужин при свечах',
    date: '2026-10-25',
    place: 'Траттория у Патриарших',
    location: {
      placeName: 'Траттория у Патриарших',
      address: 'Малая Бронная ул., 24, Москва',
      latitude: 55.7628,
      longitude: 37.5947,
      placeId: 'trattoria-patr',
    },
    story:
      'Наш любимый столик у окна, негромкий джаз и домашняя паста с трюфелем. Говорили часами обо всём на свете и строили планы на зиму.',
    photos: [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    ],
    createdAt: '2026-10-25T21:00:00.000Z',
  },
  {
    id: 'memory-3',
    title: 'Осенняя прогулка в парке',
    date: '2026-10-12',
    place: 'Нескучный сад',
    location: {
      placeName: 'Нескучный сад',
      address: 'Ленинский проспект, 16–20, Москва',
      latitude: 55.7231,
      longitude: 37.5944,
      placeId: 'neskuchny-sad',
    },
    story:
      'Гуляли среди золотых клёнов, шуршали листьями, пили горячий чай с облепихой из термоса и сделали десяток тёплых совместных полароидов.',
    photos: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=800&q=80',
    ],
    createdAt: '2026-10-12T16:20:00.000Z',
  },
  {
    id: 'memory-4',
    title: 'Выходные в домике у озера',
    date: '2026-09-18',
    place: 'Парк-отель «Лесное»',
    location: {
      placeName: 'Парк-отель «Лесное»',
      address: 'Озёрная набережная, Ярославская область',
      latitude: 56.7328,
      longitude: 38.8541,
      placeId: 'lesnoe-resort',
    },
    story:
      'Два дня тишины вдали от городской суеты: деревянный домик с камином среди вековых сосен, утренний туман над тихой водой и звёздное небо ночью.',
    photos: [
      'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=800&q=80',
    ],
    createdAt: '2026-09-18T19:40:00.000Z',
  },
  {
    id: 'memory-5',
    title: 'Домашний вечер с пиццей и настолками',
    date: '2026-08-30',
    place: 'Дома на кухне',
    location: {
      placeName: 'Наш уютный дом',
      address: 'ул. Покровка, 19, Москва',
      latitude: 55.7591,
      longitude: 37.6472,
      placeId: 'home-sweet-home',
    },
    story:
      'Вместе замесили тесто для неаполитанской пиццы, перепачкались мукой, а потом устроили турнир по настольным играм до двух часов ночи.',
    photos: [
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    ],
    createdAt: '2026-08-30T22:15:00.000Z',
  },
];

class DateMemoryService {
  private notify() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lovia_dates_updated'));
    }
  }

  getDateMemories(): DateMemory[] {
    try {
      const stored = localStorage.getItem(STORAGE_DATE_MEMORIES_KEY);
      if (!stored) {
        if (isLocalDevHost() && coupleService.isDemoCouple()) {
          localStorage.setItem(STORAGE_DATE_MEMORIES_KEY, JSON.stringify(initialDateMemories));
          return [...initialDateMemories];
        }
        localStorage.setItem(STORAGE_DATE_MEMORIES_KEY, JSON.stringify([]));
        return [];
      }
      return JSON.parse(stored);
    } catch {
      return isLocalDevHost() && coupleService.isDemoCouple() ? [...initialDateMemories] : [];
    }
  }

  getDateMemoryById(id: string): DateMemory | null {
    const list = this.getDateMemories();
    return list.find((m) => m.id === id) || null;
  }

  createDateMemory(input: CreateDateMemoryInput): DateMemory {
    if (isFutureDate(input.date)) {
      throw new Error(
        'Можно сохранять только воспоминания о свиданиях, которые уже состоялись. Будущую дату выбрать нельзя.'
      );
    }

    const list = this.getDateMemories();
    const effectivePlace = input.place?.trim() || input.location?.placeName || undefined;

    const newEntry: DateMemory = {
      id: `memory-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: input.title.trim(),
      date: input.date,
      place: effectivePlace,
      location: input.location ? { ...input.location } : undefined,
      story: input.story?.trim() || undefined,
      photos: input.photos ? [...input.photos] : [],
      linkUrl: input.linkUrl?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const updated = [newEntry, ...list];
    try {
      localStorage.setItem(STORAGE_DATE_MEMORIES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save date memory:', e);
    }
    this.notify();
    return newEntry;
  }

  updateDateMemory(id: string, input: UpdateDateMemoryInput): DateMemory | null {
    if (input.date && isFutureDate(input.date)) {
      throw new Error(
        'Можно сохранять только воспоминания о свиданиях, которые уже состоялись. Будущую дату выбрать нельзя.'
      );
    }

    const list = this.getDateMemories();
    const index = list.findIndex((m) => m.id === id);
    if (index === -1) return null;

    const existing = list[index];
    const effectivePlace =
      input.place !== undefined
        ? input.place.trim() || undefined
        : input.location !== undefined
        ? input.location?.placeName
        : existing.place;

    const updatedEntry: DateMemory = {
      ...existing,
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.date !== undefined ? { date: input.date } : {}),
      place: effectivePlace,
      ...(input.location !== undefined ? { location: input.location ? { ...input.location } : undefined } : {}),
      ...(input.story !== undefined ? { story: input.story.trim() || undefined } : {}),
      ...(input.photos !== undefined ? { photos: [...input.photos] } : {}),
      ...(input.linkUrl !== undefined ? { linkUrl: input.linkUrl.trim() || undefined } : {}),
      updatedAt: new Date().toISOString(),
    };

    list[index] = updatedEntry;
    try {
      localStorage.setItem(STORAGE_DATE_MEMORIES_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to update date memory:', e);
    }
    this.notify();
    return updatedEntry;
  }

  deleteDateMemory(id: string): boolean {
    const list = this.getDateMemories();
    const filtered = list.filter((m) => m.id !== id);
    if (filtered.length === list.length) return false;

    try {
      localStorage.setItem(STORAGE_DATE_MEMORIES_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Failed to delete date memory:', e);
    }
    this.notify();
    return true;
  }

  getHeldDatesCount(): number {
    return this.getDateMemories().length;
  }

  /**
   * Completely clears all shared date memories upon couple dissolution
   */
  clearSharedData(): void {
    try {
      localStorage.setItem(STORAGE_DATE_MEMORIES_KEY, JSON.stringify([]));
    } catch (e) {
      console.warn('Failed to clear date memories from localStorage:', e);
    }
    this.notify();
  }
}

export const dateMemoryService = new DateMemoryService();
