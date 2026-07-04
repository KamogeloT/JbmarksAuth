import { NetworkNode, NodeStatus } from '../lib/monitor'
import { format } from 'date-fns'

interface Props {
  nodes: NetworkNode[]
  statuses: Record<string, NodeStatus>
  checking: boolean
  onRefresh: () => void
  onOpenConfig: () => void
}

const TYPE_ICONS: Record<string, string> = {
  server: '🖥️',
  website: '🌐',
  router: '📡',
  switch: '🔌',
  printer: '🖨️',
  service: '⚙️',
  other: '📦',
}

export function Dashboard({ nodes, statuses, checking, onRefresh, onOpenConfig }: Props) {
  const upCount = Object.values(statuses).filter(s => s.status === 'up').length
  const downCount = Object.values(statuses).filter(s => s.status === 'down').length
  const slowCount = Object.values(statuses).filter(s => s.status === 'slow').length
  const totalChecked = Object.keys(statuses).length

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="text-2xl font-bold text-white">
            📡 Network Monitor
          </div>
          <span className="text-sm text-slate-400">JB Marks Municipality</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500">
            {checking ? '⟳ Checking...' : `Last check: ${Object.values(statuses)[0]?.lastChecked ? format(new Date(Object.values(statuses)[0].lastChecked), 'HH:mm:ss') : '—'}`}
          </div>
          <button
            onClick={onRefresh}
            disabled={checking}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors disabled:opacity-50"
          >
            {checking ? '⟳' : '🔄'} Refresh
          </button>
          <button
            onClick={onOpenConfig}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors"
          >
            ⚙️ Configure
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-3xl font-bold text-white">{nodes.length}</div>
          <div className="text-xs text-slate-400 mt-1">Total Nodes</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-green-900/50">
          <div className="text-3xl font-bold text-green-400">{upCount}</div>
          <div className="text-xs text-green-400/70 mt-1">Online</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-red-900/50">
          <div className="text-3xl font-bold text-red-400">{downCount}</div>
          <div className="text-xs text-red-400/70 mt-1">Offline</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-yellow-900/50">
          <div className="text-3xl font-bold text-yellow-400">{slowCount}</div>
          <div className="text-xs text-yellow-400/70 mt-1">Slow</div>
        </div>
      </div>

      {/* Nodes Grid */}
      {nodes.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📡</div>
          <p className="text-slate-400 text-lg mb-4">No nodes configured</p>
          <button onClick={onOpenConfig} className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl text-white font-semibold transition-colors">
            ⚙️ Add Nodes
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {nodes.map(node => {
            const status = statuses[node.id]
            const state = status?.status || 'unknown'

            return (
              <div
                key={node.id}
                className={`relative bg-slate-800 rounded-xl p-5 border transition-all ${
                  state === 'up' ? 'border-green-600/30 hover:border-green-500/60' :
                  state === 'down' ? 'border-red-600/50 hover:border-red-400' :
                  state === 'slow' ? 'border-yellow-600/30 hover:border-yellow-500/60' :
                  'border-slate-700 hover:border-slate-600'
                }`}
              >
                {/* Status indicator */}
                <div className={`absolute top-4 right-4 w-3.5 h-3.5 rounded-full ${
                  state === 'up' ? 'bg-green-400 pulse-green' :
                  state === 'down' ? 'bg-red-500 pulse-red' :
                  state === 'slow' ? 'bg-yellow-400' :
                  'bg-slate-500'
                }`} />

                {/* Node info */}
                <div className="text-2xl mb-2">{TYPE_ICONS[node.type] || '📦'}</div>
                <h3 className="text-sm font-bold text-white truncate pr-6">{node.name}</h3>
                <p className="text-xs text-slate-400 truncate mt-1">{node.location}</p>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">{node.url}</p>

                {/* Status details */}
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase ${
                      state === 'up' ? 'text-green-400' :
                      state === 'down' ? 'text-red-400' :
                      state === 'slow' ? 'text-yellow-400' :
                      'text-slate-500'
                    }`}>
                      {state === 'up' ? '● ONLINE' :
                       state === 'down' ? '● OFFLINE' :
                       state === 'slow' ? '● SLOW' :
                       '○ PENDING'}
                    </span>
                    {status && (
                      <span className="text-[10px] text-slate-500">
                        {status.responseTime}ms
                      </span>
                    )}
                  </div>
                  {status?.error && state === 'down' && (
                    <p className="text-[10px] text-red-400/70 mt-1 truncate">{status.error}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-slate-600">
        Auto-refreshes every 30 seconds • {totalChecked} nodes checked
      </div>
    </div>
  )
}
