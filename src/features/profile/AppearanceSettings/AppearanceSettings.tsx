import React from 'react';
import { Icon } from '../../../components/ui/Icon/Icon';
import './AppearanceSettings.css';

export interface AppearanceSettingsProps {
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  theme,
  onThemeChange,
}) => {
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
    </section>
  );
};
