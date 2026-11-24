import { useState } from 'react';
import { useRelationship } from '../hooks/useRelationship';
import { CoupleInfoCard } from '../widgets/Relationship/CoupleInfoCard/CoupleInfoCard';
import { AnniversaryCard } from '../widgets/Relationship/AnniversaryCard/AnniversaryCard';
import { MemorableDatesList } from '../widgets/Relationship/MemorableDatesList/MemorableDatesList';
import { CreateEditMemorableDateModal } from '../features/relationships/CreateEditMemorableDateModal/CreateEditMemorableDateModal';
import { DeleteMemorableDateDialog } from '../features/relationships/DeleteMemorableDateDialog/DeleteMemorableDateDialog';
import { BottomActionButton } from '../components/ui/BottomActionButton/BottomActionButton';
import { useToast } from '../components/ui/Toast/ToastContext';
import { MemorableDate, CreateMemorableDateInput } from '../types/relationship';
import { Skeleton } from '../components/ui/Loading/Skeleton';
import { Mascot } from '../components/ui/Mascot/Mascot';
import { SketchUnderline } from '../components/ui/SketchDecor/SketchDecor';
import { useSpaceMode } from '../hooks/useSpaceMode';
import './RelationshipPage.css';

export function RelationshipPage() {
  const { isFriendship } = useSpaceMode();
  const {
    profile,
    startDate,
    daysTogether,
    anniversary,
    heldDatesCount,
    memorableDates,
    isLoading,
    addMemorableDate,
    updateMemorableDate,
    deleteMemorableDate,
  } = useRelationship();

  const { showToast } = useToast();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<MemorableDate | null>(null);
  const [deletingDate, setDeletingDate] = useState<MemorableDate | null>(null);
  const isEditStartDateOpen = false;

  const handleCreateOrEditSubmit = async (input: CreateMemorableDateInput) => {
    try {
      if (editingDate) {
        await updateMemorableDate(editingDate.id, input);
        showToast({
          title: 'Дата обновлена',
          message: `«${input.title}» успешно сохранена`,
          type: 'success',
        });
        setEditingDate(null);
      } else {
        await addMemorableDate(input);
        showToast({
          title: 'Памятная дата добавлена',
          message: `«${input.title}» добавлена в историю ${isFriendship ? 'дружбы' : 'пары'}`,
          type: 'love',
        });
      }
    } catch (err: any) {
      showToast({
        title: 'Ошибка сохранения',
        message: err.message || 'Не удалось сохранить дату в базе данных',
        type: 'info',
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDate) return;
    const title = deletingDate.title;
    try {
      await deleteMemorableDate(deletingDate.id);
      showToast({
        title: 'Дата удалена',
        message: `«${title}» удалена из списка памятных дат`,
        type: 'info',
      });
      setDeletingDate(null);
    } catch (err: any) {
      showToast({
        title: 'Ошибка удаления',
        message: err.message || 'Не удалось удалить дату из базы данных',
        type: 'info',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="relationship-page">
        <Skeleton height={140} borderRadius="var(--radius-lg)" />
        <Skeleton height={120} borderRadius="var(--radius-lg)" />
        <Skeleton height={200} borderRadius="var(--radius-lg)" />
      </div>
    );
  }

  return (
    <div className="relationship-page">
      <header className="relationship-page__header">
        <div className="relationship-page__header-left">
          <h1 className="relationship-page__title">
            {isFriendship ? 'Наша дружба ' : 'Наша история '}
            <span className="relationship-page__title-mark" aria-hidden="true">
              {isFriendship ? '✦' : '♥'}
            </span>
          </h1>
          <SketchUnderline width={110} variant="wave" className="relationship-page__title-underline" />
        </div>
        <div className="relationship-page__peeking-mascot" aria-hidden="true">
          <Mascot
            name={isFriendship ? '36_high_five' : '16_relationships_hug'}
            size={68}
            eager
          />
        </div>
      </header>

      {/* 1.1 Couple Info Card */}
      <CoupleInfoCard
        profile={profile}
        startDate={startDate}
        daysTogether={daysTogether}
        heldDatesCount={heldDatesCount}
        onAddMemorableDate={() => {
          setEditingDate(null);
          setIsCreateModalOpen(true);
        }}
      />

      {/* 1.2 Anniversary Block */}
      <AnniversaryCard
        anniversary={anniversary}
        startDate={startDate}
        onAddMemorableDate={() => {
          setEditingDate(null);
          setIsCreateModalOpen(true);
        }}
      />

      {/* 2. Memorable Dates */}
      <section className="relationship-page__dates-section" aria-label="Памятные даты">
        <div className="relationship-page__dates-header">
          <div className="relationship-page__dates-title-wrap">
            <h2 className="relationship-page__section-title">Памятные даты</h2>
            <span className="relationship-page__count-badge">{memorableDates.length}</span>
          </div>
        </div>

        <MemorableDatesList
          dates={memorableDates}
          onEdit={(date) => {
            setEditingDate(date);
            setIsCreateModalOpen(true);
          }}
          onDelete={(date) => setDeletingDate(date)}
        />
      </section>

      {/* Floating Action Button directly above BottomNav */}
      <BottomActionButton
        variant="floating"
        visible={!isCreateModalOpen && !isEditStartDateOpen && !deletingDate}
        label="Добавить памятную дату"
        onClick={() => {
          setEditingDate(null);
          setIsCreateModalOpen(true);
        }}
        iconName="plus"
        ariaLabel="Добавить памятную дату"
      />

      {/* Modals & Dialogs */}
      <CreateEditMemorableDateModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingDate(null);
        }}
        onSubmit={handleCreateOrEditSubmit}
        initialDate={editingDate}
      />

      <DeleteMemorableDateDialog
        isOpen={Boolean(deletingDate)}
        onClose={() => setDeletingDate(null)}
        onConfirm={handleDeleteConfirm}
        targetDate={deletingDate}
      />
    </div>
  );
}
