export interface DatePlace {
  placeName: string;
  address?: string;
  latitude: number;
  longitude: number;
  placeId?: string;
}

export interface DateMemory {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  place?: string; // Text representation
  location?: DatePlace; // Structured geolocation & address
  story?: string;
  photos: string[]; // URLs or Data URLs
  linkUrl?: string; // Kept for backwards compatibility
  createdAt: string;
  updatedAt?: string;
}

export interface CreateDateMemoryInput {
  title: string;
  date: string; // YYYY-MM-DD (must be <= today)
  place?: string;
  location?: DatePlace;
  story?: string;
  photos?: string[];
  linkUrl?: string;
}

export interface UpdateDateMemoryInput {
  title?: string;
  date?: string;
  place?: string;
  location?: DatePlace;
  story?: string;
  photos?: string[];
  linkUrl?: string;
}

export type DateMemorySort = 'newest' | 'oldest';
