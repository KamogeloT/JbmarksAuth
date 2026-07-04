/**
 * Azure Function — Batch Ping API
 * Checks multiple URLs at once from server side
 * 
 * POST /api/ping-batch
 * Body: { "nodes": [{ "id": "1", "url": "http://...", "timeout": 10000 }, ...] }
 * 
 * Returns: { "results": { "1": { "status": "up", "responseTime": 123, ... }, ... } }
 */

const http = require('http')
const https = require('https')
const { URL } = require('url')

const SLOW_THRESHOLD = 3000

module.exports = async function (context, req) {
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
    return
  }

  const { nodes = [] } = req.body || {}

  if (!Array.isArray(nodes) || nodes.length === 0) {
    context.res = {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'nodes array is required' }),
    }
    return
  }

  // Check all nodes in parallel
  const results = {}
  const checks = nodes.map(async (node) => {
    const { id, url, timeout = 10000 } = node
    if (!id || !url) return

    try {
      const result = await checkUrl(url, timeout)
      results[id] = {
        status: result.responseTime > SLOW_THRESHOLD ? 'slow' : 'up',
        responseTime: result.responseTime,
        statusCode: result.statusCode,
        lastChecked: new Date().toISOString(),
        error: null,
      }
    } catch (err) {
      results[id] = {
        status: 'down',
        responseTime: err.responseTime || timeout,
        statusCode: null,
        lastChecked: new Date().toISOString(),
        error: err.message || 'Unreachable',
      }
    }
  })

  await Promise.all(checks)

  context.res = {
    status: 200,
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    body: JSON.stringify({ results }),
  }
}

function checkUrl(urlStr, timeout) {
  return new Promise((resolve, reject) => {
    const start = Date.now()

    let targetUrl = urlStr
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'http://' + targetUrl
    }

    let parsedUrl
    try {
      parsedUrl = new URL(targetUrl)
    } catch (e) {
      reject({ message: 'Invalid URL', responseTime: 0 })
      return
    }

    const client = parsedUrl.protocol === 'https:' ? https : http

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname || '/',
      method: 'HEAD',
      timeout: timeout,
      headers: { 'User-Agent': 'JBmarks-NetworkMonitor/1.0' },
      rejectUnauthorized: false,
    }

    const req = client.request(options, (res) => {
      const responseTime = Date.now() - start
      res.destroy()
      resolve({ statusCode: res.statusCode, responseTime })
    })

    req.on('timeout', () => {
      req.destroy()
      reject({ message: 'Timeout', responseTime: Date.now() - start })
    })

    req.on('error', (err) => {
      const responseTime = Date.now() - start
      if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
        reject({ message: `Connection refused`, responseTime })
      } else if (err.code === 'ENOTFOUND') {
        reject({ message: 'DNS not found', responseTime })
      } else if (err.code === 'ETIMEDOUT') {
        reject({ message: 'Timeout', responseTime })
      } else {
        reject({ message: err.message || 'Network error', responseTime })
      }
    })

    req.end()
  })
}
