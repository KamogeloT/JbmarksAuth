import React, { useState } from 'react';
import { config } from '../config';
import { storageService } from '../services/storageService';
import { SatisfactionRating } from './SatisfactionRating';
interface TaskStatus {
  id: string
  title: string
  status: string
  statusName: string
  priority: string
  createdDate: string
  deadline: string | null
  closedDate: string | null
  responsibleName: string
  description: string
  comments: TaskComment[]
}

interface TaskComment {
  author: string
  date: string
  text: string
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: string; step: number }> = {
  '2': { label: 'Reported', color: '#3b82f6', icon: '📋', step: 1 },
  '3': { label: 'In Progress', color: '#F9A825', icon: '🔧', step: 2 },
  '4': { label: 'Awaiting Feedback', color: '#8b5cf6', icon: '⏳', step: 2 },
  '5': { label: 'Resolved', color: '#1B5E20', icon: '✅', step: 3 },
  '6': { label: 'Deferred', color: '#6b7280', icon: '⏸️', step: 1 },
}

function cleanBBCode(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/\[USER=\d+\]([^[]*)\[\/USER\]/g, '$1')
    .replace(/\[[A-Z]+(?:=[^\]]*)?]/gi, '')
    .replace(/\[\/[A-Z]+]/gi, '')
    .replace(/:[a-f0-9]+:/g, '')
    .replace(/Observers added:.*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const TrackReport: React.FC = () => {
  const [refNumber, setRefNumber] = useState('')
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [showRating, setShowRating] = useState(false)

  const webhookUrl = config.bitrix24.webhookUrl.endsWith('/')
    ? config.bitrix24.webhookUrl.slice(0, -1)
    : config.bitrix24.webhookUrl

  const handleSearch = async () => {
    if (!refNumber.trim()) {
      setError('Please enter a reference number')
      return
    }

    setLoading(true)
    setError('')
    setTaskStatus(null)
    setSearched(true)

    try {
      // First try to find the task ID from local storage
      const localReport = storageService.getReportByRefNumber(refNumber.trim())
      let taskId = localReport?.taskId

      if (!taskId) {
        // Search by reference number in task UF_CRM_TASK field or title
        const searchResp = await fetch(`${webhookUrl}/tasks.task.list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filter: { '%TITLE': refNumber.trim() },
            select: ['ID', 'TITLE'],
            start: 0,
          }),
        })
        const searchData = await searchResp.json()
        const tasks = searchData.result?.tasks || []

        if (tasks.length === 0) {
          // Also try searching in description
          const descResp = await fetch(`${webhookUrl}/tasks.task.list`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filter: { '%DESCRIPTION': refNumber.trim() },
              select: ['ID', 'TITLE'],
              start: 0,
            }),
          })
          const descData = await descResp.json()
          const descTasks = descData.result?.tasks || []
          if (descTasks.length > 0) taskId = descTasks[0].id
        } else {
          taskId = tasks[0].id
        }
      }

      if (!taskId) {
        setError('No report found with this reference number. Please check and try again.')
        setLoading(false)
        return
      }

      // Get full task details
      const taskResp = await fetch(`${webhookUrl}/tasks.task.get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, select: ['*'] }),
      })
      const taskData = await taskResp.json()
      const task = taskData.result?.task

      if (!task) {
        setError('Could not retrieve report details.')
        setLoading(false)
        return
      }

      // Get comments
      let comments: TaskComment[] = []
      try {
        const commResp = await fetch(`${webhookUrl}/task.commentitem.getlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ TASK_ID: taskId }),
        })
        const commData = await commResp.json()
        const rawComments = commData.result || []
        comments = rawComments
          .filter((c: any) => {
            const text = cleanBBCode(c.POST_MESSAGE || '')
            return text.length > 0 && !text.startsWith('Observers added')
          })
          .map((c: any) => ({
            author: c.AUTHOR_NAME || 'System',
            date: c.POST_DATE || '',
            text: cleanBBCode(c.POST_MESSAGE || ''),
          }))
      } catch { /* no comments */ }

      // Get responsible user name
      let responsibleName = 'Unassigned'
      if (task.responsibleId && task.responsibleId !== '1') {
        try {
          const userResp = await fetch(`${webhookUrl}/user.get`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ID: task.responsibleId }),
          })
          const userData = await userResp.json()
          const user = userData.result?.[0]
          if (user) responsibleName = `${user.NAME} ${user.LAST_NAME}`.trim()
        } catch { /* keep unassigned */ }
      }

      setTaskStatus({
        id: task.id,
        title: task.title,
        status: task.status,
        statusName: STATUS_MAP[task.status]?.label || 'Unknown',
        priority: task.priority === '2' ? 'High' : task.priority === '1' ? 'Normal' : 'Low',
        createdDate: task.createdDate || '',
        deadline: task.deadline || null,
        closedDate: task.closedDate || null,
        responsibleName,
        description: task.description || '',
        comments,
      })
    } catch (e) {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const getProgressStep = (): number => {
    if (!taskStatus) return 0
    return STATUS_MAP[taskStatus.status]?.step || 1
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="text-white px-4 py-6 shadow-lg" style={{ backgroundColor: '#2E7D32' }}>
        <h1 className="text-2xl font-bold text-center">Track My Report</h1>
        <p className="text-center text-white opacity-90 text-sm mt-2">
          Enter your reference number to check the status
        </p>
      </div>

      {/* Search Box */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Reference Number
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={refNumber}
              onChange={(e) => setRefNumber(e.target.value)}
              placeholder="e.g. REF1719849283"
              className="flex-1 px-4 py-3 text-base font-medium text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 text-white font-bold rounded-lg transition-colors disabled:opacity-50 border-2 border-green-800"
              style={{ backgroundColor: '#2E7D32' }}
            >
              {loading ? '...' : '🔍'}
            </button>
          </div>

          {/* Quick access from local reports */}
          {!searched && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">Recent reports:</p>
              <div className="flex flex-wrap gap-2">
                {storageService.getAllReports()
                  .filter(r => r.status === 'submitted' && r.taskId)
                  .slice(0, 3)
                  .map(r => (
                    <button
                      key={r.id}
                      onClick={() => { setRefNumber(r.refNumber); }}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-200"
                    >
                      {r.refNumber}
                    </button>
                  ))
                }
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-700 font-medium">❌ {error}</p>
          </div>
        )}

        {/* Results */}
        {taskStatus && (
          <div className="mt-6 space-y-4">
            {/* Status Card */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-4 border-b border-gray-100" style={{ backgroundColor: STATUS_MAP[taskStatus.status]?.color + '15' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl mr-2">{STATUS_MAP[taskStatus.status]?.icon}</span>
                    <span className="text-lg font-bold" style={{ color: STATUS_MAP[taskStatus.status]?.color }}>
                      {taskStatus.statusName}
                    </span>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">
                    #{taskStatus.id}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-gray-800 mt-2">{taskStatus.title}</h3>
              </div>

              {/* Progress Bar */}
              <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-2">
                  {['Reported', 'In Progress', 'Resolved'].map((step, i) => (
                    <div key={step} className="flex flex-col items-center flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        getProgressStep() > i
                          ? 'bg-green-500 text-white'
                          : getProgressStep() === i + 1
                            ? 'bg-yellow-400 text-white'
                            : 'bg-gray-200 text-gray-500'
                      }`}>
                        {getProgressStep() > i ? '✓' : i + 1}
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 text-center">{step}</span>
                    </div>
                  ))}
                </div>
                <div className="relative h-1.5 bg-gray-200 rounded-full mt-1 mx-4">
                  <div
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${((getProgressStep() - 1) / 2) * 100}%`,
                      backgroundColor: '#2E7D32',
                    }}
                  />
                </div>
              </div>

              {/* Details */}
              <div className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Assigned To</p>
                    <p className={`font-semibold ${taskStatus.responsibleName === 'Unassigned' ? 'text-red-500' : 'text-gray-800'}`}>
                      {taskStatus.responsibleName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Priority</p>
                    <p className="font-semibold text-gray-800">{taskStatus.priority}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Reported On</p>
                    <p className="font-semibold text-gray-800">
                      {taskStatus.createdDate ? new Date(taskStatus.createdDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Deadline</p>
                    <p className={`font-semibold ${taskStatus.deadline && new Date(taskStatus.deadline) < new Date() && taskStatus.status !== '5' ? 'text-red-600' : 'text-gray-800'}`}>
                      {taskStatus.deadline ? new Date(taskStatus.deadline).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                  {taskStatus.closedDate && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500">Resolved On</p>
                      <p className="font-semibold text-green-700">
                        {new Date(taskStatus.closedDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Comments / Updates */}
            {taskStatus.comments.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-4">
                <h4 className="text-sm font-bold text-gray-700 mb-3">💬 Updates ({taskStatus.comments.length})</h4>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {taskStatus.comments.map((comment, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-700">{comment.author}</span>
                        <span className="text-[10px] text-gray-400">
                          {comment.date ? new Date(comment.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{comment.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resolved message */}
            {taskStatus.status === '5' && (
              <div className="space-y-4">
                {/* Before/After Photos */}
                {taskStatus.comments.some(c => c.text.includes('RESOLVED_PHOTO') || c.text.includes('After photo')) && (
                  <div className="bg-white rounded-xl shadow-md p-4">
                    <h4 className="text-sm font-bold text-gray-700 mb-3">📷 Before & After</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-gray-500 text-center mb-1">Before</p>
                        <div className="bg-gray-100 rounded-lg h-32 flex items-center justify-center text-gray-400 text-xs">Photo from report</div>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 text-center mb-1">After</p>
                        <div className="bg-green-50 rounded-lg h-32 flex items-center justify-center text-green-600 text-xs border border-green-200">✅ Resolved</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Satisfaction Rating */}
                {!showRating ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <p className="text-green-800 font-semibold mb-2">✅ This issue has been resolved</p>
                    <p className="text-xs text-green-600 mb-3">Was the issue resolved to your satisfaction?</p>
                    <button
                      onClick={() => setShowRating(true)}
                      className="px-5 py-2.5 bg-green-700 text-white rounded-lg text-sm font-bold"
                    >
                      ⭐ Rate Service
                    </button>
                  </div>
                ) : (
                  <SatisfactionRating
                    taskId={taskStatus.id}
                    ticketTitle={taskStatus.title}
                    onClose={() => setShowRating(false)}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default TrackReport
