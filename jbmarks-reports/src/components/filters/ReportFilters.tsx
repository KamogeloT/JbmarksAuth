'use client'

import { useState, useEffect } from 'react'
import { getBitrixApi, BitrixWorkgroup } from '@/lib/bitrix-api'

export interface FilterState {
  groupId: string
  userId: string
  dateFrom: string
  dateTo: string
}

interface ReportFiltersProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
}

const DATE_PRESETS = [
  { label: 'Today', getValue: () => { const d = new Date().toISOString().split('T')[0]; return { from: d, to: d } } },
  { label: 'This Week', getValue: () => { const now = new Date(); const start = new Date(now); start.setDate(now.getDate() - now.getDay()); return { from: start.toISOString().split('T')[0], to: now.toISOString().split('T')[0] } } },
  { label: 'This Month', getValue: () => { const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), 1); return { from: start.toISOString().split('T')[0], to: now.toISOString().split('T')[0] } } },
  { label: 'Last 7 Days', getValue: () => { const now = new Date(); const start = new Date(now); start.setDate(now.getDate() - 7); return { from: start.toISOString().split('T')[0], to: now.toISOString().split('T')[0] } } },
  { label: 'Last 30 Days', getValue: () => { const now = new Date(); const start = new Date(now); start.setDate(now.getDate() - 30); return { from: start.toISOString().split('T')[0], to: now.toISOString().split('T')[0] } } },
  { label: 'Last 90 Days', getValue: () => { const now = new Date(); const start = new Date(now); start.setDate(now.getDate() - 90); return { from: start.toISOString().split('T')[0], to: now.toISOString().split('T')[0] } } },
  { label: 'This Year', getValue: () => { const now = new Date(); const start = new Date(now.getFullYear(), 0, 1); return { from: start.toISOString().split('T')[0], to: now.toISOString().split('T')[0] } } },
]

export function ReportFilters({ filters, onChange }: ReportFiltersProps) {
  const [workgroups, setWorkgroups] = useState<BitrixWorkgroup[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [showPresets, setShowPresets] = useState(false)

  useEffect(() => {
    const fetchWorkgroups = async () => {
      setLoadingGroups(true)
      try {
        const api = getBitrixApi()
        const groups = await api.getWorkgroups()
        setWorkgroups(groups)
      } catch (e) {
        console.warn('Failed to load workgroups:', e)
      } finally {
        setLoadingGroups(false)
      }
    }
    fetchWorkgroups()
  }, [])

  const hasFilters = filters.groupId || filters.userId || filters.dateFrom || filters.dateTo

  const applyPreset = (preset: typeof DATE_PRESETS[0]) => {
    const { from, to } = preset.getValue()
    onChange({ ...filters, dateFrom: from, dateTo: to })
    setShowPresets(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {/* Date range */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full text-[13px] font-medium text-ios-label shadow-ios hover:shadow-ios-lg transition-all flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 text-brand-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {filters.dateFrom || filters.dateTo ? (
              <span>{filters.dateFrom || '...'} → {filters.dateTo || '...'}</span>
            ) : (
              <span>Date Range</span>
            )}
          </button>

          {showPresets && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-ios-xl border border-white/50 overflow-hidden z-50">
              <div className="px-3 py-2 border-b border-ios-separator">
                <p className="text-[11px] font-semibold text-ios-tertiary uppercase tracking-wide">Quick Select</p>
              </div>
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-ios-label hover:bg-primary-50/60 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
              <div className="border-t border-ios-separator px-3 py-3">
                <p className="text-[11px] font-semibold text-ios-tertiary uppercase tracking-wide mb-2">Custom Range</p>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => { onChange({ ...filters, dateFrom: e.target.value }); }}
                    className="flex-1 px-2 py-1.5 bg-gray-100 rounded-lg text-[12px] outline-none border-0"
                  />
                  <span className="text-[11px] text-ios-tertiary">to</span>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => { onChange({ ...filters, dateTo: e.target.value }); }}
                    className="flex-1 px-2 py-1.5 bg-gray-100 rounded-lg text-[12px] outline-none border-0"
                  />
                </div>
              </div>
              <button
                onClick={() => setShowPresets(false)}
                className="w-full text-center px-4 py-2 text-[12px] font-medium text-brand-medium border-t border-ios-separator hover:bg-gray-50 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Group filter */}
      <select
        value={filters.groupId}
        onChange={(e) => onChange({ ...filters, groupId: e.target.value })}
        className="px-4 py-2 bg-white/80 backdrop-blur-sm border-0 rounded-full text-[13px] font-medium text-ios-label shadow-ios focus:ring-2 focus:ring-brand-medium/30 outline-none appearance-none cursor-pointer pr-8"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2386868b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '16px' }}
      >
        <option value="">All Groups</option>
        {workgroups.map((g) => (
          <option key={g.GROUP_ID} value={g.GROUP_ID}>
            {g.GROUP_NAME}
          </option>
        ))}
      </select>

      {/* User ID */}
      <input
        type="text"
        value={filters.userId}
        onChange={(e) => onChange({ ...filters, userId: e.target.value })}
        placeholder="User ID"
        className="px-4 py-2 bg-white/80 backdrop-blur-sm border-0 rounded-full text-[13px] font-medium text-ios-label shadow-ios w-28 focus:ring-2 focus:ring-brand-medium/30 outline-none placeholder:text-ios-tertiary"
      />

      {/* Clear all */}
      {hasFilters && (
        <button
          onClick={() => onChange({ groupId: '', userId: '', dateFrom: '', dateTo: '' })}
          className="px-3 py-2 text-[13px] font-medium text-brand-medium hover:text-brand-dark rounded-full hover:bg-primary-50/60 transition-all duration-200"
        >
          Clear all
        </button>
      )}

      {loadingGroups && (
        <span className="text-[11px] text-ios-tertiary animate-pulse">Loading...</span>
      )}
    </div>
  )
}
