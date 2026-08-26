/**
 * Backend API base + JWT helpers for the Helpdesk Portal.
 * All Service Desk data flows through the authenticated backend — the Bitrix
 * webhook token is never shipped to the browser.
 */
export const API_BASE = 'https://jbmarksauth-production.up.railway.app'

const TOKEN_KEY = 'it_helpdesk_token'

export function setToken(t: string) { try { localStorage.setItem(TOKEN_KEY, t) } catch {} }
export function getToken(): string | null { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }
export function clearToken() { try { localStorage.removeItem(TOKEN_KEY) } catch {} }

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return fetch(`${API_BASE}${path}`, { ...options, headers })
}
