import './App.css'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage.tsx'
import { TutorialPage } from './pages/TutorialPage.tsx'
import { LoadingPage } from './pages/LoadingPage.tsx'
import ChatParser from './components/ChatParser'
import { Dashboard } from './pages/Dashboard'

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
