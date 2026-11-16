import React from 'react';
import './Badge.css';

export type UrgencyLevel = 'low' | 'medium' | 'high';
export type TaskCategory = 'dates' | 'chores' | 'gifts' | 'wishes' | 'memories';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'urgency' | 'category';
  urgency?: UrgencyLevel;
  category?: TaskCategory;
  dot?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  urgency,
  category,
  dot = false,
  icon,
  children,
  className = '',
  ...props
}) => {
  let modifierClass = `glass-badge--${variant}`;

  if (variant === 'urgency' && urgency) {
    modifierClass += ` glass-badge--urgency-${urgency}`;
  } else if (variant === 'category' && category) {
    modifierClass += ` glass-badge--cat-${category}`;
  }

  return (
    <span className={`glass-badge ${modifierClass} ${className}`} {...props}>
      {dot && <span className="glass-badge__dot" aria-hidden="true" />}
      {icon && <span className="glass-badge__icon" aria-hidden="true">{icon}</span>}
      <span className="glass-badge__text">{children}</span>
    </span>
  );
};
