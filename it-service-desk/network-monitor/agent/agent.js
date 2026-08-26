#!/usr/bin/env node
/**
 * JBmarks Network Monitor — On-Network Probe Agent
 * ------------------------------------------------
 * Runs INSIDE your network (LAN VM, Raspberry Pi, on-prem server) so it can
 * reach internal/private IPs that Azure cannot. It:
 *   1. Pulls the shared node list from the backend
 *   2. Checks each node locally (ICMP ping, TCP port, and/or HTTP)
 *   3. Pushes the results back to the backend
 * The dashboard then displays these stored results — no code change needed
 * on the device beyond running this agent.
 *
 * Zero npm dependencies — uses only Node.js built-ins.
 *
 * Configure via environment variables (see agent/.env.example):
 *   API_BASE            Backend base URL      (default: Railway prod)
 *   NETWORK_AGENT_TOKEN Shared secret; must match the backend env var
 *   AGENT_ID            Friendly name for this probe (default: hostname)
 *   INTERVAL_MS         Poll interval in ms   (default: 30000)
 *
 * Run:  NETWORK_AGENT_TOKEN=xxx node agent.js
 */

const http = require('http');
const https = require('https');
const net = require('net');
const os = require('os');
const { URL } = require('url');
const { spawn } = require('child_process');

const API_BASE = (process.env.API_BASE || 'https://jbmarksauth-production.up.railway.app').replace(/\/$/, '');
const AGENT_TOKEN = process.env.NETWORK_AGENT_TOKEN || '';
const AGENT_ID = process.env.AGENT_ID || os.hostname();
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS || '30000', 10);
const SLOW_THRESHOLD = parseInt(process.env.SLOW_THRESHOLD_MS || '3000', 10);
const DEFAULT_TIMEOUT = parseInt(process.env.TIMEOUT_MS || '10000', 10);

const isWindows = process.platform === 'win32';

// ── HTTP helpers (talk to the backend) ────────────────────────────────

