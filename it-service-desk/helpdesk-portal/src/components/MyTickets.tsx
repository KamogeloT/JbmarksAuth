import { useState, useEffect } from 'react'
import { storageService } from '../services/storageService'
import { ITTicket } from '../types'

interface MyTicketsProps {
  onBack: () => void
  onTrack?: () => void
}

export function MyTickets({ onBack, onTrack }: MyTicketsProps) {
  const [tickets, setTickets] = useState<ITTicket[]>([])
  const [filter, setFilter] = useState<'all' | 'submitted' | 'failed' | 'pending'>('all')

  useEffect(() => {
    setTickets(storageService.getAllTickets())
  }, [])

  const filtered = tickets.filter(t => filter === 'all' || t.status === filter)

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      submitted: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      draft: 'bg-gray-100 text-gray-600',
    }
    return styles[status] || styles.draft
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 lg:px-10 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="JBmarks" className="h-8 w-auto" />
            <div>
              <h1 className="text-base font-bold text-gray-900">My Tickets</h1>
              <p className="text-xs text-gray-500">{tickets.length} total</p>
            </div>
          </div>
        </div>
        {onTrack && (
          <button onClick={onTrack} className="px-4 py-2 bg-brand-dark text-white rounded-lg text-sm font-medium hover:bg-brand-medium transition-colors">
            Track Live Status
          </button>
        )}
      </header>

      {/* Filter tabs */}
      <div className="bg-white border-b border-gray-100 px-6 lg:px-10 py-3 flex gap-2 overflow-x-auto">
        {(['all', 'submitted', 'failed', 'pending'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
              filter === f
                ? 'bg-brand-dark text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({f === 'all' ? tickets.length : tickets.filter(t => t.status === f).length})
          </button>
        ))}
      </div>

      <div className="px-6 lg:px-10 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-lg font-medium text-gray-600">No tickets yet</p>
            <p className="text-sm text-gray-400 mt-1">Submitted tickets will appear here</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map(ticket => (
              <div key={ticket.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{ticket.refNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusBadge(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-base">{ticket.subject || ticket.category}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{ticket.category} • {ticket.department}</p>
                  </div>
                  <div className="text-right text-xs text-gray-400 flex-shrink-0">
                    <p>{new Date(ticket.createdAt).toLocaleDateString('en-ZA')}</p>
                    <p>{new Date(ticket.createdAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                {ticket.error && (
                  <div className="mt-3 bg-red-50 border border-red-100 rounded-lg p-2 text-xs text-red-600">
                    {ticket.error.substring(0, 120)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
