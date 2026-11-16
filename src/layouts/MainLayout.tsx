import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { FireworksOverlay } from '../components/ui/FireworksOverlay/FireworksOverlay';
import { useToast } from '../components/ui/Toast/ToastContext';
import {
  CelebrationEvent,
  consumeTodayCelebrationIfNew,
} from '../services/celebrationService';
import { relationshipService } from '../services/relationshipService';
import { telegramService } from '../services/telegramService';
import './MainLayout.css';

export function MainLayout() {
  const [activeCelebration, setActiveCelebration] = useState<CelebrationEvent | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    // 1. Check for real today's celebration (strictly once a day per event)
    const startDate = relationshipService.getStartDate();
    const memorableDates = relationshipService.getMemorableDates();
    const todayCelebration = consumeTodayCelebrationIfNew(startDate, memorableDates);

    if (todayCelebration) {
      setActiveCelebration(todayCelebration);
      telegramService.hapticNotification('success');
      showToast({
        title: todayCelebration.title,
        message: todayCelebration.subtitle,
        type: 'love',
      });
    }

    // 2. Listen for manual celebration triggers (e.g. from DemoStateSwitcher)
    const handleManualCelebration = (e: Event) => {
      const customEvt = e as CustomEvent<CelebrationEvent>;
      if (customEvt.detail) {
        setActiveCelebration(customEvt.detail);
        telegramService.hapticNotification('success');
        showToast({
          title: customEvt.detail.title,
          message: customEvt.detail.subtitle,
          type: 'love',
        });
      }
    };

    window.addEventListener('lovia_celebrate', handleManualCelebration);
    return () => {
      window.removeEventListener('lovia_celebrate', handleManualCelebration);
    };
  }, [showToast]);

  return (
    <div className="main-layout">
      {activeCelebration && (
        <FireworksOverlay
          burstCount={activeCelebration.burstCount}
          onComplete={() => setActiveCelebration(null)}
        />
      )}
      <main className="main-content">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
