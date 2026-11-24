import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CoupleProfile,
  CoupleReminder,
  CoupleEvent,
  CreateReminderInput,
  UserCategory,
} from '../types';
import { requestsService } from '../services/requestsService';
import { categoriesService } from '../services/categoriesService';
import { initialCoupleProfile } from '../services/mockData';

export type DemoStateMode =
  | 'normal'
  | 'loading'
  | 'error'
  | 'unpaired'
  | 'empty_tasks'
  | 'overdue';

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

  const hasLoadedRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent && !requestsService.hasCachedData() && !hasLoadedRef.current) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const [profData, reqsData, evsData] = await Promise.all([
        requestsService.getProfile(),
        requestsService.getRequests(demoMode === 'overdue'),
        requestsService.getEvents(),
      ]);

      hasLoadedRef.current = true;
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
      if (!silent) {
        setError('Не удалось загрузить данные пары. Проверьте соединение.');
      }
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

  const handleToggleStatus = useCallback(async (id: string) => {
    const updated = await requestsService.toggleStatus(id);
    if (updated) {
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: updated.status } : r))
      );
    }
  }, []);

  const handleCreateRequest = useCallback(async (input: CreateReminderInput) => {
    const created = await requestsService.createRequest(input);
    setRequests((prev) =>
      prev.some((r) => r.id === created.id)
        ? prev.map((r) => (r.id === created.id ? created : r))
        : [created, ...prev]
    );
  }, []);

  const handleUpdateRequest = useCallback(
    async (id: string, input: Partial<CreateReminderInput>) => {
      const updated = await requestsService.updateRequest(id, input);
      if (updated) {
        setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
      }
      return updated;
    },
    []
  );

  const handleDeleteRequest = useCallback(async (id: string) => {
    const ok = await requestsService.deleteRequest(id);
    if (ok) {
      setRequests((prev) => prev.filter((r) => r.id !== id));
    }
  }, []);

  const handleConnectPartnerSim = useCallback(() => {
    setProfile({
      ...initialCoupleProfile,
      isPartnerConnected: true,
    });
    setDemoMode('normal');
  }, []);

  const handleCategoriesChanged = useCallback(() => {
    const updatedCats = categoriesService.getCategories();
    setCategories(updatedCats);
    requestsService.getRequests(demoMode === 'overdue').then((list) => {
      if (demoMode !== 'empty_tasks') {
        setRequests(list);
      }
    });
  }, [demoMode]);

  const reload = useCallback(() => loadData(false), [loadData]);

  useEffect(() => {
    // Coalesce bursts of lovia_* events (e.g. applyBundle) into a single silent refresh
    const scheduleSilentRefresh = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        loadData(true);
      }, 45);
    };

    const onCatsUpdated = () => handleCategoriesChanged();

    window.addEventListener('lovia_categories_updated', onCatsUpdated);
    window.addEventListener('lovia_relationship_updated', scheduleSilentRefresh);
    window.addEventListener('lovia_couple_updated', scheduleSilentRefresh);
    window.addEventListener('lovia_couple_connected', scheduleSilentRefresh);
    window.addEventListener('lovia_reminders_updated', scheduleSilentRefresh);
    window.addEventListener('lovia_profile_updated', scheduleSilentRefresh);

    // Silent background poll every 25 seconds so partner sees new reminders
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible' && !document.hidden && demoMode === 'normal') {
        requestsService
          .getRequests(false)
          .then((list) => {
            setRequests(list);
          })
          .catch(() => {});
      }
    }, 25000);

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      window.removeEventListener('lovia_categories_updated', onCatsUpdated);
      window.removeEventListener('lovia_relationship_updated', scheduleSilentRefresh);
      window.removeEventListener('lovia_couple_updated', scheduleSilentRefresh);
      window.removeEventListener('lovia_couple_connected', scheduleSilentRefresh);
      window.removeEventListener('lovia_reminders_updated', scheduleSilentRefresh);
      window.removeEventListener('lovia_profile_updated', scheduleSilentRefresh);
      clearInterval(intervalId);
    };
  }, [loadData, handleCategoriesChanged, demoMode]);

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
    handleToggleStatus,
    handleCreateRequest,
    handleUpdateRequest,
    handleDeleteRequest,
    handleConnectPartnerSim,
    handleCategoriesChanged,
    reload,
  };
}
