import React from 'react';
import { Button } from '../Button/Button';
import { Mascot } from '../Mascot/Mascot';
import './EmptyState.css';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  mascotVariant?: 'sleepy' | 'love' | 'peek';
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  mascotVariant = 'sleepy',
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div className={`empty-state ${className}`}>
      {mascotVariant ? (
        <div className="empty-state__mascot-wrap" aria-hidden="true">
          <Mascot variant={mascotVariant} size={118} animated interactive />
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
