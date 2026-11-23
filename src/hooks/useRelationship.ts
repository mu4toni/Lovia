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
import { capture } from '../lib/posthog';

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

  const refreshData = useCallback(async () => {
    const curStart = relationshipService.getStartDate();
    setStartDateState(curStart);
    setDaysTogether(calculateDaysTogether(curStart));
    setAnniversary(getAnniversaryInfo(curStart));
    setHeldDatesCount(dateMemoryService.getHeldDatesCount());
    try {
      const dates = await relationshipService.fetchMemorableDates();
      setMemorableDates(dates);
    } catch {
      setMemorableDates(relationshipService.getMemorableDates());
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      if (!relationshipService.hasCachedData() && !profile) {
        setIsLoading(true);
      }
      try {
        const prof = await requestsService.getProfile();
        if (isMounted) {
          setProfile(prof);
          await refreshData();
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
    window.addEventListener('lovia_couple_connected', handleRelUpdate);
    window.addEventListener('lovia_couple_updated', handleRelUpdate);

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible' && !document.hidden) {
        refreshData();
      }
    }, 18000);

    return () => {
      isMounted = false;
      window.removeEventListener('lovia_relationship_updated', handleRelUpdate);
      window.removeEventListener('lovia_dates_updated', handleDatesUpdate);
      window.removeEventListener('lovia_couple_connected', handleRelUpdate);
      window.removeEventListener('lovia_couple_updated', handleRelUpdate);
      clearInterval(intervalId);
    };
  }, [refreshData]);

  const updateStartDate = useCallback((newDate: string) => {
    relationshipService.setStartDate(newDate);
    refreshData();
  }, [refreshData]);

  const addMemorableDate = useCallback(async (input: CreateMemorableDateInput) => {
    const created = await relationshipService.addMemorableDate(input);
    refreshData();
    capture('memorable_date_created', {
      is_annual: created.isAnnual,
    });
    return created;
  }, [refreshData]);

  const updateMemorableDate = useCallback((id: string, input: UpdateMemorableDateInput) => {
    const updated = relationshipService.updateMemorableDate(id, input);
    refreshData();
    return updated;
  }, [refreshData]);

  const deleteMemorableDate = useCallback(async (id: string) => {
    const success = await relationshipService.deleteMemorableDate(id);
    refreshData();
    if (success) {
      capture('memorable_date_deleted');
    }
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