function apiRequest(method, path, bodyObj) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const client = url.protocol === 'https:' ? https : http;
    const body = bodyObj ? JSON.stringify(bodyObj) : null;

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(AGENT_TOKEN ? { 'x-agent-token': AGENT_TOKEN } : {}),
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
      },
      timeout: 15000,
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(data ? JSON.parse(data) : {}); }
          catch { resolve({}); }
        } else {
          reject(new Error(`API ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('API request timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

// ── Check strategies ──────────────────────────────────────────────────

/** True ICMP ping using the OS `ping` binary. Resolves { alive, time }. */
function icmpPing(host) {
  return new Promise((resolve) => {
    const start = Date.now();
    const args = isWindows
      ? ['-n', '1', '-w', '3000', host]
      : ['-c', '1', '-W', '3', host];
    let out = '';
    let proc;
    try {
      proc = spawn('ping', args);
    } catch {
      resolve({ alive: false, time: Date.now() - start, unsupported: true });
      return;
    }
    proc.stdout.on('data', (d) => (out += d));
    proc.on('error', () => resolve({ alive: false, time: Date.now() - start, unsupported: true }));
    proc.on('close', (code) => {
      const time = Date.now() - start;
      // Parse round-trip time when available (e.g. "time=12.3 ms" / "time=12ms")
      const m = out.match(/time[=<]\s*([\d.]+)\s*ms/i);
      const rtt = m ? Math.round(parseFloat(m[1])) : time;
      resolve({ alive: code === 0, time: rtt });
    });
  });
}

/** TCP connect check to host:port. Resolves { open, time }. */
function tcpCheck(host, port, timeout) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let done = false;
    const finish = (open) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve({ open, time: Date.now() - start });
    };
    socket.setTimeout(timeout);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

/** HTTP(S) HEAD check. Resolves { ok, statusCode, time } or rejects. */
function httpCheck(urlStr, timeout) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    let target = urlStr;
    if (!/^https?:\/\//i.test(target)) target = 'http://' + target;

    let url;
    try { url = new URL(target); } catch { reject(new Error('Invalid URL')); return; }
    const client = url.protocol === 'https:' ? https : http;

    const req = client.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search || '/',
      method: 'HEAD',
      timeout,
      rejectUnauthorized: false,
      headers: { 'User-Agent': 'JBmarks-NetworkAgent/1.0' },
    }, (res) => {
      res.destroy();
      resolve({ ok: true, statusCode: res.statusCode, time: Date.now() - start });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', (e) => reject(new Error(e.code || e.message || 'Network error')));
    req.end();
  });
}

// ── Node classification ────────────────────────────────────────────────

/** Decide how to check a node and return the standard status object. */
async function checkNode(node) {
  const timeout = Number.isInteger(node.timeout) ? node.timeout : DEFAULT_TIMEOUT;
  const raw = String(node.url || '').trim();
  const hasScheme = /^https?:\/\//i.test(raw);

  // Websites/services with an explicit http(s) URL → HTTP check (falls back to TCP/ICMP)
  if (hasScheme) {
    try {
      const r = await httpCheck(raw, timeout);
      return mkStatus(r.time > SLOW_THRESHOLD ? 'slow' : 'up', r.time, { statusCode: r.statusCode, method: 'http' });
    } catch (e) {
      // HTTP failed — try TCP on the URL's port, then ICMP on the host
      const u = safeUrl(raw);
      if (u) {
        const port = u.port ? parseInt(u.port, 10) : (u.protocol === 'https:' ? 443 : 80);
        const tcp = await tcpCheck(u.hostname, port, timeout);
        if (tcp.open) return mkStatus(tcp.time > SLOW_THRESHOLD ? 'slow' : 'up', tcp.time, { method: 'tcp' });
        const ping = await icmpPing(u.hostname);
        if (ping.alive) return mkStatus('slow', ping.time, { method: 'icmp', error: 'Host up, HTTP/TCP closed' });
      }
      return mkStatus('down', timeout, { method: 'http', error: e.message });
    }
  }

  // Bare host or host:port → TCP if a port is given, else ICMP ping
  const { host, port } = parseHostPort(raw);
  if (port) {
    const tcp = await tcpCheck(host, port, timeout);
    if (tcp.open) return mkStatus(tcp.time > SLOW_THRESHOLD ? 'slow' : 'up', tcp.time, { method: 'tcp' });
    const ping = await icmpPing(host);
    if (ping.alive) return mkStatus('slow', ping.time, { method: 'icmp', error: `Host up, port ${port} closed` });
    return mkStatus('down', timeout, { method: 'tcp', error: `Port ${port} closed / host unreachable` });
  }

  const ping = await icmpPing(host);
  if (ping.unsupported) {
    // No ping binary (rare) — last resort TCP:80
    const tcp = await tcpCheck(host, 80, timeout);
    return tcp.open
      ? mkStatus('up', tcp.time, { method: 'tcp' })
      : mkStatus('down', timeout, { method: 'tcp', error: 'ping unavailable, TCP:80 closed' });
  }
  return ping.alive
    ? mkStatus(ping.time > SLOW_THRESHOLD ? 'slow' : 'up', ping.time, { method: 'icmp' })
    : mkStatus('down', ping.time, { method: 'icmp', error: 'No ICMP reply' });
}

function mkStatus(status, responseTime, extra = {}) {
  return { status, responseTime: Math.round(responseTime), ...extra };
}

function safeUrl(s) {
  try { return new URL(/^https?:\/\//i.test(s) ? s : 'http://' + s); } catch { return null; }
}

function parseHostPort(s) {
  // Supports "host", "host:port", "http-less ip:port"
  const clean = s.replace(/^tcp:\/\//i, '');
  const idx = clean.lastIndexOf(':');
  if (idx > -1 && /^\d+$/.test(clean.slice(idx + 1))) {
    return { host: clean.slice(0, idx), port: parseInt(clean.slice(idx + 1), 10) };
  }
  return { host: clean, port: null };
}

// ── Main loop ───────────────────────────────────────────────────────────

async function runOnce() {
  let nodes = [];
  try {
    const data = await apiRequest('GET', '/api/network-nodes');
    nodes = Array.isArray(data.nodes) ? data.nodes : [];
  } catch (e) {
    console.error(`[${new Date().toISOString()}] Failed to fetch nodes: ${e.message}`);
    return;
  }

  if (nodes.length === 0) {
    console.log(`[${new Date().toISOString()}] No nodes configured.`);
    return;
  }

  const results = await Promise.all(nodes.map(async (n) => {
    const s = await checkNode(n);
    return { nodeId: n.id, ...s };
  }));

  try {
    await apiRequest('POST', '/api/network-status', { agentId: AGENT_ID, results });
    const up = results.filter((r) => r.status === 'up').length;
    const slow = results.filter((r) => r.status === 'slow').length;
    const down = results.filter((r) => r.status === 'down').length;
    console.log(`[${new Date().toISOString()}] Reported ${results.length} nodes — up:${up} slow:${slow} down:${down}`);
  } catch (e) {
    console.error(`[${new Date().toISOString()}] Failed to push status: ${e.message}`);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('JBmarks Network Monitor — Probe Agent');
  console.log('='.repeat(60));
  console.log(`Agent ID:   ${AGENT_ID}`);
  console.log(`Backend:    ${API_BASE}`);
  console.log(`Interval:   ${INTERVAL_MS} ms`);
  console.log(`Auth token: ${AGENT_TOKEN ? 'set' : 'NOT SET (backend must also be unset)'}`);
  console.log('='.repeat(60));

  await runOnce();
  setInterval(runOnce, INTERVAL_MS);
}

main();
