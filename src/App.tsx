import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { HomePage } from './pages/HomePage';
import { WishlistPage } from './pages/WishlistPage';
import { RelationshipPage } from './pages/RelationshipPage';
import { DatesPage } from './pages/DatesPage';
import { ProfilePage } from './pages/ProfilePage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DesignSystemPage } from './pages/DesignSystemPage';
import { DevBanner } from './components/DevBanner';
import { ToastProvider } from './components/ui';
import { coupleService } from './services/coupleService';
import { telegramService } from './services/telegramService';

function ProtectedCoupleRoute() {
  const [isConnected, setIsConnected] = useState(() => coupleService.isConnected());

  useEffect(() => {
    const handleCoupleChange = () => {
      setIsConnected(coupleService.isConnected());
    };

    window.addEventListener('lovia_couple_connected', handleCoupleChange);
    window.addEventListener('lovia_couple_updated', handleCoupleChange);
    window.addEventListener('lovia_couple_dissolved', handleCoupleChange);

    return () => {
      window.removeEventListener('lovia_couple_connected', handleCoupleChange);
      window.removeEventListener('lovia_couple_updated', handleCoupleChange);
      window.removeEventListener('lovia_couple_dissolved', handleCoupleChange);
    };
  }, []);

  if (!isConnected) {
    return <Navigate to="/connect" replace />;
  }

  return <Outlet />;
}

/**
 * Synchronizes Telegram Native BackButton with current route.
 * - Hidden on main tab '/'
 * - Shown on secondary tabs and deeper views; returns back or to '/'
 */
function TelegramBackButtonSync() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === '/') {
      telegramService.setupBackButton(null);
    } else {
      telegramService.setupBackButton(() => {
        if (window.history.state && window.history.state.idx > 0) {
          navigate(-1);
        } else {
          navigate('/');
        }
      });
    }

    return () => {
      telegramService.setupBackButton(null);
    };
  }, [location.pathname, navigate]);

  return null;
}

export function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('lovia_theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
    telegramService.init();
    telegramService.applyThemeColors();
  }, []);

  return (
    <ToastProvider>
      <TelegramBackButtonSync />
      <DevBanner />
      <Routes>
        {/* Registration & Couple Connect (Outside MainLayout) */}
        <Route path="/connect" element={<OnboardingPage />} />
        <Route path="/onboarding" element={<Navigate to="/connect" replace />} />

        {/* Protected Navigation Tabs (Requires active connected couple) */}
        <Route element={<ProtectedCoupleRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/relationship" element={<RelationshipPage />} />
            <Route path="/dates" element={<DatesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/calendar" element={<DatesPage />} />
          </Route>
        </Route>

        {/* Design System & Showcase (Accessible anytime) */}
        <Route path="/design" element={<DesignSystemPage />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
