import { useState, useEffect, useCallback } from 'react';
import {
  MemorableDate,
  CreateMemorableDateInput,
  UpdateMemorableDateInput,
  AnniversaryInfo,
} from '../types/relationship';
import { CoupleProfile } from '../types/couple';
import { relationshipService } from '../services/relationshipService';
import { dateMemoryService } from '../services/dateMemoryService';
import { requestsService } from '../services/requestsService';
import {
  calculateDaysTogether,
  getAnniversaryInfo,
} from '../utils/dateCalculations';

export function useRelationship() {
  const [profile, setProfile] = useState<CoupleProfile | null>(null);
  const [startDate, setStartDateState] = useState<string>(() => relationshipService.getStartDate());
  const [daysTogether, setDaysTogether] = useState<number>(0);
  const [anniversary, setAnniversary] = useState<AnniversaryInfo>(() =>
    getAnniversaryInfo(relationshipService.getStartDate())
  );
  const [heldDatesCount, setHeldDatesCount] = useState<number>(() => dateMemoryService.getHeldDatesCount());
  const [memorableDates, setMemorableDates] = useState<MemorableDate[]>(() =>
    relationshipService.getMemorableDates()
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshData = useCallback(() => {
    const curStart = relationshipService.getStartDate();
    setStartDateState(curStart);
    setDaysTogether(calculateDaysTogether(curStart));
    setAnniversary(getAnniversaryInfo(curStart));
    setHeldDatesCount(dateMemoryService.getHeldDatesCount());
    setMemorableDates(relationshipService.getMemorableDates());
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      setIsLoading(true);
      try {
        const prof = await requestsService.getProfile();
        if (isMounted) {
          setProfile(prof);
          refreshData();
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    init();

    const handleRelUpdate = () => refreshData();
    const handleDatesUpdate = () => refreshData();

    window.addEventListener('lovia_relationship_updated', handleRelUpdate);
    window.addEventListener('lovia_dates_updated', handleDatesUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('lovia_relationship_updated', handleRelUpdate);
      window.removeEventListener('lovia_dates_updated', handleDatesUpdate);
    };
  }, [refreshData]);

  const updateStartDate = useCallback((newDate: string) => {
    relationshipService.setStartDate(newDate);
    refreshData();
  }, [refreshData]);

  const addMemorableDate = useCallback((input: CreateMemorableDateInput) => {
    const created = relationshipService.addMemorableDate(input);
    refreshData();
    return created;
  }, [refreshData]);

  const updateMemorableDate = useCallback((id: string, input: UpdateMemorableDateInput) => {
    const updated = relationshipService.updateMemorableDate(id, input);
    refreshData();
    return updated;
  }, [refreshData]);

  const deleteMemorableDate = useCallback((id: string) => {
    const success = relationshipService.deleteMemorableDate(id);
    refreshData();
    return success;
  }, [refreshData]);

  return {
    profile,
    startDate,
    daysTogether,
    anniversary,
    heldDatesCount,
    memorableDates,
    isLoading,
    updateStartDate,
    addMemorableDate,
    updateMemorableDate,
    deleteMemorableDate,
    refreshData,
  };
}
