'use client'

import { useState, useEffect } from 'react'
import { sdimApi, SDiMTask, SDiMUser, TICKET_STATUS_MAP, TICKET_STATUS_COLORS, PRIORITY_MAP, isUnassigned, getAssigneeName, parseCallerInfo } from '@/lib/sdim-api'
import { format } from 'date-fns'

interface Props {
  ticketId: string
  onBack: () => void
  onRefresh: () => void
}

export function TicketDetail({ ticketId, onBack, onRefresh }: Props) {
  const [ticket, setTicket] = useState<SDiMTask | null>(null)
  const [comments, setComments] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<SDiMUser[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState('')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assigningTo, setAssigningTo] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [t, c, members] = await Promise.all([
          sdimApi.getTicket(ticketId),
          sdimApi.getComments(ticketId),
          sdimApi.getTeamMembers(),
        ])
        setTicket(t)
        setComments(c)

        // Fetch full user details for team members
        if (members.length > 0) {
          const userIds = members.map((m: any) => m.USER_ID)
          const users: SDiMUser[] = []
          for (const uid of userIds) {
            try {
              const resp = await fetch(`https://jbmarks.sdinmotion.co.za/rest/1/accwtpjw1vnywkss/user.get.json?ID=${uid}`)
              const data = await resp.json()
              if (data.result?.[0]) users.push(data.result[0])
            } catch { /* skip */ }
          }
          setTeamMembers(users)
        }
      } catch (e) {
        console.error('Failed to load ticket:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [ticketId])

  const handleAction = async (action: string) => {
    setActionLoading(action)
    try {
      switch (action) {
        case 'start': await sdimApi.startTicket(ticketId); break
        case 'complete': await sdimApi.completeTicket(ticketId); break
        case 'defer': await sdimApi.deferTicket(ticketId); break
        case 'reopen': await sdimApi.renewTicket(ticketId); break
      }
      const t = await sdimApi.getTicket(ticketId)
      setTicket(t)
      onRefresh()
    } catch (e) {
      alert('Action failed: ' + (e instanceof Error ? e.message : 'Unknown error'))
    } finally {
      setActionLoading('')
    }
  }

  const handleAssign = async (userId: string) => {
    setAssigningTo(userId)
    try {
      await sdimApi.reassignTicket(ticketId, userId)
      // Add a comment noting the assignment
      const tech = teamMembers.find(u => u.ID === userId)
      const techName = tech ? `${tech.NAME} ${tech.LAST_NAME}` : `User ${userId}`
      await sdimApi.addComment(ticketId, `🔧 Ticket assigned to ${techName}`)

      const t = await sdimApi.getTicket(ticketId)
      setTicket(t)
      const c = await sdimApi.getComments(ticketId)
      setComments(c)
      setShowAssignModal(false)
      onRefresh()
    } catch (e) {
      alert('Assignment failed: ' + (e instanceof Error ? e.message : 'Unknown error'))
    } finally {
      setAssigningTo('')
    }
  }

  const handleComment = async () => {
    if (!newComment.trim()) return
    setSubmitting(true)
    try {
      await sdimApi.addComment(ticketId, newComment)
      setNewComment('')
      const c = await sdimApi.getComments(ticketId)
      setComments(c)
    } catch (e) {
      alert('Failed to add comment')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-brand-dark"></div>
      </div>
    )
  }

  if (!ticket) {
    return <div className="text-center py-12 text-ios-secondary">Ticket not found</div>
  }

  const status = TICKET_STATUS_MAP[ticket.status] || 'New'
  const statusColor = TICKET_STATUS_COLORS[ticket.status] || '#6b7280'

  /** Clean Bitrix BBCode and system text from comments */
  const cleanComment = (text: string): string => {
    return text
      .replace(/<[^>]+>/g, '')
      .replace(/\[USER=\d+\]([^[]*)\[\/USER\]/g, '$1')
      .replace(/\[[A-Z]+(?:=[^\]]*)?]/gi, '')
      .replace(/\[\/[A-Z]+]/gi, '')
      .replace(/:([0-9a-f]{8}):/g, '')
      .replace(/:[a-f0-9]+:/g, '')
      .replace(/Observers added:.*$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-mono text-ios-tertiary">#{ticket.id}</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold" style={{ backgroundColor: statusColor + '20', color: statusColor }}>{status}</span>
            <span className="text-[11px] text-ios-secondary">{PRIORITY_MAP[ticket.priority] || 'Normal'} priority</span>
          </div>
          <h1 className="text-[18px] sm:text-[22px] font-bold text-ios-label mt-1">{ticket.title}</h1>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <div className="card">
            <h3 className="text-[13px] font-semibold text-ios-secondary uppercase tracking-wide mb-3">Description</h3>
            <pre className="text-[13px] text-ios-label whitespace-pre-wrap font-sans leading-relaxed">{ticket.description || 'No description'}</pre>
          </div>

          {/* Comments */}
          <div className="card">
            <h3 className="text-[13px] font-semibold text-ios-secondary uppercase tracking-wide mb-3">Comments ({comments.length})</h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto mb-4">
              {comments.length === 0 && <p className="text-[13px] text-ios-tertiary">No comments yet</p>}
              {comments.map((c, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-semibold text-ios-label">{c.AUTHOR_NAME || c.author?.name || `User ${c.AUTHOR_ID}`}</span>
                    <span className="text-[10px] text-ios-tertiary">{c.POST_DATE || c.createdDate || ''}</span>
                  </div>
                  <p className="text-[12px] text-ios-secondary">{cleanComment(c.POST_MESSAGE || c.postMessage || '')}</p>
                </div>
              ))}
            </div>
            {/* Add comment */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-4 py-2 bg-gray-100 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-brand-medium/30"
                onKeyDown={e => { if (e.key === 'Enter') handleComment() }}
              />
              <button
                onClick={handleComment}
                disabled={submitting || !newComment.trim()}
                className="px-4 py-2 bg-brand-dark text-white rounded-xl text-[13px] font-semibold disabled:opacity-40 hover:bg-brand-medium transition-colors"
              >
                {submitting ? '...' : 'Send'}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Assign Tech */}
          <div className="card">
            <h3 className="text-[13px] font-semibold text-ios-secondary uppercase tracking-wide mb-3">Assigned Technician</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold ${
                isUnassigned(ticket) ? 'bg-red-100 text-red-600' : 'bg-gradient-to-br from-brand-medium to-brand-dark text-white'
              }`}>
                {isUnassigned(ticket) ? '?' : (ticket.responsible?.name ? ticket.responsible.name.split(' ').map(n => n[0]).join('') : '?')}
              </div>
              <div>
                <p className={`text-[14px] font-semibold ${isUnassigned(ticket) ? 'text-red-600' : 'text-ios-label'}`}>
                  {getAssigneeName(ticket)}
                </p>
                <p className="text-[11px] text-ios-secondary">{isUnassigned(ticket) ? 'Needs assignment' : 'IT Support'}</p>
              </div>
            </div>
            <button
              onClick={() => setShowAssignModal(true)}
              className="w-full py-2 bg-primary-50 text-brand-dark rounded-xl text-[13px] font-semibold hover:bg-primary-100 transition-colors"
            >
              {ticket.responsible?.name ? 'Reassign' : 'Assign Technician'}
            </button>
          </div>

          {/* Actions */}
          <div className="card">
            <h3 className="text-[13px] font-semibold text-ios-secondary uppercase tracking-wide mb-3">Actions</h3>
            <div className="space-y-2">
              {ticket.status === '2' && (
                <button onClick={() => handleAction('start')} disabled={!!actionLoading} className="w-full py-2 bg-gold-500 text-white rounded-xl text-[13px] font-semibold disabled:opacity-50">
                  {actionLoading === 'start' ? '...' : '▶ Start Working'}
                </button>
              )}
              {(ticket.status === '3' || ticket.status === '4') && (
                <button onClick={() => handleAction('complete')} disabled={!!actionLoading} className="w-full py-2 bg-brand-dark text-white rounded-xl text-[13px] font-semibold disabled:opacity-50">
                  {actionLoading === 'complete' ? '...' : '✓ Mark Resolved'}
                </button>
              )}
              {ticket.status === '3' && (
                <button onClick={() => handleAction('defer')} disabled={!!actionLoading} className="w-full py-2 bg-gray-200 text-gray-700 rounded-xl text-[13px] font-semibold disabled:opacity-50">
                  {actionLoading === 'defer' ? '...' : '⏸ Put On Hold'}
                </button>
              )}
              {(ticket.status === '5' || ticket.status === '6') && (
                <button onClick={() => handleAction('reopen')} disabled={!!actionLoading} className="w-full py-2 bg-blue-500 text-white rounded-xl text-[13px] font-semibold disabled:opacity-50">
                  {actionLoading === 'reopen' ? '...' : '↩ Reopen'}
                </button>
              )}
            </div>
          </div>

          {/* Caller / Reporter Info */}
          <div className="card">
            <h3 className="text-[13px] font-semibold text-ios-secondary uppercase tracking-wide mb-3">Reported By</h3>
            {(() => {
              const caller = parseCallerInfo(ticket.description)
              return (
                <div className="space-y-2 text-[12px]">
                  {caller.name && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                        {caller.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </div>
                      <span className="font-semibold text-ios-label text-[13px]">{caller.name}</span>
                    </div>
                  )}
                  {caller.email && (
                    <div className="flex justify-between">
                      <span className="text-ios-secondary">Email</span>
                      <a href={`mailto:${caller.email}`} className="text-brand-medium font-medium hover:underline">{caller.email}</a>
                    </div>
                  )}
                  {caller.department && (
                    <div className="flex justify-between">
                      <span className="text-ios-secondary">Department</span>
                      <span className="text-ios-label font-medium">{caller.department}</span>
                    </div>
                  )}
                  {caller.phone && (
                    <div className="flex justify-between">
                      <span className="text-ios-secondary">Phone</span>
                      <a href={`tel:${caller.phone}`} className="text-brand-medium font-medium hover:underline">{caller.phone}</a>
                    </div>
                  )}
                  {!caller.name && !caller.email && (
                    <p className="text-ios-tertiary">No caller info available</p>
                  )}
                </div>
              )
            })()}
          </div>

          {/* Details */}
          <div className="card">
            <h3 className="text-[13px] font-semibold text-ios-secondary uppercase tracking-wide mb-3">Details</h3>
            <div className="space-y-3 text-[12px]">
              <div className="flex justify-between">
                <span className="text-ios-secondary">Created By</span>
                <span className="text-ios-label font-medium">{ticket.creator?.name || `User ${ticket.createdBy}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ios-secondary">Created</span>
                <span className="text-ios-label">{ticket.createdDate ? format(new Date(ticket.createdDate), 'dd MMM yyyy HH:mm') : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ios-secondary">Deadline</span>
                <span className={`font-medium ${ticket.deadline && new Date(ticket.deadline) < new Date() && ticket.status !== '5' ? 'text-red-600' : 'text-ios-label'}`}>
                  {ticket.deadline ? format(new Date(ticket.deadline), 'dd MMM yyyy HH:mm') : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ios-secondary">Priority</span>
                <span className="text-ios-label font-medium">{PRIORITY_MAP[ticket.priority] || 'Normal'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowAssignModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-ios-lg w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-ios-label">Assign Technician</h3>
              <button onClick={() => setShowAssignModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 max-h-[400px] overflow-y-auto">
              {teamMembers.length === 0 ? (
                <p className="text-center text-ios-secondary text-[13px] py-8">Loading team members...</p>
              ) : (
                <div className="space-y-2">
                  {teamMembers.map(member => (
                    <button
                      key={member.ID}
                      onClick={() => handleAssign(member.ID)}
                      disabled={!!assigningTo}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:bg-primary-50 ${
                        ticket?.responsibleId === member.ID ? 'bg-primary-50 border-2 border-brand-medium' : 'border border-gray-100'
                      } ${assigningTo === member.ID ? 'opacity-50' : ''}`}
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-medium to-brand-dark text-white flex items-center justify-center text-[12px] font-bold flex-shrink-0">
                        {member.NAME?.[0]}{member.LAST_NAME?.[0]}
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-semibold text-ios-label">{member.NAME} {member.LAST_NAME}</p>
                        <p className="text-[11px] text-ios-secondary">{member.WORK_POSITION || 'IT Support'}</p>
                      </div>
                      {ticket?.responsibleId === member.ID && (
                        <span className="text-[10px] bg-brand-dark text-white px-2 py-0.5 rounded-full font-bold">Current</span>
                      )}
                      {assigningTo === member.ID && (
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-gray-200 border-t-brand-dark"></span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
