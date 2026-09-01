'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

/**
 * Service Desk Configuration Register (Admin only).
 * Edits the 7 configuration items: categories, priorities, statuses,
 * assignment, escalation, notifications, reporting. Persists to the backend.
 */
export function Settings() {
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    apiFetch('/api/config')
      .then(r => r.json())
      .then(d => setConfig(d.config))
      .catch(() => setMsg('Failed to load configuration'))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true); setMsg('')
    try {
      const res = await apiFetch('/api/config', { method: 'PUT', body: JSON.stringify({ config }) })
      const d = await res.json()
      if (res.ok && d.success) setMsg('✓ Configuration saved')
      else setMsg(d.message || 'Save failed')
    } catch { setMsg('Save failed') } finally { setSaving(false) }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-brand-dark" /></div>
  }
  if (!config) return <p className="text-red-600">{msg || 'No configuration available.'}</p>

  const set = (path: string, value: any) => {
    setConfig((prev: any) => {
      const next = structuredClone(prev)
      const keys = path.split('.')
      let o = next
      for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]]
      o[keys[keys.length - 1]] = value
      return next
    })
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] sm:text-[28px] font-bold text-ios-label tracking-tight">Settings</h1>
          <p className="text-[13px] text-ios-secondary mt-0.5">Service Desk configuration register</p>
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className={`text-[13px] ${msg.startsWith('✓') ? 'text-brand-dark' : 'text-red-600'}`}>{msg}</span>}
          <button onClick={save} disabled={saving} className="px-5 py-2 bg-brand-dark text-white rounded-full text-[13px] font-semibold hover:bg-brand-medium disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Ticket Categories */}
      <Section title="Ticket Categories" subtitle="IT incident/request categories">
        {config.categories.map((c: any, i: number) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <input value={c.icon || ''} onChange={e => setArr('categories', i, 'icon', e.target.value)} className="w-12 input" placeholder="🔧" />
            <input value={c.label} onChange={e => setArr('categories', i, 'label', e.target.value)} className="flex-1 input" placeholder="Category name" />
            <input value={(c.issues || []).join(', ')} onChange={e => setArr('categories', i, 'issues', e.target.value.split(',').map((s: string) => s.trim()))} className="flex-[2] input" placeholder="Sub-issues, comma separated" />
            <button onClick={() => removeArr('categories', i)} className="del">✕</button>
          </div>
        ))}
        <button onClick={() => addArr('categories', { id: `cat${Date.now()}`, label: '', icon: '🔧', issues: [] })} className="addBtn">+ Add category</button>
      </Section>

      {/* Priorities */}
      <Section title="Priorities" subtitle="Priority levels, colours and SLA deadline (hours)">
        {config.priorities.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <input value={p.label} onChange={e => setArr('priorities', i, 'label', e.target.value)} className="flex-1 input" placeholder="Label" />
            <select value={p.value} onChange={e => setArr('priorities', i, 'value', e.target.value)} className="input w-28">
              <option value="0">Bitrix Low</option><option value="1">Bitrix Normal</option><option value="2">Bitrix High</option>
            </select>
            <input type="color" value={p.color || '#2E7D32'} onChange={e => setArr('priorities', i, 'color', e.target.value)} className="w-10 h-9 rounded border-0" />
            <input type="number" value={p.deadlineHours ?? 24} onChange={e => setArr('priorities', i, 'deadlineHours', parseInt(e.target.value || '0', 10))} className="input w-24" placeholder="SLA hrs" />
            <span className="text-[11px] text-ios-secondary">hrs</span>
            <button onClick={() => removeArr('priorities', i)} className="del">✕</button>
          </div>
        ))}
        <button onClick={() => addArr('priorities', { id: `pri${Date.now()}`, label: '', value: '1', color: '#2E7D32', deadlineHours: 24 })} className="addBtn">+ Add priority</button>
      </Section>

      {/* Statuses */}
      <Section title="Statuses" subtitle="Ticket lifecycle statuses (Bitrix status codes)">
        {config.statuses.map((s: any, i: number) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <input value={s.code} onChange={e => setArr('statuses', i, 'code', e.target.value)} className="input w-20" placeholder="Code" />
            <input value={s.label} onChange={e => setArr('statuses', i, 'label', e.target.value)} className="flex-1 input" placeholder="Label" />
            <input type="color" value={s.color || '#3b82f6'} onChange={e => setArr('statuses', i, 'color', e.target.value)} className="w-10 h-9 rounded border-0" />
          </div>
        ))}
      </Section>

      {/* Assignment */}
      <Section title="Assignment" subtitle="Routing of tickets to IT support">
        <Field label="IT Support Group ID">
          <input value={config.assignment.itGroupId} onChange={e => set('assignment.itGroupId', e.target.value)} className="input w-40" />
        </Field>
        <Field label="Unassigned queue user ID">
          <input value={config.assignment.unassignedUserId} onChange={e => set('assignment.unassignedUserId', e.target.value)} className="input w-40" />
        </Field>
      </Section>

      {/* Escalation */}
      <Section title="Escalation" subtitle="Automatic escalation workflow">
        <Toggle label="Escalation enabled" checked={!!config.escalation.enabled} onChange={v => set('escalation.enabled', v)} />
        <Field label="Scan interval (minutes)">
          <input type="number" value={config.escalation.intervalMinutes} onChange={e => set('escalation.intervalMinutes', parseInt(e.target.value || '0', 10))} className="input w-28" />
        </Field>
        <Field label="Unassigned SLA (minutes)">
          <input type="number" value={config.escalation.unassignedSlaMinutes} onChange={e => set('escalation.unassignedSlaMinutes', parseInt(e.target.value || '0', 10))} className="input w-28" />
        </Field>
        <Field label="Escalation notify email">
          <input value={config.escalation.notifyEmail} onChange={e => set('escalation.notifyEmail', e.target.value)} className="input w-72" />
        </Field>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" subtitle="Which ticket events send emails">
        {['onCreated', 'onAssigned', 'onStatusChanged', 'onCommentAdded', 'onResolved', 'onReopened'].map(k => (
          <Toggle key={k} label={k.replace('on', 'On ')} checked={!!config.notifications[k]} onChange={v => set(`notifications.${k}`, v)} />
        ))}
        <Field label="Sender address">
          <input value={config.notifications.senderAddress} onChange={e => set('notifications.senderAddress', e.target.value)} className="input w-72" />
        </Field>
      </Section>

      {/* Reporting */}
      <Section title="Reporting" subtitle="Operational reporting">
        <Toggle label="Reporting enabled" checked={!!config.reporting.enabled} onChange={v => set('reporting.enabled', v)} />
        <Field label="Default range (days)">
          <input type="number" value={config.reporting.defaultRangeDays} onChange={e => set('reporting.defaultRangeDays', parseInt(e.target.value || '0', 10))} className="input w-24" />
        </Field>
        <Field label="SLA target (%)">
          <input type="number" value={config.reporting.slaTargetPercent} onChange={e => set('reporting.slaTargetPercent', parseInt(e.target.value || '0', 10))} className="input w-24" />
        </Field>
      </Section>

      <style jsx>{`
        .input { padding: 0.5rem 0.75rem; background: #f3f4f6; border: 0; border-radius: 0.6rem; font-size: 13px; outline: none; }
        .input:focus { box-shadow: 0 0 0 2px rgba(46,125,50,0.4); }
        .del { color: #dc2626; padding: 0 0.5rem; font-weight: 700; }
        .addBtn { margin-top: 0.25rem; font-size: 13px; color: #1B5E20; font-weight: 600; }
      `}</style>
    </div>
  )

  function setArr(section: string, index: number, key: string, value: any) {
    setConfig((prev: any) => {
      const next = structuredClone(prev)
      next[section][index][key] = value
      return next
    })
  }
  function addArr(section: string, item: any) {
    setConfig((prev: any) => ({ ...prev, [section]: [...prev[section], item] }))
  }
  function removeArr(section: string, index: number) {
    setConfig((prev: any) => ({ ...prev, [section]: prev[section].filter((_: any, i: number) => i !== index) }))
  }
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h3 className="text-[15px] font-semibold text-ios-label">{title}</h3>
      {subtitle && <p className="text-[12px] text-ios-secondary mb-3">{subtitle}</p>}
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[13px] text-ios-label">{label}</span>
      {children}
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[13px] text-ios-label">{label}</span>
      <button onClick={() => onChange(!checked)} className={`w-11 h-6 rounded-full transition-colors ${checked ? 'bg-brand-dark' : 'bg-gray-300'}`}>
        <span className={`block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}
