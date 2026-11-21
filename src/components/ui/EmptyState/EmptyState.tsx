import React from 'react';
import { Button } from '../Button/Button';
import { Mascot, MascotMood } from '../Mascot/Mascot';
import './EmptyState.css';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  mascotMood?: MascotMood;
  mascotVariant?: 'sleepy' | 'love' | 'peek';
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  mascotMood,
  mascotVariant = 'sleepy',
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  const resolvedMood = mascotMood || mascotVariant;

  return (
    <div className={`empty-state ${className}`}>
      {resolvedMood ? (
        <div className="empty-state__mascot-wrap" aria-hidden="true">
          <Mascot mood={resolvedMood} size={114} interactive />
        </div>
      ) : (
        icon && (
          <div className="empty-state__icon-bubble" aria-hidden="true">
            {icon}
          </div>
        )
      )}
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__desc">{description}</p>
      {actionText && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
