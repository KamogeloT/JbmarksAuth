import { useState } from 'react'
import { TicketForm } from './components/TicketForm'
import { MyTickets } from './components/MyTickets'
import { HomePage } from './components/HomePage'
import { TrackTicket } from './components/TrackTicket'
import { LoginPage } from './components/LoginPage'
import { useAuth } from './hooks/useAuth'

type View = 'home' | 'new-ticket' | 'my-tickets' | 'track'

function App() {
  const { isAuthenticated, user, loading, error, startLogin, logout } = useAuth()
  const [view, setView] = useState<View>('home')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8faf8]">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.png" alt="" className="w-14 h-14 rounded-2xl shadow-md" />
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-brand-dark"></div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage onSignIn={startLogin} error={error} />
  }

  return (
    <div className="min-h-screen bg-[#f8faf8]">
      {view === 'home' && <HomePage onNavigate={setView} user={user} onLogout={logout} />}
      {view === 'new-ticket' && <TicketForm onBack={() => setView('home')} onSuccess={() => setView('my-tickets')} user={user} />}
      {view === 'my-tickets' && <MyTickets onBack={() => setView('home')} onTrack={() => setView('track')} />}
      {view === 'track' && <TrackTicket onBack={() => setView('my-tickets')} />}
    </div>
  )
}

export default App
