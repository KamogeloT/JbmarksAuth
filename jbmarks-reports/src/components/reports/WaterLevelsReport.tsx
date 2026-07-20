'use client'

import { useState, useEffect } from 'react'

interface WaterLevelReading {
  id: string
  reservoir_name: string
  cluster: string
  level_percentage: number
  status: string
  serving_areas: string[]
  submitted_by: string
  submitted_at: string
}

interface WaterLevelSubmission {
  id: string
  date: string
  submitted_by: string
  submitted_at: string
  readings: WaterLevelReading[]
}

interface MergedReservoir {
  reservoir_name: string
  cluster: string
  level_percentage: number
  status: string
  serving_areas: string[]
  submitted_by: string
  submitted_at: string
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-red-100', text: 'text-red-700', label: 'Critical' },
  low: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Low' },
  moderate: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Moderate' },
  good: { bg: 'bg-green-100', text: 'text-green-700', label: 'Good' },
  full: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Full' },
}

function getLevelColor(percentage: number): string {
  if (percentage <= 20) return 'bg-red-500'
  if (percentage <= 40) return 'bg-orange-500'
  if (percentage <= 60) return 'bg-yellow-500'
  if (percentage <= 80) return 'bg-green-500'
  return 'bg-blue-500'
}

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

export function WaterLevelsReport() {
  const [reservoirs, setReservoirs] = useState<MergedReservoir[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState(getToday())
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const fetchWaterLevels = async (date: string) => {
    setLoading(true)
    setError('')
    try {
      const resp = await fetch(
        `https://jbmarksauth-production.up.railway.app/api/water-levels?date=${date}&limit=10`
      )
      if (!resp.ok) throw new Error('Failed to fetch water levels')
      const data: WaterLevelSubmission[] = await resp.json()

      // Merge multiple submissions for the day — most recent reading per reservoir wins
      const reservoirMap = new Map<string, MergedReservoir>()

      // Sort submissions oldest first so newer ones overwrite
      const sorted = [...data].sort(
        (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
      )

      for (const submission of sorted) {
        for (const reading of submission.readings) {
          reservoirMap.set(reading.reservoir_name, {
            reservoir_name: reading.reservoir_name,
            cluster: reading.cluster,
            level_percentage: reading.level_percentage,
            status: reading.status,
            serving_areas: reading.serving_areas,
            submitted_by: reading.submitted_by || submission.submitted_by,
            submitted_at: reading.submitted_at || submission.submitted_at,
          })
        }
      }

      const merged = Array.from(reservoirMap.values())
      setReservoirs(merged)

      if (merged.length > 0) {
        const latest = merged.reduce((a, b) =>
          new Date(a.submitted_at) > new Date(b.submitted_at) ? a : b
        )
        setLastUpdated(latest.submitted_at)
      } else {
        setLastUpdated('')
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unable to load water levels'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWaterLevels(selectedDate)
  }, [selectedDate])

  // Group reservoirs by cluster
  const clusters = reservoirs.reduce<Record<string, MergedReservoir[]>>((acc, r) => {
    if (!acc[r.cluster]) acc[r.cluster] = []
    acc[r.cluster].push(r)
    return acc
  }, {})

  // Use Array.from(new Set(...)) for TypeScript compatibility
  const clusterNames = Array.from(new Set(reservoirs.map(r => r.cluster)))

  // Summary stats
  const totalReservoirs = reservoirs.length
  const avgLevel = totalReservoirs > 0
    ? Math.round(reservoirs.reduce((sum, r) => sum + r.level_percentage, 0) / totalReservoirs)
    : 0
  const criticalCount = reservoirs.filter(r => r.status === 'critical' || r.status === 'low').length

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-brand-dark"></div>
        <span className="text-[13px] text-ios-secondary">Loading water level data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card text-center py-10">
        <p className="text-[15px] font-semibold text-red-600">Unable to load report</p>
        <p className="text-[13px] text-ios-secondary mt-1">{error}</p>
        <button onClick={() => fetchWaterLevels(selectedDate)} className="btn-primary mt-4">
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6" id="report-content">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-[28px] font-bold text-ios-label tracking-tight">
            Water Levels
          </h1>
          <p className="text-[13px] sm:text-[15px] text-ios-secondary mt-0.5">
            Daily reservoir status across JB Marks
          </p>
        </div>
        {lastUpdated && (
          <span className="text-[12px] text-ios-secondary">
            Last updated: {new Date(lastUpdated).toLocaleTimeString('en-ZA', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>

      {/* Date picker */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <label className="text-[13px] font-medium text-ios-label">Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={getToday()}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] text-ios-label"
          />
          <button
            onClick={() => setSelectedDate(getToday())}
            className="text-[12px] text-brand-dark font-semibold hover:underline"
          >
            Today
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-[12px] text-ios-secondary uppercase tracking-wide">Reservoirs</p>
          <p className="text-[28px] font-bold text-ios-label">{totalReservoirs}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-[12px] text-ios-secondary uppercase tracking-wide">Avg Level</p>
          <p className="text-[28px] font-bold text-ios-label">{avgLevel}%</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-[12px] text-ios-secondary uppercase tracking-wide">Critical/Low</p>
          <p className={`text-[28px] font-bold ${criticalCount > 0 ? 'text-red-600' : 'text-ios-label'}`}>
            {criticalCount}
          </p>
        </div>
      </div>

      {/* Empty state */}
      {reservoirs.length === 0 && (
        <div className="card text-center py-10">
          <p className="text-2xl mb-2">💧</p>
          <p className="text-[15px] font-medium text-ios-label">No readings for this date</p>
          <p className="text-[13px] text-ios-secondary mt-1">
            Water level data will appear here once submitted
          </p>
        </div>
      )}

      {/* Cluster cards */}
      {clusterNames.map(cluster => {
        const items = clusters[cluster]
        const clusterAvg = Math.round(
          items.reduce((sum, r) => sum + r.level_percentage, 0) / items.length
        )

        return (
          <div key={cluster} className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-ios-label">{cluster}</h3>
              <span className="text-[12px] text-ios-secondary">
                Avg: {clusterAvg}%
              </span>
            </div>

            <div className="space-y-4">
              {items.map(reservoir => {
                const statusInfo = STATUS_CONFIG[reservoir.status] || STATUS_CONFIG.moderate
                const barColor = getLevelColor(reservoir.level_percentage)

                return (
                  <div key={reservoir.reservoir_name} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13px] font-medium text-ios-label">
                        {reservoir.reservoir_name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusInfo.bg} ${statusInfo.text}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Level bar */}
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${Math.min(reservoir.level_percentage, 100)}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-medium text-ios-label">
                        {reservoir.level_percentage}%
                      </span>
                      {reservoir.serving_areas.length > 0 && (
                        <span className="text-[11px] text-ios-secondary truncate ml-2">
                          Serves: {reservoir.serving_areas.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
