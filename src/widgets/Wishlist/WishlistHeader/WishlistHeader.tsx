import React from 'react';
import { WishlistTab } from '../../../types/wishlist';
import { Avatar } from '../../../components/ui/Avatar/Avatar';
import './WishlistHeader.css';

export interface WishlistHeaderProps {
  activeTab: WishlistTab;
  onSelectTab: (tab: WishlistTab) => void;
  myItemsCount: number;
  partnerItemsCount: number;
  userName: string;
  partnerName: string;
  userAvatarUrl?: string;
  partnerAvatarUrl?: string;
  onCreateClick?: () => void;
  isOwnList: boolean;
  className?: string;
}

function toGenitive(name: string): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (trimmed.endsWith('а') || trimmed.endsWith('А')) {
    return trimmed.slice(0, -1) + (trimmed.endsWith('а') ? 'ы' : 'Ы');
  }
  if (trimmed.endsWith('я') || trimmed.endsWith('Я')) {
    return trimmed.slice(0, -1) + (trimmed.endsWith('я') ? 'и' : 'И');
  }
  if (trimmed.endsWith('й') || trimmed.endsWith('ь')) {
    return trimmed.slice(0, -1) + 'я';
  }
  if (/[бвгджзклмнпрстфхцчшщ]$/i.test(trimmed)) {
    return trimmed + 'а';
  }
  return trimmed;
}

export const WishlistHeader: React.FC<WishlistHeaderProps> = ({
  activeTab,
  onSelectTab,
  myItemsCount,
  partnerItemsCount,
  userName,
  partnerName,
  userAvatarUrl,
  partnerAvatarUrl,
  onCreateClick: _onCreateClick,
  isOwnList,
  className = '',
}) => {
  const currentOwnerName = isOwnList ? userName : partnerName;
  const currentAvatarUrl = isOwnList ? userAvatarUrl : partnerAvatarUrl;
  const currentCount = isOwnList ? myItemsCount : partnerItemsCount;
  const partnerGenitive = toGenitive(partnerName);

  const countWord =
    currentCount === 1
      ? 'желание'
      : currentCount >= 2 && currentCount <= 4
      ? 'желания'
      : 'желаний';

  return (
    <div className={`wishlist-header ${className}`}>
      {/* 1. Top Segmented Switch: Мой вишлист vs Вишлист партнера */}
      <div
        className="wishlist-header__tabs-dock"
        role="tablist"
        aria-label="Переключение списков желаний"
      >
        <button
          type="button"
          role="tab"
          id="tab-my-wishlist"
          aria-selected={activeTab === 'mine'}
          aria-controls="panel-wishlist"
          className={`wishlist-header__tab-btn ${
            activeTab === 'mine' ? 'wishlist-header__tab-btn--active' : ''
          }`}
          onClick={() => onSelectTab('mine')}
        >
          <span>Мой вишлист</span>
          <span className="wishlist-header__tab-badge" aria-label={`${myItemsCount} желаний`}>
            {myItemsCount}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-partner-wishlist"
          aria-selected={activeTab === 'partner'}
          aria-controls="panel-wishlist"
          className={`wishlist-header__tab-btn ${
            activeTab === 'partner' ? 'wishlist-header__tab-btn--active' : ''
          }`}
          onClick={() => onSelectTab('partner')}
        >
          <span>Вишлист {partnerGenitive}</span>
          <span
            className="wishlist-header__tab-badge"
            aria-label={`${partnerItemsCount} желаний`}
          >
            {partnerItemsCount}
          </span>
        </button>
      </div>

      {/* 2. Main Owner Profile Card */}
      <div className="wishlist-header__owner-card">
        <div className="wishlist-header__owner-info">
          <Avatar
            name={currentOwnerName}
            src={currentAvatarUrl}
            size="lg"
          />
          <div className="wishlist-header__owner-details">
            <span className="wishlist-header__owner-badge">
              {isOwnList ? 'Ваш персональный список' : `Список ${partnerGenitive}`}
            </span>
            <h1 className="wishlist-header__owner-title">
              {isOwnList ? 'Мои желания' : `Мечты ${partnerGenitive}`}
            </h1>
            <span className="wishlist-header__owner-count">
              {currentCount > 0
                ? `${currentCount} ${countWord} в списке`
                : 'Список пока пуст'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
