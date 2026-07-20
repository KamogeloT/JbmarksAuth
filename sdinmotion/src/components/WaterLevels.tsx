import React, { useState, useEffect } from 'react'

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

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
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

interface WaterLevelsProps {
  onBack?: () => void
}

export const WaterLevels: React.FC<WaterLevelsProps> = ({ onBack }) => {
  const [reservoirs, setReservoirs] = useState<MergedReservoir[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const fetchWaterLevels = async () => {
    setLoading(true)
    setError('')
    try {
      const today = getToday()
      const resp = await fetch(
        `https://jbmarksauth-production.up.railway.app/api/water-levels?date=${today}&limit=10`
      )
      if (!resp.ok) throw new Error('Failed to fetch water levels')
      const data: WaterLevelSubmission[] = await resp.json()

      // Merge multiple submissions — most recent reading per reservoir wins
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
      }
    } catch (e: any) {
      setError(e.message || 'Unable to load water levels')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWaterLevels()
  }, [])

  // Group reservoirs by cluster
  const clusters = reservoirs.reduce<Record<string, MergedReservoir[]>>((acc, r) => {
    if (!acc[r.cluster]) acc[r.cluster] = []
    acc[r.cluster].push(r)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="text-white px-4 py-6 shadow-lg" style={{ backgroundColor: '#2E7D32' }}>
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="text-white text-xl">
              ←
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-center">Water Levels</h1>
            <p className="text-center text-white opacity-90 text-sm mt-1">
              Community reservoir status
            </p>
          </div>
          <button
            onClick={fetchWaterLevels}
            className="text-white text-lg"
            aria-label="Refresh"
          >
            🔄
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Last updated */}
        {lastUpdated && !loading && (
          <p className="text-xs text-gray-400 text-center mb-4">
            Last updated: {new Date(lastUpdated).toLocaleTimeString('en-ZA', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-green-700 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-3">Loading water levels...</p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm p-6">
            <p className="text-red-600 font-semibold">Unable to load water levels</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
            <button
              onClick={fetchWaterLevels}
              className="mt-4 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && reservoirs.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm p-6">
            <p className="text-2xl mb-2">💧</p>
            <p className="text-gray-600 font-medium">No readings for today</p>
            <p className="text-sm text-gray-400 mt-1">
              Water level data will appear here once submitted
            </p>
          </div>
        )}

        {/* Cluster groups */}
        {!loading && !error && Object.entries(clusters).map(([cluster, items]) => (
          <div key={cluster} className="mb-6">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
              {cluster}
            </h2>
            <div className="space-y-3">
              {items.map(reservoir => {
                const statusInfo = STATUS_COLORS[reservoir.status] || STATUS_COLORS.moderate
                const barColor = getLevelColor(reservoir.level_percentage)

                return (
                  <div
                    key={reservoir.reservoir_name}
                    className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-800">
                        {reservoir.reservoir_name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusInfo.bg} ${statusInfo.text}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Level bar */}
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${Math.min(reservoir.level_percentage, 100)}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {reservoir.level_percentage}%
                      </span>
                      {reservoir.serving_areas.length > 0 && (
                        <span className="text-xs text-gray-400 truncate ml-2">
                          Serves: {reservoir.serving_areas.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default WaterLevels
