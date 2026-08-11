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
import PageSkeleton from './components/PageSkeleton';

import ScrollToTop from './components/ScrollToTop';
import BackToTop from './components/BackToTop';
import ReadingProgress from './components/ReadingProgress';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import OfflineBanner from './components/OfflineBanner';
import { ToastProvider } from './components/Toast';
import './index.css';

const AboutPage = lazy(() => import('./pages/AboutPage'));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AdminSignupPage = lazy(() => import('./pages/AdminSignupPage'));
const AudiobooksPage = lazy(() => import('./pages/AudiobooksPage'));
const AuthorsPage = lazy(() => import('./pages/AuthorsPage'));
const AuthorProfilePage = lazy(() => import('./pages/AuthorProfilePage'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const DisclaimerPage = lazy(() => import('./pages/DisclaimerPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const LinksPage = lazy(() => import('./pages/LinksPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SeriesPage = lazy(() => import('./pages/SeriesPage'));
const ReaderLoginPage = lazy(() => import('./pages/ReaderLoginPage'));
const ReaderSignupPage = lazy(() => import('./pages/ReaderSignupPage'));
const SkillsPage = lazy(() => import('./pages/SkillsPage'));
const StoriesPage = lazy(() => import('./pages/StoriesPage'));
const StoryDetailsPage = lazy(() => import('./pages/StoryDetailsPage'));
const StoryPartsPage = lazy(() => import('./pages/StoryPartsPage'));
const SubmitStoryPage = lazy(() => import('./pages/SubmitStoryPage'));
const TagsPage = lazy(() => import('./pages/TagsPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const UpdatePasswordPage = lazy(() => import('./pages/UpdatePasswordPage'));
const WriterDashboard = lazy(() => import('./pages/WriterDashboard'));

const PageLoadingFallback = () => <PageSkeleton />;

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
    return <PageLoadingFallback />;
  }

  return <Navigate to={targetPath} replace />;
};

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    trackVisit();
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200">
      <Header />
      <main id="main-content">{children}</main>
      <Footer />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    initTheme(getStoredTheme());
    trackVisit();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const syncState = async () => {
      const user = await getCurrentUser();
      if (!isMounted) return;
      if (user?.id) {
        await hydrateReaderStateFromCloud(user.id);
      }
    };
    void syncState();

    const sub = onAuthStateChange((_evt, session) => {
      if (session?.user?.id) {
        queueReaderStateSync(session.user.id);
      }
    });

    return () => {
      isMounted = false;
      sub?.unsubscribe?.();
    };
  }, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <Router>
          <AdSenseScript />
          <ScrollToTop />
          <ReadingProgress />
          <BackToTop />
          <CookieConsent />
          <PwaInstallPrompt />
          <OfflineBanner />
          <Layout>
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/audiobooks" element={<AudiobooksPage />} />
                <Route path="/stories" element={<StoriesPage />} />
                <Route path="/stories/:id" element={<StoryDetailsPage />} />
                <Route path="/stories/:id/part/:partNumber" element={<StoryDetailsPage />} />
                <Route path="/stories/:id/:partNumber" element={<StoryDetailsPage />} />
                <Route path="/story-parts/:id" element={<StoryPartsPage />} />
                <Route path="/series" element={<SeriesPage />} />
                <Route path="/authors" element={<AuthorsPage />} />
                <Route path="/authors/:id" element={<AuthorProfilePage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/tags" element={<TagsPage />} />
                <Route path="/submit" element={<SubmitStoryPage />} />
                <Route path="/login" element={<Navigate to="/reader/login" replace />} />
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/update-password" element={<UpdatePasswordPage />} />
                <Route path="/signup" element={<Navigate to="/reader/signup" replace />} />
                <Route path="/admin/signup" element={<AdminSignupPage />} />
                <Route path="/reader/login" element={<ReaderLoginPage />} />
                <Route path="/reader/signup" element={<ReaderSignupPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/writer/dashboard" element={<WriterDashboard />} />
                <Route path="/reader/dashboard" element={<Navigate to="/profile" replace />} />
                <Route path="/admin/dashboard/*" element={<AdminPage />} />
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
      </ToastProvider>
    </ErrorBoundary>
  );
}
