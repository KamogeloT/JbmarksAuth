import { useState, useCallback } from 'react'
import { storageService } from '../services/storageService'
import { ITTicket } from '../types'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { apiFetch } from '../services/api'

interface TrackTicketProps {
  onBack: () => void
}

/**
 * Clean Bitrix BBCode and emoji codes from comment text
 */
function cleanComment(text: string): string {
  return text
    // Strip HTML tags
    .replace(/<[^>]+>/g, '')
    // Convert [USER=id]Name[/USER] → just the name
    .replace(/\[USER=\d+\]([^[]*)\[\/USER\]/g, '$1')
    // Remove remaining BBCode tags like [b], [i], [url], etc.
    .replace(/\[[A-Z]+(?:=[^\]]*)?]/gi, '')
    .replace(/\[\/[A-Z]+]/gi, '')
    // Convert emoji hex codes like :f09f94a7: to actual emoji
    .replace(/:([0-9a-f]{8}):/g, (_match, hex) => {
      try {
        const codePoint = parseInt(hex.substring(0, 4), 16)
        return String.fromCodePoint(codePoint)
      } catch { return '' }
    })
    // Remove remaining :emoji: style codes
    .replace(/:[a-f0-9]+:/g, '')
    // Clean up "Observers added:" system messages
    .replace(/Observers added:.*$/gm, '')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  '2': { label: 'New — Logged', color: '#3b82f6', bg: 'bg-blue-50 text-blue-700' },
  '3': { label: 'In Progress', color: '#F9A825', bg: 'bg-yellow-50 text-yellow-700' },
  '4': { label: 'Awaiting Your Response', color: '#8b5cf6', bg: 'bg-purple-50 text-purple-700' },
  '5': { label: 'Resolved', color: '#1B5E20', bg: 'bg-green-50 text-green-700' },
  '6': { label: 'On Hold', color: '#6b7280', bg: 'bg-gray-100 text-gray-700' },
}

interface LiveStatus {
  id: string
  title: string
  status: string
  responsible: string
  deadline: string | null
  createdDate: string | null
  commentsCount: string
}

interface Comment {
  id: string
  authorName: string
  text: string
  date: string
}

