export type SpaceType = 'relationship' | 'friendship';

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  moodEmoji?: string;
  moodText?: string;
}

export interface Partner extends User {
  lastSeen?: string;
}

export interface CoupleProfile {
  id: string;
  user: User;
  partner?: Partner;
  isPartnerConnected: boolean;
  startDate: string; // ISO date
  daysTogether: number;
  inviteCode: string;
  motto?: string;
  spaceType?: SpaceType;
}
