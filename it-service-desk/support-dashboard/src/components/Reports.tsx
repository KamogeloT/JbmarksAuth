'use client'

import { useMemo, useState } from 'react'
import {
  SDiMTask, TICKET_STATUS_MAP, TICKET_STATUS_COLORS, PRIORITY_MAP,
  getAssigneeName, parseCallerInfo,
} from '@/lib/sdim-api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts'
import { format, isBefore, differenceInHours, subDays, startOfDay } from 'date-fns'

interface Props {
  tickets: SDiMTask[]
  loading: boolean
}

const PRIORITY_COLORS: Record<string, string> = { '0': '#6b7280', '1': '#2E7D32', '2': '#F9A825' }

type RangeKey = '7' | '30' | '90' | 'all'

export function Reports({ tickets, loading }: Props) {
  const [range, setRange] = useState<RangeKey>('30')
  const [exporting, setExporting] = useState<string | null>(null)

  // Filter by created-date range
  const scoped = useMemo(() => {
    if (range === 'all') return tickets
    const cutoff = subDays(new Date(), parseInt(range, 10))
    return tickets.filter(t => t.createdDate && new Date(t.createdDate) >= cutoff)
  }, [tickets, range])

  const metrics = useMemo(() => computeMetrics(scoped), [scoped])

  // ── Chart datasets ──
  const statusData = Object.entries(TICKET_STATUS_MAP)
    .map(([code, label]) => ({ name: label, value: scoped.filter(t => t.status === code).length, color: TICKET_STATUS_COLORS[code] }))
    .filter(d => d.value > 0)

  const priorityData = Object.entries(PRIORITY_MAP)
    .map(([code, label]) => ({ name: label, value: scoped.filter(t => t.priority === code).length, color: PRIORITY_COLORS[code] }))
    .filter(d => d.value > 0)

  const assigneeData = useMemo(() => {
    const map = new Map<string, number>()
    scoped.forEach(t => {
      const name = getAssigneeName(t)
      map.set(name, (map.get(name) || 0) + 1)
    })
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10)
  }, [scoped])

  const trendData = useMemo(() => buildTrend(scoped, range), [scoped, range])

  // ── Exports ──
  const exportCSV = () => {
    setExporting('csv')
    try {
      const rows = scoped.map(t => reportRow(t))
      const headers = Object.keys(rows[0] || DEFAULT_ROW)
      const csv = [headers.join(','),
        ...rows.map(r => headers.map(h => csvCell((r as any)[h])).join(','))].join('\n')
      downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `service-desk-report-${stamp()}.csv`)
    } finally { setExporting(null) }
  }

  const exportExcel = async () => {
    setExporting('xlsx')
    try {
      const XLSX = await import('xlsx')
      const summary = [
        { Metric: 'Total tickets', Value: metrics.total },
        { Metric: 'Open', Value: metrics.open },
        { Metric: 'Resolved', Value: metrics.resolved },
        { Metric: 'Overdue (open)', Value: metrics.overdue },
        { Metric: 'Unassigned', Value: metrics.unassigned },
        { Metric: 'Resolution rate %', Value: metrics.resolutionRate },
        { Metric: 'Avg resolution (hrs)', Value: metrics.avgResolutionHours },
        { Metric: 'SLA met %', Value: metrics.slaMetRate },
      ]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Summary')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(scoped.map(reportRow)), 'Tickets')
      XLSX.writeFile(wb, `service-desk-report-${stamp()}.xlsx`)
    } finally { setExporting(null) }
  }

  const exportPDF = async () => {
    setExporting('pdf')
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF()
      doc.setFontSize(16); doc.text('JB Marks ICT Service Desk — Report', 14, 18)
      doc.setFontSize(10); doc.setTextColor(120)
      doc.text(`Generated ${format(new Date(), 'PPpp')}  •  Range: ${rangeLabel(range)}`, 14, 25)
      autoTable(doc, {
        startY: 32,
        head: [['Metric', 'Value']],
        body: [
          ['Total tickets', String(metrics.total)],
          ['Open', String(metrics.open)],
          ['Resolved', String(metrics.resolved)],
          ['Overdue (open)', String(metrics.overdue)],
          ['Unassigned', String(metrics.unassigned)],
          ['Resolution rate', `${metrics.resolutionRate}%`],
          ['Avg resolution time', `${metrics.avgResolutionHours} hrs`],
          ['SLA met', `${metrics.slaMetRate}%`],
        ],
        theme: 'grid', headStyles: { fillColor: [27, 94, 32] },
      })
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 8,
        head: [['#', 'Title', 'Status', 'Priority', 'Assignee', 'Created']],
        body: scoped.slice(0, 200).map(t => [
          t.id,
          (t.title || '').slice(0, 40),
          TICKET_STATUS_MAP[t.status] || t.status,
          PRIORITY_MAP[t.priority] || t.priority,
          getAssigneeName(t),
          t.createdDate ? format(new Date(t.createdDate), 'yyyy-MM-dd') : '',
        ]),
        theme: 'striped', headStyles: { fillColor: [27, 94, 32] }, styles: { fontSize: 8 },
      })
      doc.save(`service-desk-report-${stamp()}.pdf`)
    } finally { setExporting(null) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-brand-dark"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-[28px] font-bold text-ios-label tracking-tight">Reports</h1>
          <p className="text-[13px] text-ios-secondary mt-0.5">Operational service desk metrics &amp; SLA performance</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={range} onChange={e => setRange(e.target.value as RangeKey)}
            className="px-3 py-2 rounded-full text-[13px] font-medium bg-gray-100 border-0 focus:ring-2 focus:ring-brand-medium">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          <button onClick={exportCSV} disabled={!!exporting} className="px-3 py-2 bg-gray-100 rounded-full text-[13px] font-medium hover:bg-gray-200 transition-colors disabled:opacity-50">
            {exporting === 'csv' ? '…' : 'CSV'}
          </button>
          <button onClick={exportExcel} disabled={!!exporting} className="px-3 py-2 bg-gray-100 rounded-full text-[13px] font-medium hover:bg-gray-200 transition-colors disabled:opacity-50">
            {exporting === 'xlsx' ? '…' : 'Excel'}
          </button>
          <button onClick={exportPDF} disabled={!!exporting} className="px-4 py-2 bg-brand-dark text-white rounded-full text-[13px] font-semibold hover:bg-brand-medium transition-colors disabled:opacity-50">
            {exporting === 'pdf' ? 'Generating…' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <Kpi label="Total" value={metrics.total} />
        <Kpi label="Resolution Rate" value={`${metrics.resolutionRate}%`} accent="text-brand-dark" />
        <Kpi label="Avg Resolution" value={`${metrics.avgResolutionHours}h`} accent="text-blue-600" />
        <Kpi label="SLA Met" value={`${metrics.slaMetRate}%`} accent={metrics.slaMetRate >= 80 ? 'text-brand-dark' : 'text-red-600'} />
        <Kpi label="Open" value={metrics.open} accent="text-gold-500" />
        <Kpi label="Overdue" value={metrics.overdue} accent="text-red-600" />
        <Kpi label="Unassigned" value={metrics.unassigned} accent="text-purple-600" />
        <Kpi label="Escalated (est.)" value={metrics.overdue} accent="text-red-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-[15px] font-semibold text-ios-label mb-4">Ticket Volume Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="created" name="Created" stroke="#2E7D32" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#1976d2" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-[15px] font-semibold text-ios-label mb-4">By Status</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" strokeWidth={2} stroke="#fff">
                {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip /><Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-[15px] font-semibold text-ios-label mb-4">By Priority</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" name="Tickets" radius={[6, 6, 0, 0]}>
                {priorityData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-[15px] font-semibold text-ios-label mb-4">Workload by Assignee</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={assigneeData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
              <Tooltip />
              <Bar dataKey="value" name="Tickets" fill="#2E7D32" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, accent = 'text-ios-label' }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="card !p-4">
      <p className="text-[11px] text-ios-secondary uppercase tracking-wide font-medium">{label}</p>
      <p className={`text-[26px] font-bold mt-1 ${accent}`}>{value}</p>
    </div>
  )
}

// ── Metrics ──────────────────────────────────────────────────────────
function computeMetrics(tickets: SDiMTask[]) {
  const now = new Date()
  const total = tickets.length
  const resolvedTickets = tickets.filter(t => t.status === '5')
  const open = tickets.filter(t => t.status !== '5' && t.status !== '6').length
  const resolved = resolvedTickets.length
  const overdue = tickets.filter(t => t.status !== '5' && t.status !== '6' && t.deadline && isBefore(new Date(t.deadline), now)).length
  const unassigned = tickets.filter(t => !t.responsibleId || t.responsibleId === '1').length

  // Avg resolution time (created → closed) in hours
  const durations = resolvedTickets
    .filter(t => t.createdDate && t.closedDate)
    .map(t => differenceInHours(new Date(t.closedDate as string), new Date(t.createdDate as string)))
    .filter(h => h >= 0)
  const avgResolutionHours = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0

  // SLA met = resolved on/before deadline
  const withDeadline = resolvedTickets.filter(t => t.deadline && t.closedDate)
  const slaMet = withDeadline.filter(t => !isBefore(new Date(t.deadline as string), new Date(t.closedDate as string))).length
  const slaMetRate = withDeadline.length ? Math.round((slaMet / withDeadline.length) * 100) : 100

  const resolutionRate = total ? Math.round((resolved / total) * 100) : 0

  return { total, open, resolved, overdue, unassigned, avgResolutionHours, slaMetRate, resolutionRate }
}

function buildTrend(tickets: SDiMTask[], range: RangeKey) {
  const days = range === 'all' ? 30 : parseInt(range, 10)
  const buckets: { date: string; created: number; resolved: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const day = startOfDay(subDays(new Date(), i))
    buckets.push({ date: format(day, 'MM/dd'), created: 0, resolved: 0 })
  }
  const idxByDate = new Map(buckets.map((b, i) => [b.date, i]))
  tickets.forEach(t => {
    if (t.createdDate) {
      const k = format(startOfDay(new Date(t.createdDate)), 'MM/dd')
      if (idxByDate.has(k)) buckets[idxByDate.get(k) as number].created++
    }
    if (t.status === '5' && t.closedDate) {
      const k = format(startOfDay(new Date(t.closedDate)), 'MM/dd')
      if (idxByDate.has(k)) buckets[idxByDate.get(k) as number].resolved++
    }
  })
  return buckets
}

// ── Export helpers ───────────────────────────────────────────────────
const DEFAULT_ROW = { ID: '', Title: '', Status: '', Priority: '', Assignee: '', Reporter: '', Created: '', Closed: '', Deadline: '' }

function reportRow(t: SDiMTask) {
  const caller = parseCallerInfo(t.description)
  return {
    ID: t.id,
    Title: t.title || '',
    Status: TICKET_STATUS_MAP[t.status] || t.status,
    Priority: PRIORITY_MAP[t.priority] || t.priority,
    Assignee: getAssigneeName(t),
    Reporter: caller.name || '',
    Department: caller.department || '',
    Created: t.createdDate ? format(new Date(t.createdDate), 'yyyy-MM-dd HH:mm') : '',
    Closed: t.closedDate ? format(new Date(t.closedDate), 'yyyy-MM-dd HH:mm') : '',
    Deadline: t.deadline ? format(new Date(t.deadline), 'yyyy-MM-dd HH:mm') : '',
  }
}

function csvCell(v: any): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function stamp() { return format(new Date(), 'yyyyMMdd-HHmm') }
function rangeLabel(r: RangeKey) { return r === 'all' ? 'All time' : `Last ${r} days` }
