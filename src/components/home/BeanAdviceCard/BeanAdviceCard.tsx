import React, { useMemo } from 'react';
import { Mascot } from '../../ui/Mascot/Mascot';
import { SketchDoodle } from '../../ui/SketchDecor/SketchDecor';
import { useSpaceMode } from '../../../hooks/useSpaceMode';
import './BeanAdviceCard.css';

const RELATIONSHIP_TIPS = [
  'Напишите друг другу короткую записку о том, за что вы благодарны сегодня ♡',
  'Устройте вечер без телефонов: чай, плед и любимый фильм вдвоём ♡',
  'Сделайте сегодня одно совместное фото и сохраните его в дневник свиданий ♡',
  'Загляните в вишлист любимого человека — вдруг там ждёт идея для маленького сюрприза ♡',
  'Приготовьте вместе необычный ужин или сходите в новое уютное кафе ♡',
  'Вспомните ваше самое смешное свидание и перечитайте заметки в «Нашей истории» ♡',
  'Подарите сегодня внезапное тёплое объятие просто так, без повода ♡',
];

const FRIENDSHIP_TIPS = [
  'Договоритесь выпить кофе и обсудить все последние новости на этой неделе ✦',
  'Сохраните в дневнике встреч лучшее фото с вашей последней прогулки ✦',
  'Загляните в вишлист друга — маленькие знаки внимания всегда поднимают настроение ✦',
  'Запланируйте спонтанную прогулку по новому маршруту в выходные ✦',
  'Отправьте друг другу любимую песню дня и устройте мини-обмен плейлистами ✦',
  'Вспомните самую весёлую историю из вашей дружбы и запишите её в памятные даты ✦',
  'Поблагодарите друга за поддержку — тёплые слова всегда ценятся ✦',
];

export const BeanAdviceCard: React.FC = () => {
  const { isFriendship } = useSpaceMode();

  const tip = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    const list = isFriendship ? FRIENDSHIP_TIPS : RELATIONSHIP_TIPS;
    return list[dayOfYear % list.length];
  }, [isFriendship]);

  return (
    <aside className="bean-advice-card" aria-label="Совет дня от Бина">
      <div className="bean-advice-card__mascot" aria-hidden="true">
        <Mascot mood="support" size={58} />
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
        <p className="bean-advice-card__text">{tip}</p>
      </div>
    </aside>
  );
};
