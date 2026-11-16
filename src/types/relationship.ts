export interface MemorableDate {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  description?: string;
  isAnnual: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateMemorableDateInput {
  title: string;
  date: string; // YYYY-MM-DD
  description?: string;
  isAnnual: boolean;
}

export interface UpdateMemorableDateInput {
  title?: string;
  date?: string;
  description?: string;
  isAnnual?: boolean;
}

import { AnniversaryInfo } from '../utils/dateCalculations';
export type { AnniversaryInfo };

export interface CoupleRelationshipData {
  startDate: string; // YYYY-MM-DD
  daysTogether: number;
  anniversary: AnniversaryInfo;
  heldDatesCount: number;
}
