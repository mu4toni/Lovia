import React, { useId } from 'react';
import './Input.css';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      id: customId,
      label,
      error,
      helperText,
      className = '',
      disabled,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = customId || generatedId;
    const errorId = `${textareaId}-error`;
    const helperId = `${textareaId}-helper`;

    return (
      <div className={`input-field ${disabled ? 'input-field--disabled' : ''} ${className}`}>
        {label && (
          <label htmlFor={textareaId} className="input-field__label">
            {label}
          </label>
        )}
        <div
          className={`input-field__container input-field__container--textarea ${
            error ? 'input-field__container--error' : ''
          }`}
        >
          <textarea
            ref={ref}
            id={textareaId}
            rows={rows}
            disabled={disabled}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            className="input-field__control input-field__control--textarea"
            {...props}
          />
        </div>
        {error && (
          <p id={errorId} className="input-field__error" role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="input-field__helper">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
