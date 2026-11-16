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

  const refreshMemories = useCallback(() => {
    setAllMemories(dateMemoryService.getDateMemories());
  }, []);

  useEffect(() => {
    const handleUpdate = () => refreshMemories();
    window.addEventListener('lovia_dates_updated', handleUpdate);
    return () => {
      window.removeEventListener('lovia_dates_updated', handleUpdate);
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

  const createMemory = useCallback((input: CreateDateMemoryInput) => {
    const created = dateMemoryService.createDateMemory(input);
    refreshMemories();
    return created;
  }, [refreshMemories]);

  const updateMemory = useCallback((id: string, input: UpdateDateMemoryInput) => {
    const updated = dateMemoryService.updateDateMemory(id, input);
    refreshMemories();
    return updated;
  }, [refreshMemories]);

  const deleteMemory = useCallback((id: string) => {
    const ok = dateMemoryService.deleteDateMemory(id);
    refreshMemories();
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
