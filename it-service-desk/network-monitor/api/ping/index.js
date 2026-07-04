/**
 * Azure Function — Network Ping API
 * Checks if a URL/IP is reachable from the server side (no CORS issues)
 * 
 * POST /api/ping
 * Body: { "url": "http://102.133.224.173", "timeout": 10000 }
 * 
 * Returns: { "status": "up"|"down"|"slow", "responseTime": 123, "statusCode": 200, "error": null }
 */

const http = require('http')
const https = require('https')
const { URL } = require('url')

module.exports = async function (context, req) {
  // Handle CORS preflight
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

  const { url, timeout = 10000 } = req.body || {}

  if (!url) {
    context.res = {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'URL is required' }),
    }
    return
  }

  const SLOW_THRESHOLD = 3000

  try {
    const result = await checkUrl(url, timeout)

    context.res = {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: result.responseTime > SLOW_THRESHOLD ? 'slow' : 'up',
        responseTime: result.responseTime,
        statusCode: result.statusCode,
        error: null,
      }),
    }
  } catch (err) {
    context.res = {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'down',
        responseTime: err.responseTime || timeout,
        statusCode: null,
        error: err.message || 'Unreachable',
      }),
    }
  }
}

function checkUrl(urlStr, timeout) {
  return new Promise((resolve, reject) => {
    const start = Date.now()

    // Ensure URL has protocol
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
      headers: {
        'User-Agent': 'JBmarks-NetworkMonitor/1.0',
      },
      // Don't reject self-signed certs
      rejectUnauthorized: false,
    }

    const req = client.request(options, (res) => {
      const responseTime = Date.now() - start
      res.destroy() // We don't need the body
      resolve({ statusCode: res.statusCode, responseTime })
    })

    req.on('timeout', () => {
      req.destroy()
      reject({ message: 'Timeout', responseTime: Date.now() - start })
    })

    req.on('error', (err) => {
      const responseTime = Date.now() - start
      
      // If we got ECONNREFUSED quickly, try GET instead of HEAD (some servers reject HEAD)
      if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
        reject({ message: `Connection refused (${err.code})`, responseTime })
        return
      }

      if (err.code === 'ENOTFOUND') {
        reject({ message: 'DNS not found', responseTime })
        return
      }

      if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
        reject({ message: 'Timeout', responseTime })
        return
      }

      reject({ message: err.message || err.code || 'Network error', responseTime })
    })

    req.end()
  })
}
