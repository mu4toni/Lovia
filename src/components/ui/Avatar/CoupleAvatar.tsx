import React from 'react';
import { Avatar } from './Avatar';
import { Icon } from '../Icon/Icon';
import './Avatar.css';

export interface CoupleAvatarProps {
  user1: { name: string; src?: string };
  user2: { name: string; src?: string };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

export const CoupleAvatar: React.FC<CoupleAvatarProps> = ({
  user1,
  user2,
  size = 'md',
  className = '',
  style,
}) => {
  const heartSize = size === 'lg' ? 13 : size === 'sm' ? 10 : 12;

  return (
    <div
      style={style}
      className={`couple-avatar couple-avatar--${size} ${className}`}
      role="group"
      aria-label={`Пара: ${user1.name} и ${user2.name}`}
    >
      <div className="couple-avatar__first">
        <Avatar name={user1.name} src={user1.src} size={size} />
      </div>
      <div className="couple-avatar__heart" aria-hidden="true">
        <Icon name="heart-filled" size={heartSize} className="couple-avatar__heart-icon" />
      </div>
      <div className="couple-avatar__second">
        <Avatar name={user2.name} src={user2.src} size={size} />
      </div>
    </div>
  );
};
