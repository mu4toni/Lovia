import React, { useId } from 'react';
import './Switch.css';

export interface SwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  id: customId,
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className = '',
  ariaLabel,
}) => {
  const generatedId = useId();
  const switchId = customId || generatedId;
  const descriptionId = `${switchId}-desc`;

  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div
      className={`glass-switch-container ${disabled ? 'glass-switch-container--disabled' : ''} ${className}`}
      onClick={handleToggle}
    >
      {label && (
        <div className="glass-switch-container__text">
          <label htmlFor={switchId} className="glass-switch-container__label">
            {label}
          </label>
          {description && (
            <p id={descriptionId} className="glass-switch-container__desc">
              {description}
            </p>
          )}
        </div>
      )}
      <button
        type="button"
        id={switchId}
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || (typeof label === 'string' ? label : undefined)}
        aria-describedby={description ? descriptionId : undefined}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        className={`glass-switch ${checked ? 'glass-switch--checked' : ''}`}
      >
        <span className="glass-switch__thumb" aria-hidden="true" />
      </button>
    </div>
  );
};
