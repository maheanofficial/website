import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import AdSenseScript from './components/AdSenseScript';
import CookieConsent from './components/CookieConsent';
import ErrorBoundary from './components/ErrorBoundary';
import { trackVisit } from './utils/analyticsManager';
import { getStoredTheme, initTheme } from './utils/theme';
import { getCurrentUser, onAuthStateChange } from './utils/auth';
import { hydrateReaderStateFromCloud, queueReaderStateSync } from './utils/readerStateManager';

import HomePage from './pages/HomePage';

import ScrollToTop from './components/ScrollToTop';
import './index.css';

const AboutPage = lazy(() => import('./pages/AboutPage'));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AdminSignupPage = lazy(() => import('./pages/AdminSignupPage'));
const AudiobooksPage = lazy(() => import('./pages/AudiobooksPage'));
const AuthorsPage = lazy(() => import('./pages/AuthorsPage'));
const AuthorProfilePage = lazy(() => import('./pages/AuthorProfilePage'));
const AuthorPortalPage = lazy(() => import('./pages/AuthorPortalPage'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const DisclaimerPage = lazy(() => import('./pages/DisclaimerPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const LinksPage = lazy(() => import('./pages/LinksPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SeriesPage = lazy(() => import('./pages/SeriesPage'));
const SeriesDetailPage = lazy(() => import('./pages/SeriesDetailPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const SkillsPage = lazy(() => import('./pages/SkillsPage'));
const StoriesPage = lazy(() => import('./pages/StoriesPage'));
const StoryDetailsPage = lazy(() => import('./pages/StoryDetailsPage'));
const StoryPartsPage = lazy(() => import('./pages/StoryPartsPage'));
const SubmitStoryPage = lazy(() => import('./pages/SubmitStoryPage'));
const TagsPage = lazy(() => import('./pages/TagsPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const UpdatePasswordPage = lazy(() => import('./pages/UpdatePasswordPage'));

const AdminFallback = () => (
  <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
    Loading...
  </div>
);

const DashboardRedirect = ({ defaultTarget = '/profile' }: { defaultTarget?: string }) => {
  const [targetPath, setTargetPath] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    void getCurrentUser()
      .then((user) => {
        if (!isMounted) return;
        const isStaff = user?.role === 'admin' || user?.role === 'moderator';
        setTargetPath(isStaff ? '/admin/dashboard' : defaultTarget);
      })
      .catch(() => {
        if (!isMounted) return;
        setTargetPath(defaultTarget);
      });

    return () => {
      isMounted = false;
    };
  }, [defaultTarget]);

  if (!targetPath) {
    return <AdminFallback />;
  }

  return <Navigate to={targetPath} replace />;
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin')
    || location.pathname.startsWith('/dashboard')
    || location.pathname.startsWith('/author/dashboard')
    || location.pathname.startsWith('/author-portal');
  const isAuthRoute = location.pathname === '/login'
    || location.pathname === '/signup'
    || location.pathname === '/admin/login'
    || location.pathname === '/admin/signup'
    || location.pathname === '/forgot-password'
    || location.pathname === '/update-password';

  return (
    <>
      {!isAdminRoute && !isAuthRoute && <AdSenseScript />}
      {!isAdminRoute && <Header />}
      <main>
        {children}
      </main>
      {!isAdminRoute && <Footer />}
      {!isAdminRoute && !isAuthRoute && <CookieConsent />}
    </>
  );
};

function App() {
  useEffect(() => {
    initTheme(getStoredTheme());
    void trackVisit();
  }, []);

  useEffect(() => {
    let activeUserId = '';
    let syncIntervalId: number | null = null;
    let isMounted = true;

    const clearSyncInterval = () => {
      if (syncIntervalId) {
        window.clearInterval(syncIntervalId);
        syncIntervalId = null;
      }
    };

    const startSyncForUser = async (userId?: string) => {
      const normalizedUserId = String(userId || '').trim();
      clearSyncInterval();
      activeUserId = normalizedUserId;
      if (!normalizedUserId) return;
      await hydrateReaderStateFromCloud(normalizedUserId);
      if (!isMounted) return;
      syncIntervalId = window.setInterval(() => {
        queueReaderStateSync(normalizedUserId);
      }, 20_000);
    };

    void getCurrentUser()
      .then((user) => startSyncForUser(user?.id))
      .catch(() => undefined);

    const subscription = onAuthStateChange((_event, session) => {
      void startSyncForUser(session?.user?.id);
    });

    const flushSync = () => {
      if (activeUserId) {
        queueReaderStateSync(activeUserId);
      }
    };

    window.addEventListener('beforeunload', flushSync);

    return () => {
      isMounted = false;
      clearSyncInterval();
      window.removeEventListener('beforeunload', flushSync);
      subscription?.unsubscribe?.();
    };
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <ScrollToTop />
        <Layout>
          <Suspense fallback={<AdminFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/audiobooks" element={<AudiobooksPage />} />
              <Route path="/stories" element={<StoriesPage />} />
              <Route path="/series" element={<SeriesPage />} />
              <Route path="/series/:slug" element={<SeriesDetailPage />} />
              <Route path="/authors" element={<AuthorsPage />} />
              <Route path="/author/:username" element={<AuthorProfilePage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/tags" element={<TagsPage />} />
              <Route path="/stories/:id/s/:seasonNum/part/:partNumber" element={<StoryDetailsPage />} />
              <Route path="/stories/:id/:partNumber" element={<StoryDetailsPage />} />
              <Route path="/stories/:id/part/:partNumber" element={<StoryDetailsPage />} />
              <Route path="/stories/:id" element={<StoryPartsPage />} />
              <Route path="/login" element={<SubmitStoryPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/update-password" element={<UpdatePasswordPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/admin/signup" element={<AdminSignupPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/admin/dashboard/*" element={<AdminPage />} />
              <Route path="/author-portal/*" element={<AuthorPortalPage />} />
              <Route path="/author/dashboard/*" element={<DashboardRedirect defaultTarget="/profile" />} />
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/dashboard/*" element={<DashboardRedirect defaultTarget="/profile" />} />
              <Route path="/user/dashboard/*" element={<DashboardRedirect defaultTarget="/profile" />} />
              <Route path="/skills" element={<SkillsPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/disclaimer" element={<DisclaimerPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/links" element={<LinksPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
