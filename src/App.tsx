import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import ErrorBoundary from './components/ErrorBoundary'
import { trackVisit } from './utils/analyticsManager'

// Pages
import HomePage from './pages/HomePage'
import AudiobooksPage from './pages/AudiobooksPage'
import SkillsPage from './pages/SkillsPage'
import ContactPage from './pages/ContactPage'
import StoriesPage from './pages/StoriesPage'
import StoryDetailsPage from './pages/StoryDetailsPage'
import SubmitStoryPage from './pages/SubmitStoryPage'
import SignupPage from './pages/SignupPage'
import AdminPage from './pages/AdminPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import AboutPage from './pages/AboutPage'
import LinksPage from './pages/LinksPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import UpdatePasswordPage from './pages/UpdatePasswordPage'

import ScrollToTop from './components/ScrollToTop'
import './index.css'

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  // Check if current path starts with /admin or /dashboard
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/dashboard');

  return (
    <>
      {!isAdminRoute && <Header />}
      <main>
        {children}
      </main>
      {!isAdminRoute && <Footer />}
    </>
  );
};



function App() {
  useEffect(() => {
    trackVisit();
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
            <Route path="/stories/:id" element={<StoryDetailsPage />} />
            <Route path="/login" element={<SubmitStoryPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/update-password" element={<UpdatePasswordPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/dashboard" element={<AdminPage />} />
            <Route path="/skills" element={<SkillsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/links" element={<LinksPage />} />
          </Routes>
        </Layout>
      </Router>
    </ErrorBoundary>
  )
}

export default App
