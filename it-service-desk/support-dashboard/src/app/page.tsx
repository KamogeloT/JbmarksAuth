'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { sdimApi, SDiMTask, SDiMUser, TICKET_STATUS_MAP, TICKET_STATUS_COLORS, PRIORITY_MAP } from '@/lib/sdim-api'
import { TicketQueue } from '@/components/TicketQueue'
import { TicketDetail } from '@/components/TicketDetail'
import { DashboardOverview } from '@/components/DashboardOverview'
import { LoginPage } from '@/components/LoginPage'
import { isBefore } from 'date-fns'

type View = 'overview' | 'queue' | 'detail'

export default function Home() {
  const { isAuthenticated, user, loading, login, logout } = useAuth()
  const [view, setView] = useState<View>('overview')
  const [tickets, setTickets] = useState<SDiMTask[]>([])
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const fetchTickets = async () => {
    setLoadingTickets(true)
    try {
      const all = await sdimApi.getAllTickets()
      setTickets(all)
    } catch (e) {
      console.error('Failed to fetch tickets:', e)
    } finally {
      setLoadingTickets(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) fetchTickets()
  }, [isAuthenticated])

  // Auto-refresh every 30 seconds
  useAutoRefresh(useCallback(() => {
    if (isAuthenticated) {
      sdimApi.getAllTickets().then(setTickets).catch(console.error)
    }
  }, [isAuthenticated]), 30000)

  const openTicket = (id: string) => {
    setSelectedTicketId(id)
    setView('detail')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.png" alt="" className="w-14 h-14 rounded-2xl shadow-ios" />
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-brand-dark"></div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={login} />
  }

  // Stats
  const now = new Date()
  const openTickets = tickets.filter(t => t.status !== '5' && t.status !== '6')
  const newTickets = tickets.filter(t => t.status === '2')
  const inProgressTickets = tickets.filter(t => t.status === '3')
  const resolvedTickets = tickets.filter(t => t.status === '5')
  const overdueTickets = openTickets.filter(t => t.deadline && isBefore(new Date(t.deadline), now))

  const navItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'queue', label: 'Ticket Queue', icon: '📋' },
  ]

  const externalLinks = [
    { label: 'Network Monitor', icon: '📡', url: 'https://polite-hill-057872e0f.7.azurestaticapps.net' },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f5f7]">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex w-[240px] bg-white/95 backdrop-blur-2xl border-r border-ios-separator flex-col">
        <div className="p-5 flex items-center gap-3">
          <img src="/logo.png" alt="" className="w-9 h-9 rounded-[10px] shadow-ios bg-white p-0.5" />
          <div>
            <h1 className="text-[14px] font-semibold text-ios-label">IT Support</h1>
            <p className="text-[11px] text-ios-secondary">Dashboard</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-2">
          <ul className="space-y-1">
            {navItems.map(item => (
              <li key={item.id}>
                <button
                  onClick={() => { setView(item.id as View); setSelectedTicketId(null) }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    view === item.id || (item.id === 'queue' && view === 'detail')
                      ? 'bg-brand-dark text-white shadow-ios'
                      : 'text-ios-label hover:bg-gray-100/80'
                  }`}
                >
                  <span className="text-[16px]">{item.icon}</span>
                  <span className="font-medium text-[13px]">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="px-3 text-[10px] font-semibold text-ios-tertiary uppercase tracking-wider mb-2">Tools</p>
            <ul className="space-y-1">
              {externalLinks.map(link => (
                <li key={link.label}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-ios-label hover:bg-gray-100/80 transition-all"
                  >
                    <span className="text-[16px]">{link.icon}</span>
                    <span className="font-medium text-[13px]">{link.label}</span>
                    <span className="ml-auto text-[10px] text-ios-tertiary">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
        <div className="p-4 mx-3 mb-3 rounded-2xl bg-primary-50/60">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-medium animate-pulse"></span>
            <p className="text-[11px] font-medium text-brand-medium">Connected</p>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-[240px] h-full bg-white flex flex-col">
            <div className="p-5 flex items-center gap-3">
              <img src="/logo.png" alt="" className="w-9 h-9 rounded-[10px]" />
              <h1 className="text-[14px] font-semibold">IT Support</h1>
            </div>
            <nav className="flex-1 px-3">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setView(item.id as View); setSelectedTicketId(null); setMobileMenuOpen(false) }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left mb-1 ${
                    view === item.id ? 'bg-brand-dark text-white' : 'text-gray-700'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="text-[13px] font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white/60 backdrop-blur-2xl border-b border-ios-separator px-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <p className="text-[11px] text-ios-secondary font-medium uppercase tracking-wider">IT Support</p>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-ios-label hidden sm:inline">{user.NAME} {user.LAST_NAME}</span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-medium to-brand-dark text-white flex items-center justify-center text-[12px] font-bold">
                  {user.NAME?.[0]}{user.LAST_NAME?.[0]}
                </div>
              </div>
            )}
            <button onClick={logout} className="text-[12px] text-ios-secondary hover:text-ios-label px-2 py-1 rounded hidden sm:block">Sign Out</button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {view === 'overview' && (
              <DashboardOverview
                tickets={tickets}
                loading={loadingTickets}
                onViewQueue={() => setView('queue')}
                onTicketClick={openTicket}
              />
            )}
            {view === 'queue' && (
              <TicketQueue
                tickets={tickets}
                loading={loadingTickets}
                onTicketClick={openTicket}
                onRefresh={fetchTickets}
              />
            )}
            {view === 'detail' && selectedTicketId && (
              <TicketDetail
                ticketId={selectedTicketId}
                onBack={() => { setView('queue'); setSelectedTicketId(null) }}
                onRefresh={fetchTickets}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
