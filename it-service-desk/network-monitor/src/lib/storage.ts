/**
 * Node configuration persistence.
 *
 * Nodes are stored on the shared backend (Railway) so the list is GLOBAL —
 * every device/browser sees the same monitored nodes. localStorage is used
 * only as an offline cache so the dashboard still renders if the API is
 * temporarily unreachable.
 */

import { NetworkNode } from './monitor'

const STORAGE_KEY = 'jbmarks-network-nodes'
const API_BASE = 'https://jbmarksauth-production.up.railway.app'

// Default demo nodes — used only to seed the shared list the very first time
// (when the backend has no nodes yet).
const DEFAULT_NODES: NetworkNode[] = [
  { id: '1', name: 'SDiM Portal', url: 'https://jbmarks.sdinmotion.co.za', location: 'Azure - Production', type: 'website' },
  { id: '2', name: 'Dev Server', url: 'http://102.133.224.173', location: 'Azure - Dev VM', type: 'server' },
  { id: '3', name: 'Prod Server', url: 'http://20.87.213.228', location: 'Azure - Prod VM', type: 'server' },
  { id: '4', name: 'IT Helpdesk Portal', url: 'https://zealous-sand-0050fce00.7.azurestaticapps.net', location: 'Azure Static Web App', type: 'website' },
  { id: '5', name: 'IT Support Dashboard', url: 'https://black-water-07331b400.7.azurestaticapps.net', location: 'Azure Static Web App', type: 'website' },
  { id: '6', name: 'Reports Dashboard', url: 'https://polite-tree-08ad84b00.7.azurestaticapps.net', location: 'Azure Static Web App', type: 'website' },
]

/** Read the localStorage cache (offline fallback). */
export function loadNodesCache(): NetworkNode[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) return JSON.parse(data)
  } catch { /* ignore */ }
  return DEFAULT_NODES
}

function writeCache(nodes: NetworkNode[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes))
  } catch { /* ignore */ }
}

/**
 * Load nodes from the shared backend. Falls back to the local cache if the
 * API is unreachable. Seeds the backend with defaults the first time.
 */
export async function loadNodes(): Promise<NetworkNode[]> {
  try {
    const res = await fetch(`${API_BASE}/api/network-nodes`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`API ${res.status}`)
    const data = await res.json()
    const nodes: NetworkNode[] = Array.isArray(data.nodes) ? data.nodes : []

    if (nodes.length === 0) {
      // First run: seed the shared list with the defaults.
      await saveNodes(DEFAULT_NODES)
      writeCache(DEFAULT_NODES)
      return DEFAULT_NODES
    }

    writeCache(nodes)
    return nodes
  } catch {
    // Offline / API down — use the last known cache.
    return loadNodesCache()
  }
}

/**
 * Persist the full node list to the shared backend so all devices get it.
 * Also updates the local cache. Returns true on a successful server save.
 */
export async function saveNodes(nodes: NetworkNode[]): Promise<boolean> {
  writeCache(nodes)
  try {
    const res = await fetch(`${API_BASE}/api/network-nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes }),
    })
    return res.ok
  } catch {
    return false
  }
}
