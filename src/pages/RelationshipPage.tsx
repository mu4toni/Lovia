import { useState, useCallback } from 'react';
import { useRelationship } from '../hooks/useRelationship';
import { MemorableDatesList } from '../widgets/Relationship/MemorableDatesList/MemorableDatesList';
import { CreateEditMemorableDateModal } from '../features/relationships/CreateEditMemorableDateModal/CreateEditMemorableDateModal';
import { MemorableDateDetailModal } from '../features/relationships/MemorableDateDetailModal/MemorableDateDetailModal';
import { DeleteMemorableDateDialog } from '../features/relationships/DeleteMemorableDateDialog/DeleteMemorableDateDialog';
import { RelationshipMilestonesModal } from '../components/relationship/RelationshipMilestonesModal';
import { PhotoLightbox } from '../features/dates/PhotoLightbox/PhotoLightbox';
import { BottomActionButton } from '../components/ui/BottomActionButton/BottomActionButton';
import { useToast } from '../components/ui/Toast/ToastContext';
import { MemorableDate, CreateMemorableDateInput } from '../types/relationship';
import { Skeleton } from '../components/ui/Loading/Skeleton';
import { Mascot } from '../components/ui/Mascot/Mascot';
import { Icon } from '../components/ui/Icon/Icon';
import { Avatar } from '../components/ui/Avatar/Avatar';
import { AnniversaryProgressBar } from '../components/ui/AnniversaryProgress/AnniversaryProgressBar';
import { formatRussianDate, pluralizeRu } from '../utils/dateCalculations';
import { telegramService } from '../services/telegramService';
import { useSpaceMode } from '../hooks/useSpaceMode';
import './RelationshipPage.css';

