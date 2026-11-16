import { useState, useEffect, useCallback } from 'react';
import {
  CoupleProfile,
  CoupleReminder,
  CoupleEvent,
  CreateReminderInput,
  UserCategory,
} from '../types';
import { requestsService } from '../services/requestsService';
import { categoriesService } from '../services/categoriesService';
import { DemoStateMode } from '../components/home/DemoStateSwitcher/DemoStateSwitcher';
import { initialCoupleProfile } from '../services/mockData';

export function useHomeData() {
  const [profile, setProfile] = useState<CoupleProfile | null>(null);
  const [requests, setRequests] = useState<CoupleReminder[]>([]);
  const [events, setEvents] = useState<CoupleEvent[]>([]);
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState<DemoStateMode>('normal');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingRequest, setEditingRequest] = useState<CoupleReminder | null>(null);
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState<boolean>(false);
  const [isManageCategoriesModalOpen, setIsManageCategoriesModalOpen] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [profData, reqsData, evsData] = await Promise.all([
        requestsService.getProfile(),
        requestsService.getRequests(demoMode === 'overdue'),
        requestsService.getEvents(),
      ]);

      const catsData = categoriesService.getCategories();
      setCategories(catsData);

      // Apply demo mode modifiers
      if (demoMode === 'unpaired') {
        profData.isPartnerConnected = false;
        profData.partner = undefined;
      }

      if (demoMode === 'empty_tasks') {
        setRequests([]);
      } else {
        setRequests(reqsData);
      }

      setProfile(profData);
      setEvents(evsData);
    } catch {
      setError('Не удалось загрузить данные пары. Проверьте соединение.');
    } finally {
      setIsLoading(false);
    }
  }, [demoMode]);

  useEffect(() => {
    if (demoMode === 'loading') {
      setIsLoading(true);
      setError(null);
      return;
    }
    if (demoMode === 'error') {
      setIsLoading(false);
      setError('Ошибка синхронизации с сервером (Код 503). Попробуйте обновить.');
      return;
    }
    loadData();
  }, [demoMode, loadData]);

  const handleToggleStatus = async (id: string) => {
    const updated = await requestsService.toggleStatus(id);
    if (updated) {
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: updated.status } : r))
      );
    }
  };

  const handleCreateRequest = async (input: CreateReminderInput) => {
    const created = await requestsService.createRequest(input);
    setRequests((prev) => [created, ...prev]);
  };

  const handleUpdateRequest = async (id: string, input: Partial<CreateReminderInput>) => {
    const updated = await requestsService.updateRequest(id, input);
    if (updated) {
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? updated : r))
      );
    }
    return updated;
  };

  const handleDeleteRequest = async (id: string) => {
    const ok = await requestsService.deleteRequest(id);
    if (ok) {
      setRequests((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleConnectPartnerSim = () => {
    setProfile({
      ...initialCoupleProfile,
      isPartnerConnected: true,
    });
    setDemoMode('normal');
  };

  const handleCategoriesChanged = useCallback(() => {
    const updatedCats = categoriesService.getCategories();
    setCategories(updatedCats);
    // Reload reminders to sync any unlinked categories
    requestsService.getRequests(demoMode === 'overdue').then((list) => {
      if (demoMode !== 'empty_tasks') {
        setRequests(list);
      }
    });
  }, [demoMode]);

  useEffect(() => {
    const onCatsUpdated = () => handleCategoriesChanged();
    const onRelUpdated = () => {
      loadData();
    };
    window.addEventListener('lovia_categories_updated', onCatsUpdated);
    window.addEventListener('lovia_relationship_updated', onRelUpdated);
    window.addEventListener('lovia_couple_updated', onRelUpdated);
    window.addEventListener('lovia_profile_updated', onRelUpdated);
    return () => {
      window.removeEventListener('lovia_categories_updated', onCatsUpdated);
      window.removeEventListener('lovia_relationship_updated', onRelUpdated);
      window.removeEventListener('lovia_couple_updated', onRelUpdated);
      window.removeEventListener('lovia_profile_updated', onRelUpdated);
    };
  }, [loadData, handleCategoriesChanged]);

  return {
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
    isCreateCategoryModalOpen,
    setIsCreateCategoryModalOpen,
    isManageCategoriesModalOpen,
    setIsManageCategoriesModalOpen,
    handleToggleStatus,
    handleCreateRequest,
    handleUpdateRequest,
    handleDeleteRequest,
    handleConnectPartnerSim,
    handleCategoriesChanged,
    reload: loadData,
  };
}
