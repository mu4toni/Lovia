import React, { useId } from 'react';
import './Checkbox.css';

export interface CheckboxProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  id: customId,
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className = '',
}) => {
  const generatedId = useId();
  const checkboxId = customId || generatedId;
  const descriptionId = `${checkboxId}-desc`;

  return (
    <label
      htmlFor={checkboxId}
      className={`glass-checkbox-label ${disabled ? 'glass-checkbox-label--disabled' : ''} ${className}`}
    >
      <input
        type="checkbox"
        id={checkboxId}
        checked={checked}
        disabled={disabled}
        aria-describedby={description ? descriptionId : undefined}
        onChange={(e) => onChange(e.target.checked)}
        className="glass-checkbox__input sr-only"
      />
      <span className={`glass-checkbox ${checked ? 'glass-checkbox--checked' : ''}`} aria-hidden="true">
        {checked && (
          <svg className="glass-checkbox__icon" viewBox="0 0 16 16" fill="none">
            <path
              d="M3.5 8.5L6.5 11.5L12.5 4.5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      {(label || description) && (
        <span className="glass-checkbox__content">
          {label && (
            <span
              className={`glass-checkbox__title ${
                checked ? 'glass-checkbox__title--completed' : ''
              }`}
            >
              {label}
            </span>
          )}
          {description && (
            <span id={descriptionId} className="glass-checkbox__desc">
              {description}
            </span>
          )}
        </span>
      )}
    </label>
  );
};