export function RelationshipPage() {
  const { isFriendship } = useSpaceMode();
  const {
    profile,
    startDate,
    anniversary,
    memorableDates,
    isLoading,
    addMemorableDate,
    updateMemorableDate,
    deleteMemorableDate,
  } = useRelationship();

  const { showToast } = useToast();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMilestonesOpen, setIsMilestonesOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<MemorableDate | null>(null);
  const [editingDate, setEditingDate] = useState<MemorableDate | null>(null);
  const [deletingDate, setDeletingDate] = useState<MemorableDate | null>(null);
  const [lightboxState, setLightboxState] = useState<{
    photos: string[];
    index: number;
  } | null>(null);

  const handleCreateOrEditSubmit = async (input: CreateMemorableDateInput) => {
    try {
      if (editingDate) {
        const updated = await updateMemorableDate(editingDate.id, input);
        if (updated && selectedDate?.id === updated.id) {
          setSelectedDate(updated);
        }
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
    const deletedId = deletingDate.id;
    try {
      await deleteMemorableDate(deletedId);
      if (selectedDate?.id === deletedId) {
        setSelectedDate(null);
      }
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

  const handleSelectDate = useCallback((date: MemorableDate) => {
    setSelectedDate(date);
  }, []);

  const handleEditDate = useCallback((date: MemorableDate) => {
    setEditingDate(date);
    setIsCreateModalOpen(true);
  }, []);

  const handleDeleteDate = useCallback((date: MemorableDate) => {
    setDeletingDate(date);
  }, []);

  const handleOpenLightbox = useCallback((photos: string[], index: number) => {
    setLightboxState({ photos, index });
  }, []);

  if (isLoading) {
    return (
      <div className="relationship-page">
        <Skeleton height={88} borderRadius="var(--radius-lg)" />
        <Skeleton height={78} borderRadius="var(--radius-lg)" />
        <Skeleton height={220} borderRadius="var(--radius-lg)" />
      </div>
    );
  }

  const daysLabel = pluralizeRu(anniversary.daysUntil, 'день', 'дня', 'дней');
  const yearsLabel = pluralizeRu(anniversary.yearsTogether, 'год', 'года', 'лет');
  const prevYears = Math.max(0, anniversary.yearsTogether - 1);
  const prevYearsLabel = pluralizeRu(prevYears, 'год', 'года', 'лет');
  const mark = isFriendship ? '✦' : '♥';
  const userName = profile?.user?.name || 'Вы';
  const partnerName = profile?.partner?.name || (isFriendship ? 'Друг' : 'Партнёр');
  const formattedStartDate = formatRussianDate(startDate);
  const anyOverlayOpen =
    isCreateModalOpen ||
    isMilestonesOpen ||
    Boolean(selectedDate) ||
    Boolean(deletingDate) ||
    Boolean(lightboxState);

  return (
    <div className="relationship-page">
      {/* 1. Redesigned Header: Handwritten Title + Subtitle + Bean */}
      <header className="relationship-page__header">
        <div className="relationship-page__hero-row">
          <div className="relationship-page__header-left">
            <h1 className="relationship-page__title">
              {isFriendship ? 'Наша дружба ' : 'Наша история '}
              <span className="relationship-page__title-mark" aria-hidden="true">
                {isFriendship ? '✦' : '♥'}
              </span>
            </h1>
            <p className="relationship-page__subtitle">
              Маленькие моменты, которые делают вас ближе
            </p>
          </div>
          <div className="relationship-page__peeking-mascot" aria-hidden="true">
            <Mascot
              name={isFriendship ? '36_high_five' : '16_relationships_hug'}
              size={72}
              eager
            />
          </div>
        </div>
      </header>

      {/* 2. Compact Anniversary Banner with Partner Avatars & Progress Bar (opens Milestones Modal) */}
      <article
        className={`relationship-anniv-banner sketch-card ${
          anniversary.isToday ? 'relationship-anniv-banner--today' : ''
        }`}
        role="button"
        tabIndex={0}
        onClick={() => {
          telegramService.hapticImpact('light');
          setIsMilestonesOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            telegramService.hapticImpact('light');
            setIsMilestonesOpen(true);
          }
        }}
        aria-label={
          anniversary.isToday
            ? `Сегодня годовщина: ${anniversary.yearsTogether} ${yearsLabel}. Открыть вехи.`
            : `До следующей годовщины (${anniversary.yearsTogether} ${yearsLabel}) осталось ${anniversary.daysUntil} ${daysLabel}. Открыть вехи.`
        }
      >
        {/* Top Row: Symmetric 3-Column Couple Row (Avatar — Names & Date — Avatar) */}
        <div className="relationship-anniv-banner__couple-row">
          <Avatar
            src={profile?.user?.avatarUrl}
            name={userName}
            size="md"
            className="relationship-anniv-banner__avatar"
          />

          <div className="relationship-anniv-banner__couple-info">
            <div className="relationship-anniv-banner__names">
              <span className="relationship-anniv-banner__name">{userName}</span>
              <span className="relationship-anniv-banner__name-mark" aria-hidden="true">
                {mark}
              </span>
              <span className="relationship-anniv-banner__name">{partnerName}</span>
            </div>
            <span className="relationship-anniv-banner__since">
              {isFriendship ? 'Дружим с ' : 'Вместе с '}
              {formattedStartDate}
            </span>
          </div>

          <Avatar
            src={profile?.partner?.avatarUrl}
            name={partnerName}
            size="md"
            className="relationship-anniv-banner__avatar"
          />
        </div>

        <div className="relationship-anniv-banner__divider" aria-hidden="true" />

        {/* Bottom Block: Countdown + HomePage-style Thin Gradient Progress Bar */}
        <div className="relationship-anniv-banner__anniv-block">
          <div className="relationship-anniv-banner__headline-row">
            <div className="relationship-anniv-banner__headline">
              <span className="relationship-anniv-banner__label">
                {anniversary.isToday
                  ? isFriendship
                    ? 'Годовщина дружбы сегодня!'
                    : 'Наша годовщина сегодня!'
                  : 'До нашей следующей годовщины'}
              </span>
              <div className="relationship-anniv-banner__value-row">
                <span className="relationship-anniv-banner__days">
                  {anniversary.isToday
                    ? `${anniversary.yearsTogether} ${yearsLabel}!`
                    : `${anniversary.daysUntil} ${daysLabel}`}
                </span>
                <span className="relationship-anniv-banner__meta">
                  {anniversary.formattedAnniversaryDate}
                </span>
              </div>
            </div>

            <span className="relationship-anniv-banner__chevron" aria-hidden="true">
              <Icon name="chevron-right" size={18} />
            </span>
          </div>

          <div className="relationship-anniv-banner__progress-wrap">
            <AnniversaryProgressBar
              progressPercent={anniversary.progressPercent}
              daysUntil={anniversary.daysUntil}
              isToday={anniversary.isToday}
              yearsTogether={anniversary.yearsTogether}
              hideCaption
            />
            <div className="relationship-anniv-banner__milestones-row">
              <span>
                {prevYears} {prevYearsLabel}
              </span>
              <span className="relationship-anniv-banner__milestone-next">
                {anniversary.yearsTogether} {yearsLabel}
              </span>
            </div>
          </div>
        </div>
      </article>

      {/* 3. Memorable Dates Timeline */}
      <section className="relationship-page__dates-section" aria-label="Памятные даты">
        <div className="relationship-page__dates-header">
          <div className="relationship-page__dates-title-wrap">
            <h2 className="relationship-page__section-title">Памятные даты</h2>
            <span className="relationship-page__count-badge">{memorableDates.length}</span>
          </div>
        </div>

        <MemorableDatesList
          dates={memorableDates}
          onSelect={handleSelectDate}
          onEdit={handleEditDate}
          onDelete={handleDeleteDate}
        />
      </section>

      {/* Floating Action Button directly above BottomNav */}
      <BottomActionButton
        variant="floating"
        visible={!anyOverlayOpen}
        label="Добавить памятную дату"
        onClick={() => {
          setEditingDate(null);
          setIsCreateModalOpen(true);
        }}
        iconName="plus"
        ariaLabel="Добавить памятную дату"
      />

      {/* Modals & Dialogs */}
      <RelationshipMilestonesModal
        isOpen={isMilestonesOpen}
        onClose={() => setIsMilestonesOpen(false)}
        startDate={startDate}
        onAddMemorableDate={() => {
          setEditingDate(null);
          setIsCreateModalOpen(true);
        }}
      />

      <MemorableDateDetailModal
        isOpen={Boolean(selectedDate)}
        onClose={() => setSelectedDate(null)}
        memorableDate={selectedDate}
        onEdit={handleEditDate}
        onDelete={handleDeleteDate}
        onOpenLightbox={handleOpenLightbox}
      />

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

      {lightboxState && (
        <PhotoLightbox
          isOpen
          photos={lightboxState.photos}
          currentIndex={lightboxState.index}
          onIndexChange={(nextIndex) =>
            setLightboxState((prev) => (prev ? { ...prev, index: nextIndex } : null))
          }
          onClose={() => setLightboxState(null)}
        />
      )}
    </div>
  );
}
