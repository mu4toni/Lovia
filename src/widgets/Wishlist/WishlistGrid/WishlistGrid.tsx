import React from 'react';
import { WishItem } from '../../../types/wishlist';
import { WishCard } from '../WishCard/WishCard';
import { Button } from '../../../components/ui/Button/Button';
import { Icon } from '../../../components/ui/Icon/Icon';
import { Mascot } from '../../../components/ui/Mascot/Mascot';
import { useSpaceMode } from '../../../hooks/useSpaceMode';
import './WishlistGrid.css';

export interface WishlistGridProps {
  items: WishItem[];
  isOwnList: boolean;
  partnerName: string;
  onCreateClick: () => void;
  onEdit: (item: WishItem) => void;
  onDelete: (item: WishItem) => void;
  onToggleReserve?: (id: string) => void;
  onRemindPartner?: () => void;
  onItemClick?: (item: WishItem) => void;
  className?: string;
}

export const WishlistGrid: React.FC<WishlistGridProps> = ({
  items,
  isOwnList,
  partnerName,
  onCreateClick: _onCreateClick,
  onEdit,
  onDelete,
  onToggleReserve,
  onRemindPartner,
  onItemClick,
  className = '',
}) => {
  const { isFriendship } = useSpaceMode();
  // 1. Empty States
  if (items.length === 0) {
    // A: Own list is empty
    if (isOwnList) {
      return (
        <div className="wishlist-empty-card" role="region" aria-label="Ваш вишлист пуст">
          <div className="wishlist-empty-icon" aria-hidden="true">
            <Mascot mood="thinking" size={114} interactive />
          </div>
          <h2 className="wishlist-empty-title">Ваш вишлист пока пуст</h2>
          <p className="wishlist-empty-desc">
            Добавьте то, о чём давно мечтаете: желанные вещи, впечатления, книги или уютные мелочи.
            {isFriendship ? ' Друг' : ' Партнёр'} увидит ваш список и сможет порадовать сюрпризом!
          </p>
        </div>
      );
    }

    // B: Partner's list is empty
    return (
      <div
        className="wishlist-empty-card"
        role="region"
        aria-label={isFriendship ? 'Вишлист друга пуст' : 'Вишлист партнёра пуст'}
      >
        <div className="wishlist-empty-icon" aria-hidden="true">
          <Mascot variant="sleepy" size={120} animated interactive />
        </div>
        <h2 className="wishlist-empty-title">У {partnerName} пока нет желаний</h2>
        <p className="wishlist-empty-desc">
          Список желаний {partnerName} пока пуст. Отправьте{' '}
          {isFriendship ? 'дружеское' : 'нежное'} напоминание, чтобы{' '}
          {isFriendship ? 'друг' : 'партнёр'} добавил пару идей для подарка!
        </p>
        {onRemindPartner && (
          <Button
            variant="primary"
            size="md"
            leftIcon={<Icon name="bell" size={16} />}
            onClick={onRemindPartner}
          >
            Напомнить {partnerName}
          </Button>
        )}
      </div>
    );
  }

  // 2. Active Grid
  return (
    <div
      id="panel-wishlist"
      role="region"
      aria-label="Список желаний"
      className={`wishlist-grid ${className}`}
    >
      {items.map((item) => (
        <WishCard
          key={item.id}
          item={item}
          isOwnList={isOwnList}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleReserve={onToggleReserve}
          onClick={onItemClick}
        />
      ))}
    </div>
  );
};
