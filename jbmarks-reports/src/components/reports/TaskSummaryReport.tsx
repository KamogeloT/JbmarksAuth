'use client'

import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getBitrixApi, BitrixTask, TASK_STATUS_MAP, TASK_STATUS_LABELS, TASK_STATUS_COLORS, TASK_PRIORITY_LABELS, TaskStatus } from '@/lib/bitrix-api'
import { ReportFilters, FilterState } from '@/components/filters/ReportFilters'
import { StatCard } from '@/components/ui/StatCard'
import { ExportButton } from '@/components/ui/ExportButton'
import { DrillDownPanel } from '@/components/ui/DrillDownPanel'

interface StatusCount {
  name: string
  value: number
  color: string
  key: TaskStatus
}

interface PriorityCount {
  name: string
  value: number
}

export function TaskSummaryReport() {
  const [tasks, setTasks] = useState<BitrixTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<FilterState>({ groupId: '', userId: '', dateFrom: '', dateTo: '' })
  const [drillDown, setDrillDown] = useState<{ title: string; tasks: BitrixTask[] } | null>(null)

  // Auto-scroll to drill-down panel when opened
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
      // Apply date filter on createdDate
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

  // Aggregate data
  const statusCounts: StatusCount[] = Object.entries(TASK_STATUS_LABELS).map(([key, label]) => {
    const statusCode = Object.entries(TASK_STATUS_MAP).find(([, v]) => v === key)?.[0] || ''
    return {
      name: label,
      value: tasks.filter(t => t.status === statusCode).length,
      color: TASK_STATUS_COLORS[key as TaskStatus],
      key: key as TaskStatus,
    }
  }).filter(s => s.value > 0)

  const priorityCounts: PriorityCount[] = Object.entries(TASK_PRIORITY_LABELS).map(([code, label]) => ({
    name: label,
    value: tasks.filter(t => t.priority === code).length,
  })).filter(p => p.value > 0)

  const totalTasks = tasks.length
  const activeTasks = tasks.filter(t => t.status !== '5' && t.status !== '6').length
  const completedTasks = tasks.filter(t => t.status === '5').length
  const overdueTasks = tasks.filter(t => {
    if (!t.deadline || t.status === '5') return false
    return new Date(t.deadline) < new Date()
  }).length
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Group by workgroup
  const groupData = tasks.reduce<Record<string, { name: string; active: number; completed: number }>>((acc, task) => {
    const groupName = task.group?.name || 'No Group'
    if (!acc[groupName]) acc[groupName] = { name: groupName, active: 0, completed: 0 }
    if (task.status === '5') acc[groupName].completed++
    else if (task.status !== '6') acc[groupName].active++
    return acc
  }, {})
  const groupChartData = Object.values(groupData).sort((a, b) => (b.active + b.completed) - (a.active + a.completed)).slice(0, 10)

  const exportData = tasks.map(t => {
    const desc = t.description || ''
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
      'Assigned To': t.responsible?.name || t.responsibleId || '',
      Created: t.createdDate ? t.createdDate.split('T')[0] : '',
      Deadline: t.deadline ? t.deadline.split('T')[0] : '',
      Status: TASK_STATUS_LABELS[TASK_STATUS_MAP[t.status] || 'new'],
    }
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-brand-dark"></div>
        <span className="text-[13px] text-ios-secondary">Loading task data...</span>
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-[28px] font-bold text-ios-label tracking-tight">Task Summary</h1>
          <p className="text-[13px] sm:text-[15px] text-ios-secondary mt-0.5">Overview of all tasks across your portal</p>
        </div>
        <ExportButton data={exportData} filename="task-summary" title="Task Summary Report" />
      </div>

      {/* Filters */}
      <ReportFilters filters={filters} onChange={setFilters} />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total Tasks" value={totalTasks} icon="📋" onClick={() => setDrillDown({ title: 'All Tasks', tasks })} />
        <StatCard label="Active" value={activeTasks} icon="🟢" onClick={() => setDrillDown({ title: 'Active Tasks', tasks: tasks.filter(t => t.status !== '5' && t.status !== '6') })} />
        <StatCard label="Completed" value={completedTasks} icon="✅" highlight="green" onClick={() => setDrillDown({ title: 'Completed Tasks', tasks: tasks.filter(t => t.status === '5') })} />
        <StatCard label="Overdue" value={overdueTasks} icon="🔴" highlight={overdueTasks > 0 ? 'red' : undefined} onClick={() => setDrillDown({ title: 'Overdue Tasks', tasks: tasks.filter(t => { if (!t.deadline || t.status === '5') return false; return new Date(t.deadline) < new Date() }) })} />
        <StatCard label="Completion" value={`${completionRate}%`} icon="📈" />
      </div>

      {/* Charts — hidden when drill-down is open */}
      {!drillDown && <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Status Pie Chart */}
        <div className="card">
          <h3 className="text-[15px] font-semibold text-ios-label mb-4">By Status</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={statusCounts}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                strokeWidth={2}
                stroke="#fff"
              >
                {statusCounts.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  fontSize: '13px',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                iconType="circle"
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Overdue vs On Time Chart */}
        <div className="card">
          <h3 className="text-[15px] font-semibold text-ios-label mb-4">Overdue vs On Time</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={[
                  { name: 'On Time', value: activeTasks - overdueTasks, color: '#2E7D32' },
                  { name: 'Overdue', value: overdueTasks, color: '#F9A825' },
                ].filter(d => d.value > 0)}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                strokeWidth={2}
                stroke="#fff"
              >
                <Cell fill="#2E7D32" />
                <Cell fill="#F9A825" />
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  fontSize: '13px',
                }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>}

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
