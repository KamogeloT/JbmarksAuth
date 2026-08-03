'use client'

import { useState, useEffect } from 'react'

interface ReservoirReading {
  reservoirId: string
  levelPercent: number
  status: string
}

interface WaterLevelSubmission {
  id: string
  date: string
  submittedBy: string
  submittedByName: string
  submittedAt: string
  readings: ReservoirReading[]
}

interface ReservoirInfo {
  id: string
  name: string
  cluster: string
  capacityMl?: number
}

const RESERVOIRS: ReservoirInfo[] = [
  { id: 'vyfhoek_complex', name: 'Vyfhoek Complex', cluster: 'Vyfhoek' },
  { id: 'old_plant', name: 'Old Plant', cluster: 'Vyfhoek' },
  { id: 'ventersdorp_res1', name: 'Res 1', cluster: 'Ventersdorp', capacityMl: 15 },
  { id: 'ventersdorp_res2', name: 'Res 2', cluster: 'Ventersdorp', capacityMl: 13.5 },
  { id: 'ventersdorp_res3', name: 'Res 3', cluster: 'Ventersdorp', capacityMl: 9.5 },
  { id: 'eesterandjies_5ml', name: '5ML', cluster: 'Eesterandjies', capacityMl: 5 },
  { id: 'eesterandjies_10ml', name: '10ML', cluster: 'Eesterandjies', capacityMl: 10 },
  { id: 'ikageng_main', name: 'Main', cluster: 'Ikageng' },
  { id: 'ikageng_west', name: 'West', cluster: 'Ikageng' },
]

const API_BASE = 'https://jbmarksauth-production.up.railway.app/api/water-levels'

function getLevelColor(percent: number): string {
  if (percent >= 80) return 'bg-green-500'
  if (percent >= 50) return 'bg-amber-500'
  if (percent >= 30) return 'bg-orange-500'
  return 'bg-red-500'
}

function getStatusBadge(status: string): string {
  switch (status) {
    case 'STABLE': return 'bg-green-100 text-green-700'
    case 'CLIMBING': return 'bg-blue-100 text-blue-700'
    case 'RECOVERING': return 'bg-yellow-100 text-yellow-700'
    case 'CRITICAL': return 'bg-red-100 text-red-700'
    case 'DECLINING': return 'bg-red-100 text-red-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

export function WaterLevelsReport() {
  const [mergedReadings, setMergedReadings] = useState<Record<string, ReservoirReading>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [lastUpdated, setLastUpdated] = useState('')

  useEffect(() => {
    fetchData()
  }, [selectedDate])

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}?date=${selectedDate}&limit=10`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data: WaterLevelSubmission[] = await res.json()

      // Merge: most recent reading per reservoir wins
      const merged: Record<string, ReservoirReading> = {}
      const sorted = data.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''))
      for (const sub of sorted) {
        for (const reading of sub.readings) {
          if (!merged[reading.reservoirId]) {
            merged[reading.reservoirId] = reading
          }
        }
      }
      setMergedReadings(merged)
      if (sorted.length > 0) setLastUpdated(sorted[0].submittedAt)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const clusters = Array.from(new Set(RESERVOIRS.map(r => r.cluster)))
  const hasData = Object.keys(mergedReadings).length > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">💧 Water Levels Report</h2>
          <p className="text-sm text-gray-500 mt-1">Reservoir status across JB Marks Municipality</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm"
          />
          <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
            Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && !hasData && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <span className="text-4xl block mb-3">💧</span>
          <p className="text-gray-500 font-medium">No data for {selectedDate}</p>
          <p className="text-gray-400 text-sm mt-1">Select a different date or wait for submissions.</p>
        </div>
      )}

      {!loading && !error && hasData && (
        <>
          {lastUpdated && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <span className="text-sm text-gray-500">
                Last updated: {new Date(lastUpdated).toLocaleString('en-ZA')}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {clusters.map(cluster => {
              const clusterReservoirs = RESERVOIRS.filter(r => r.cluster === cluster)
              return (
                <div key={cluster} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gray-800 px-4 py-3">
                    <h3 className="font-bold text-sm uppercase tracking-wide text-white">{cluster}</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    {clusterReservoirs.map(reservoir => {
                      const reading = mergedReadings[reservoir.id]
                      const percent = reading?.levelPercent ?? 0
                      const status = reading?.status ?? 'N/A'

                      return (
                        <div key={reservoir.id}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-semibold text-gray-800">
                              {reservoir.name}
                              {reservoir.capacityMl && <span className="text-xs text-gray-400 ml-1">({reservoir.capacityMl}ML)</span>}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-gray-900">{percent.toFixed(1)}%</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${getStatusBadge(status)}`}>{status}</span>
                            </div>
                          </div>
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${getLevelColor(percent)}`} style={{ width: `${Math.min(percent, 100)}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
