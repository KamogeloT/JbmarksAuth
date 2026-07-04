import { useState } from 'react'
import { NetworkNode, checkNode } from '../lib/monitor'

interface Props {
  nodes: NetworkNode[]
  onAdd: (node: Omit<NetworkNode, 'id'>) => void
  onEdit: (id: string, updates: Partial<NetworkNode>) => void
  onDelete: (id: string) => void
  onClose: () => void
}

const NODE_TYPES: { value: NetworkNode['type']; label: string; icon: string }[] = [
  { value: 'server', label: 'Server', icon: '🖥️' },
  { value: 'website', label: 'Website', icon: '🌐' },
  { value: 'router', label: 'Router', icon: '📡' },
  { value: 'switch', label: 'Switch', icon: '🔌' },
  { value: 'printer', label: 'Printer', icon: '🖨️' },
  { value: 'service', label: 'Service', icon: '⚙️' },
  { value: 'other', label: 'Other', icon: '📦' },
]

export function ConfigPanel({ nodes, onAdd, onEdit, onDelete, onClose }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ status: string; time: number; error?: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    url: '',
    location: '',
    type: 'server' as NetworkNode['type'],
    timeout: 10000,
  })

  const resetForm = () => {
    setForm({ name: '', url: '', location: '', type: 'server', timeout: 10000 })
    setEditingId(null)
    setShowForm(false)
    setTestResult(null)
  }

  const handleTest = async () => {
    if (!form.url) return
    setTesting(true)
    setTestResult(null)
    try {
      const result = await checkNode({
        id: 'test',
        name: form.name || 'Test',
        url: form.url,
        location: '',
        type: form.type,
        timeout: form.timeout,
      })
      setTestResult({ status: result.status, time: result.responseTime, error: result.error })
    } catch {
      setTestResult({ status: 'down', time: 0, error: 'Connection failed' })
    } finally {
      setTesting(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.url) return

    if (editingId) {
      onEdit(editingId, form)
    } else {
      onAdd(form)
    }
    resetForm()
  }

  const handleEditClick = (node: NetworkNode) => {
    setForm({
      name: node.name,
      url: node.url,
      location: node.location,
      type: node.type,
      timeout: node.timeout || 10000,
    })
    setEditingId(node.id)
    setShowForm(true)
  }

  const handleDeleteClick = (id: string, name: string) => {
    if (confirm(`Delete "${name}"? This cannot be undone.`)) {
      onDelete(id)
    }
  }

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">⚙️ Network Configuration</h1>
          <p className="text-sm text-slate-400 mt-1">Add, edit, or remove network nodes to monitor</p>
        </div>
        <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors">
          ← Back to Dashboard
        </button>
      </div>

      {/* Add Node Button */}
      {!showForm && (
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="mb-6 px-5 py-3 bg-green-600 hover:bg-green-500 rounded-xl text-white font-semibold transition-colors"
        >
          + Add New Node
        </button>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl p-6 mb-6 border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4">
            {editingId ? '✏️ Edit Node' : '➕ Add New Node'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Node Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Main Server"
                className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-green-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">URL / IP Address *</label>
              <input
                type="text"
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="e.g. https://example.com or 192.168.1.1"
                className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-green-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Location / Description</label>
              <input
                type="text"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Server Room A, Azure Cloud"
                className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Node Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as NetworkNode['type'] }))}
                className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-green-500 focus:outline-none"
              >
                {NODE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Timeout (ms)</label>
              <input
                type="number"
                value={form.timeout}
                onChange={e => setForm(f => ({ ...f, timeout: Number(e.target.value) }))}
                placeholder="10000"
                className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !form.url}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-semibold text-sm transition-colors disabled:opacity-40"
            >
              {testing ? '⟳ Testing...' : '🔌 Test Connection'}
            </button>
            <button type="submit" disabled={!testResult || testResult.status === 'down'} className="px-5 py-2.5 bg-green-600 hover:bg-green-500 rounded-lg text-white font-semibold text-sm transition-colors disabled:opacity-40">
              {editingId ? '💾 Save Changes' : '➕ Add Node'}
            </button>
            <button type="button" onClick={resetForm} className="px-5 py-2.5 bg-slate-600 hover:bg-slate-500 rounded-lg text-white text-sm transition-colors">
              Cancel
            </button>
          </div>
          {/* Test Result */}
          {testResult && (
            <div className={`mt-4 p-3 rounded-lg border text-sm ${
              testResult.status === 'up' ? 'bg-green-900/20 border-green-700 text-green-400' :
              testResult.status === 'slow' ? 'bg-yellow-900/20 border-yellow-700 text-yellow-400' :
              'bg-red-900/20 border-red-700 text-red-400'
            }`}>
              {testResult.status === 'up' && `✅ Connection successful — ${testResult.time}ms response time`}
              {testResult.status === 'slow' && `⚠️ Connection slow — ${testResult.time}ms response time`}
              {testResult.status === 'down' && `❌ Connection failed${testResult.error ? ` — ${testResult.error}` : ''}`}
            </div>
          )}
        </form>
      )}

      {/* Nodes List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
          Configured Nodes ({nodes.length})
        </h3>
        {nodes.length === 0 ? (
          <p className="text-slate-500 text-sm py-8 text-center">No nodes configured yet. Add one above.</p>
        ) : (
          nodes.map(node => (
            <div key={node.id} className="flex items-center gap-4 bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors">
              <div className="text-2xl">{NODE_TYPES.find(t => t.value === node.type)?.icon || '📦'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white truncate">{node.name}</h4>
                  <span className="text-[10px] px-2 py-0.5 bg-slate-700 rounded-full text-slate-400">{node.type}</span>
                </div>
                <p className="text-xs text-slate-400 truncate">{node.url}</p>
                {node.location && <p className="text-xs text-slate-500 truncate">{node.location}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditClick(node)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-white transition-colors"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDeleteClick(node.id, node.name)}
                  className="px-3 py-1.5 bg-red-900/30 hover:bg-red-900/60 border border-red-800/50 rounded-lg text-xs text-red-400 transition-colors"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
