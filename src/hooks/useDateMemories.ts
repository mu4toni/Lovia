import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  DateMemory,
  CreateDateMemoryInput,
  UpdateDateMemoryInput,
  DateMemorySort,
} from '../types/dates';
import { dateMemoryService } from '../services/dateMemoryService';
import { parseDateComponents } from '../utils/dateCalculations';
import { captureEvent } from '../lib/posthog';

export function useDateMemories() {
  const [allMemories, setAllMemories] = useState<DateMemory[]>(() =>
    dateMemoryService.getDateMemories()
  );
  const [sortOrder, setSortOrder] = useState<DateMemorySort>('newest');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        setAllMemories(dateMemoryService.getDateMemories());
      }, 45);
    };

    window.addEventListener('lovia_dates_updated', scheduleRefresh);
    window.addEventListener('lovia_couple_connected', scheduleRefresh);
    window.addEventListener('lovia_couple_updated', scheduleRefresh);

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible' && !document.hidden) {
        refreshMemories();
      }
    }, 25000);

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      window.removeEventListener('lovia_dates_updated', scheduleRefresh);
      window.removeEventListener('lovia_couple_connected', scheduleRefresh);
      window.removeEventListener('lovia_couple_updated', scheduleRefresh);
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
    captureEvent('date_memory_created');
    setAllMemories(dateMemoryService.getDateMemories());
    return created;
  }, []);

  const updateMemory = useCallback(async (id: string, input: UpdateDateMemoryInput) => {
    const updated = await dateMemoryService.updateDateMemory(id, input);
    setAllMemories(dateMemoryService.getDateMemories());
    return updated;
  }, []);

  const deleteMemory = useCallback(async (id: string) => {
    const ok = await dateMemoryService.deleteDateMemory(id);
    if (ok) captureEvent('date_memory_deleted');
    setAllMemories(dateMemoryService.getDateMemories());
    return ok;
  }, []);

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
