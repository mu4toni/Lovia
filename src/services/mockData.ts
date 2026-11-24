import { CoupleProfile, CoupleRequest, CoupleEvent } from '../types';
import type { MemorableDate } from '../types/relationship';
import type { ChecklistItem } from '../types/checklist';

function makeDemoPhotoSvg(bg1: string, bg2: string, accent: string, motif: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/></linearGradient></defs><rect width="320" height="220" fill="url(#g)"/><circle cx="258" cy="48" r="34" fill="${accent}" opacity="0.22"/><circle cx="52" cy="182" r="46" fill="${accent}" opacity="0.16"/>${motif}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const DEMO_PHOTO_COFFEE = makeDemoPhotoSvg(
  '#F9E5D8',
  '#F1C9B6',
  '#A87554',
  '<rect x="118" y="92" width="76" height="64" rx="18" fill="#FFFCF8" stroke="#6E4E3E" stroke-width="4"/><path d="M194 106h14c10 0 16 7 16 16s-6 16-16 16h-14" fill="none" stroke="#6E4E3E" stroke-width="4"/><path d="M138 78c0-8 8-8 8-16M162 78c0-8 8-8 8-16" fill="none" stroke="#C92D48" stroke-width="3.5" stroke-linecap="round"/><path d="M104 162h104" stroke="#6E4E3E" stroke-width="4" stroke-linecap="round"/>'
);

export const DEMO_PHOTO_SNOW_HEARTS = makeDemoPhotoSvg(
  '#F5D7DE',
  '#E6B7C6',
  '#C92D48',
  '<path d="M160 156s-46-28-56-56c-7-19 5-40 26-42 14-1 25 7 30 18 5-11 16-19 30-18 21 2 33 23 26 42-10 28-56 56-56 56z" fill="#C92D48" opacity="0.88"/><circle cx="88" cy="54" r="5" fill="#FFF8F4"/><circle cx="242" cy="76" r="6" fill="#FFF8F4"/><circle cx="110" cy="176" r="4" fill="#FFF8F4"/><circle cx="226" cy="162" r="5" fill="#FFF8F4"/>'
);

export const DEMO_PHOTO_EVENING_LIGHTS = makeDemoPhotoSvg(
  '#3A2B36',
  '#6E4555',
  '#FFD08A',
  '<circle cx="96" cy="68" r="14" fill="#FFE6A8" opacity="0.9"/><circle cx="164" cy="54" r="10" fill="#FFD17A" opacity="0.82"/><circle cx="228" cy="74" r="13" fill="#FFE6A8" opacity="0.88"/><path d="M0 168q80-28 160 0t160 0v52H0z" fill="#2A1F26"/><path d="M160 150s-20-12-25-24c-3-8 2-17 11-18 6-1 11 3 14 8 3-5 8-9 14-8 9 1 14 10 11 18-5 12-25 24-25 24z" fill="#FF879C"/>'
);

export const DEMO_PHOTO_KAZAN = makeDemoPhotoSvg(
  '#DCECF8',
  '#F7DFC8',
  '#3C7CA8',
  '<path d="M0 156q90-30 170-8t150-6v78H0z" fill="#A6C8B0" opacity="0.72"/><path d="M98 118l118-38-34 52-24-12-20 18 4-24z" fill="#FFFCF8" stroke="#49372F" stroke-width="3.5" stroke-linejoin="round"/><path d="M62 126c14-2 24-6 34-10" stroke="#49372F" stroke-width="3" stroke-dasharray="5 5" stroke-linecap="round"/>'
);

export const DEMO_PHOTO_NN = makeDemoPhotoSvg(
  '#FDE2C4',
  '#E8A88C',
  '#C92D48',
  '<circle cx="160" cy="126" r="36" fill="#FFF5D6" opacity="0.92"/><path d="M0 144q80-20 160 0t160 0v76H0z" fill="#7D5E57" opacity="0.78"/><path d="M0 168q80 14 160 0t160 0v52H0z" fill="#49372F" opacity="0.65"/>'
);

export const initialDemoMemorableDates: MemorableDate[] = [
  {
    id: 'mdate-1',
    title: 'Первое знакомство',
    date: '2025-10-14',
    description: 'Случайная встреча за кофе в уютном книжном на Покровке — проговорили до закрытия.',
    isAnnual: true,
    photos: [DEMO_PHOTO_COFFEE],
    createdAt: '2025-10-14T15:30:00.000Z',
  },
  {
    id: 'mdate-2',
    title: 'Первый поцелуй',
    date: '2025-11-20',
    description:
      'Под тихим ночным снегопадом у Патриарших прудов. Город уже засыпал в золотых огнях фонарей, мы грели руки о стаканчики с пряным какао и вдруг поняли, что не хотим расставаться ни на минуту.',
    isAnnual: true,
    photos: [DEMO_PHOTO_SNOW_HEARTS, DEMO_PHOTO_EVENING_LIGHTS],
    createdAt: '2025-11-20T21:45:00.000Z',
  },
  {
    id: 'mdate-3',
    title: 'Поездка в Казань',
    date: '2026-03-14',
    description: 'Начало наших совместных приключений: первый перелёт вдвоём, набережная и горячий чак-чак.',
    isAnnual: false,
    photos: [DEMO_PHOTO_KAZAN],
    createdAt: '2026-03-14T10:00:00.000Z',
  },
  {
    id: 'mdate-4',
    title: 'Нижний Новгород',
    date: '2026-06-15',
    isAnnual: false,
    photos: [DEMO_PHOTO_NN],
    createdAt: '2026-06-15T18:00:00.000Z',
  },
  {
    id: 'mdate-5',
    title: 'Подарок на Новый год',
    date: '2025-12-31',
    description: 'Тёплый сюрприз под ёлкой и загаданное вместе желание под бой курантов.',
    isAnnual: true,
    photos: [],
    createdAt: '2025-12-31T23:55:00.000Z',
  },
];

export const initialDemoChecklistItems: ChecklistItem[] = [
  {
    id: 'chk-demo-1',
    coupleId: 'couple-1',
    text: 'Купить свежую клубнику и круассаны',
    createdById: 'user-marsel',
    createdAt: '2026-11-24T09:00:00.000Z',
  },
  {
    id: 'chk-demo-2',
    coupleId: 'couple-1',
    text: 'Забронировать столик на пятницу',
    createdById: 'user-alisa',
    createdAt: '2026-11-24T09:05:00.000Z',
  },
  {
    id: 'chk-demo-3',
    coupleId: 'couple-1',
    text: 'Выбрать уютный фильм на вечер',
    createdById: 'user-marsel',
    createdAt: '2026-11-24T09:10:00.000Z',
  },
];

export const initialCoupleProfile: CoupleProfile = {
  id: 'couple-1',
  user: {
    id: 'user-marsel',
    name: 'Марсель',
    moodEmoji: '✨',
    moodText: 'Готовлю сюрприз',
  },
  partner: {
    id: 'user-alisa',
    name: 'Алиса',
    moodEmoji: '💖',
    moodText: 'Жду вечер',
  },
  isPartnerConnected: true,
  startDate: '2025-12-08',
  daysTogether: 342,
  inviteCode: 'LOVE-MARSEL-ALISA-77',
  motto: 'Маленькие радости каждый день',
};

// Helper for dynamic dates relative to today
const getRelativeDate = (offsetDays: number, hour = 18, minute = 0): Date => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d;
};

