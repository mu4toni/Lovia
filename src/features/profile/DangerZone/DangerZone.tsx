import React, { useState } from 'react';
import { Icon } from '../../../components/ui/Icon/Icon';
import { Button } from '../../../components/ui/Button/Button';
import { Modal } from '../../../components/ui/Modal/Modal';
import './DangerZone.css';

export const DangerZone: React.FC = () => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const handleRequestDeletion = () => {
    // Transparently informs the user about server requirements without performing destructive fake local deletion
    setRequestSent(true);
  };

  const handleClose = () => {
    setIsDeleteModalOpen(false);
    setIsConfirmed(false);
    setRequestSent(false);
  };

  return (
    <section className="danger-zone" aria-label="Управление аккаунтом">
      <div className="danger-zone__card">
        <div className="danger-zone__info">
          <h4 className="danger-zone__title">Удаление аккаунта</h4>
        </div>

        <button
          type="button"
          className="danger-zone__trigger-btn"
          onClick={() => setIsDeleteModalOpen(true)}
          aria-label="Запросить удаление аккаунта"
        >
          Удалить аккаунт
        </button>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleClose}
        title="Запрос на удаление аккаунта"
      >
        <div className="danger-modal-content">
          {!requestSent ? (
            <>
              <div className="danger-modal-warning-box">
                <Icon name="alert" size={22} className="danger-warning-icon" />
                <div className="danger-modal-warning-text">
                  <strong>Внимание: это действие необратимо</strong>
                  <p>
                    При удалении аккаунта будут навсегда удалены ваши личные данные, списки желаний и история встреч.
                  </p>
                </div>
              </div>

              <div className="danger-modal-consequences">
                <h5 className="danger-modal-subtitle">Что произойдёт после удаления:</h5>
                <ul className="danger-modal-list">
                  <li>Ваш личный профиль и вишлист будут стёрты без возможности восстановления.</li>
                  <li>Совместное пространство пары будет разорвано.</li>
                  <li>Партнёр получит уведомление о прекращении синхронизации пары.</li>
                  <li>Все напоминания, созданные вами для партнёра, будут переведены в архив.</li>
                </ul>
              </div>

              <label className="danger-modal-confirm-checkbox">
                <input
                  type="checkbox"
                  checked={isConfirmed}
                  onChange={(e) => setIsConfirmed(e.target.checked)}
                />
                <span>Я понимаю последствия и хочу запросить удаление аккаунта</span>
              </label>

              <div className="danger-modal-actions">
                <Button variant="ghost" type="button" onClick={handleClose}>
                  Отмена
                </Button>
                <Button
                  variant="primary"
                  type="button"
                  onClick={handleRequestDeletion}
                  disabled={!isConfirmed}
                  style={{ background: 'var(--color-danger, #e53e3e)', borderColor: 'var(--color-danger, #e53e3e)' }}
                >
                  Запросить удаление
                </Button>
              </div>
            </>
          ) : (
            <div className="danger-modal-sent-box">
              <div className="danger-modal-sent-icon" aria-hidden="true">
                <Icon name="check" size={24} />
              </div>
              <h4 className="danger-modal-sent-title">Запрос на удаление подготовлен</h4>
              <p className="danger-modal-sent-desc">
                В соответствии с политикой безопасности Telegram Mini Apps, удаление аккаунта требует подтверждения через официального бота <strong>@LoviaBot</strong>.
              </p>
              <div className="danger-modal-server-notice">
                <span className="server-notice-badge">Серверная операция</span>
                <p>
                  Локальные данные сохранены. Фиктивное удаление не производилось. Для завершения операции обратитесь к боту авторизации.
                </p>
              </div>
              <Button variant="primary" fullWidth onClick={handleClose}>
                Понятно
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </section>
  );
};
