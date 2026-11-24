import React from 'react';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Button } from '../../../components/ui/Button/Button';
import { Icon } from '../../../components/ui/Icon/Icon';
import { DateMemory } from '../../../types/dates';
import { useSpaceMode } from '../../../hooks/useSpaceMode';

export interface DeleteDateMemoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  targetMemory: DateMemory | null;
}

export const DeleteDateMemoryDialog: React.FC<DeleteDateMemoryDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  targetMemory,
}) => {
  const { isFriendship } = useSpaceMode();
  if (!targetMemory) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isFriendship ? 'Удалить встречу?' : 'Удалить свидание?'}
      zIndex={1200}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-danger-soft, #FDE8E8)',
              color: 'var(--color-danger, #e53e3e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            <Icon name="trash" size={20} />
          </div>
          <div>
            <p
              style={{
                margin: '0 0 6px 0',
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              Вы действительно хотите удалить воспоминание?
            </p>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: 'var(--text-secondary)',
                lineHeight: 1.4,
              }}
            >
              Запись «<strong style={{ color: 'var(--text-primary)' }}>{targetMemory.title}</strong>»
              будет удалена из дневника {isFriendship ? 'встреч' : 'свиданий'}.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <Button variant="ghost" onClick={onClose} style={{ minHeight: '44px' }}>
            Отмена
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={{ minHeight: '44px' }}
          >
            Удалить
          </Button>
        </div>
      </div>
    </Modal>
  );
};