export const initialRequests: CoupleRequest[] = [
  {
    id: 'req-1',
    title: 'Выбрать фильм на уютный вечер',
    description: 'Хочется что-то доброе или романтическую комедию',
    authorId: 'user-alisa',
    authorName: 'Алиса',
    targetId: 'user-marsel',
    targetName: 'Для тебя',
    dueDate: getRelativeDate(0, 19, 30).toISOString(),
    dueLabel: 'Сегодня до 19:30',
    urgency: 'high',
    categoryColor: '#F4DDE2', // Пудровый (Стандартный пастельный)
    status: 'pending',
    createdAt: new Date().toISOString(),
    rewardNote: 'С меня тёплый плед и попкорн',
  },
  {
    id: 'req-2',
    title: 'Купить круассаны с миндалём к завтраку',
    description: 'В той французской пекарне у дома',
    authorId: 'user-marsel',
    authorName: 'Марсель',
    targetId: 'user-alisa',
    targetName: 'Для Алисы',
    dueDate: getRelativeDate(1, 10, 0).toISOString(),
    dueLabel: 'Завтра до 10:00',
    urgency: 'medium',
    categoryColor: '#E3EBDD', // Шалфейный (Стандартный пастельный)
    status: 'pending',
    createdAt: new Date().toISOString(),
    rewardNote: 'С меня свежесваренный кофе',
  },
  {
    id: 'req-3',
    title: 'Забрать посылку с подарком из СДЭК',
    description: 'Код получения придёт в SMS',
    authorId: 'user-marsel',
    authorName: 'Марсель',
    targetId: 'user-marsel',
    targetName: 'Для тебя',
    dueDate: getRelativeDate(2, 20, 0).toISOString(),
    dueLabel: 'Послезавтра',
    urgency: 'low',
    categoryColor: '#F5EACD', // Сливочный (Стандартный пастельный)
    status: 'pending',
    createdAt: new Date().toISOString(),
    rewardNote: 'Сюрприз на нашу годовщину',
  },
  {
    id: 'req-4',
    title: 'Обнять крепко при встрече на 30 секунд',
    authorId: 'user-alisa',
    authorName: 'Алиса',
    targetId: 'user-marsel',
    targetName: 'Для тебя',
    dueDate: getRelativeDate(0, 21, 0).toISOString(),
    dueLabel: 'Сегодня',
    urgency: 'low',
    status: 'completed',
    createdAt: new Date().toISOString(),
    rewardNote: 'Люблю тебя',
  },
];

// Overdue task for testing overdue state
export const overdueRequest: CoupleRequest = {
  id: 'req-overdue',
  title: 'Забронировать билеты в планетарий',
  description: 'Посмотреть на звёзды на куполе',
  authorId: 'user-alisa',
  authorName: 'Алиса',
  targetId: 'user-marsel',
  targetName: 'Для тебя',
  dueDate: getRelativeDate(-1, 15, 0).toISOString(),
  dueLabel: 'Вчера в 15:00',
  urgency: 'high',
  categoryColor: '#F4DDE2', // Пудровый
  status: 'overdue',
  createdAt: getRelativeDate(-2).toISOString(),
  rewardNote: 'Очень хотела попасть туда в эти выходные',
};

// Initial couple events for calendar
export const initialEvents: CoupleEvent[] = [
  {
    id: 'ev-1',
    title: 'Ужин при свечах дома',
    date: new Date().toISOString().split('T')[0],
    time: '20:00',
    category: 'dates',
    emoji: '🕯️',
    location: 'Дома',
    note: 'Готовим пасту вместе',
  },
  {
    id: 'ev-2',
    title: 'Прогулка в парке с термосом чая',
    date: getRelativeDate(1).toISOString().split('T')[0],
    time: '16:30',
    category: 'dates',
    emoji: '🧣',
    location: 'Центральный парк',
  },
  {
    id: 'ev-3',
    title: 'Спектакль в театре',
    date: getRelativeDate(4).toISOString().split('T')[0],
    time: '19:00',
    category: 'wishes',
    emoji: '🎟️',
    location: 'Театр драмы',
  },
];
