import React from 'react';
import { Mascot } from '../Mascot/Mascot';
import './PageSkeleton.css';

export interface PageSkeletonProps {
  cardsCount?: number;
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({ cardsCount = 3 }) => {
  return (
    <div className="page-skeleton" role="status" aria-label="Загрузка страницы...">
      <div className="page-skeleton__mascot-row" aria-hidden="true">
        <Mascot name="32_peeking_cloud" size={44} className="page-skeleton__cloud" />
        <Mascot name="19_loading_tea" size={68} eager animated />
      </div>
      <div className="page-skeleton__header" />
      <div className="page-skeleton__card page-skeleton__card--large" />
      {Array.from({ length: cardsCount }).map((_, idx) => (
        <div key={idx} className="page-skeleton__card" />
      ))}
    </div>
  );
};
