import { config } from '../config'
import { AuthUser } from '../hooks/useAuth'

interface HomePageProps {
  onNavigate: (view: 'home' | 'new-ticket' | 'my-tickets' | 'track') => void
  user: AuthUser | null
  onLogout: () => void
}

export function HomePage({ onNavigate, user, onLogout }: HomePageProps) {
  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 lg:px-10 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="JBmarks" className="h-10 w-auto" />
          <div>
            <h1 className="text-lg font-bold text-brand-dark">IT Helpdesk</h1>
            <p className="text-xs text-gray-500">Service Delivery in Motion</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('my-tickets')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            My Tickets
          </button>
          {user && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-dark text-white flex items-center justify-center text-xs font-bold">
                {user.name?.[0]}{user.lastName?.[0]}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">{user.name} {user.lastName}</span>
            </div>
          )}
          <button onClick={onLogout} className="text-xs text-gray-500 hover:text-gray-700 hidden sm:inline">Sign out</button>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-dark via-brand-medium to-primary-400 text-white px-6 lg:px-10 py-16">
        <div className="max-w-3xl">
          <h2 className="text-4xl lg:text-5xl font-bold leading-tight">Need IT Support?</h2>
          <p className="text-lg text-white/80 mt-3 max-w-xl">Log your issue and our IT team will respond within the SLA timeframe. Track your ticket status in real time.</p>
          <div className="flex flex-wrap gap-3 mt-8">
            <button
              onClick={() => onNavigate('new-ticket')}
              className="bg-white text-brand-dark px-6 py-3 rounded-xl font-bold text-base hover:bg-gray-100 transition-colors shadow-lg"
            >
              Log New Ticket
            </button>
            <button
              onClick={() => onNavigate('track')}
              className="bg-white/10 backdrop-blur-sm text-white border border-white/30 px-6 py-3 rounded-xl font-bold text-base hover:bg-white/20 transition-colors"
            >
              Track My Ticket
            </button>
            <button
              onClick={() => onNavigate('my-tickets')}
              className="bg-white/10 backdrop-blur-sm text-white border border-white/30 px-6 py-3 rounded-xl font-bold text-base hover:bg-white/20 transition-colors"
            >
              View History
            </button>
          </div>
        </div>
      </div>

      {/* Categories grid */}
      <div className="px-6 lg:px-10 py-12">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">What do you need help with?</h3>
        <p className="text-gray-500 mb-8">Select a category to get started</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {config.categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => onNavigate('new-ticket')}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center hover:shadow-lg hover:border-brand-light hover:-translate-y-1 transition-all duration-200 group"
            >
              <span className="text-4xl block mb-3 group-hover:scale-110 transition-transform">{cat.icon}</span>
              <p className="text-sm font-semibold text-gray-800">{cat.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* SLA info */}
      <div className="px-6 lg:px-10 pb-12">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Response Times (SLA)</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {config.priorities.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-4 rounded-xl bg-gray-50">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }}></div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{p.label}</p>
                  <p className="text-xs text-gray-500">{p.deadline}h response target</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white px-6 lg:px-10 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="h-6 w-auto opacity-50" />
            <span>JBmarks IT Helpdesk v{config.app.version}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Urgent? Call <a href={`tel:${config.app.supportPhone}`} className="text-brand-dark font-medium">{config.app.supportPhone}</a></span>
            <span>•</span>
            <a href={`mailto:${config.app.supportEmail}`} className="text-brand-dark font-medium">{config.app.supportEmail}</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
