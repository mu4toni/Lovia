import { CoupleProfile, CoupleRequest, CoupleEvent } from '../types';

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
