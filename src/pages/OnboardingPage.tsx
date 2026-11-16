import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card/Card';
import { Button } from '../components/ui/Button/Button';
import { Input } from '../components/ui/Input/Input';
import { DatePicker } from '../components/ui/DatePicker/DatePicker';
import { Icon } from '../components/ui/Icon/Icon';
import { Mascot } from '../components/ui/Mascot/Mascot';
import { useToast } from '../components/ui/Toast/ToastContext';
import { coupleService, CoupleSpace, RegisteredUser, SpaceType } from '../services/coupleService';
import { telegramService } from '../services/telegramService';
import { getTodayDateString } from '../utils/dateCalculations';
import { copyTextToClipboard } from '../utils/clipboard';
import { isLocalDevHost } from '../utils/env';
import './OnboardingPage.css';

export function OnboardingPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [currentUser, setCurrentUser] = useState<RegisteredUser>(() =>
    coupleService.getActiveUser()
  );
  const [currentCouple, setCurrentCouple] = useState<CoupleSpace | null>(() =>
    coupleService.getCurrentCouple()
  );

  // Form states: prefill from Telegram if available, or keep empty in non-local-dev host
  const tgUser = telegramService.getTelegramUser();
  const [name, setName] = useState(() => {
    if (telegramService.isTelegramEnv() && tgUser?.first_name) {
      return tgUser.first_name;
    }
    if (currentUser.name && (isLocalDevHost() || telegramService.isTelegramEnv())) {
      return currentUser.name;
    }
    return '';
  });
  const [nameError, setNameError] = useState<string | null>(null);
  const [gender, setGender] = useState<'male' | 'female' | undefined>(currentUser.gender);
  const [spaceType, setSpaceType] = useState<SpaceType>('relationship');
  const [startDate, setStartDate] = useState<string>(() => getTodayDateString());

  // Deep-link invite code from Telegram start_param (e.g. t.me/bot/app?startapp=CODE)
  const initialParam = telegramService.getStartParam();
  const initialCode = initialParam ? initialParam.replace(/_/g, '-').toUpperCase() : '';

  // Connect by code state
  const [isJoinExpanded, setIsJoinExpanded] = useState(() => Boolean(initialCode));
  const [joinCode, setJoinCode] = useState(() => initialCode);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // Create couple state
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Re-sync on couple events
  useEffect(() => {
    const handleCoupleChange = () => {
      const active = coupleService.getActiveUser();
      const couple = coupleService.getCurrentCouple();
      setCurrentUser(active);
      setCurrentCouple(couple);

      if (couple && couple.status === 'connected') {
        showToast({
          title: 'Пара подключена',
          message: 'Добро пожаловать в ваше совместное пространство Lovia.',
          type: 'love',
        });
        navigate('/');
      }
    };

    window.addEventListener('lovia_couple_connected', handleCoupleChange);
    window.addEventListener('lovia_couple_updated', handleCoupleChange);
    window.addEventListener('lovia_couple_dissolved', handleCoupleChange);

    return () => {
      window.removeEventListener('lovia_couple_connected', handleCoupleChange);
      window.removeEventListener('lovia_couple_updated', handleCoupleChange);
      window.removeEventListener('lovia_couple_dissolved', handleCoupleChange);
    };
  }, [navigate, showToast]);

  // If already connected, redirect to app
  useEffect(() => {
    if (coupleService.isConnected()) {
      navigate('/');
    }
  }, [navigate]);

  // Auto-poll for partner connection when waiting in couple space
  useEffect(() => {
    if (currentCouple?.status !== 'waiting_partner') return;

    const intervalId = setInterval(async () => {
      await coupleService.checkPartnerConnected();
    }, 2500);

    return () => clearInterval(intervalId);
  }, [currentCouple?.status]);

  const validateName = (): string | null => {
    const clean = name.trim();
    if (!clean) {
      setNameError('Пожалуйста, введите ваше имя');
      return null;
    }
    if (clean.length < 2) {
      setNameError('Имя должно содержать не менее 2 символов');
      return null;
    }
    setNameError(null);
    return clean;
  };

  // Handler: Create couple space
  const handleCreateCouple = async () => {
    const validName = validateName();
    if (!validName) return;

    setIsCreating(true);
    setCreateError(null);

    try {
      const couple = await coupleService.createCouple({
        name: validName,
        gender,
        startDate,
        spaceType,
      });
      telegramService.hapticNotification('success');
      setCurrentCouple(couple);
      showToast({
        title: spaceType === 'friendship' ? 'Код дружбы создан!' : 'Код пары создан!',
        message:
          spaceType === 'friendship'
            ? 'Отправьте код вашему другу для совместного подключения'
            : 'Отправьте код вашему партнёру для совместного подключения',
        type: 'love',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Не удалось создать пару';
      setCreateError(msg);
      showToast({
        title: 'Ошибка создания пары',
        message: msg,
        type: 'info',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Handler: Copy generated code
  const handleCopyCode = async () => {
    if (!currentCouple?.inviteCode) return;
    const ok = await copyTextToClipboard(currentCouple.inviteCode);
    if (ok) {
      telegramService.hapticNotification('success');
      setCopied(true);
      showToast({
        title: 'Код скопирован!',
        message: 'Отправьте его партнёру в Telegram или мессенджер',
        type: 'love',
      });
      setTimeout(() => setCopied(false), 3000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // Handler: Cancel waiting code to enter partner's code
  const handleCancelWaiting = () => {
    coupleService.cancelWaitingCouple();
    setCurrentCouple(null);
    setIsJoinExpanded(true);
  };

  // Handler: Join existing couple by code
  const handleJoinCouple = async (e: React.FormEvent) => {
    e.preventDefault();
    const validName = validateName();
    if (!validName) return;

    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) {
      setJoinError('Пожалуйста, введите код пары');
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      await coupleService.joinCoupleByCode({
        code: cleanCode,
        name: validName,
        gender,
      });
      telegramService.hapticNotification('success');

      showToast({
        title: 'Успешное подключение',
        message: 'Вы подключились к общему пространству',
        type: 'love',
      });
      navigate('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка подключения по коду';
      setJoinError(msg);
      showToast({
        title: 'Ошибка подключения',
        message: msg,
        type: 'info',
      });
    } finally {
      setIsJoining(false);
    }
  };

  const isWaitingPartner = Boolean(currentCouple && currentCouple.status === 'waiting_partner');
  const activeSpaceType: SpaceType = currentCouple?.spaceType || spaceType;
  const isFriendship = activeSpaceType === 'friendship';

  return (
    <div className="onboarding-page" data-testid="onboarding-page">
      <div className="onboarding-container">
        {/* ================================================================= */}
        {/* Блок 1. Приветствие                                               */}
        {/* ================================================================= */}
        <header className="onboarding-hero">
          <div className="onboarding-hero__mascot" aria-hidden="true">
            <Mascot variant="love" size={110} animated interactive />
          </div>
          <div className="onboarding-hero__badge">
            <span className="onboarding-hero__logo-icon" aria-hidden="true">
              <Icon name={isFriendship ? 'sparkles' : 'heart-filled'} size={16} />
            </span>
            <span className="onboarding-hero__brand">Lovia</span>
          </div>

          <h1 className="onboarding-hero__title">Давайте знакомиться</h1>
          <p className="onboarding-hero__subtitle">
            {isFriendship
              ? 'Создадим ваше тёплое пространство дружбы'
              : 'Создадим ваше маленькое общее пространство'}
          </p>
        </header>

        {/* ================================================================= */}
        {/* Блок 2. Имя пользователя + Блок 3. Выбор пола + Формат           */}
        {/* ================================================================= */}
        <Card variant="solid" className="onboarding-card">
          <div className="onboarding-field">
            <label htmlFor="user-name-input" className="onboarding-label">
              Как вас зовут? <span className="onboarding-required">*</span>
            </label>
            <Input
              id="user-name-input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              placeholder="Введите ваше имя"
              maxLength={32}
              error={nameError || undefined}
              autoComplete="name"
            />
          </div>

          <div className="onboarding-field">
            <label className="onboarding-label">Укажите ваш пол</label>
            <div
              className="onboarding-gender-selector"
              role="radiogroup"
              aria-label="Укажите ваш пол"
            >
              <button
                type="button"
                role="radio"
                aria-checked={gender === 'male'}
                className={`onboarding-gender-pill ${
                  gender === 'male' ? 'onboarding-gender-pill--active' : ''
                }`}
                onClick={() => setGender('male')}
              >
                <span className="onboarding-gender-icon" aria-hidden="true">
                  <Icon name="profile" size={16} />
                </span>
                <span className="onboarding-gender-text">Мужской</span>
                {gender === 'male' && (
                  <span className="onboarding-gender-check" aria-hidden="true">
                    <Icon name="check" size={12} strokeWidth={2.8} />
                  </span>
                )}
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={gender === 'female'}
                className={`onboarding-gender-pill ${
                  gender === 'female' ? 'onboarding-gender-pill--active' : ''
                }`}
                onClick={() => setGender('female')}
              >
                <span className="onboarding-gender-icon" aria-hidden="true">
                  <Icon name="profile" size={16} />
                </span>
                <span className="onboarding-gender-text">Женский</span>
                {gender === 'female' && (
                  <span className="onboarding-gender-check" aria-hidden="true">
                    <Icon name="check" size={12} strokeWidth={2.8} />
                  </span>
                )}
              </button>
            </div>
          </div>

          {!isWaitingPartner && (
            <div className="onboarding-field">
              <label className="onboarding-label">Формат пространства</label>
              <div
                className="onboarding-gender-selector"
                role="radiogroup"
                aria-label="Выберите формат пространства"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={spaceType === 'relationship'}
                  className={`onboarding-gender-pill ${
                    spaceType === 'relationship' ? 'onboarding-gender-pill--active' : ''
                  }`}
                  onClick={() => setSpaceType('relationship')}
                >
                  <span className="onboarding-gender-icon" aria-hidden="true">
                    <Icon name="heart" size={16} />
                  </span>
                  <span className="onboarding-gender-text">Отношения</span>
                  {spaceType === 'relationship' && (
                    <span className="onboarding-gender-check" aria-hidden="true">
                      <Icon name="check" size={12} strokeWidth={2.8} />
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={spaceType === 'friendship'}
                  className={`onboarding-gender-pill ${
                    spaceType === 'friendship' ? 'onboarding-gender-pill--active' : ''
                  }`}
                  onClick={() => setSpaceType('friendship')}
                >
                  <span className="onboarding-gender-icon" aria-hidden="true">
                    <Icon name="sparkles" size={16} />
                  </span>
                  <span className="onboarding-gender-text">Дружба</span>
                  {spaceType === 'friendship' && (
                    <span className="onboarding-gender-check" aria-hidden="true">
                      <Icon name="check" size={12} strokeWidth={2.8} />
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* ================================================================= */}
        {/* Блок 4. Создание и подключение пары / пространства                */}
        {/* ================================================================= */}
        <section
          className="onboarding-actions-section"
          aria-label={isFriendship ? 'Создание и подключение дружбы' : 'Создание и подключение пары'}
        >
          {/* 4.1. Создать новую пару / пространство дружбы */}
          {!isWaitingPartner ? (
            <Card variant="solid" className="onboarding-card onboarding-action-card">
              <div className="onboarding-action-card__header">
                <div className="onboarding-action-card__icon-wrap">
                  <Icon
                    name={isFriendship ? 'sparkles' : 'heart'}
                    size={20}
                    className="onboarding-action-card__icon"
                  />
                </div>
                <div className="onboarding-action-card__text">
                  <h2 className="onboarding-action-card__title">
                    {isFriendship ? 'Создать пространство дружбы' : 'Создать наше пространство'}
                  </h2>
                  <p className="onboarding-action-card__desc">
                    {isFriendship
                      ? 'Создайте общее пространство и пригласите друга присоединиться'
                      : 'Создайте свою пару и пригласите партнёра присоединиться'}
                  </p>
                </div>
              </div>

              {createError && (
                <div className="onboarding-error-box" role="alert">
                  <Icon name="alert" size={15} />
                  <span>{createError}</span>
                </div>
              )}

              <div className="onboarding-field" style={{ marginBottom: '16px' }}>
                <DatePicker
                  label={isFriendship ? 'Когда вы начали дружить?' : 'Когда вы начали встречаться?'}
                  value={startDate}
                  maxDate={getTodayDateString()}
                  onChange={setStartDate}
                  hint="Эту дату можно будет изменить в любое время"
                  required
                />
              </div>

              <Button
                variant="primary"
                fullWidth
                size="lg"
                disabled={isCreating}
                onClick={handleCreateCouple}
                className="onboarding-create-btn"
                leftIcon={<Icon name="sparkles" size={17} />}
              >
                {isCreating
                  ? 'Создание кода...'
                  : isFriendship
                  ? 'Создать код дружбы'
                  : 'Создать код пары'}
              </Button>
            </Card>
          ) : (
            /* Отображение уже созданного кода */
            <Card variant="solid" className="onboarding-card onboarding-code-display-card">
              <div className="onboarding-code-status-pill">
                <span className="onboarding-status-dot" aria-hidden="true" />
                <span>
                  {isFriendship
                    ? 'Ожидание подключения друга'
                    : 'Ожидание подключения партнёра'}
                </span>
              </div>

              <h2 className="onboarding-code-heading">
                {isFriendship ? 'Код вашей дружбы' : 'Код вашей пары'}
              </h2>
              <p className="onboarding-code-subheading">
                {isFriendship
                  ? 'Отправьте этот уникальный код вашему другу. Как только он введёт его, вы сразу окажетесь в общем пространстве.'
                  : 'Отправьте этот уникальный код вашему партнёру. Как только он введёт его, вы сразу окажетесь в общем пространстве.'}
              </p>

              <div className="onboarding-code-banner">
                <code className="onboarding-code-value">{currentCouple?.inviteCode || ''}</code>
              </div>

              <div className="onboarding-code-actions">
                <Button
                  variant="primary"
                  fullWidth
                  size="md"
                  onClick={handleCopyCode}
                  className="onboarding-copy-btn"
                  leftIcon={<Icon name={copied ? 'check' : 'copy'} size={16} />}
                >
                  {copied ? 'Код скопирован!' : 'Скопировать код'}
                </Button>

                <button
                  type="button"
                  className="onboarding-cancel-waiting-btn"
                  onClick={handleCancelWaiting}
                >
                  {isFriendship
                    ? 'Отменить и ввести код друга'
                    : 'Отменить и ввести код партнёра'}
                </button>
              </div>

              <p className="onboarding-code-footnote">
                Срок действия кода: 7 дней. Безопасное подключение ровно для двух участников.
              </p>
            </Card>
          )}

          {/* 4.2. Подключиться по коду (с плавным раскрытием) */}
          <Card variant="solid" className="onboarding-card onboarding-join-card">
            <button
              type="button"
              className="onboarding-join-toggle"
              onClick={() => {
                setIsJoinExpanded((prev) => !prev);
                setJoinError(null);
              }}
              aria-expanded={isJoinExpanded}
            >
              <div className="onboarding-join-toggle__left">
                <div className="onboarding-join-toggle__icon-wrap">
                  <Icon name="tag" size={18} className="onboarding-join-toggle__icon" />
                </div>
                <div className="onboarding-join-toggle__text">
                  <h3 className="onboarding-join-toggle__title">
                    {isFriendship ? 'Уже есть код дружбы?' : 'Уже есть код пары?'}
                  </h3>
                  <p className="onboarding-join-toggle__desc">
                    {isFriendship
                      ? 'Введите код, который отправил вам друг'
                      : 'Введите код, который отправил вам партнёр'}
                  </p>
                </div>
              </div>
              <div
                className={`onboarding-join-toggle__chevron ${
                  isJoinExpanded ? 'onboarding-join-toggle__chevron--open' : ''
                }`}
                aria-hidden="true"
              >
                <Icon name="chevron-down" size={18} />
              </div>
            </button>

            {isJoinExpanded && (
              <form onSubmit={handleJoinCouple} className="onboarding-join-form">
                <div className="onboarding-join-input-wrap">
                  <label htmlFor="join-code-input" className="onboarding-label">
                    {isFriendship
                      ? 'Код приглашения от друга'
                      : 'Код приглашения от партнёра'}
                  </label>
                  <Input
                    id="join-code-input"
                    value={joinCode}
                    onChange={(e) => {
                      setJoinCode(e.target.value.toUpperCase());
                      if (joinError) setJoinError(null);
                    }}
                    placeholder="Например: LOVIA-7492-MK"
                    maxLength={24}
                    autoFocus
                    className="onboarding-code-input"
                  />
                </div>

                {joinError && (
                  <div className="onboarding-error-box" role="alert">
                    <Icon name="alert" size={15} />
                    <span>{joinError}</span>
                  </div>
                )}

                <div className="onboarding-join-actions">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => {
                      setIsJoinExpanded(false);
                      setJoinError(null);
                    }}
                  >
                    Свернуть
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={isJoining || !joinCode.trim()}
                    className="onboarding-join-submit-btn"
                  >
                    {isJoining ? 'Подключение...' : 'Присоединиться'}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </section>

        {/* Development test switcher for instant persona validation */}
        {isLocalDevHost() && (
          <aside className="onboarding-dev-panel" aria-label="Панель переключения тестовых аккаунтов">
            <span className="onboarding-dev-title">Тестовые аккаунты:</span>
            <div className="onboarding-dev-buttons">
              <button
                type="button"
                className="onboarding-dev-btn"
                onClick={() => {
                  coupleService.switchTestUser('user-marsel', 'Марсель', 'male');
                  setName('Марсель');
                  setGender('male');
                  setCurrentUser(coupleService.getActiveUser());
                  setCurrentCouple(coupleService.getCurrentCouple());
                }}
              >
                Марсель
              </button>
              <button
                type="button"
                className="onboarding-dev-btn"
                onClick={() => {
                  coupleService.switchTestUser('user-alisa', 'Алиса', 'female');
                  setName('Алиса');
                  setGender('female');
                  setCurrentUser(coupleService.getActiveUser());
                  setCurrentCouple(coupleService.getCurrentCouple());
                }}
              >
                Алиса
              </button>
              <button
                type="button"
                className="onboarding-dev-btn"
                onClick={() => {
                  coupleService.resetToDemo();
                  showToast({ title: 'Сброшено к демо-состоянию', type: 'love' });
                  navigate('/');
                }}
              >
                Сбросить к демо-паре
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
