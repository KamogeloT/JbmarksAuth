'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getBitrixApi, BitrixTask, TASK_STATUS_MAP, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/lib/bitrix-api'
import { ReportFilters, FilterState } from '@/components/filters/ReportFilters'
import { StatCard } from '@/components/ui/StatCard'
import { ExportButton } from '@/components/ui/ExportButton'
import { DrillDownPanel } from '@/components/ui/DrillDownPanel'
import { differenceInDays, format, addDays, isAfter, isBefore } from 'date-fns'

interface OverdueTask {
  id: string
  title: string
  responsible: string
  group: string
  deadline: string
  daysOverdue: number
  priority: string
  status: string
}

export function OverdueReport() {
  const [tasks, setTasks] = useState<BitrixTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<FilterState>({ groupId: '', userId: '', dateFrom: '', dateTo: '' })
  const [drillDown, setDrillDown] = useState<{ title: string; tasks: BitrixTask[] } | null>(null)

  useEffect(() => {
    if (drillDown) {
      setTimeout(() => {
        document.getElementById('drill-down-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    }
  }, [drillDown])

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const api = getBitrixApi()
      const filterParams: Record<string, string> = {}
      if (filters.groupId) filterParams['GROUP_ID'] = filters.groupId
      if (filters.userId) filterParams['RESPONSIBLE_ID'] = filters.userId
      
      const allTasks = await api.getAllTasks(filterParams)
      const datFiltered = allTasks.filter(t => {
        if (!filters.dateFrom && !filters.dateTo) return true
        const created = t.createdDate ? t.createdDate.split('T')[0] : null
        if (!created) return true
        if (filters.dateFrom && created < filters.dateFrom) return false
        if (filters.dateTo && created > filters.dateTo) return false
        return true
      })
      setTasks(datFiltered)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tasks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [filters])

  const now = new Date()

  // Overdue tasks (have deadline in the past, not completed/deferred)
  const overdueTasks: OverdueTask[] = tasks
    .filter(t => {
      if (!t.deadline) return false
      if (t.status === '5' || t.status === '6') return false
      return isBefore(new Date(t.deadline), now)
    })
    .map(t => ({
      id: t.id,
      title: t.title,
      responsible: t.responsible?.name || `User ${t.responsibleId}`,
      group: t.group?.name || 'No Group',
      deadline: t.deadline!,
      daysOverdue: differenceInDays(now, new Date(t.deadline!)),
      priority: TASK_PRIORITY_LABELS[t.priority] || 'Normal',
      status: TASK_STATUS_LABELS[TASK_STATUS_MAP[t.status] || 'new'],
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue)

  // Tasks due in next 7 days
  const upcomingDeadlines = tasks.filter(t => {
    if (!t.deadline) return false
    if (t.status === '5' || t.status === '6') return false
    const deadline = new Date(t.deadline)
    return isAfter(deadline, now) && isBefore(deadline, addDays(now, 7))
  })

  // Tasks with no deadline
  const noDeadlineTasks = tasks.filter(t => {
    if (t.status === '5' || t.status === '6') return false
    return !t.deadline
  })

  // Overdue by severity
  const severityData = [
    { name: '1-3 days', value: overdueTasks.filter(t => t.daysOverdue <= 3).length, fill: '#f59e0b' },
    { name: '4-7 days', value: overdueTasks.filter(t => t.daysOverdue > 3 && t.daysOverdue <= 7).length, fill: '#f97316' },
    { name: '8-14 days', value: overdueTasks.filter(t => t.daysOverdue > 7 && t.daysOverdue <= 14).length, fill: '#ef4444' },
    { name: '15-30 days', value: overdueTasks.filter(t => t.daysOverdue > 14 && t.daysOverdue <= 30).length, fill: '#dc2626' },
    { name: '30+ days', value: overdueTasks.filter(t => t.daysOverdue > 30).length, fill: '#991b1b' },
  ].filter(s => s.value > 0)

  // Overdue by responsible person
  const overdueByPerson = overdueTasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.responsible] = (acc[t.responsible] || 0) + 1
    return acc
  }, {})
  const overdueByPersonData = Object.entries(overdueByPerson)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  const exportData = overdueTasks.map(t => {
    // Find the raw task to parse description fields
    const rawTask = tasks.find(rt => rt.id === t.id)
    const desc = rawTask?.description || ''
    const parseField = (label: string) => {
      const pattern = new RegExp(`^${label}\\s*:?\\s*(.+)`, 'im')
      for (const line of desc.split('\n')) {
        const match = pattern.exec(line.trim())
        if (match && match[1]?.trim()) return match[1].trim()
      }
      return ''
    }
    return {
      Task: t.title,
      'Specific Issue': parseField('Specific issue'),
      'Reported By': parseField('Reported by'),
      Location: parseField('Location'),
      Contact: parseField('Contact'),
      'Assigned To': t.responsible,
      Created: rawTask?.createdDate ? rawTask.createdDate.split('T')[0] : '',
      Deadline: format(new Date(t.deadline), 'yyyy-MM-dd'),
      Status: t.status,
      'Days Overdue': t.daysOverdue,
    }
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-brand-dark"></div>
        <span className="text-[13px] text-ios-secondary">Loading deadline data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card text-center py-10">
        <p className="text-[15px] font-semibold text-red-600">Unable to load report</p>
        <p className="text-[13px] text-ios-secondary mt-1">{error}</p>
        <button onClick={fetchData} className="btn-primary mt-4">Try Again</button>
      </div>
    )
  }

  return (
    <div className="space-y-6" id="report-content">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-ios-label tracking-tight">Overdue & Deadlines</h1>
          <p className="text-[15px] text-ios-secondary mt-0.5">Track missed deadlines and upcoming due dates</p>
        </div>
        <ExportButton data={exportData} filename="overdue-report" title="Overdue & Deadlines Report" />
      </div>

      {/* Filters */}
      <ReportFilters filters={filters} onChange={setFilters} />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Overdue Tasks" 
          value={overdueTasks.length} 
          icon="🔴" 
          highlight={overdueTasks.length > 0 ? 'red' : undefined}
          onClick={() => { const ot = tasks.filter(t => { if (!t.deadline || t.status === '5' || t.status === '6') return false; return isBefore(new Date(t.deadline), now) }); setDrillDown({ title: 'Overdue Tasks', tasks: ot }) }}
        />
        <StatCard label="Due This Week" value={upcomingDeadlines.length} icon="⚠️" highlight={upcomingDeadlines.length > 5 ? 'yellow' : undefined} onClick={() => setDrillDown({ title: 'Due This Week', tasks: upcomingDeadlines })} />
        <StatCard label="No Deadline Set" value={noDeadlineTasks.length} icon="❓" onClick={() => setDrillDown({ title: 'No Deadline Set', tasks: noDeadlineTasks })} />
        <StatCard 
          label="Avg Days Overdue" 
          value={overdueTasks.length > 0 ? Math.round(overdueTasks.reduce((sum, t) => sum + t.daysOverdue, 0) / overdueTasks.length) : 0} 
          icon="📅" 
        />
      </div>

      {/* Charts — hidden when drill-down is open */}
      {!drillDown && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Chart */}
        {severityData.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Overdue Severity</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={severityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" name="Tasks" radius={[4, 4, 0, 0]}>
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Overdue by Person */}
        {overdueByPersonData.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Overdue by Person</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={overdueByPersonData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" name="Overdue Tasks" fill="#F9A825" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>}

      {/* Overdue Tasks Table — hidden when drill-down is open */}
      {overdueTasks.length > 0 && !drillDown && (
        <div className="card overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Overdue Tasks Detail</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Task</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Responsible</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Group</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Deadline</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Days Overdue</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {overdueTasks.slice(0, 25).map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{task.title}</td>
                    <td className="px-4 py-3 text-gray-600">{task.responsible}</td>
                    <td className="px-4 py-3 text-gray-600">{task.group}</td>
                    <td className="px-4 py-3 text-gray-600">{format(new Date(task.deadline), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        task.daysOverdue > 14 ? 'bg-red-100 text-red-800' :
                        task.daysOverdue > 7 ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {task.daysOverdue} days
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{task.priority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {overdueTasks.length > 25 && (
              <p className="text-sm text-gray-500 px-4 py-3 border-t">
                Showing 25 of {overdueTasks.length} overdue tasks. Export for full list.
              </p>
            )}
          </div>
        </div>
      )}

      {overdueTasks.length === 0 && !drillDown && (
        <div className="card text-center py-16 relative overflow-hidden">
          {/* Logo watermark background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <img src="/logo.png" alt="" className="w-[300px] h-[300px] object-contain opacity-[0.04]" />
          </div>
          <div className="relative z-10">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-[17px] font-semibold text-ios-label">No overdue tasks!</p>
            <p className="text-[14px] text-ios-secondary mt-1">All tasks are on track</p>
          </div>
        </div>
      )}

      {/* Drill-down panel */}
      {drillDown && (
        <DrillDownPanel
          title={drillDown.title}
          tasks={drillDown.tasks}
          onClose={() => setDrillDown(null)}
        />
      )}
    </div>
  )
}


