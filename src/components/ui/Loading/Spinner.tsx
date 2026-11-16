import React from 'react';
import './Loading.css';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  label = 'Загрузка...',
  className = '',
}) => {
  return (
    <div
      className={`glass-spinner-container ${className}`}
      role="status"
      aria-label={label}
    >
      <div className={`glass-spinner glass-spinner--${size}`} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
};
