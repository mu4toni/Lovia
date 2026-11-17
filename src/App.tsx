import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { HomePage } from './pages/HomePage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DevBanner } from './components/DevBanner';
import { ToastProvider, PageSkeleton } from './components/ui';
import { coupleService } from './services/coupleService';
import { telegramService } from './services/telegramService';

// Code Splitting: второстепенные страницы подгружаются по требованию
const WishlistPage = lazy(() =>
  import('./pages/WishlistPage').then((m) => ({ default: m.WishlistPage }))
);
const RelationshipPage = lazy(() =>
  import('./pages/RelationshipPage').then((m) => ({ default: m.RelationshipPage }))
);
const DatesPage = lazy(() =>
  import('./pages/DatesPage').then((m) => ({ default: m.DatesPage }))
);
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const DesignSystemPage = lazy(() =>
  import('./pages/DesignSystemPage').then((m) => ({ default: m.DesignSystemPage }))
);

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
            <Route
              path="/wishlist"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <WishlistPage />
                </Suspense>
              }
            />
            <Route
              path="/relationship"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <RelationshipPage />
                </Suspense>
              }
            />
            <Route
              path="/dates"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <DatesPage />
                </Suspense>
              }
            />
            <Route
              path="/profile"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <ProfilePage />
                </Suspense>
              }
            />
            <Route
              path="/calendar"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <DatesPage />
                </Suspense>
              }
            />
          </Route>
        </Route>

        {/* Design System & Showcase (Accessible anytime) */}
        <Route
          path="/design"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <DesignSystemPage />
            </Suspense>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
