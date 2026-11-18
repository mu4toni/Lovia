import { Navigate } from 'react-router-dom';
import { useHomeData } from '../hooks';
import { HomeHeader, HomeCalendar, RequestsList, UnpairedBanner } from '../widgets';
import { CreateRequestModal } from '../features/create-reminder';
import { DemoStateSwitcher } from '../features/demo-switcher';
import { Card, Button, Skeleton, Icon, useToast, BottomActionButton } from '../shared';
import { telegramService } from '../services/telegramService';
import { coupleService } from '../services/coupleService';
import { isLocalDevHost } from '../utils/env';
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
    demoMode,
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
      {/* 1. Demo States Switcher for easy testing of required states */}
      {isLocalDevHost() && (
        <DemoStateSwitcher currentMode={demoMode} onSelectMode={setDemoMode} />
      )}

      {/* 2. Loading State */}
      {isLoading && (
        <div className="home-loading-skeleton" aria-busy="true" aria-label="Загрузка данных...">
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
          <div className="home-error-icon-wrap" aria-hidden="true">
            <Icon name="alert" size={32} className="home-error-icon" />
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
          {/* Header */}
          <HomeHeader profile={profile} />

          {/* Unpaired state banner if partner is not connected (ONLY in local dev simulation) */}
          {!profile.isPartnerConnected && isLocalDevHost() && (
            <UnpairedBanner
              inviteCode={profile.inviteCode}
              onConnectPartnerSim={handleConnectPartnerSim}
            />
          )}

          {/* Shared Calendar */}
          <HomeCalendar
            events={events}
            requests={requests}
            categories={categories}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          {/* Reminders List */}
          <RequestsList
            requests={requests}
            categories={categories}
            currentUserId={profile.user.id}
            onToggleStatus={handleToggleWithToast}
            onDeleteRequest={handleDeleteWithToast}
            onEditRequest={(req) => {
              setEditingRequest(req);
              setIsCreateModalOpen(true);
            }}
            onCreateClick={() => {
              setEditingRequest(null);
              setIsCreateModalOpen(true);
            }}
          />

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
