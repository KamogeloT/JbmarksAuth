/**
 * Backend API base + JWT token helpers.
 * All Service Desk data now flows through the authenticated backend proxy —
 * the Bitrix webhook token is NEVER shipped to the browser.
 */
export const API_BASE = 'https://jbmarksauth-production.up.railway.app'

const TOKEN_KEY = 'it_support_token'

export function setToken(t: string) { try { localStorage.setItem(TOKEN_KEY, t) } catch {} }
export function getToken(): string | null { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }
export function clearToken() { try { localStorage.removeItem(TOKEN_KEY) } catch {} }

/** Authenticated fetch — attaches the Bearer token and JSON headers. */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (res.status === 401) {
    // Session expired/invalid — force re-login
    clearToken()
    if (typeof window !== 'undefined') window.location.reload()
  }
  return res
}
