/**
 * Network Monitor — Node checking logic
 * Uses server-side Azure Function API for reliable ping checks
 * Falls back to browser fetch if API is unavailable
 */

export interface NetworkNode {
  id: string
  name: string
  url: string           // URL or IP to check (must be HTTP/HTTPS endpoint)
  location: string      // Physical location or description
  type: 'server' | 'website' | 'router' | 'switch' | 'printer' | 'service' | 'other'
  expectedStatus?: number  // Expected HTTP status code (default 200)
  timeout?: number         // Timeout in ms (default 10000)
}

export interface NodeStatus {
  status: 'up' | 'down' | 'slow' | 'unknown'
  responseTime: number   // ms
  lastChecked: string    // ISO timestamp
  statusCode?: number
  error?: string
  method?: 'icmp' | 'tcp' | 'http' | string  // how the agent checked it
  agentId?: string                            // which probe reported it
}

const API_BASE = '/api'
// Shared backend where the on-network agent reports real ICMP/TCP/HTTP results.
const BACKEND_BASE = 'https://jbmarksauth-production.up.railway.app'

/**
 * Fetch statuses reported by the on-network probe agent.
 * Returns null if the endpoint is unavailable or has no data yet, so the
 * caller can fall back to the browser/Azure check.
 */
export async function fetchAgentStatuses(): Promise<Record<string, NodeStatus> | null> {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/network-status`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    const statuses: Record<string, NodeStatus> = data.statuses || {}
    return Object.keys(statuses).length > 0 ? statuses : null
  } catch {
    return null
  }
}

/** Check a single node via server-side API */
export async function checkNode(node: NetworkNode): Promise<NodeStatus> {
  try {
    const response = await fetch(`${API_BASE}/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: node.url, timeout: node.timeout || 10000 }),
    })
    
    if (!response.ok) throw new Error('API error')
    
    const data = await response.json()
    return {
      status: data.status,
      responseTime: data.responseTime,
      lastChecked: new Date().toISOString(),
      statusCode: data.statusCode,
      error: data.error,
    }
  } catch {
    // Fallback: browser-based check
    return checkNodeBrowser(node)
  }
}

/** Check all nodes in one batch API call (more efficient) */
export async function checkAllNodesBatch(nodes: NetworkNode[]): Promise<Record<string, NodeStatus>> {
  try {
    const response = await fetch(`${API_BASE}/ping-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodes: nodes.map(n => ({ id: n.id, url: n.url, timeout: n.timeout || 10000 })),
      }),
    })

    if (!response.ok) throw new Error('API error')

    const data = await response.json()
    return data.results || {}
  } catch {
    // Fallback: check each node via browser
    const results: Record<string, NodeStatus> = {}
    await Promise.all(nodes.map(async (node) => {
      results[node.id] = await checkNodeBrowser(node)
    }))
    return results
  }
}

/** Browser-based fallback check */
async function checkNodeBrowser(node: NetworkNode): Promise<NodeStatus> {
  const timeout = node.timeout || 10000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  const start = Date.now()

  try {
    const url = node.url.startsWith('http') ? node.url : `http://${node.url}`
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors',
      cache: 'no-store',
    })
    clearTimeout(timer)
    const responseTime = Date.now() - start
    return {
      status: responseTime > 3000 ? 'slow' : 'up',
      responseTime,
      lastChecked: new Date().toISOString(),
      statusCode: response.status || 0,
    }
  } catch (e: any) {
    clearTimeout(timer)
    const responseTime = Date.now() - start
    if (e.name === 'AbortError') {
      return { status: 'down', responseTime: timeout, lastChecked: new Date().toISOString(), error: 'Timeout' }
    }
    return { status: 'down', responseTime, lastChecked: new Date().toISOString(), error: e.message || 'Network error' }
  }
}
