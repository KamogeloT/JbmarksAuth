import React, { useState, useEffect } from 'react'
import { config } from '../config'
import { WaterIcon, PowerIcon, RoadIcon, TrashIcon } from './icons'

interface NearbyReport {
  id: string
  title: string
  type: string
  status: string
  createdDate: string
  address: string
}

interface Props {
  faultType: string
  city: string
  address: string
  onSelectExisting: (taskId: string) => void
  onContinueNew: () => void
}

const STATUS_LABELS: Record<string, string> = {
  '2': 'Reported',
  '3': 'In Progress',
  '4': 'Awaiting',
  '5': 'Resolved',
  '6': 'Deferred',
}

export const DuplicateDetection: React.FC<Props> = ({ faultType, city, address, onSelectExisting, onContinueNew }) => {
  const [similar, setSimilar] = useState<NearbyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [checked, setChecked] = useState(false)

  const webhookUrl = config.bitrix24.webhookUrl.endsWith('/')
    ? config.bitrix24.webhookUrl.slice(0, -1)
    : config.bitrix24.webhookUrl

  useEffect(() => {
    findSimilar()
  }, [faultType, city, address])

  const findSimilar = async () => {
    setLoading(true)
    try {
      // Get the group IDs for this city + fault type
      const selectedCity = city === 'Ventersdorp' ? 'Ventersdorp' : 'Potchefstroom'
      const groupMap: Record<string, string> = config.bitrix24.groups[selectedCity]
      const typeKey = faultType.toLowerCase() as 'water' | 'electricity' | 'roads' | 'waste'
      const groupId = groupMap[typeKey]

      // Search for recent open tasks in the same group
      const resp = await fetch(`${webhookUrl}/tasks.task.list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter: {
            GROUP_ID: groupId,
            '!STATUS': [5, 6], // Not resolved or deferred
          },
          order: { CREATED_DATE: 'desc' },
          select: ['ID', 'TITLE', 'STATUS', 'CREATED_DATE', 'DESCRIPTION'],
          start: 0,
        }),
      })
      const data = await resp.json()
      const tasks = data.result?.tasks || []

      // Filter for potentially similar issues (by address keywords)
      const addressWords = address.toLowerCase().split(/[\s,]+/).filter(w => w.length > 3)
      
      const similar: NearbyReport[] = tasks
        .filter((t: any) => {
          const desc = (t.description || '').toLowerCase()
          const title = (t.title || '').toLowerCase()
          // Match if any address keyword appears in the task
          return addressWords.some(word => desc.includes(word) || title.includes(word))
        })
        .slice(0, 5)
        .map((t: any) => {
          // Extract address from description
          const addrMatch = (t.description || '').match(/Location:\s*(.+)/i)
          return {
            id: t.id,
            title: t.title,
            type: faultType,
            status: t.status,
            createdDate: t.createdDate || '',
            address: addrMatch ? addrMatch[1].trim() : '',
          }
        })

      setSimilar(similar)
      setChecked(true)
    } catch (e) {
      console.error('Duplicate check failed:', e)
      setChecked(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
        <p className="text-sm text-blue-700 flex items-center justify-center gap-2">
          <span className="animate-spin">🔍</span> Checking for similar reports nearby...
        </p>
      </div>
    )
  }

  if (checked && similar.length === 0) {
    return null // No duplicates found, proceed normally
  }

  return (
    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
      <h4 className="text-sm font-bold text-yellow-800 mb-2">
        ⚠️ Similar reports found nearby
      </h4>
      <p className="text-xs text-yellow-700 mb-3">
        We found {similar.length} existing {faultType.toLowerCase()} report{similar.length > 1 ? 's' : ''} in your area. Is one of these your issue?
      </p>

      <div className="space-y-2 mb-4">
        {similar.map(report => (
          <button
            key={report.id}
            onClick={() => onSelectExisting(report.id)}
            className="w-full text-left bg-white rounded-lg p-3 border border-yellow-200 hover:border-yellow-400 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{report.title}</p>
                {report.address && <p className="text-[10px] text-gray-500 truncate">📍 {report.address}</p>}
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold ml-2 flex-shrink-0">
                {STATUS_LABELS[report.status] || 'Open'}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Reported {report.createdDate ? new Date(report.createdDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) : ''}
            </p>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onContinueNew}
          className="flex-1 px-4 py-2.5 bg-green-700 text-white rounded-lg text-sm font-bold"
        >
          No, report new issue
        </button>
      </div>
    </div>
  )
}

export default DuplicateDetection
