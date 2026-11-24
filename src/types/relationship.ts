export interface MemorableDate {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  description?: string;
  isAnnual: boolean;
  photos?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface CreateMemorableDateInput {
  title: string;
  date: string; // YYYY-MM-DD
  description?: string;
  isAnnual: boolean;
  photos?: string[];
}

export interface UpdateMemorableDateInput {
  title?: string;
  date?: string;
  description?: string;
  isAnnual?: boolean;
  photos?: string[];
}

import { AnniversaryInfo } from '../utils/dateCalculations';
export type { AnniversaryInfo };

export interface CoupleRelationshipData {
  startDate: string; // YYYY-MM-DD
  daysTogether: number;
  anniversary: AnniversaryInfo;
  heldDatesCount: number;
}
