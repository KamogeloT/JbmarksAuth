import React, { useState, useEffect } from 'react'
import { config } from '../config'
import { WaterIcon, PowerIcon, RoadIcon, TrashIcon, ClockIcon } from './icons'

interface CommunityReport {
  id: string
  type: string
  area: string
  status: string
  createdDate: string
  city: string
}

const TYPE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  Water: WaterIcon,
  Electricity: PowerIcon,
  Roads: RoadIcon,
  Waste: TrashIcon,
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  '2': { label: 'Reported', color: 'bg-blue-100 text-blue-700' },
  '3': { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
  '4': { label: 'Awaiting', color: 'bg-purple-100 text-purple-700' },
  '5': { label: 'Resolved', color: 'bg-green-100 text-green-700' },
  '6': { label: 'Deferred', color: 'bg-gray-100 text-gray-700' },
}

function getRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

function detectFaultType(title: string): string {
  if (title.toLowerCase().includes('water') || title.toLowerCase().includes('sanitation')) return 'Water'
  if (title.toLowerCase().includes('electric') || title.toLowerCase().includes('power')) return 'Electricity'
  if (title.toLowerCase().includes('road') || title.toLowerCase().includes('pothole') || title.toLowerCase().includes('storm')) return 'Roads'
  if (title.toLowerCase().includes('waste') || title.toLowerCase().includes('refuse') || title.toLowerCase().includes('dump')) return 'Waste'
  return 'Other'
}

export const CommunityFeed: React.FC = () => {
  const [reports, setReports] = useState<CommunityReport[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'Water' | 'Electricity' | 'Roads' | 'Waste'>('all')

  const webhookUrl = config.bitrix24.webhookUrl.endsWith('/')
    ? config.bitrix24.webhookUrl.slice(0, -1)
    : config.bitrix24.webhookUrl

  useEffect(() => {
    loadFeed()
  }, [])

  const loadFeed = async () => {
    setLoading(true)
    try {
      // Get recent tasks from all municipal workgroups
      const groupIds = [
        ...Object.values(config.bitrix24.groups.Potchefstroom),
        ...Object.values(config.bitrix24.groups.Ventersdorp),
      ]

      const resp = await fetch(`${webhookUrl}/tasks.task.list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter: { GROUP_ID: groupIds },
          order: { CREATED_DATE: 'desc' },
          select: ['ID', 'TITLE', 'STATUS', 'CREATED_DATE', 'GROUP_ID'],
          start: 0,
        }),
      })
      const data = await resp.json()
      const tasks = data.result?.tasks || []

      const mapped: CommunityReport[] = tasks.slice(0, 20).map((t: any) => {
        const type = detectFaultType(t.title)
        // Anonymise — only show area from title
        const titleParts = t.title.split(' - ')
        const area = titleParts.length > 1 ? titleParts[1] : 'General'
        // Determine city from group ID
        const potchGroups = Object.values(config.bitrix24.groups.Potchefstroom)
        const city = potchGroups.includes(t.groupId) ? 'Potchefstroom' : 'Ventersdorp'

        return {
          id: t.id,
          type,
          area,
          status: t.status,
          createdDate: t.createdDate || '',
          city,
        }
      })

      setReports(mapped)
    } catch (e) {
      console.error('Failed to load community feed:', e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all' ? reports : reports.filter(r => r.type === filter)

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="text-white px-4 py-6 shadow-lg" style={{ backgroundColor: '#2E7D32' }}>
        <h1 className="text-2xl font-bold text-center">Community Feed</h1>
        <p className="text-center text-white opacity-90 text-sm mt-2">
          Recent reports in your area
        </p>
      </div>

      {/* Filter chips */}
      <div className="sticky top-0 z-10 bg-white shadow-sm px-4 py-3">
        <div className="flex gap-2 overflow-x-auto">
          {(['all', 'Water', 'Electricity', 'Roads', 'Waste'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border-2 transition-colors ${
                filter === f
                  ? 'border-green-700 bg-green-700 text-white'
                  : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              {f === 'all' ? `All (${reports.length})` : f}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-green-700 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-3">Loading community reports...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <p className="text-gray-500">No reports found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(report => {
              const Icon = TYPE_ICONS[report.type] || WaterIcon
              const statusInfo = STATUS_LABELS[report.status] || STATUS_LABELS['2']

              return (
                <div key={report.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-green-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800 truncate">{report.type} Issue</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{report.area} • {report.city}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                      <ClockIcon className="h-3 w-3" />
                      <span>{getRelativeTime(report.createdDate)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={loadFeed}
            className="text-sm text-green-700 font-semibold"
          >
            🔄 Refresh Feed
          </button>
        </div>
      </div>
    </div>
  )
}

export default CommunityFeed
