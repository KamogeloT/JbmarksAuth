import { useState, useEffect, useCallback, useRef } from 'react'
import { NetworkNode, NodeStatus, checkNode, checkAllNodesBatch } from './lib/monitor'
import { loadNodes, loadNodesCache, saveNodes } from './lib/storage'
import { playAlertSound } from './lib/sounds'
import { Dashboard } from './components/Dashboard'
import { ConfigPanel } from './components/ConfigPanel'

export default function App() {
  // Seed from the offline cache so the UI renders instantly, then hydrate
  // from the shared backend on mount.
  const [nodes, setNodes] = useState<NetworkNode[]>(() => loadNodesCache())
  const [statuses, setStatuses] = useState<Record<string, NodeStatus>>({})
  const [showConfig, setShowConfig] = useState(false)
  const [checking, setChecking] = useState(false)
  const prevDownRef = useRef<Set<string>>(new Set())
  // Skip the first server-save: the initial state came from load, not a user edit.
  const hydratedRef = useRef(false)

  // Load the shared node list from the backend once on mount.
  useEffect(() => {
    let cancelled = false
    loadNodes().then(serverNodes => {
      if (cancelled) return
      hydratedRef.current = true
      setNodes(serverNodes)
    })
    return () => { cancelled = true }
  }, [])

  // Save nodes to the shared backend whenever the user changes them.
  useEffect(() => {
    if (!hydratedRef.current) return
    saveNodes(nodes)
  }, [nodes])

  // Check all nodes
  const checkAllNodes = useCallback(async () => {
    if (nodes.length === 0) return
    setChecking(true)

    // Use batch API for efficiency
    const results = await checkAllNodesBatch(nodes)

    // Detect new failures and alert
    const currentDown = new Set<string>()
    Object.entries(results).forEach(([id, status]) => {
      if (status.status === 'down') currentDown.add(id)
    })

    // Play alert if a node just went down
    const newlyDown = [...currentDown].filter(id => !prevDownRef.current.has(id))
    if (newlyDown.length > 0) {
      playAlertSound()
    }
    prevDownRef.current = currentDown

    setStatuses(results)
    setChecking(false)
  }, [nodes])

  // Auto-check every 30 seconds
  useEffect(() => {
    checkAllNodes()
    const interval = setInterval(checkAllNodes, 30000)
    return () => clearInterval(interval)
  }, [checkAllNodes])

  const handleAddNode = (node: Omit<NetworkNode, 'id'>) => {
    const newNode: NetworkNode = { ...node, id: crypto.randomUUID() }
    setNodes(prev => [...prev, newNode])
  }

  const handleEditNode = (id: string, updates: Partial<NetworkNode>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n))
  }

  const handleDeleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id))
    setStatuses(prev => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {showConfig ? (
        <ConfigPanel
          nodes={nodes}
          onAdd={handleAddNode}
          onEdit={handleEditNode}
          onDelete={handleDeleteNode}
          onClose={() => setShowConfig(false)}
        />
      ) : (
        <Dashboard
          nodes={nodes}
          statuses={statuses}
          checking={checking}
          onRefresh={checkAllNodes}
          onOpenConfig={() => setShowConfig(true)}
        />
      )}
    </div>
  )
}
