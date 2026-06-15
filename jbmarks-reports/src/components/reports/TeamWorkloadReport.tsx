'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getBitrixApi, BitrixTask, BitrixUser, TASK_STATUS_MAP, TASK_PRIORITY_LABELS } from '@/lib/bitrix-api'
import { ReportFilters, FilterState } from '@/components/filters/ReportFilters'
import { StatCard } from '@/components/ui/StatCard'
import { ExportButton } from '@/components/ui/ExportButton'
import { DrillDownPanel } from '@/components/ui/DrillDownPanel'
import { isBefore } from 'date-fns'

interface TeamMemberStats {
  userId: string
  name: string
  position: string
  activeTasks: number
  completedTasks: number
  overdueTasks: number
  totalTasks: number
  timeLogged: number // seconds
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h`
  if (minutes > 0) return `${minutes}m`
  return '0m'
}

export function TeamWorkloadReport() {
  const [teamStats, setTeamStats] = useState<TeamMemberStats[]>([])
  const [allTasks, setAllTasks] = useState<BitrixTask[]>([])
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
      
      // Fetch all tasks
      const filterParams: Record<string, string> = {}
      if (filters.groupId) filterParams['GROUP_ID'] = filters.groupId
      
      const [fetchedTasks, users] = await Promise.all([
        api.getAllTasks(filterParams),
        api.getAllUsers(),
      ])
      
      // Apply date filter
      const datFiltered = fetchedTasks.filter(t => {
        if (!filters.dateFrom && !filters.dateTo) return true
        const created = t.createdDate ? t.createdDate.split('T')[0] : null
        if (!created) return true
        if (filters.dateFrom && created < filters.dateFrom) return false
        if (filters.dateTo && created > filters.dateTo) return false
        return true
      })
      setAllTasks(datFiltered)

      const now = new Date()

      // Build stats per user
      const statsMap = new Map<string, TeamMemberStats>()

      // Initialize from users
      users.forEach(u => {
        statsMap.set(u.ID, {
          userId: u.ID,
          name: `${u.NAME} ${u.LAST_NAME}`,
          position: u.WORK_POSITION || 'Team Member',
          activeTasks: 0,
          completedTasks: 0,
          overdueTasks: 0,
          totalTasks: 0,
          timeLogged: 0,
        })
      })

      // Aggregate task data by responsible person
      datFiltered.forEach(task => {
        const userId = task.responsibleId
        if (!userId) return

        if (!statsMap.has(userId)) {
          statsMap.set(userId, {
            userId,
            name: task.responsible?.name || `User ${userId}`,
            position: '',
            activeTasks: 0,
            completedTasks: 0,
            overdueTasks: 0,
            totalTasks: 0,
            timeLogged: 0,
          })
        }

        const stats = statsMap.get(userId)!
        stats.totalTasks++

        if (task.status === '5') {
          stats.completedTasks++
        } else if (task.status !== '6') {
          stats.activeTasks++
          // Check overdue
          if (task.deadline && isBefore(new Date(task.deadline), now)) {
            stats.overdueTasks++
          }
        }

        // Time logged
        if (task.timeSpentInLogs) {
          stats.timeLogged += parseInt(task.timeSpentInLogs) || 0
        }
      })

      // Filter to only users who have tasks
      const teamData = Array.from(statsMap.values())
        .filter(s => s.totalTasks > 0)
        .sort((a, b) => b.activeTasks - a.activeTasks)

      // If userId filter is set, only show that user
      if (filters.userId) {
        setTeamStats(teamData.filter(s => s.userId === filters.userId))
      } else {
        setTeamStats(teamData)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch team data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [filters])

  // Aggregate totals
  const totalActive = teamStats.reduce((sum, s) => sum + s.activeTasks, 0)
  const totalCompleted = teamStats.reduce((sum, s) => sum + s.completedTasks, 0)
  const totalOverdue = teamStats.reduce((sum, s) => sum + s.overdueTasks, 0)
  const teamSize = teamStats.length
  const avgTasksPerPerson = teamSize > 0 ? Math.round(totalActive / teamSize) : 0

  // Chart data - top 15 team members by workload
  const workloadChart = teamStats.slice(0, 15).map(s => ({
    name: s.name.length > 15 ? s.name.substring(0, 15) + '...' : s.name,
    active: s.activeTasks,
    completed: s.completedTasks,
    overdue: s.overdueTasks,
  }))

  const exportData = teamStats.map(s => ({
    Name: s.name,
    Position: s.position,
    'Active Tasks': s.activeTasks,
    'Completed Tasks': s.completedTasks,
    'Overdue Tasks': s.overdueTasks,
    'Total Tasks': s.totalTasks,
    'Time Logged': formatDuration(s.timeLogged),
    'Completion Rate': s.totalTasks > 0 ? `${Math.round((s.completedTasks / s.totalTasks) * 100)}%` : '0%',
  }))

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-brand-dark"></div>
        <span className="text-[13px] text-ios-secondary">Loading team data...</span>
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
          <h1 className="text-[28px] font-bold text-ios-label tracking-tight">Team Workload</h1>
          <p className="text-[15px] text-ios-secondary mt-0.5">Task distribution and productivity across team members</p>
        </div>
        <ExportButton data={exportData} filename="team-workload" title="Team Workload Report" />
      </div>

      {/* Filters */}
      <ReportFilters filters={filters} onChange={setFilters} />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Team Members" value={teamSize} icon="👥" />
        <StatCard label="Total Active Tasks" value={totalActive} icon="📋" onClick={() => setDrillDown({ title: 'All Active Tasks', tasks: allTasks.filter(t => t.status !== '5' && t.status !== '6') })} />
        <StatCard label="Avg Tasks/Person" value={avgTasksPerPerson} icon="📊" />
        <StatCard label="Total Overdue" value={totalOverdue} icon="🔴" highlight={totalOverdue > 0 ? 'red' : undefined} onClick={() => { const now = new Date(); setDrillDown({ title: 'All Overdue Tasks', tasks: allTasks.filter(t => t.deadline && t.status !== '5' && t.status !== '6' && isBefore(new Date(t.deadline), now)) }) }} />
      </div>

      {/* Workload Chart */}
      {/* Workload Chart — hidden when drill-down is open */}
      {workloadChart.length > 0 && !drillDown && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Workload Distribution</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={workloadChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="active" name="Active" fill="#2E7D32" stackId="a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Completed" fill="#66BB6A" stackId="b" />
              <Bar dataKey="overdue" name="Overdue" fill="#F9A825" stackId="c" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Team Table */}
      {/* Team Table — hidden when drill-down is open */}
      {teamStats.length > 0 && !drillDown && (
        <div className="card overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Detail</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Position</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Active</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Completed</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Overdue</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Time Logged</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Completion %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {teamStats.map((member) => {
                  const completionRate = member.totalTasks > 0
                    ? Math.round((member.completedTasks / member.totalTasks) * 100)
                    : 0
                  return (
                    <tr key={member.userId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{member.name}</td>
                      <td className="px-4 py-3 text-gray-600">{member.position || '—'}</td>
                      <td className="px-4 py-3 text-center">{member.activeTasks}</td>
                      <td className="px-4 py-3 text-center text-green-600">{member.completedTasks}</td>
                      <td className="px-4 py-3 text-center">
                        {member.overdueTasks > 0 ? (
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {member.overdueTasks}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {member.timeLogged > 0 ? formatDuration(member.timeLogged) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                completionRate >= 70 ? 'bg-brand-dark' :
                                completionRate >= 40 ? 'bg-gold-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${completionRate}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600">{completionRate}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {teamStats.length === 0 && !drillDown && (
        <div className="card text-center py-16 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <img src="/logo.png" alt="" className="w-[300px] h-[300px] object-contain opacity-[0.04]" />
          </div>
          <div className="relative z-10">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-[17px] font-semibold text-ios-label">No team data available</p>
            <p className="text-[14px] text-ios-secondary mt-1">No users with assigned tasks found</p>
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
