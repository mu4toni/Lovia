import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Button } from '../../../components/ui/Button/Button';
import { Icon } from '../../../components/ui/Icon/Icon';

export interface DeleteWishConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  wishTitle: string;
}

export const DeleteWishConfirmDialog: React.FC<DeleteWishConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  wishTitle,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Failed to delete wish', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Удалить желание?" zIndex={1200}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-danger-soft, #FDE8E8)',
              color: 'var(--color-danger)',
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
            <p style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Вы действительно хотите удалить желание?
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              «<strong style={{ color: 'var(--text-primary)' }}>{wishTitle}</strong>» будет безвозвратно удалено из вашего списка желаний.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <Button variant="secondary" size="md" onClick={onClose} disabled={isDeleting}>
            Отмена
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={handleConfirm}
            isLoading={isDeleting}
            leftIcon={<Icon name="trash" size={16} />}
          >
            Удалить
          </Button>
        </div>
      </div>
    </Modal>
  );
};
