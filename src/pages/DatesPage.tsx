import { useState, useCallback } from 'react';
import { useDateMemories } from '../hooks/useDateMemories';
import { DatesHeader } from '../widgets/Dates/DatesHeader/DatesHeader';
import { DateMemoryCard } from '../widgets/Dates/DateMemoryCard/DateMemoryCard';
import { CreateEditDateMemoryModal } from '../features/dates/CreateEditDateMemoryModal/CreateEditDateMemoryModal';
import { DateMemoryDetailModal } from '../features/dates/DateMemoryDetailModal/DateMemoryDetailModal';
import { DeleteDateMemoryDialog } from '../features/dates/DeleteDateMemoryDialog/DeleteDateMemoryDialog';
import { DatesQuickListModal } from '../features/dates/DatesQuickListModal/DatesQuickListModal';
import { AllDatesAlbumModal } from '../features/dates/AllDatesAlbumModal/AllDatesAlbumModal';
import { PhotoLightbox } from '../features/dates/PhotoLightbox/PhotoLightbox';
import { BottomActionButton } from '../components/ui/BottomActionButton/BottomActionButton';
import { Button } from '../components/ui/Button/Button';
import { Icon } from '../components/ui/Icon/Icon';
import { useToast } from '../components/ui/Toast/ToastContext';
import { DateMemory, CreateDateMemoryInput } from '../types/dates';
import { Mascot } from '../components/ui/Mascot/Mascot';
import { telegramService } from '../services/telegramService';
import { useSpaceMode } from '../hooks/useSpaceMode';
import './DatesPage.css';

