import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DateMemory,
  CreateDateMemoryInput,
  UpdateDateMemoryInput,
  DateMemorySort,
} from '../types/dates';
import { dateMemoryService } from '../services/dateMemoryService';
import { parseDateComponents } from '../utils/dateCalculations';

export function useDateMemories() {
  const [allMemories, setAllMemories] = useState<DateMemory[]>(() =>
    dateMemoryService.getDateMemories()
  );
  const [sortOrder, setSortOrder] = useState<DateMemorySort>('newest');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  const refreshMemories = useCallback(async () => {
    try {
      const list = await dateMemoryService.fetchDateMemories();
      setAllMemories(list);
    } catch {
      setAllMemories(dateMemoryService.getDateMemories());
    }
  }, []);

  useEffect(() => {
    refreshMemories();

    const handleUpdate = () => refreshMemories();
    window.addEventListener('lovia_dates_updated', handleUpdate);
    window.addEventListener('lovia_couple_connected', handleUpdate);
    window.addEventListener('lovia_couple_updated', handleUpdate);

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !document.hidden) {
        refreshMemories();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible' && !document.hidden) {
        refreshMemories();
      }
    }, 18000);

    return () => {
      window.removeEventListener('lovia_dates_updated', handleUpdate);
      window.removeEventListener('lovia_couple_connected', handleUpdate);
      window.removeEventListener('lovia_couple_updated', handleUpdate);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(intervalId);
    };
  }, [refreshMemories]);

  // Extract unique years
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    allMemories.forEach((m) => {
      const { year } = parseDateComponents(m.date);
      if (year) set.add(year.toString());
    });
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [allMemories]);

  // Filter and sort
  const memories = useMemo(() => {
    let result = [...allMemories];

    if (selectedYear !== 'all') {
      result = result.filter((m) => {
        const { year } = parseDateComponents(m.date);
        return year.toString() === selectedYear;
      });
    }

    result.sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [allMemories, selectedYear, sortOrder]);

  const heldDatesCount = allMemories.length;

  const totalMemoriesWithPhotos = useMemo(() => {
    return allMemories.filter((m) => m.photos && m.photos.length > 0).length;
  }, [allMemories]);

  const totalPhotosCount = useMemo(() => {
    return allMemories.reduce((acc, m) => acc + (m.photos ? m.photos.length : 0), 0);
  }, [allMemories]);

  const createMemory = useCallback(async (input: CreateDateMemoryInput) => {
    const created = await dateMemoryService.createDateMemory(input);
    await refreshMemories();
    return created;
  }, [refreshMemories]);

  const updateMemory = useCallback(async (id: string, input: UpdateDateMemoryInput) => {
    const updated = await dateMemoryService.updateDateMemory(id, input);
    await refreshMemories();
    return updated;
  }, [refreshMemories]);

  const deleteMemory = useCallback(async (id: string) => {
    const ok = await dateMemoryService.deleteDateMemory(id);
    await refreshMemories();
    return ok;
  }, [refreshMemories]);

  return {
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
    refreshMemories,
  };
}
