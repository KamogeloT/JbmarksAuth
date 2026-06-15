'use client'

import { useState, useMemo } from 'react'
import { BitrixTask, TASK_STATUS_MAP, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/lib/bitrix-api'
import { format } from 'date-fns'

interface DrillDownPanelProps {
  title: string
  tasks: BitrixTask[]
  onClose: () => void
  id?: string
}

/**
 * Parse structured fields from task description
 * Same logic as the mobile app: looks for lines like "Reported by: John"
 */
function parseTaskField(description: string | undefined, label: string): string | null {
  if (!description) return null
  const pattern = new RegExp(`^${label}\\s*:?\\s*(.+)`, 'im')
  for (const line of description.split('\n')) {
    const match = pattern.exec(line.trim())
    if (match && match[1]?.trim()) return match[1].trim()
  }
  return null
}

export function DrillDownPanel({ title, tasks, onClose, id }: DrillDownPanelProps) {
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<string>('createdDate')
  const [sortAsc, setSortAsc] = useState(false)
  const [filterResponsible, setFilterResponsible] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Build distinct filter options
  const responsibleOptions = useMemo(() => {
    const names = tasks
      .map(t => t.responsible?.name || `User ${t.responsibleId}`)
      .filter(Boolean)
    return Array.from(new Set(names)).sort()
  }, [tasks])

  const statusOptions = useMemo(() => {
    const statuses = tasks.map(t => TASK_STATUS_LABELS[TASK_STATUS_MAP[t.status] || 'new'])
    return Array.from(new Set(statuses)).sort()
  }, [tasks])

  const filtered = useMemo(() => {
    let result = tasks

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(t =>
        t.title?.toLowerCase().includes(q) ||
        t.responsible?.name?.toLowerCase().includes(q) ||
        t.group?.name?.toLowerCase().includes(q) ||
        t.id?.includes(q)
      )
    }

    // Responsible filter
    if (filterResponsible) {
      result = result.filter(t => {
        const name = t.responsible?.name || `User ${t.responsibleId}`
        return name === filterResponsible
      })
    }

    // Status filter
    if (filterStatus) {
      result = result.filter(t => {
        const label = TASK_STATUS_LABELS[TASK_STATUS_MAP[t.status] || 'new']
        return label === filterStatus
      })
    }

    // Sort
    result = [...result].sort((a, b) => {
      let valA = ''
      let valB = ''
      switch (sortField) {
        case 'id':
          valA = a.id || '0'
          valB = b.id || '0'
          return sortAsc ? parseInt(valA) - parseInt(valB) : parseInt(valB) - parseInt(valA)
        case 'title':
          valA = a.title || ''
          valB = b.title || ''
          break
        case 'deadline':
          valA = a.deadline || (sortAsc ? '9999' : '0000')
          valB = b.deadline || (sortAsc ? '9999' : '0000')
          break
        case 'createdDate':
          valA = a.createdDate || (sortAsc ? '9999' : '0000')
          valB = b.createdDate || (sortAsc ? '9999' : '0000')
          break
        case 'status':
          valA = TASK_STATUS_LABELS[TASK_STATUS_MAP[a.status] || 'new']
          valB = TASK_STATUS_LABELS[TASK_STATUS_MAP[b.status] || 'new']
          break
        case 'responsible':
          valA = a.responsible?.name || ''
          valB = b.responsible?.name || ''
          break
      }
      const cmp = valA.localeCompare(valB)
      return sortAsc ? cmp : -cmp
    })

    return result
  }, [tasks, search, sortField, sortAsc, filterResponsible, filterStatus])

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  const sortIcon = (field: string) => {
    if (sortField !== field) return '↕'
    return sortAsc ? '↑' : '↓'
  }

  const hasFilters = search || filterResponsible || filterStatus

  const clearAllFilters = () => {
    setSearch('')
    setFilterResponsible('')
    setFilterStatus('')
  }

  return (
    <div id={id || 'drill-down-panel'} className="mt-6 card p-0 overflow-hidden border border-ios-separator">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-brand-dark text-white">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-bold">{title}</h2>
          <span className="text-[12px] bg-white/20 px-2 py-0.5 rounded-full">
            {filtered.length} of {tasks.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Filters Row */}
      <div className="px-5 py-3 bg-gray-50/80 border-b border-ios-separator flex flex-wrap items-center gap-2">
        {/* Search */}
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] w-40 outline-none focus:ring-1 focus:ring-brand-medium/40 placeholder:text-ios-tertiary"
        />

        {/* Responsible filter */}
        <select
          value={filterResponsible}
          onChange={(e) => setFilterResponsible(e.target.value)}
          className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-brand-medium/40 appearance-none cursor-pointer pr-7 max-w-[160px]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2386868b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '14px' }}
        >
          <option value="">All Responsible</option>
          {responsibleOptions.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-brand-medium/40 appearance-none cursor-pointer pr-7 max-w-[150px]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2386868b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '14px' }}
        >
          <option value="">All Statuses</option>
          {statusOptions.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={clearAllFilters}
            className="px-3 py-1.5 text-[12px] font-medium text-brand-medium hover:text-brand-dark transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-[12px] border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-primary-50 border-b border-primary-100">
              <th
                className="text-left px-3 py-2.5 font-semibold text-brand-dark cursor-pointer hover:bg-primary-100 transition w-14"
                onClick={() => toggleSort('id')}
              >
                # {sortIcon('id')}
              </th>
              <th
                className="text-left px-3 py-2.5 font-semibold text-brand-dark cursor-pointer hover:bg-primary-100 transition min-w-[180px]"
                onClick={() => toggleSort('title')}
              >
                Task {sortIcon('title')}
              </th>
              <th className="text-left px-3 py-2.5 font-semibold text-brand-dark min-w-[150px]">Specific Issue</th>
              <th className="text-left px-3 py-2.5 font-semibold text-brand-dark w-28">Reported By</th>
              <th className="text-left px-3 py-2.5 font-semibold text-brand-dark w-36">Location</th>
              <th className="text-left px-3 py-2.5 font-semibold text-brand-dark w-28">Contact</th>
              <th
                className="text-left px-3 py-2.5 font-semibold text-brand-dark cursor-pointer hover:bg-primary-100 transition w-32"
                onClick={() => toggleSort('responsible')}
              >
                Assigned To {sortIcon('responsible')}
              </th>
              <th
                className="text-left px-3 py-2.5 font-semibold text-brand-dark cursor-pointer hover:bg-primary-100 transition w-24"
                onClick={() => toggleSort('createdDate')}
              >
                Created {sortIcon('createdDate')}
              </th>
              <th
                className="text-left px-3 py-2.5 font-semibold text-brand-dark cursor-pointer hover:bg-primary-100 transition w-24"
                onClick={() => toggleSort('deadline')}
              >
                Deadline {sortIcon('deadline')}
              </th>
              <th
                className="text-left px-3 py-2.5 font-semibold text-brand-dark cursor-pointer hover:bg-primary-100 transition w-28"
                onClick={() => toggleSort('status')}
              >
                Status {sortIcon('status')}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((task, i) => {
              const status = TASK_STATUS_MAP[task.status] || 'new'
              const isOverdue = task.deadline && task.status !== '5' && new Date(task.deadline) < new Date()
              const reportedBy = parseTaskField(task.description, 'Reported by')
              const contact = parseTaskField(task.description, 'Contact')
              const location = parseTaskField(task.description, 'Location')
              const specificIssue = parseTaskField(task.description, 'Specific issue')
              return (
                <tr
                  key={task.id}
                  className={`border-b border-gray-100 hover:bg-primary-50/40 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                >
                  <td className="px-3 py-2 text-ios-tertiary font-mono text-[11px]">{task.id}</td>
                  <td className="px-3 py-2 text-ios-label font-medium">
                    <span className="line-clamp-2">{task.title}</span>
                  </td>
                  <td className="px-3 py-2 text-ios-secondary text-[11px]">
                    <span className="line-clamp-2">{specificIssue || '—'}</span>
                  </td>
                  <td className="px-3 py-2 text-ios-secondary text-[11px]">{reportedBy || '—'}</td>
                  <td className="px-3 py-2 text-ios-secondary text-[11px]">
                    <span className="line-clamp-1">{location || '—'}</span>
                  </td>
                  <td className="px-3 py-2 text-ios-secondary text-[11px]">{contact || '—'}</td>
                  <td className="px-3 py-2 text-ios-secondary text-[11px]">
                    {task.responsible?.name || `User ${task.responsibleId}`}
                  </td>
                  <td className="px-3 py-2 text-ios-secondary text-[11px]">
                    {task.createdDate ? format(new Date(task.createdDate), 'dd MMM yyyy') : '—'}
                  </td>
                  <td className={`px-3 py-2 text-[11px] ${isOverdue ? 'text-red-600 font-semibold' : 'text-ios-secondary'}`}>
                    {task.deadline ? format(new Date(task.deadline), 'dd MMM yyyy') : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${
                      status === 'completed' ? 'bg-primary-100 text-primary-700' :
                      status === 'in_progress' ? 'bg-gold-100 text-gold-700' :
                      status === 'deferred' ? 'bg-gray-100 text-gray-600' :
                      status === 'awaiting_approval' ? 'bg-purple-100 text-purple-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {TASK_STATUS_LABELS[status]}
                    </span>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-ios-tertiary text-[13px]">
                  No tasks match your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-5 py-2 bg-gray-50/80 border-t border-ios-separator flex items-center justify-between">
        <p className="text-[11px] text-ios-tertiary">
          Showing {filtered.length} of {tasks.length} tasks
        </p>
        <p className="text-[11px] text-ios-tertiary">
          Click column headers to sort
        </p>
      </div>
    </div>
  )
}
