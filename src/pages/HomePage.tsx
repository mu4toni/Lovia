import { useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useHomeData } from '../hooks/useHomeData';
import { HomeHeader } from '../components/home/HomeHeader/HomeHeader';
import { HomeCalendar } from '../components/home/HomeCalendar/HomeCalendar';
import { RequestsList } from '../components/home/RequestsList/RequestsList';
import { UnpairedBanner } from '../components/home/UnpairedBanner/UnpairedBanner';
import { StreakCard } from '../components/home/StreakCard/StreakCard';
import { BeanAdviceCard } from '../components/home/BeanAdviceCard/BeanAdviceCard';
import { CreateRequestModal } from '../components/home/CreateRequestModal/CreateRequestModal';
import { Card } from '../components/ui/Card/Card';
import { Button } from '../components/ui/Button/Button';
import { Skeleton } from '../components/ui/Loading/Skeleton';
import { Mascot } from '../components/ui/Mascot/Mascot';
import { useToast } from '../components/ui/Toast/ToastContext';
import { BottomActionButton } from '../components/ui/BottomActionButton/BottomActionButton';
import { telegramService } from '../services/telegramService';
import { coupleService } from '../services/coupleService';
import { isLocalDevHost } from '../utils/env';
import type { CoupleReminder } from '../types';
import './HomePage.css';