export function TrackTicket({ onBack }: TrackTicketProps) {
  const [refInput, setRefInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [liveStatus, setLiveStatus] = useState<LiveStatus | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [error, setError] = useState('')
  const [localTickets] = useState<ITTicket[]>(storageService.getAllTickets().filter(t => t.taskId))

  const lookupTicket = async (taskId: string, silent = false) => {
    // On a silent background refresh, don't clear the view or flash the spinner.
    if (!silent) {
      setLoading(true)
      setError('')
      setLiveStatus(null)
      setComments([])
    }

    try {
      // Ownership is enforced server-side: requesters can only fetch their own tickets.
      const resp = await apiFetch(`/api/tickets/${taskId}`)
      const data = await resp.json().catch(() => ({}))
      if (resp.status === 403) throw new Error('You can only track your own tickets.')
      if (resp.status === 401) throw new Error('Please sign in again to track tickets.')
      if (!resp.ok) throw new Error(data.message || 'Ticket not found')

      const task = data.ticket
      if (!task) throw new Error('Ticket not found')

      setLiveStatus({
        id: task.id,
        title: task.title || '',
        status: task.status || '2',
        responsible: (!task.responsibleId || task.responsibleId === '1') ? 'Unassigned — Awaiting technician' : (task.responsible?.name || 'IT Support'),
        deadline: task.deadline || null,
        createdDate: task.createdDate || null,
        commentsCount: task.commentsCount || '0',
      })
      setWatchingTaskId(taskId)

      // Comments come inline with the ticket from the proxy (if present)
      if (!silent) setLoadingComments(true)
      try {
        const rawComments = task.comments || []
        const parsed: Comment[] = rawComments.map((c: any) => ({
          id: c.ID || c.id || '',
          authorName: c.AUTHOR_NAME || c.author?.name || `User ${c.AUTHOR_ID || c.authorId || ''}`,
          text: c.POST_MESSAGE || c.postMessage || c.POST_MESSAGE_HTML || '',
          date: c.POST_DATE || c.createdDate || '',
        }))
        setComments(parsed)
      } finally {
        if (!silent) setLoadingComments(false)
      }
    } catch (e: any) {
      // On silent refresh, keep the last known state instead of showing an error.
      if (!silent) setError(e.message || 'Unable to fetch ticket status')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  // Auto-refresh ticket status/comments every 15s while viewing (silent).
  const [watchingTaskId, setWatchingTaskId] = useState<string | null>(null)

  useAutoRefresh(useCallback(() => {
    if (watchingTaskId) {
      lookupTicket(watchingTaskId, true)
    }
  }, [watchingTaskId]), 15000)

  const handleSearch = () => {
    // Check if the input matches a local ref number
    const local = localTickets.find(t => t.refNumber === refInput.trim() || t.taskId === refInput.trim())
    if (local?.taskId) {
      lookupTicket(local.taskId)
    } else if (/^\d+$/.test(refInput.trim())) {
      // Direct task ID
      lookupTicket(refInput.trim())
    } else {
      setError('Please enter a valid reference number or ticket ID')
    }
  }

  const statusInfo = liveStatus ? STATUS_MAP[liveStatus.status] || STATUS_MAP['2'] : null

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 lg:px-10 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="JBmarks" className="h-8 w-auto" />
          <div>
            <h1 className="text-base font-bold text-gray-900">Track Ticket</h1>
            <p className="text-xs text-gray-500">Check the live status of your IT ticket</p>
          </div>
        </div>
      </header>

      <div className="px-6 lg:px-10 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left column — Search + Recent */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Look up your ticket</h2>
              <p className="text-sm text-gray-500 mb-4">Enter reference number or ticket ID</p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={refInput}
                  onChange={e => setRefInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
                  placeholder="IT-12345678 or ticket ID"
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-medium/30 focus:border-brand-medium outline-none"
                />
                <button
                  onClick={handleSearch}
                  disabled={loading || !refInput.trim()}
                  className="px-6 py-3 bg-brand-dark text-white rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-brand-medium transition-colors"
                >
                  {loading ? '...' : 'Track'}
                </button>
              </div>
              {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
            </div>

            {/* Recent tickets */}
            {localTickets.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Recent Tickets</h3>
                <div className="space-y-2">
                  {localTickets.slice(0, 8).map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setRefInput(t.taskId || t.refNumber); if (t.taskId) lookupTicket(t.taskId) }}
                      className="w-full text-left bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{t.subject || t.category}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{t.refNumber} • {new Date(t.createdAt).toLocaleDateString('en-ZA')}</p>
                      </div>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column — Live Status (takes 2 cols) */}
          <div className="lg:col-span-2">
            {liveStatus && statusInfo ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Status bar */}
                <div className="px-6 py-4 border-b border-gray-100" style={{ backgroundColor: statusInfo.color + '10' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Ticket #{liveStatus.id}</p>
                      <h3 className="text-lg font-bold text-gray-900 mt-0.5">{liveStatus.title.replace(/^IT:\s*/i, '')}</h3>
                    </div>
                    <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${statusInfo.bg}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                {/* Progress indicator */}
                <div className="px-6 py-6">
                  <div className="flex items-center justify-between mb-8 max-w-md mx-auto">
                    {['Logged', 'In Progress', 'Resolved'].map((step, i) => {
                      const stepStatuses = [['2'], ['3', '4'], ['5']]
                      const isActive = stepStatuses[i].includes(liveStatus.status)
                      const isPast = i === 0 ? true : i === 1 ? ['3', '4', '5'].includes(liveStatus.status) : liveStatus.status === '5'
                      return (
                        <div key={step} className="flex flex-col items-center flex-1">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold mb-2 ${
                            isActive ? 'bg-brand-dark text-white' : isPast ? 'bg-brand-light text-white' : 'bg-gray-200 text-gray-500'
                          }`}>
                            {isPast && !isActive ? '✓' : i + 1}
                          </div>
                          <span className={`text-xs font-medium ${isActive ? 'text-brand-dark' : 'text-gray-500'}`}>{step}</span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Details grid */}
                  <div className="grid sm:grid-cols-2 gap-4 border-t border-gray-100 pt-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">Assigned Technician</p>
                      <p className="text-sm font-bold text-brand-dark">{liveStatus.responsible}</p>
                    </div>
                    {liveStatus.createdDate && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-500 mb-1">Logged On</p>
                        <p className="text-sm font-medium text-gray-900">{new Date(liveStatus.createdDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    )}
                    {liveStatus.deadline && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-500 mb-1">Target Resolution</p>
                        <p className={`text-sm font-medium ${new Date(liveStatus.deadline) < new Date() && liveStatus.status !== '5' ? 'text-red-600' : 'text-gray-900'}`}>
                          {new Date(liveStatus.deadline).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">Updates</p>
                      <p className="text-sm font-medium text-gray-900">{liveStatus.commentsCount} comment{liveStatus.commentsCount !== '1' ? 's' : ''}</p>
                    </div>
                  </div>
                </div>

                {/* Comments */}
                {(comments.length > 0 || loadingComments) && (
                  <div className="px-6 py-5 border-t border-gray-100">
                    <h4 className="text-sm font-bold text-gray-900 mb-3">Updates & Comments</h4>
                    {loadingComments ? (
                      <p className="text-sm text-gray-400">Loading comments...</p>
                    ) : (
                      <div className="space-y-3 max-h-[300px] overflow-y-auto">
                        {comments.map(c => (
                          <div key={c.id} className="bg-gray-50 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-gray-800">{c.authorName}</span>
                              <span className="text-[10px] text-gray-400">{c.date ? new Date(c.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{cleanComment(c.text)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <div className="text-5xl mb-4">🔍</div>
                <p className="text-lg font-medium text-gray-600">Enter a ticket ID to see its live status</p>
                <p className="text-sm text-gray-400 mt-1">Or click one of your recent tickets on the left</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