export function DatesPage() {
  const { isFriendship } = useSpaceMode();
  const {
    memories,
    allMemories,
    availableYears,
    selectedYear,
    setSelectedYear,
    sortOrder,
    setSortOrder,
    heldDatesCount,
    totalMemoriesWithPhotos,
    totalPhotosCount,
    createMemory,
    updateMemory,
    deleteMemory,
  } = useDateMemories();

  const { showToast } = useToast();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<DateMemory | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<DateMemory | null>(null);
  const [deletingMemory, setDeletingMemory] = useState<DateMemory | null>(null);
  const [isQuickListOpen, setIsQuickListOpen] = useState(false);
  const [isAlbumOpen, setIsAlbumOpen] = useState(false);

  // Lightbox State
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const isAnyModalOpen =
    isCreateModalOpen ||
    Boolean(selectedMemory) ||
    Boolean(deletingMemory) ||
    isLightboxOpen ||
    isQuickListOpen ||
    isAlbumOpen;

  const handleCreateOrEditSubmit = async (input: CreateDateMemoryInput) => {
    try {
      if (editingMemory) {
        await updateMemory(editingMemory.id, input);
        showToast({
          title: 'Воспоминание сохранено',
          message: `«${input.title}» успешно обновлено`,
          type: 'success',
        });
        if (selectedMemory && selectedMemory.id === editingMemory.id) {
          setSelectedMemory({
            ...selectedMemory,
            ...input,
            photos: input.photos || [],
          });
        }
        setEditingMemory(null);
      } else {
        await createMemory(input);
        telegramService.hapticNotification('success');
        showToast({
          title: 'Воспоминание сохранено',
          message: `«${input.title}» добавлено в ваш дневник ${isFriendship ? 'встреч' : 'свиданий'}`,
          type: 'love',
        });
      }
    } catch (err: any) {
      showToast({
        title: 'Ошибка сохранения',
        message:
          err.message ||
          (isFriendship
            ? 'Не удалось сохранить встречу в Supabase'
            : 'Не удалось сохранить свидание в Supabase'),
        type: 'info',
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMemory) return;
    const title = deletingMemory.title;
    try {
      await deleteMemory(deletingMemory.id);
      showToast({
        title: isFriendship ? 'Встреча удалена' : 'Свидание удалено',
        message: `«${title}» удалено из дневника ${isFriendship ? 'встреч' : 'свиданий'}`,
        type: 'info',
      });
      if (selectedMemory && selectedMemory.id === deletingMemory.id) {
        setSelectedMemory(null);
      }
    } catch (err: any) {
      showToast({
        title: 'Ошибка удаления',
        message:
          err.message ||
          (isFriendship
            ? 'Не удалось удалить встречу из базы данных'
            : 'Не удалось удалить свидание из базы данных'),
        type: 'info',
      });
    }
    setDeletingMemory(null);
  };

  const openLightbox = useCallback((photos: string[], index: number) => {
    setLightboxPhotos(photos);
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  }, []);

  const handleSelectMemory = useCallback((mem: DateMemory) => {
    setSelectedMemory(mem);
  }, []);

  const handleEditMemoryCard = useCallback((mem: DateMemory, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMemory(mem);
    setIsCreateModalOpen(true);
  }, []);

  const handleDeleteMemoryCard = useCallback((mem: DateMemory, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingMemory(mem);
  }, []);

  return (
    <div className="dates-page">
      {/* 1. Header with stats, year filters and sort */}
      <DatesHeader
        heldDatesCount={heldDatesCount}
        memoriesWithPhotosCount={totalMemoriesWithPhotos}
        totalPhotosCount={totalPhotosCount}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
        availableYears={availableYears}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        onOpenQuickList={() => {
          telegramService.hapticImpact('light');
          setIsQuickListOpen(true);
        }}
        onOpenAlbum={() => {
          telegramService.hapticImpact('light');
          setIsAlbumOpen(true);
        }}
      />

      {/* 2. Scrapbook Photo Album / Memories Feed or Empty State */}
      {memories.length === 0 ? (
        <section
          className="dates-empty-state"
          aria-label={isFriendship ? 'Нет сохранённых встреч' : 'Нет сохранённых свиданий'}
        >
          <div className="dates-empty-state__mascot" aria-hidden="true">
            <Mascot name="08_camera_photo" size={120} />
          </div>
          <h2 className="dates-empty-state__title">
            {isFriendship
              ? 'Здесь будут храниться ваши яркие встречи ✦'
              : 'Здесь будут храниться ваши маленькие истории ♡'}
          </h2>
          <p className="dates-empty-state__desc">
            {isFriendship
              ? 'Сохраняйте фото, любимые места и тёплые заметки о каждом совместном дне'
              : 'Сохраняйте полароидные фото, любимые места и тёплые заметки о каждом свидании'}
          </p>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Icon name="plus" size={16} />}
            onClick={() => {
              telegramService.hapticImpact('light');
              setEditingMemory(null);
              setIsCreateModalOpen(true);
            }}
          >
            {isFriendship ? 'Добавить первую встречу' : 'Добавить первое свидание'}
          </Button>
        </section>
      ) : (
        <section
          className="dates-list"
          aria-label={isFriendship ? 'Список прошедших встреч' : 'Список прошедших свиданий'}
        >
          {memories.map((memory, idx) => (
            <DateMemoryCard
              key={memory.id}
              memory={memory}
              tilt={idx % 2 === 0 ? 'left' : 'right'}
              onClick={handleSelectMemory}
              onEdit={handleEditMemoryCard}
              onDelete={handleDeleteMemoryCard}
              onOpenPhotoLightbox={openLightbox}
            />
          ))}
        </section>
      )}

      {/* Floating Action Button directly above BottomNav */}
      <BottomActionButton
        variant="floating"
        visible={!isAnyModalOpen}
        label={isFriendship ? 'Добавить встречу' : 'Добавить свидание'}
        onClick={() => {
          setEditingMemory(null);
          setIsCreateModalOpen(true);
        }}
        iconName="plus"
        ariaLabel={
          isFriendship
            ? 'Добавить воспоминание о встрече'
            : 'Добавить воспоминание о свидании'
        }
      />

      {/* Create / Edit Modal */}
      <CreateEditDateMemoryModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingMemory(null);
        }}
        onSubmit={handleCreateOrEditSubmit}
        initialMemory={editingMemory}
      />

      {/* Detail Modal */}
      <DateMemoryDetailModal
        isOpen={Boolean(selectedMemory)}
        onClose={() => setSelectedMemory(null)}
        memory={selectedMemory}
        onEdit={(mem) => {
          setEditingMemory(mem);
          setIsCreateModalOpen(true);
        }}
        onDelete={(mem) => setDeletingMemory(mem)}
        onOpenPhotoLightbox={openLightbox}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteDateMemoryDialog
        isOpen={Boolean(deletingMemory)}
        onClose={() => setDeletingMemory(null)}
        onConfirm={handleDeleteConfirm}
        targetMemory={deletingMemory}
      />

      {/* Quick List Modal */}
      <DatesQuickListModal
        isOpen={isQuickListOpen}
        onClose={() => setIsQuickListOpen(false)}
        memories={allMemories}
        onSelectMemory={(memory) => {
          setIsQuickListOpen(false);
          setSelectedMemory(memory);
        }}
      />

      {/* All Dates Album Modal */}
      <AllDatesAlbumModal
        isOpen={isAlbumOpen}
        onClose={() => setIsAlbumOpen(false)}
        memories={allMemories}
        onOpenPhotoLightbox={openLightbox}
      />

      {/* Photo Lightbox */}
      <PhotoLightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        photos={lightboxPhotos}
        currentIndex={lightboxIndex}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}
