import { useWishlist } from '../hooks/useWishlist';
import { WishlistHeader, WishlistGrid } from '../widgets/Wishlist';
import { CreateEditWishModal, DeleteWishConfirmDialog } from '../features/wishlist';
import { Skeleton } from '../components/ui/Loading/Skeleton';
import { BottomActionButton } from '../components/ui/BottomActionButton/BottomActionButton';
import { useToast } from '../components/ui/Toast/ToastContext';
import { WishItem, CreateWishInput } from '../types/wishlist';
import { telegramService } from '../services/telegramService';
import './WishlistPage.css';

export function WishlistPage() {
  const {
    profile,
    activeTab,
    setActiveTab,
    isLoading,
    isOwnList,
    displayedItems,
    myItemsCount,
    partnerItemsCount,
    isCreateModalOpen,
    setIsCreateModalOpen,
    editingWish,
    setEditingWish,
    deletingWish,
    setDeletingWish,
    handleCreateWish,
    handleUpdateWish,
    handleDeleteWish,
    handleToggleReserve,
  } = useWishlist();

  const { showToast } = useToast();

  const userName = profile?.user.name || 'Марсель';
  const partnerName = profile?.partner?.name || 'Алиса';

  const onCreateSubmit = async (input: CreateWishInput) => {
    try {
      await handleCreateWish(input);
      telegramService.hapticNotification('success');
      showToast({
        title: 'Желание сохранено',
        message: `«${input.title}» добавлено в ваш вишлист`,
        type: 'love',
      });
    } catch (err: any) {
      showToast({
        title: 'Ошибка сохранения',
        message: err.message || 'Не удалось сохранить желание в базе данных',
        type: 'info',
      });
    }
  };

  const onEditSubmit = async (input: CreateWishInput) => {
    if (!editingWish) return;
    try {
      await handleUpdateWish(editingWish.id, input);
      showToast({
        title: 'Изменения сохранены',
        message: `«${input.title}» успешно обновлено`,
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Ошибка обновления',
        message: err.message || 'Не удалось обновить желание в базе данных',
        type: 'info',
      });
    }
  };

  const onDeleteConfirm = async () => {
    if (!deletingWish) return;
    const title = deletingWish.title;
    try {
      await handleDeleteWish(deletingWish.id);
      showToast({
        title: 'Желание удалено',
        message: `«${title}» удалено из вишлиста`,
        type: 'info',
      });
    } catch (err: any) {
      showToast({
        title: 'Ошибка удаления',
        message: err.message || 'Не удалось удалить желание из базы данных',
        type: 'info',
      });
    }
  };

  const onToggleReserveWithToast = async (id: string) => {
    const targetItem = displayedItems.find((w) => w.id === id);
    try {
      const updated = await handleToggleReserve(id);
      telegramService.hapticImpact('light');
      if (updated.isReserved) {
        showToast({
          title: 'Секретная бронь сохранена',
          message: `Вы зарезервировали: «${targetItem?.title}». Партнёр не увидит эту отметку, чтобы сюрприз удался!`,
          type: 'love',
        });
      } else {
        showToast({
          title: 'Бронь снята',
          message: `Вы отменили резервирование подарка «${targetItem?.title}».`,
          type: 'info',
        });
      }
    } catch (err: any) {
      showToast({
        title: 'Ошибка бронирования',
        message: err.message || 'Не удалось обновить статус брони в базе данных',
        type: 'info',
      });
    }
  };

  const handleRemindPartner = () => {
    showToast({
      title: 'Напоминание отправлено',
      message: `Мы напомнили ${partnerName} заглянуть в вишлист и добавить пару желаний!`,
      type: 'love',
    });
  };

  return (
    <div className="wishlist-page">
      {/* 1. Header with segmented tab switcher & owner info */}
      <WishlistHeader
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        myItemsCount={myItemsCount}
        partnerItemsCount={partnerItemsCount}
        userName={userName}
        partnerName={partnerName}
        userAvatarUrl={profile?.user.avatarUrl}
        partnerAvatarUrl={profile?.partner?.avatarUrl}
        onCreateClick={() => setIsCreateModalOpen(true)}
        isOwnList={isOwnList}
      />

      {/* 2. Loading State */}
      {isLoading && (
        <div className="wishlist-loading-grid" aria-busy="true" aria-label="Загрузка списка желаний...">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="wishlist-skeleton-card">
              <div className="wishlist-skeleton-media">
                <Skeleton height="100%" borderRadius="0" />
              </div>
              <div className="wishlist-skeleton-body">
                <Skeleton width="40%" height={14} />
                <Skeleton width="85%" height={20} />
                <Skeleton width="60%" height={14} />
                <Skeleton width="30%" height={24} style={{ marginTop: '8px' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Wishlist Items Grid / Empty States */}
      {!isLoading && (
        <>
          <WishlistGrid
            items={displayedItems}
            isOwnList={isOwnList}
            partnerName={partnerName}
            onCreateClick={() => setIsCreateModalOpen(true)}
            onEdit={(item: WishItem) => setEditingWish(item)}
            onDelete={(item: WishItem) => setDeletingWish(item)}
            onToggleReserve={onToggleReserveWithToast}
            onRemindPartner={handleRemindPartner}
          />

          {/* Single Dedicated Floating Add Wish Button */}
          {isOwnList && (
            <BottomActionButton
              variant="floating"
              visible={!isCreateModalOpen && !editingWish && !deletingWish}
              label="Добавить желание"
              onClick={() => {
                setEditingWish(null);
                setIsCreateModalOpen(true);
              }}
              iconName="plus"
              ariaLabel="Добавить желание"
            />
          )}
        </>
      )}

      {/* 4. Create Wish Modal */}
      <CreateEditWishModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={onCreateSubmit}
      />

      {/* 5. Edit Wish Modal */}
      {editingWish && (
        <CreateEditWishModal
          isOpen={Boolean(editingWish)}
          onClose={() => setEditingWish(null)}
          initialWish={editingWish}
          onSubmit={onEditSubmit}
        />
      )}

      {/* 6. Delete Confirmation Dialog */}
      {deletingWish && (
        <DeleteWishConfirmDialog
          isOpen={Boolean(deletingWish)}
          onClose={() => setDeletingWish(null)}
          wishTitle={deletingWish.title}
          onConfirm={onDeleteConfirm}
        />
      )}
    </div>
  );
}
