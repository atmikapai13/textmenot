import './App.css'
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage.tsx'
import { TutorialPage } from './pages/TutorialPage.tsx'
import { LoadingPage } from './pages/LoadingPage.tsx'
import ChatParser from './components/ChatParser'
import Dashboard from './pages/Dashboard.tsx'
import { useEffect } from 'react'
import { trackPageView, initGA } from './utils/analytics'

// Component to track page views
function PageTracker() {
  const location = useLocation();
  
  useEffect(() => {
    // Initialize GA on first load
    initGA();
  }, []);
  
  useEffect(() => {
    // Track page view on route change
    trackPageView(location.pathname);
  }, [location]);

  return null;
}

function LandingPageWithNav() {
  const navigate = useNavigate()
  return <LandingPage onNext={() => navigate('/tutorial')} />
}

function TutorialPageWithNav() {
  const navigate = useNavigate()
  return <TutorialPage onNext={() => navigate('/loading')} />
}

function App() {
  return (
    <Router basename="/ghosting_validator">
      <PageTracker />
      <Routes>
        <Route path="/" element={<LandingPageWithNav />} />
        <Route path="/tutorial" element={<TutorialPageWithNav />} />
        <Route path="/loading" element={<LoadingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chatparser" element={<ChatParser />} />
      </Routes>
    </Router>
  )
}

export default App
