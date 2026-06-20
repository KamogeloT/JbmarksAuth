'use client'

import { SDiMTask, TICKET_STATUS_MAP, TICKET_STATUS_COLORS, PRIORITY_MAP, getAssigneeName, isUnassigned, parseCallerInfo } from '@/lib/sdim-api'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { isBefore } from 'date-fns'

interface Props {
  tickets: SDiMTask[]
  loading: boolean
  onViewQueue: () => void
  onTicketClick: (id: string) => void
}

export function DashboardOverview({ tickets, loading, onViewQueue, onTicketClick }: Props) {
  const now = new Date()
  const open = tickets.filter(t => t.status !== '5' && t.status !== '6')
  const newCount = tickets.filter(t => t.status === '2').length
  const inProgress = tickets.filter(t => t.status === '3').length
  const resolved = tickets.filter(t => t.status === '5').length
  const overdue = open.filter(t => t.deadline && isBefore(new Date(t.deadline), now)).length

  const statusData = Object.entries(TICKET_STATUS_MAP).map(([code, label]) => ({
    name: label,
    value: tickets.filter(t => t.status === code).length,
    color: TICKET_STATUS_COLORS[code],
  })).filter(d => d.value > 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-brand-dark"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] sm:text-[28px] font-bold text-ios-label tracking-tight">Overview</h1>
          <p className="text-[13px] text-ios-secondary mt-0.5">IT Support ticket summary</p>
        </div>
        <button onClick={onViewQueue} className="px-4 py-2 bg-brand-dark text-white rounded-full text-[13px] font-semibold hover:bg-brand-medium transition-colors">
          View All Tickets
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card" onClick={onViewQueue}>
          <p className="text-[11px] text-ios-secondary uppercase tracking-wide font-medium">Total</p>
          <p className="text-[28px] font-bold text-ios-label mt-1">{tickets.length}</p>
        </div>
        <div className="stat-card" onClick={onViewQueue}>
          <p className="text-[11px] text-ios-secondary uppercase tracking-wide font-medium">New</p>
          <p className="text-[28px] font-bold text-blue-600 mt-1">{newCount}</p>
        </div>
        <div className="stat-card" onClick={onViewQueue}>
          <p className="text-[11px] text-ios-secondary uppercase tracking-wide font-medium">In Progress</p>
          <p className="text-[28px] font-bold text-gold-500 mt-1">{inProgress}</p>
        </div>
        <div className="stat-card" onClick={onViewQueue}>
          <p className="text-[11px] text-ios-secondary uppercase tracking-wide font-medium">Resolved</p>
          <p className="text-[28px] font-bold text-brand-dark mt-1">{resolved}</p>
        </div>
        <div className="stat-card bg-gradient-to-br from-red-50/80 to-white/80" onClick={onViewQueue}>
          <p className="text-[11px] text-ios-secondary uppercase tracking-wide font-medium">Overdue</p>
          <p className="text-[28px] font-bold text-red-600 mt-1">{overdue}</p>
        </div>
      </div>

      {/* Chart + Recent tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-[15px] font-semibold text-ios-label mb-4">Tickets by Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" strokeWidth={2} stroke="#fff">
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-[15px] font-semibold text-ios-label mb-4">Recent Tickets</h3>
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {tickets.slice(0, 8).map(t => (
              <button
                key={t.id}
                onClick={() => onTicketClick(t.id)}
                className="w-full text-left p-3 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-ios-label truncate">{t.title}</p>
                  <p className="text-[11px] text-ios-secondary">{parseCallerInfo(t.description).name || 'Unknown'} → {getAssigneeName(t)}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: TICKET_STATUS_COLORS[t.status] + '20', color: TICKET_STATUS_COLORS[t.status] }}>
                  {TICKET_STATUS_MAP[t.status] || 'New'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
