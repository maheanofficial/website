import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import AdSenseScript from './components/AdSenseScript'
import CookieConsent from './components/CookieConsent'
import ErrorBoundary from './components/ErrorBoundary'
import { trackVisit } from './utils/analyticsManager'
import { getStoredTheme, initTheme } from './utils/theme'

// Pages
import HomePage from './pages/HomePage'
import AudiobooksPage from './pages/AudiobooksPage'
import SkillsPage from './pages/SkillsPage'
import ContactPage from './pages/ContactPage'
import StoriesPage from './pages/StoriesPage'
import StoryPartsPage from './pages/StoryPartsPage'
import StoryDetailsPage from './pages/StoryDetailsPage'
import SubmitStoryPage from './pages/SubmitStoryPage'
import SignupPage from './pages/SignupPage'
import AdminPage from './pages/AdminPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import DisclaimerPage from './pages/DisclaimerPage'
import AboutPage from './pages/AboutPage'
import LinksPage from './pages/LinksPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import UpdatePasswordPage from './pages/UpdatePasswordPage'
import SeriesPage from './pages/SeriesPage'
import AuthorsPage from './pages/AuthorsPage'
import CategoriesPage from './pages/CategoriesPage'
import TagsPage from './pages/TagsPage'
import NotFoundPage from './pages/NotFoundPage'

import ScrollToTop from './components/ScrollToTop'
import './index.css'

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  // Check if current path starts with /admin or /dashboard (legacy) or /author/dashboard (legacy)
  const isAdminRoute = location.pathname.startsWith('/admin')
    || location.pathname.startsWith('/dashboard')
    || location.pathname.startsWith('/author/dashboard');
  const isAuthRoute = location.pathname === '/login'
    || location.pathname === '/signup'
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
  }, [])

  return (
    <ErrorBoundary>
      <Router>
        <ScrollToTop />
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/audiobooks" element={<AudiobooksPage />} />
            <Route path="/stories" element={<StoriesPage />} />
            <Route path="/series" element={<SeriesPage />} />
            <Route path="/authors" element={<AuthorsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/tags" element={<TagsPage />} />
            <Route path="/stories/:id/part/:partNumber" element={<StoryDetailsPage />} />
            <Route path="/stories/:id" element={<StoryPartsPage />} />
            <Route path="/login" element={<SubmitStoryPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/update-password" element={<UpdatePasswordPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/admin/dashboard/*" element={<AdminPage />} />
            <Route path="/author/dashboard/*" element={<Navigate to="/admin/dashboard" replace />} />
            {/* Redirect legacy routes if needed or just remove them. Keeping them for safety but pointing to AdminPage which handles routing or simply removing them if we want strict paths. */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/skills" element={<SkillsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/disclaimer" element={<DisclaimerPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/links" element={<LinksPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Layout>
      </Router>
    </ErrorBoundary>
  )
}

export default App