export function HomePage() {
  const {
    profile,
    requests,
    events,
    categories,
    selectedDate,
    setSelectedDate,
    isLoading,
    error,
    setDemoMode,
    isCreateModalOpen,
    setIsCreateModalOpen,
    editingRequest,
    setEditingRequest,
    handleToggleStatus,
    handleCreateRequest,
    handleUpdateRequest,
    handleDeleteRequest,
    handleConnectPartnerSim,
    handleCategoriesChanged,
    reload,
  } = useHomeData();

  const { showToast } = useToast();

  const handleEditRequest = useCallback(
    (req: CoupleReminder) => {
      setEditingRequest(req);
      setIsCreateModalOpen(true);
    },
    [setEditingRequest, setIsCreateModalOpen]
  );

  const handleOpenCreate = useCallback(() => {
    setEditingRequest(null);
    setIsCreateModalOpen(true);
  }, [setEditingRequest, setIsCreateModalOpen]);

  if (!coupleService.isConnected()) {
    return <Navigate to="/connect" replace />;
  }

  const handleToggleWithToast = async (id: string) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;

    telegramService.hapticImpact('light');
    const willBeCompleted = req.status !== 'completed';
    try {
      await handleToggleStatus(id);
      showToast({
        title: willBeCompleted ? 'Напоминание выполнено' : 'Вернули в активные',
        message: willBeCompleted
          ? `«${req.title}» отмечено как выполненное.`
          : `«${req.title}» снова в списке дел.`,
        type: willBeCompleted ? 'love' : 'info',
      });
    } catch (err: any) {
      showToast({
        title: 'Ошибка обновления',
        message: err.message || 'Не удалось обновить статус напоминания в базе данных',
        type: 'info',
      });
    }
  };

  const handleCreateWithToast = async (input: Parameters<typeof handleCreateRequest>[0]) => {
    try {
      await handleCreateRequest(input);
      telegramService.hapticNotification('success');
      showToast({
        title: 'Напоминание сохранено',
        message: `«${input.title}» добавлено в ваш список`,
        type: 'love',
      });
    } catch (err: any) {
      showToast({
        title: 'Ошибка создания',
        message: err.message || 'Не удалось сохранить напоминание в базе данных',
        type: 'info',
      });
    }
  };

  const handleUpdateWithToast = async (id: string, input: Parameters<typeof handleUpdateRequest>[1]) => {
    try {
      await handleUpdateRequest(id, input);
      telegramService.hapticNotification('success');
      showToast({
        title: 'Напоминание обновлено',
        message: `«${input.title || 'Напоминание'}» успешно обновлено`,
        type: 'love',
      });
    } catch (err: any) {
      showToast({
        title: 'Ошибка обновления',
        message: err.message || 'Не удалось обновить напоминание в базе данных',
        type: 'info',
      });
    }
  };

  const handleDeleteWithToast = async (id: string) => {
    const req = requests.find((r) => r.id === id);
    try {
      await handleDeleteRequest(id);
      showToast({
        title: 'Напоминание удалено',
        message: req ? `«${req.title}» удалено из списка` : undefined,
        type: 'info',
      });
    } catch (err: any) {
      showToast({
        title: 'Ошибка удаления',
        message: err.message || 'Не удалось удалить напоминание из базы данных',
        type: 'info',
      });
    }
  };

  return (
    <div className="home-page">
      {/* 1. Loading State */}
      {isLoading && (
        <div className="home-loading-skeleton" aria-busy="true" aria-label="Загрузка данных...">
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 2px' }} aria-hidden="true">
            <Mascot name="19_loading_tea" size={64} eager animated />
          </div>
          {/* Header Skeleton */}
          <Card variant="solid">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <Skeleton width="40%" height={14} />
                <Skeleton width="65%" height={22} style={{ margin: '8px 0' }} />
                <Skeleton width="50%" height={16} />
              </div>
              <Skeleton variant="circular" width={54} height={54} />
            </div>
          </Card>

          {/* Calendar Skeleton */}
          <Card variant="solid" style={{ marginTop: '12px' }}>
            <Skeleton width="30%" height={16} style={{ marginBottom: '12px' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} height={60} borderRadius="12px" style={{ flex: 1 }} />
              ))}
            </div>
          </Card>

          {/* Tasks Skeleton */}
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Skeleton width="35%" height={18} />
            <Skeleton height={78} borderRadius="16px" />
            <Skeleton height={78} borderRadius="16px" />
          </div>
        </div>
      )}

      {/* 3. Error State */}
      {!isLoading && error && (
        <Card variant="solid" className="home-error-card" role="alert">
          <div className="home-error-mascot-wrap" aria-hidden="true">
            <Mascot name="20_error_dizzy" size={96} eager />
          </div>
          <h2 className="home-error-title">Что-то пошло не так</h2>
          <p className="home-error-desc">{error}</p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '14px' }}>
            <Button variant="primary" size="md" onClick={reload}>
              Повторить попытку
            </Button>
            <Button variant="secondary" size="md" onClick={() => setDemoMode('normal')}>
              В обычный режим
            </Button>
          </div>
        </Card>
      )}

      {/* 4. Normal / Unpaired / Empty / Overdue Content */}
      {!isLoading && !error && profile && (
        <>
          {/* 1. Greeting & Together N Days Polaroid Card */}
          <HomeHeader profile={profile} />

          {/* Unpaired state banner if partner is not connected (ONLY in local dev simulation) */}
          {!profile.isPartnerConnected && isLocalDevHost() && (
            <UnpairedBanner
              inviteCode={profile.inviteCode}
              onConnectPartnerSim={handleConnectPartnerSim}
            />
          )}

          {/* 2. Daily Streak Card («Огонёк») */}
          <StreakCard profile={profile} />

          {/* 3. Shared Calendar */}
          <HomeCalendar
            events={events}
            requests={requests}
            categories={categories}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          {/* 4. Today & Reminders List */}
          <RequestsList
            requests={requests}
            categories={categories}
            currentUserId={profile.user.id}
            onToggleStatus={handleToggleWithToast}
            onDeleteRequest={handleDeleteWithToast}
            onEditRequest={handleEditRequest}
            onCreateClick={handleOpenCreate}
          />

          {/* 5. Bean Advises Card */}
          <BeanAdviceCard />

          {/* Single Dedicated Floating Add Reminder Button */}
          <BottomActionButton
            variant="floating"
            visible={!isCreateModalOpen}
            label="Добавить напоминание"
            onClick={() => {
              setEditingRequest(null);
              setIsCreateModalOpen(true);
            }}
            iconName="plus"
            ariaLabel="Добавить напоминание"
          />

          {/* Create / Edit Reminder Modal */}
          <CreateRequestModal
            isOpen={isCreateModalOpen}
            onClose={() => {
              setIsCreateModalOpen(false);
              setEditingRequest(null);
            }}
            onSubmit={handleCreateWithToast}
            onUpdate={handleUpdateWithToast}
            editingReminder={editingRequest}
            partnerName={profile.partner?.name || 'партнёра'}
            categories={categories}
            onCategoryCreated={handleCategoriesChanged}
          />
        </>
      )}
    </div>
  );
}
