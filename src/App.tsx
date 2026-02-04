import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import ErrorBoundary from './components/ErrorBoundary'
import { trackVisit } from './utils/analyticsManager'

// Pages
import SubmitStoryPage from './pages/SubmitStoryPage'

// ... imports

<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/audiobooks" element={<AudiobooksPage />} />
  <Route path="/stories" element={<StoriesPage />} />
  <Route path="/stories/:id" element={<StoryDetailsPage />} />
  <Route path="/submit-story" element={<SubmitStoryPage />} />
  <Route path="/admin" element={<AdminPage />} />
  <Route path="/skills" element={<SkillsPage />} />
  <Route path="/contact" element={<ContactPage />} />
  <Route path="/privacy" element={<PrivacyPage />} />
  <Route path="/terms" element={<TermsPage />} />
  <Route path="/about" element={<AboutPage />} />
  <Route path="/links" element={<LinksPage />} />
</Routes>
        </main >
  <Footer />
      </Router >
    </ErrorBoundary >
  )
}

export default App
