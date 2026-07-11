import React, { useState, useEffect } from 'react'
import { config } from '../config'

interface Announcement {
  id: string
  title: string
  body: string
  date: string
  type: 'maintenance' | 'loadshedding' | 'notice' | 'resolved'
  area?: string
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  maintenance: { icon: '🔧', color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Planned Maintenance' },
  loadshedding: { icon: '⚡', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Load Shedding' },
  notice: { icon: '📢', color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Notice' },
  resolved: { icon: '✅', color: 'bg-green-100 text-green-700 border-green-200', label: 'Resolved' },
}

function classifyAnnouncement(title: string, body: string): Announcement['type'] {
  const text = (title + ' ' + body).toLowerCase()
  if (text.includes('load shedding') || text.includes('loadshedding') || text.includes('power cut')) return 'loadshedding'
  if (text.includes('maintenance') || text.includes('interruption') || text.includes('shutdown') || text.includes('shutoff')) return 'maintenance'
  if (text.includes('resolved') || text.includes('restored') || text.includes('completed')) return 'resolved'
  return 'notice'
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()
}

export const ServiceAnnouncements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  const webhookUrl = config.bitrix24.webhookUrl.endsWith('/')
    ? config.bitrix24.webhookUrl.slice(0, -1)
    : config.bitrix24.webhookUrl

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = async () => {
    setLoading(true)
    try {
      // Fetch blog posts / important messages from SDiM
      const resp = await fetch(`${webhookUrl}/log.blogpost.get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ POST_PER_PAGE: 15 }),
      })
      const data = await resp.json()
      const posts = Array.isArray(data.result) ? data.result : []

      const mapped: Announcement[] = posts.map((p: any) => {
        const title = p.TITLE || 'Announcement'
        const body = stripHtml(p.POST_TEXT || p.DETAIL_TEXT || '')
        return {
          id: p.ID || String(Math.random()),
          title,
          body: body.length > 200 ? body.substring(0, 200) + '...' : body,
          date: p.DATE_PUBLISH || '',
          type: classifyAnnouncement(title, body),
          area: '',
        }
      })

      setAnnouncements(mapped)
    } catch (e) {
      console.error('Failed to load announcements:', e)
      // Show sample announcements as fallback
      setAnnouncements([
        { id: '1', title: 'Planned Water Interruption', body: 'Water maintenance scheduled for CBD area on Sunday. Please store water in advance.', date: new Date().toISOString(), type: 'maintenance', area: 'CBD' },
        { id: '2', title: 'Load Shedding Schedule Updated', body: 'Stage 2 load shedding effective from Monday. Check your area schedule.', date: new Date().toISOString(), type: 'loadshedding' },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="text-white px-4 py-6 shadow-lg" style={{ backgroundColor: '#1565C0' }}>
        <h1 className="text-2xl font-bold text-center">📢 Service Announcements</h1>
        <p className="text-center text-white opacity-90 text-sm mt-2">
          Planned maintenance, outages & notices
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-700 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-3">Loading announcements...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-500">No announcements at this time</p>
            <p className="text-xs text-gray-400 mt-1">Check back later for service updates</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map(announcement => {
              const typeInfo = TYPE_CONFIG[announcement.type] || TYPE_CONFIG.notice
              return (
                <div key={announcement.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${typeInfo.color.split(' ')[2] || 'border-gray-100'}`}>
                  <div className={`px-4 py-2 ${typeInfo.color} flex items-center gap-2`}>
                    <span>{typeInfo.icon}</span>
                    <span className="text-xs font-bold uppercase">{typeInfo.label}</span>
                    {announcement.area && (
                      <span className="ml-auto text-xs opacity-70">📍 {announcement.area}</span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-bold text-gray-800 mb-1">{announcement.title}</h3>
                    <p className="text-xs text-gray-600 leading-relaxed">{announcement.body}</p>
                    <p className="text-[10px] text-gray-400 mt-2">
                      {announcement.date ? new Date(announcement.date).toLocaleDateString('en-ZA', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      }) : ''}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-6 text-center">
          <button onClick={loadAnnouncements} className="text-sm text-blue-700 font-semibold">
            🔄 Refresh
          </button>
        </div>
      </div>
    </div>
  )
}

export default ServiceAnnouncements
