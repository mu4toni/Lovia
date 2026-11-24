import { useState, useEffect, useCallback, useRef } from 'react';
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
import { captureEvent } from '../lib/posthog';

export function useRelationship() {
  const [profile, setProfile] = useState<CoupleProfile | null>(null);
  const [startDate, setStartDateState] = useState<string>(() => relationshipService.getStartDate());
  const [daysTogether, setDaysTogether] = useState<number>(() =>
    calculateDaysTogether(relationshipService.getStartDate())
  );
  const [anniversary, setAnniversary] = useState<AnniversaryInfo>(() =>
    getAnniversaryInfo(relationshipService.getStartDate())
  );
  const [heldDatesCount, setHeldDatesCount] = useState<number>(() =>
    dateMemoryService.getHeldDatesCount()
  );
  const [memorableDates, setMemorableDates] = useState<MemorableDate[]>(() =>
    relationshipService.getMemorableDates()
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const hasLoadedRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncLocalDerived = useCallback(() => {
    const curStart = relationshipService.getStartDate();
    setStartDateState(curStart);
    setDaysTogether(calculateDaysTogether(curStart));
    setAnniversary(getAnniversaryInfo(curStart));
    setHeldDatesCount(dateMemoryService.getHeldDatesCount());
    setMemorableDates(relationshipService.getMemorableDates());
  }, []);

  const refreshData = useCallback(async () => {
    syncLocalDerived();
    try {
      const [prof, dates] = await Promise.all([
        requestsService.getProfile(),
        relationshipService.fetchMemorableDates(),
      ]);
      setProfile(prof);
      setMemorableDates(dates);
    } catch {
      setMemorableDates(relationshipService.getMemorableDates());
    }
  }, [syncLocalDerived]);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      if (!relationshipService.hasCachedData() && !hasLoadedRef.current) {
        setIsLoading(true);
      }
      try {
        const [prof, dates] = await Promise.all([
          requestsService.getProfile(),
          relationshipService.fetchMemorableDates(),
        ]);
        if (isMounted) {
          hasLoadedRef.current = true;
          setProfile(prof);
          syncLocalDerived();
          setMemorableDates(dates);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    init();

    const scheduleLocalSync = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(async () => {
        refreshTimerRef.current = null;
        if (!isMounted) return;
        syncLocalDerived();
        const prof = await requestsService.getProfile();
        if (isMounted) setProfile(prof);
      }, 45);
    };

    window.addEventListener('lovia_relationship_updated', scheduleLocalSync);
    window.addEventListener('lovia_dates_updated', scheduleLocalSync);
    window.addEventListener('lovia_couple_connected', scheduleLocalSync);
    window.addEventListener('lovia_couple_updated', scheduleLocalSync);

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible' && !document.hidden) {
        refreshData();
      }
    }, 25000);

    return () => {
      isMounted = false;
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      window.removeEventListener('lovia_relationship_updated', scheduleLocalSync);
      window.removeEventListener('lovia_dates_updated', scheduleLocalSync);
      window.removeEventListener('lovia_couple_connected', scheduleLocalSync);
      window.removeEventListener('lovia_couple_updated', scheduleLocalSync);
      clearInterval(intervalId);
    };
  }, [refreshData, syncLocalDerived]);

  const updateStartDate = useCallback(
    (newDate: string) => {
      relationshipService.setStartDate(newDate);
      syncLocalDerived();
    },
    [syncLocalDerived]
  );

  const addMemorableDate = useCallback(
    async (input: CreateMemorableDateInput) => {
      const created = await relationshipService.addMemorableDate(input);
      captureEvent('memorable_date_created');
      syncLocalDerived();
      return created;
    },
    [syncLocalDerived]
  );

  const updateMemorableDate = useCallback(
    async (id: string, input: UpdateMemorableDateInput) => {
      const updated = await relationshipService.updateMemorableDate(id, input);
      syncLocalDerived();
      return updated;
    },
    [syncLocalDerived]
  );

  const deleteMemorableDate = useCallback(
    async (id: string) => {
      const success = await relationshipService.deleteMemorableDate(id);
      syncLocalDerived();
      return success;
    },
    [syncLocalDerived]
  );

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
