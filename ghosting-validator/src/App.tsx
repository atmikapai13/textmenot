import './App.css'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { LandingPage } from './components/LandingPage.tsx'
import { TutorialPage } from './components/TutorialPage.tsx'
import { LoadingPage } from './components/LoadingPage.tsx'
import ChatParser from './components/ChatParser'
import { WhatsAppParser } from './utils/whatsappParser'
import type { WhatsAppMessage } from './utils/whatsappParser'
import { Dashboard } from './components/Dashboard'

function LandingPageWithNav() {
  const navigate = useNavigate()
  return <LandingPage onNext={() => navigate('/tutorial')} />
}

function TutorialPageWithNav() {
  const navigate = useNavigate()
  return <TutorialPage onNext={() => navigate('/loading')} />
}

function App() {
  const [messages, setMessages] = useState<WhatsAppMessage[] | null>(null)
  const [stats, setStats] = useState<any>(null)



  if (!messages || !stats) {
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

  return <ChatParser messages={messages} stats={stats} />
}

export default App
