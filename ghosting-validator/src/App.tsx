import './App.css'
import { useState } from 'react'
import { LandingPage } from './components/LandingPage'
import ChatParser from './components/ChatParser'
import { WhatsAppParser } from './utils/whatsappParser'
import type { WhatsAppMessage } from './utils/whatsappParser'

function App() {
  const [messages, setMessages] = useState<WhatsAppMessage[] | null>(null)
  const [stats, setStats] = useState<any>(null)

  const handleFileSelected = async (file: File) => {
    try {
      const text = await file.text()
      const parsedMessages = WhatsAppParser.parseChat(text)
      const chatStats = WhatsAppParser.getStats(parsedMessages)
      setMessages(parsedMessages)
      setStats(chatStats)
    } catch (error) {
      alert('Error parsing chat file. Please make sure it\'s a valid WhatsApp export.')
    }
  }

  if (!messages || !stats) {
    return (
      <LandingPage
        onFileSelected={handleFileSelected}
        tagline="Decode your chat. Discover your fate. Have a laugh."
      />
    )
  }

  return <ChatParser messages={messages} stats={stats} />
}

export default App
