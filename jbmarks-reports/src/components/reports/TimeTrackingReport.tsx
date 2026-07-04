'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { getBitrixApi, BitrixTask, ElapsedTimeEntry } from '@/lib/bitrix-api'
import { ReportFilters, FilterState } from '@/components/filters/ReportFilters'
import { StatCard } from '@/components/ui/StatCard'
import { ExportButton } from '@/components/ui/ExportButton'
import { DrillDownPanel } from '@/components/ui/DrillDownPanel'

interface TimeByTask {
  taskId: string
  taskTitle: string
  totalSeconds: number
  estimateSeconds: number
  entries: number
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h`
  if (minutes > 0) return `${minutes}m`
  return `${seconds}s`
}

const CHART_COLORS = ['#1B5E20', '#2E7D32', '#66BB6A', '#F9A825', '#FFC107', '#4CAF50', '#81C784', '#A5D6A7']

export function TimeTrackingReport() {
  const [tasks, setTasks] = useState<BitrixTask[]>([])
  const [timeData, setTimeData] = useState<TimeByTask[]>([])
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

      // Get tasks that have time logged
      const tasksWithTime = datFiltered.filter(t => 
        t.timeSpentInLogs && parseInt(t.timeSpentInLogs) > 0
      )

      const timeByTask: TimeByTask[] = tasksWithTime.map(t => ({
        taskId: t.id,
        taskTitle: t.title.length > 40 ? t.title.substring(0, 40) + '...' : t.title,
        totalSeconds: parseInt(t.timeSpentInLogs || '0'),
        estimateSeconds: parseInt(t.timeEstimate || '0'),
        entries: 0,
      })).sort((a, b) => b.totalSeconds - a.totalSeconds)

      setTimeData(timeByTask)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch time tracking data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [filters])

  // Aggregate stats
  const totalSecondsLogged = timeData.reduce((sum, t) => sum + t.totalSeconds, 0)
  const totalEstimated = timeData.reduce((sum, t) => sum + t.estimateSeconds, 0)
  const tasksWithTimeCount = timeData.length
  const tasksWithEstimate = timeData.filter(t => t.estimateSeconds > 0).length

  // Efficiency: actual vs estimated for tasks that have both
  const tasksWithBoth = timeData.filter(t => t.estimateSeconds > 0 && t.totalSeconds > 0)
  const avgEfficiency = tasksWithBoth.length > 0
    ? Math.round((tasksWithBoth.reduce((sum, t) => sum + (t.estimateSeconds / t.totalSeconds), 0) / tasksWithBoth.length) * 100)
    : 0

  // Top 10 tasks by time spent
  const topTasksChart = timeData.slice(0, 10).map(t => ({
    name: t.taskTitle,
    hours: Math.round((t.totalSeconds / 3600) * 10) / 10,
    estimated: Math.round((t.estimateSeconds / 3600) * 10) / 10,
  }))

  // Time by group
  const timeByGroup = tasks
    .filter(t => t.timeSpentInLogs && parseInt(t.timeSpentInLogs) > 0)
    .reduce<Record<string, number>>((acc, t) => {
      const group = t.group?.name || 'No Group'
      acc[group] = (acc[group] || 0) + parseInt(t.timeSpentInLogs || '0')
      return acc
    }, {})
  const timeByGroupData = Object.entries(timeByGroup)
    .map(([name, seconds]) => ({ name, value: Math.round(seconds / 3600 * 10) / 10 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  const exportData = timeData.map(t => ({
    'Task ID': t.taskId,
    'Task': t.taskTitle,
    'Time Logged (hours)': Math.round((t.totalSeconds / 3600) * 100) / 100,
    'Estimate (hours)': Math.round((t.estimateSeconds / 3600) * 100) / 100,
    'Over/Under': t.estimateSeconds > 0
      ? `${Math.round(((t.totalSeconds - t.estimateSeconds) / 3600) * 100) / 100}h`
      : 'No estimate',
  }))

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-brand-dark"></div>
        <span className="text-[13px] text-ios-secondary">Loading time tracking data...</span>
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
          <h1 className="text-[22px] sm:text-[28px] font-bold text-ios-label tracking-tight">Time Tracking</h1>
          <p className="text-[13px] sm:text-[15px] text-ios-secondary mt-0.5">Analyse time logged against tasks and estimates</p>
        </div>
        <ExportButton data={exportData} filename="time-tracking" title="Time Tracking Report" />
      </div>

      {/* Filters */}
      <ReportFilters filters={filters} onChange={setFilters} />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Time Logged" value={formatDuration(totalSecondsLogged)} icon="🕐" onClick={() => setDrillDown({ title: 'Tasks with Time Logged', tasks: tasks.filter(t => t.timeSpentInLogs && parseInt(t.timeSpentInLogs) > 0) })} />
        <StatCard label="Tasks with Time" value={tasksWithTimeCount} icon="📋" onClick={() => setDrillDown({ title: 'Tasks with Time Entries', tasks: tasks.filter(t => t.timeSpentInLogs && parseInt(t.timeSpentInLogs) > 0) })} />
        <StatCard label="Total Estimated" value={formatDuration(totalEstimated)} icon="📐" />
        <StatCard label="Avg Efficiency" value={avgEfficiency > 0 ? `${avgEfficiency}%` : 'N/A'} icon="⚡" />
      </div>

      {/* Charts — hidden when drill-down is open */}
      {!drillDown && <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Top Tasks by Time */}
        {topTasksChart.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Tasks by Time Logged</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={topTasksChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" label={{ value: 'Hours', position: 'insideBottom', offset: -5 }} />
                <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => `${value}h`} />
                <Legend />
                <Bar dataKey="hours" name="Actual" fill="#1B5E20" radius={[0, 4, 4, 0]} />
                <Bar dataKey="estimated" name="Estimated" fill="#C8E6C9" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Time by Group Pie */}
        {timeByGroupData.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Time by Workgroup (hours)</h3>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={timeByGroupData}
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}h`}
                >
                  {timeByGroupData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value}h`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>}

      {/* Time Table — hidden when drill-down is open */}
      {timeData.length > 0 && !drillDown && (
        <div className="card overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Logged Detail</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Task</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Time Logged</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estimate</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {timeData.slice(0, 20).map((entry) => {
                  const diff = entry.estimateSeconds > 0 ? entry.totalSeconds - entry.estimateSeconds : 0
                  return (
                    <tr key={entry.taskId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{entry.taskTitle}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDuration(entry.totalSeconds)}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {entry.estimateSeconds > 0 ? formatDuration(entry.estimateSeconds) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {entry.estimateSeconds > 0 ? (
                          <span className={`text-sm font-medium ${diff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {diff > 0 ? '+' : ''}{formatDuration(Math.abs(diff))}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {timeData.length === 0 && !drillDown && (
        <div className="card text-center py-16 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <img src="/logo.png" alt="" className="w-[300px] h-[300px] object-contain opacity-[0.04]" />
          </div>
          <div className="relative z-10">
            <p className="text-4xl mb-3">⏱️</p>
            <p className="text-[17px] font-semibold text-ios-label">No time tracking data</p>
            <p className="text-[14px] text-ios-secondary mt-1">No tasks have logged time entries yet</p>
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
