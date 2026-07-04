'use client'

import { useState, useMemo } from 'react'
import { SDiMTask, TICKET_STATUS_MAP, TICKET_STATUS_COLORS, PRIORITY_MAP, getAssigneeName, isUnassigned, parseCallerInfo } from '@/lib/sdim-api'
import { format, isBefore } from 'date-fns'

interface Props {
  tickets: SDiMTask[]
  loading: boolean
  onTicketClick: (id: string) => void
  onRefresh: () => void
}

export function TicketQueue({ tickets, loading, onTicketClick, onRefresh }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [sortField, setSortField] = useState('createdDate')
  const [sortAsc, setSortAsc] = useState(false)

  const filtered = useMemo(() => {
    let result = tickets

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(t =>
        t.title?.toLowerCase().includes(q) ||
        t.responsible?.name?.toLowerCase().includes(q) ||
        t.id?.includes(q)
      )
    }
    if (statusFilter) result = result.filter(t => t.status === statusFilter)
    if (priorityFilter) result = result.filter(t => t.priority === priorityFilter)

    return [...result].sort((a, b) => {
      const valA = (a as any)[sortField] || ''
      const valB = (b as any)[sortField] || ''
      const cmp = String(valA).localeCompare(String(valB))
      return sortAsc ? cmp : -cmp
    })
  }, [tickets, search, statusFilter, priorityFilter, sortField, sortAsc])

  const toggleSort = (field: string) => {
    if (sortField === field) setSortAsc(!sortAsc)
    else { setSortField(field); setSortAsc(true) }
  }

  const now = new Date()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-[28px] font-bold text-ios-label tracking-tight">Ticket Queue</h1>
          <p className="text-[13px] text-ios-secondary">{filtered.length} tickets</p>
        </div>
        <button onClick={onRefresh} className="px-4 py-2 bg-gray-100 rounded-full text-[13px] font-medium hover:bg-gray-200 transition-colors">
          ↻ Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search tickets..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[13px] w-48 outline-none focus:ring-2 focus:ring-brand-medium/30"
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-[13px] outline-none">
          <option value="">All Statuses</option>
          {Object.entries(TICKET_STATUS_MAP).map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-[13px] outline-none">
          <option value="">All Priorities</option>
          {Object.entries(PRIORITY_MAP).map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
        {(search || statusFilter || priorityFilter) && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); setPriorityFilter('') }} className="px-3 py-2 text-[13px] text-brand-medium font-medium">Clear</button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-brand-dark"></div>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-primary-50 border-b border-primary-100">
                  <th className="text-left px-4 py-3 font-semibold text-brand-dark cursor-pointer" onClick={() => toggleSort('id')}># {sortField === 'id' ? (sortAsc ? '↑' : '↓') : ''}</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-dark cursor-pointer min-w-[200px]" onClick={() => toggleSort('title')}>Ticket</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-dark">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-dark">Priority</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-dark">Assigned To</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-dark">Logged By</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-dark cursor-pointer" onClick={() => toggleSort('createdDate')}>Created {sortField === 'createdDate' ? (sortAsc ? '↑' : '↓') : ''}</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-dark cursor-pointer" onClick={() => toggleSort('deadline')}>Deadline</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const isOverdue = t.deadline && t.status !== '5' && isBefore(new Date(t.deadline), now)
                  return (
                    <tr
                      key={t.id}
                      onClick={() => onTicketClick(t.id)}
                      className={`border-b border-gray-100 hover:bg-primary-50/40 cursor-pointer transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                    >
                      <td className="px-4 py-3 text-ios-tertiary font-mono">{t.id}</td>
                      <td className="px-4 py-3 font-medium text-ios-label">
                        <span className="line-clamp-1">{t.title}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: TICKET_STATUS_COLORS[t.status] + '20', color: TICKET_STATUS_COLORS[t.status] }}>
                          {TICKET_STATUS_MAP[t.status] || 'New'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px]">{PRIORITY_MAP[t.priority] || 'Normal'}</td>
                      <td className="px-4 py-3 text-[11px] text-ios-secondary">
                        <span className={isUnassigned(t) ? 'text-red-500 font-semibold' : ''}>
                          {getAssigneeName(t)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-ios-label font-medium">
                        {parseCallerInfo(t.description).name || '—'}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-ios-secondary">{t.createdDate ? format(new Date(t.createdDate), 'dd MMM yyyy') : '—'}</td>
                      <td className={`px-4 py-3 text-[11px] ${isOverdue ? 'text-red-600 font-bold' : 'text-ios-secondary'}`}>
                        {t.deadline ? format(new Date(t.deadline), 'dd MMM HH:mm') : '—'}
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-ios-tertiary">No tickets match your filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
