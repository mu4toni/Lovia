import React, { useState } from 'react';
import { Icon, IconName } from '../../ui/Icon/Icon';
import { triggerTestCelebration } from '../../../services/celebrationService';
import './DemoStateSwitcher.css';

export type DemoStateMode =
  | 'normal'
  | 'unpaired'
  | 'empty_tasks'
  | 'overdue'
  | 'loading'
  | 'error';

interface DemoStateSwitcherProps {
  currentMode: DemoStateMode;
  onSelectMode: (mode: DemoStateMode) => void;
}

export const DemoStateSwitcher: React.FC<DemoStateSwitcherProps> = ({
  currentMode,
  onSelectMode,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const states: { mode: DemoStateMode; label: string; icon: IconName }[] = [
    { mode: 'normal', label: 'Обычный', icon: 'sparkles' },
    { mode: 'unpaired', label: 'Без пары', icon: 'profile' },
    { mode: 'empty_tasks', label: 'Без напоминаний', icon: 'check-circle' },
    { mode: 'overdue', label: 'С просрочкой', icon: 'alert' },
    { mode: 'loading', label: 'Загрузка', icon: 'clock' },
    { mode: 'error', label: 'Ошибка', icon: 'alert' },
  ];

  const current = states.find((s) => s.mode === currentMode) || states[0];

  return (
    <div className="state-switcher" aria-label="Тестирование состояний экрана">
      <div className="state-switcher__bar">
        <button
          type="button"
          className="state-switcher__toggle"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
        >
          <span className="state-switcher__badge">Состояние</span>
          <span className="state-switcher__current">
            <Icon name={current.icon} size={14} className="state-switcher__current-icon" />
            {current.label}
          </span>
          <Icon
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={14}
            className="state-switcher__chevron"
          />
        </button>

        {isOpen && (
          <div className="state-switcher__menu">
            <span className="state-switcher__hint">
              Проверка состояний приложения:
            </span>
            <div className="state-switcher__grid">
              {states.map((s) => (
                <button
                  key={s.mode}
                  type="button"
                  className={`state-switcher__item ${
                    currentMode === s.mode ? 'state-switcher__item--active' : ''
                  }`}
                  onClick={() => {
                    onSelectMode(s.mode);
                    setIsOpen(false);
                  }}
                >
                  <Icon name={s.icon} size={14} className="state-switcher__item-icon" />
                  <span className="state-switcher__item-label">{s.label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="state-switcher__fireworks-btn"
              onClick={() => {
                triggerTestCelebration('anniversary');
                setIsOpen(false);
              }}
            >
              <span>🎆 Тест салюта</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
