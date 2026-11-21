import React, { useState, useEffect } from 'react';
import { Icon } from '../../../components/ui/Icon/Icon';
import { telegramService } from '../../../services/telegramService';
import './AppearanceSettings.css';

export type AccentPaletteId = 'strawberry' | 'caramel' | 'lavender' | 'sage' | 'sky';

export interface AccentPaletteOption {
  id: AccentPaletteId;
  label: string;
  color: string;
  softColor: string;
}

export const ACCENT_PALETTES: AccentPaletteOption[] = [
  {
    id: 'strawberry',
    label: 'Клубничный',
    color: '#C92D48',
    softColor: '#E8B9B5',
  },
  {
    id: 'caramel',
    label: 'Карамельный',
    color: '#A87554',
    softColor: '#DFC3AE',
  },
  {
    id: 'lavender',
    label: 'Лавандовый',
    color: '#8E6BB8',
    softColor: '#D6C5E9',
  },
  {
    id: 'sage',
    label: 'Шалфейный',
    color: '#4E8568',
    softColor: '#BCD5C7',
  },
  {
    id: 'sky',
    label: 'Небесный',
    color: '#4A7BB7',
    softColor: '#BDD0E7',
  },
];

export interface AppearanceSettingsProps {
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  accentColor?: AccentPaletteId;
  onAccentChange?: (accent: AccentPaletteId) => void;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  theme,
  onThemeChange,
  accentColor,
  onAccentChange,
}) => {
  const [internalAccent, setInternalAccent] = useState<AccentPaletteId>(() => {
    const attr = document.documentElement.getAttribute('data-accent') as AccentPaletteId | null;
    const saved = localStorage.getItem('lovia_accent_color') as AccentPaletteId | null;
    return accentColor || attr || saved || 'strawberry';
  });

  useEffect(() => {
    if (accentColor) {
      setInternalAccent(accentColor);
    }
  }, [accentColor]);

  const activeAccent = accentColor || internalAccent;

  const handleSelectAccent = (id: AccentPaletteId) => {
    telegramService.hapticImpact('light');
    setInternalAccent(id);
    document.documentElement.setAttribute('data-accent', id);
    localStorage.setItem('lovia_accent_color', id);
    if (onAccentChange) {
      onAccentChange(id);
    }
  };

  return (
    <section className="appearance-settings" aria-label="Оформление и тема приложения">
      <div className="appearance-settings__header">
        <div className="appearance-settings__title-row">
          <Icon name="palette" size={17} className="appearance-settings__icon" />
          <h3 className="appearance-settings__title">Оформление</h3>
        </div>
      </div>

      <div className="appearance-settings__grid" role="radiogroup" aria-label="Выбор темы оформления">
        {/* Light Theme Card */}
        <button
          type="button"
          role="radio"
          aria-checked={theme === 'light'}
          className={`appearance-card ${theme === 'light' ? 'appearance-card--active' : ''}`}
          onClick={() => onThemeChange('light')}
        >
          <div className="appearance-card__preview appearance-card__preview--light">
            <div className="appearance-card__preview-row">
              <div className="appearance-card__preview-dot" />
              <div className="appearance-card__preview-bar" />
            </div>
            <div className="appearance-card__preview-card" />
          </div>

          <div className="appearance-card__info">
            <Icon name="sun" size={17} className="appearance-card__icon" />
            <span className="appearance-card__label">Светлая</span>
          </div>

          <div
            className={`appearance-card__badge ${
              theme === 'light' ? '' : 'appearance-card__badge--inactive'
            }`}
          >
            <Icon name="check" size={11} strokeWidth={2.6} />
            <span>Активна</span>
          </div>
        </button>

        {/* Dark Theme Card */}
        <button
          type="button"
          role="radio"
          aria-checked={theme === 'dark'}
          className={`appearance-card ${theme === 'dark' ? 'appearance-card--active' : ''}`}
          onClick={() => onThemeChange('dark')}
        >
          <div className="appearance-card__preview appearance-card__preview--dark">
            <div className="appearance-card__preview-row">
              <div className="appearance-card__preview-dot" />
              <div className="appearance-card__preview-bar" />
            </div>
            <div className="appearance-card__preview-card" />
          </div>

          <div className="appearance-card__info">
            <Icon name="moon" size={17} className="appearance-card__icon" />
            <span className="appearance-card__label">Тёмная</span>
          </div>

          <div
            className={`appearance-card__badge ${
              theme === 'dark' ? '' : 'appearance-card__badge--inactive'
            }`}
          >
            <Icon name="check" size={11} strokeWidth={2.6} />
            <span>Активна</span>
          </div>
        </button>
      </div>

      {/* Scrapbook Accent Color Palette Selector */}
      <div className="appearance-accents" role="radiogroup" aria-label="Цвет акцента дневника">
        <div className="appearance-accents__header">
          <span className="appearance-accents__label">Цвет акцентов дневника</span>
          <span className="appearance-accents__current">
            {ACCENT_PALETTES.find((p) => p.id === activeAccent)?.label || 'Клубничный'}
          </span>
        </div>

        <div className="appearance-accents__row">
          {ACCENT_PALETTES.map((palette) => {
            const isSelected = activeAccent === palette.id;
            return (
              <button
                key={palette.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={palette.label}
                className={`appearance-accent-item ${
                  isSelected ? 'appearance-accent-item--active' : ''
                }`}
                onClick={() => handleSelectAccent(palette.id)}
              >
                <span
                  className="appearance-accent-swatch"
                  style={{
                    backgroundColor: palette.color,
                    '--swatch-color': palette.color,
                  } as React.CSSProperties}
                >
                  {isSelected && (
                    <span className="appearance-accent-swatch__check" aria-hidden="true">
                      <Icon name="check" size={15} strokeWidth={2.8} />
                    </span>
                  )}
                </span>
                <span className="appearance-accent-item__name">{palette.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
