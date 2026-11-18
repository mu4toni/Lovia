import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../../components/ui/Icon/Icon';
import { Button } from '../../../components/ui/Button/Button';
import { Modal } from '../../../components/ui/Modal/Modal';
import { useToast } from '../../../components/ui/Toast/ToastContext';
import { coupleService } from '../../../services/coupleService';
import { telegramService } from '../../../services/telegramService';
import './DangerZone.css';

export const DangerZone: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [code, setCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (countdown > 0) {
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [countdown]);

  const handleClose = () => {
    setIsDeleteModalOpen(false);
    setStep(1);
    setIsConfirmed(false);
    setCode('');
    setError(null);
    setIsSendingCode(false);
    setIsDeleting(false);
    setCountdown(0);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
  };

  const handleSendCode = async () => {
    setError(null);
    setIsSendingCode(true);
    telegramService.hapticImpact('light');

    const res = await coupleService.requestAccountDeletion();
    setIsSendingCode(false);

    if (!res.success) {
      setError(res.error || 'Не удалось отправить код подтверждения');
      telegramService.hapticNotification('error');
      return;
    }

    telegramService.hapticNotification('success');
    setStep(2);
    setCountdown(60);
  };

  const handleConfirmDeletion = async () => {
    const cleanCode = code.trim();
    if (cleanCode.length !== 6) {
      setError('Введите 6-значный код подтверждения');
      return;
    }

    setError(null);
    setIsDeleting(true);
    telegramService.hapticImpact('medium');

    const res = await coupleService.confirmAccountDeletion(cleanCode);
    setIsDeleting(false);

    if (!res.success) {
      setError(res.error || 'Неверный или просроченный код');
      telegramService.hapticNotification('error');
      return;
    }

    telegramService.hapticNotification('success');
    showToast({
      title: 'Аккаунт удалён',
      message: 'Все ваши данные были успешно удалены.',
      type: 'info',
    });

    handleClose();

    // Переход на экран подключения нового пространства
    navigate('/connect');
  };

  return (
    <section className="danger-zone" aria-label="Управление аккаунтом">
      <div className="danger-zone__card">
        <div className="danger-zone__info">
          <h4 className="danger-zone__title">Удаление аккаунта</h4>
          <p className="danger-zone__desc">Безвозвратное удаление профиля и данных пары</p>
        </div>

        <button
          type="button"
          className="danger-zone__trigger-btn"
          onClick={() => {
            setIsDeleteModalOpen(true);
            setStep(1);
            setError(null);
          }}
          aria-label="Удалить аккаунт"
        >
          Удалить аккаунт
        </button>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleClose}
        title={step === 1 ? 'Удаление аккаунта' : 'Подтверждение удаления'}
      >
        <div className="danger-modal-content">
          {error && (
            <div className="danger-modal-error-box" role="alert">
              <Icon name="alert" size={18} className="danger-warning-icon" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <>
              <div className="danger-modal-warning-box">
                <Icon name="alert" size={22} className="danger-warning-icon" />
                <div className="danger-modal-warning-text">
                  <strong>Внимание: это действие необратимо</strong>
                  <p>
                    При удалении аккаунта все ваши данные, напоминания, вишлисты и воспоминания будут стёрты навсегда.
                  </p>
                </div>
              </div>

              <div className="danger-modal-consequences">
                <h5 className="danger-modal-subtitle">Что произойдёт:</h5>
                <ul className="danger-modal-list">
                  <li>Ваш личный профиль и вишлист будут стёрты без возможности восстановления.</li>
                  <li>Совместное пространство пары будет расформировано, а все общие записи удалены.</li>
                  <li>Партнёр получит уведомление в Telegram о закрытии совместного пространства.</li>
                </ul>
              </div>

              <label className="danger-modal-confirm-checkbox">
                <input
                  type="checkbox"
                  checked={isConfirmed}
                  onChange={(e) => setIsConfirmed(e.target.checked)}
                />
                <span>Я понимаю последствия и хочу удалить аккаунт</span>
              </label>

              <div className="danger-modal-actions">
                <Button variant="ghost" type="button" onClick={handleClose} disabled={isSendingCode}>
                  Отмена
                </Button>
                <Button
                  variant="primary"
                  type="button"
                  onClick={handleSendCode}
                  disabled={!isConfirmed || isSendingCode}
                  style={{
                    background: 'var(--color-danger, #e53e3e)',
                    borderColor: 'var(--color-danger, #e53e3e)',
                  }}
                >
                  {isSendingCode ? 'Отправка...' : 'Отправить код в Telegram'}
                </Button>
              </div>
            </>
          ) : (
            <div className="danger-modal-code-box">
              <div className="danger-modal-sent-icon" aria-hidden="true">
                <Icon name="mail" size={24} />
              </div>

              <div className="danger-modal-code-intro">
                <h4 className="danger-modal-sent-title">Проверьте Telegram</h4>
                <p className="danger-modal-sent-desc">
                  Мы отправили 6-значный код подтверждения от бота Lovia. Введите его для окончательного удаления:
                </p>
              </div>

              <div className="danger-code-input-wrap">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setCode(val);
                    if (error) setError(null);
                  }}
                  autoFocus
                  className="danger-code-input"
                  aria-label="6-значный код подтверждения"
                />
              </div>

              <div className="danger-modal-actions danger-modal-actions--step2">
                <button
                  type="button"
                  className="danger-resend-btn"
                  onClick={handleSendCode}
                  disabled={countdown > 0 || isSendingCode || isDeleting}
                >
                  {countdown > 0 ? `Повторить через ${countdown}с` : 'Отправить код повторно'}
                </button>

                <div className="danger-modal-actions-buttons">
                  <Button variant="ghost" type="button" onClick={handleClose} disabled={isDeleting}>
                    Отмена
                  </Button>
                  <Button
                    variant="primary"
                    type="button"
                    onClick={handleConfirmDeletion}
                    disabled={code.length !== 6 || isDeleting}
                    style={{
                      background: 'var(--color-danger, #e53e3e)',
                      borderColor: 'var(--color-danger, #e53e3e)',
                    }}
                  >
                    {isDeleting ? 'Удаление...' : 'Подтвердить удаление'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </section>
  );
};
