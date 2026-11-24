import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isLocalDevHost } from '../utils/env';
import { coupleService, SpaceType } from '../services/coupleService';
import { triggerTestCelebration } from '../services/celebrationService';
import {
  DevStreakPreviewMode,
  getDevStreakPreview,
  setDevStreakPreview,
  subscribeDevStreakPreview,
} from '../utils/devTools';
import { Icon } from './ui/Icon/Icon';
import './DevBanner.css';

/**
 * Интерактивная панель инструментов разработчика.
 * Рендерится СТРОГО на локальном dev-хосте (isLocalDevHost() === true)
 * и никогда не показывается в Telegram Mini App или production.
 */
export function DevBanner() {
  if (!isLocalDevHost()) return null;

  return <DevBannerInner />;
}

function DevBannerInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const rootRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [spaceType, setSpaceType] = useState<SpaceType>(() => coupleService.getSpaceType());
  const [gender, setGender] = useState<'male' | 'female'>(
    () => coupleService.getActiveUser().gender || 'male'
  );
  const [streakPreview, setStreakPreview] = useState<DevStreakPreviewMode>(() =>
    getDevStreakPreview()
  );

  // Sync local indicators with coupleService & dev streak preview events
  useEffect(() => {
    const syncState = () => {
      setSpaceType(coupleService.getSpaceType());
      setGender(coupleService.getActiveUser().gender || 'male');
    };

    window.addEventListener('lovia_couple_updated', syncState);
    window.addEventListener('lovia_couple_connected', syncState);
    window.addEventListener('lovia_couple_dissolved', syncState);
    const unsubStreak = subscribeDevStreakPreview((mode) => setStreakPreview(mode));

    return () => {
      window.removeEventListener('lovia_couple_updated', syncState);
      window.removeEventListener('lovia_couple_connected', syncState);
      window.removeEventListener('lovia_couple_dissolved', syncState);
      unsubStreak();
    };
  }, []);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSpaceChange = (next: SpaceType) => {
    coupleService.setDevSpaceType(next);
    setSpaceType(next);
  };

  const handleGenderChange = async (next: 'male' | 'female') => {
    setGender(next);
    await coupleService.updateActiveUserProfile({ gender: next });
  };

  const handleGoOnboarding = () => {
    coupleService.setDevDisconnectedForOnboarding();
    setIsOpen(false);
    navigate('/connect');
  };

  const handleGoHome = () => {
    if (!coupleService.isConnected()) {
      coupleService.reconnectDevDemoCouple();
    }
    setIsOpen(false);
    navigate('/');
  };

  const handleStreakPreview = (mode: Exclude<DevStreakPreviewMode, null>) => {
    const next = streakPreview === mode ? null : mode;
    setDevStreakPreview(next);
    setStreakPreview(next);
  };

  const handleCelebration = () => {
    triggerTestCelebration('anniversary');
    setIsOpen(false);
  };

  const handleResetDemo = () => {
    try {
      localStorage.clear();
    } catch (err) {
      console.warn('DevBanner: failed to clear localStorage', err);
    }
    window.location.reload();
  };

  const isOnboardingRoute = location.pathname === '/connect' || location.pathname === '/onboarding';

  return (
    <div className="dev-banner-wrap" ref={rootRef}>
      <button
        type="button"
        className={`dev-banner ${isOpen ? 'dev-banner--open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="lovia-dev-tools-panel"
      >
        <span className="dev-banner__dot" aria-hidden="true" />
        <span>Lovia • Режим предварительного просмотра</span>
        <Icon
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={13}
          className="dev-banner__chevron"
        />
      </button>

      {isOpen && (
        <div
          id="lovia-dev-tools-panel"
          className="dev-tools-panel"
          role="dialog"
          aria-label="Инструменты разработчика"
        >
          <div className="dev-tools-panel__header">
            <span className="dev-tools-panel__title">Инструменты разработчика</span>
            <button
              type="button"
              className="dev-tools-panel__close"
              onClick={() => setIsOpen(false)}
              aria-label="Закрыть панель разработчика"
            >
              <Icon name="close" size={14} />
            </button>
          </div>

          <div className="dev-tools-panel__body">
            {/* 1. Space Type */}
            <div className="dev-tools-group">
              <span className="dev-tools-group__label">Пространство</span>
              <div className="dev-tools-group__row">
                <button
                  type="button"
                  className={`dev-tools-chip ${
                    spaceType === 'relationship' ? 'dev-tools-chip--active' : ''
                  }`}
                  onClick={() => handleSpaceChange('relationship')}
                >
                  Пара (Отношения)
                </button>
                <button
                  type="button"
                  className={`dev-tools-chip ${
                    spaceType === 'friendship' ? 'dev-tools-chip--active' : ''
                  }`}
                  onClick={() => handleSpaceChange('friendship')}
                >
                  Дружба
                </button>
              </div>
            </div>

            {/* 2. User Gender */}
            <div className="dev-tools-group">
              <span className="dev-tools-group__label">Пол пользователя</span>
              <div className="dev-tools-group__row">
                <button
                  type="button"
                  className={`dev-tools-chip ${
                    gender === 'male' ? 'dev-tools-chip--active' : ''
                  }`}
                  onClick={() => handleGenderChange('male')}
                >
                  Мужчина
                </button>
                <button
                  type="button"
                  className={`dev-tools-chip ${
                    gender === 'female' ? 'dev-tools-chip--active' : ''
                  }`}
                  onClick={() => handleGenderChange('female')}
                >
                  Женщина
                </button>
              </div>
            </div>

            {/* 3. Screen Navigation */}
            <div className="dev-tools-group">
              <span className="dev-tools-group__label">Экран</span>
              <div className="dev-tools-group__row">
                <button
                  type="button"
                  className={`dev-tools-chip ${
                    isOnboardingRoute ? 'dev-tools-chip--active' : ''
                  }`}
                  onClick={handleGoOnboarding}
                >
                  Регистрация / Онбординг
                </button>
                <button
                  type="button"
                  className={`dev-tools-chip ${
                    location.pathname === '/' ? 'dev-tools-chip--active' : ''
                  }`}
                  onClick={handleGoHome}
                >
                  Главная
                </button>
              </div>
            </div>

            {/* 4. Streak UI Test States */}
            <div className="dev-tools-group">
              <div className="dev-tools-group__head">
                <span className="dev-tools-group__label">Состояние огонька (тест UI)</span>
                {streakPreview !== null && (
                  <button
                    type="button"
                    className="dev-tools-group__reset-link"
                    onClick={() => {
                      setDevStreakPreview(null);
                      setStreakPreview(null);
                    }}
                  >
                    Реальное
                  </button>
                )}
              </div>
              <div className="dev-tools-group__grid-4">
                <button
                  type="button"
                  className={`dev-tools-chip ${
                    streakPreview === 'zero' ? 'dev-tools-chip--active' : ''
                  }`}
                  onClick={() => handleStreakPreview('zero')}
                >
                  0 дней
                </button>
                <button
                  type="button"
                  className={`dev-tools-chip ${
                    streakPreview === 'waiting' ? 'dev-tools-chip--active' : ''
                  }`}
                  onClick={() => handleStreakPreview('waiting')}
                >
                  Ждём второго
                </button>
                <button
                  type="button"
                  className={`dev-tools-chip ${
                    streakPreview === 'lit' ? 'dev-tools-chip--active' : ''
                  }`}
                  onClick={() => handleStreakPreview('lit')}
                >
                  Горит
                </button>
                <button
                  type="button"
                  className={`dev-tools-chip ${
                    streakPreview === 'black' ? 'dev-tools-chip--active' : ''
                  }`}
                  onClick={() => handleStreakPreview('black')}
                >
                  Чёрный (риск)
                </button>
              </div>
            </div>

            {/* 5. Effects & Demo Reset */}
            <div className="dev-tools-group">
              <span className="dev-tools-group__label">Эффекты</span>
              <div className="dev-tools-group__row">
                <button
                  type="button"
                  className="dev-tools-action dev-tools-action--accent"
                  onClick={handleCelebration}
                >
                  <Icon name="sparkles" size={14} />
                  <span>Салют / Конфетти</span>
                </button>
                <button
                  type="button"
                  className="dev-tools-action dev-tools-action--danger"
                  onClick={handleResetDemo}
                >
                  <span>Сбросить демо</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
