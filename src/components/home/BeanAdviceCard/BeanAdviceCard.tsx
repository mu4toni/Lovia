import React, { useState } from 'react';
import { Mascot, MascotName } from '../../ui/Mascot/Mascot';
import { SketchDoodle } from '../../ui/SketchDecor/SketchDecor';
import { useSpaceMode } from '../../../hooks/useSpaceMode';
import './BeanAdviceCard.css';

interface AdviceTip {
  text: string;
  sticker: MascotName;
}

const RELATIONSHIP_TIPS: AdviceTip[] = [
  {
    text: 'Напишите друг другу короткую записку о том, за что вы благодарны сегодня ♡',
    sticker: '38_writing_diary',
  },
  {
    text: 'Устройте вечер без телефонов: чай, плед и любимый фильм вдвоём ♡',
    sticker: '13_date_cinema',
  },
  {
    text: 'Сделайте сегодня одно совместное фото и сохраните его в дневник свиданий ♡',
    sticker: '08_camera_photo',
  },
  {
    text: 'Загляните в вишлист любимого человека — вдруг там ждёт идея для маленького сюрприза ♡',
    sticker: '11_wishlist_gift',
  },
  {
    text: 'Приготовьте вместе необычный ужин или зайдите в новое уютное кафе ♡',
    sticker: '12_date_coffee',
  },
  {
    text: 'Вспомните ваше самое смешное свидание и перечитайте заметки в «Нашей истории» ♡',
    sticker: '38_writing_diary',
  },
  {
    text: 'Подарите сегодня внезапное тёплое объятие и заботу просто так, без повода ♡',
    sticker: '39_umbrella_care',
  },
  {
    text: 'Отправьте друг другу короткое голосовое с комплиментом посреди рабочего дня ♡',
    sticker: '04_sending_love_note',
  },
  {
    text: 'Придумайте маленькую традицию на ближайшие выходные и добавьте её в календарь ♡',
    sticker: '09_calendar_anniversary',
  },
  {
    text: 'Соберите плейлист из 5 песен, которые напоминают вам друг о друге ♡',
    sticker: '37_heart_balloon',
  },
  {
    text: 'Заварите любимый напиток и просто пообнимайтесь 10 минут без спешки ♡',
    sticker: '16_relationships_hug',
  },
  {
    text: 'Наметьте одно место, куда вы давно мечтаете съездить вместе, и помечтайте о нём ♡',
    sticker: '34_lying_dreaming',
  },
  {
    text: 'Перед сном назовите по одному самому тёплому моменту сегодняшнего дня ♡',
    sticker: '30_kiss_goodnight',
  },
  {
    text: 'Поставьте маленькое заботливое напоминание для любимого человека на завтра ♡',
    sticker: '14_reminder_bell',
  },
];

const FRIENDSHIP_TIPS: AdviceTip[] = [
  {
    text: 'Договоритесь выпить кофе и обсудить все последние новости на этой неделе ✦',
    sticker: '12_date_coffee',
  },
  {
    text: 'Сохраните в дневнике встреч лучшее фото с вашей последней прогулки ✦',
    sticker: '08_camera_photo',
  },
  {
    text: 'Загляните в вишлист друга — маленькие знаки внимания всегда поднимают настроение ✦',
    sticker: '11_wishlist_gift',
  },
  {
    text: 'Устройте киновечер или посмотрите вместе новый сериал в выходные ✦',
    sticker: '13_date_cinema',
  },
  {
    text: 'Отправьте друг другу любимую песню дня и устройте мини-обмен плейлистами ✦',
    sticker: '37_heart_balloon',
  },
  {
    text: 'Вспомните самую весёлую историю из вашей дружбы и запишите её в памятные даты ✦',
    sticker: '38_writing_diary',
  },
  {
    text: 'Поблагодарите друга за поддержку — тёплые слова и забота всегда ценятся ✦',
    sticker: '39_umbrella_care',
  },
  {
    text: 'Отправьте другу мем или короткое сообщение «как ты?» прямо сейчас ✦',
    sticker: '04_sending_love_note',
  },
  {
    text: 'Запланируйте прогулку по новому маршруту и отметьте дату в общем календаре ✦',
    sticker: '09_calendar_anniversary',
  },
  {
    text: 'Придумайте совместный челлендж на неделю и поддерживайте друг друга ✦',
    sticker: '36_high_five',
  },
  {
    text: 'Обсудите, куда вы хотите выбраться в ближайший отпуск или на длинные выходные ✦',
    sticker: '34_lying_dreaming',
  },
  {
    text: 'Сыграйте вечером в настольную игру или устройте созвон за чашкой чая ✦',
    sticker: '19_loading_tea',
  },
  {
    text: 'Поздравьте друг друга с маленькой победой этой недели — даже самой скромной ✦',
    sticker: '18_success_celebrate',
  },
  {
    text: 'Добавьте общее напоминание, чтобы точно не забыть о ближайшей встрече ✦',
    sticker: '14_reminder_bell',
  },
];

const BEAN_SESSION_ADVICE_KEY = 'lovia_bean_session_advice_idx_v1';

function getSessionAdviceIndex(maxLen: number): number {
  try {
    const saved = sessionStorage.getItem(BEAN_SESSION_ADVICE_KEY);
    if (saved !== null) {
      const parsed = Number.parseInt(saved, 10);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        return parsed % maxLen;
      }
    }
  } catch {
    // ignore storage errors
  }

  const randomIdx = Math.floor(Math.random() * maxLen);
  try {
    sessionStorage.setItem(BEAN_SESSION_ADVICE_KEY, String(randomIdx));
  } catch {
    // ignore storage errors
  }
  return randomIdx;
}

export const BeanAdviceCard: React.FC = () => {
  const { isFriendship } = useSpaceMode();
  const [adviceIndex] = useState<number>(() =>
    getSessionAdviceIndex(Math.min(RELATIONSHIP_TIPS.length, FRIENDSHIP_TIPS.length))
  );

  const list = isFriendship ? FRIENDSHIP_TIPS : RELATIONSHIP_TIPS;
  const tip = list[adviceIndex % list.length];

  return (
    <aside className="bean-advice-card" aria-label="Совет дня от Бина">
      <div className="bean-advice-card__mascot" aria-hidden="true">
        <Mascot name={tip.sticker} size={58} />
      </div>
      <div className="bean-advice-card__body">
        <div className="bean-advice-card__header">
          <span className="bean-advice-card__title">Бин советует:</span>
          <SketchDoodle
            type={isFriendship ? 'star' : 'heart-filled'}
            size={12}
            className="bean-advice-card__doodle"
          />
        </div>
        <p className="bean-advice-card__text">{tip.text}</p>
      </div>
    </aside>
  );
};
