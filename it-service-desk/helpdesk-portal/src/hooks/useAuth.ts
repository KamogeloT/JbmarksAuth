import { useState, useEffect, useCallback } from 'react'
import { API_BASE, setToken, getToken, clearToken } from '../services/api'

const USER_KEY = 'it_helpdesk_user'

export interface AuthUser {
  id: string
  name: string
  lastName: string
  email: string
  phone?: string
  position?: string
  department?: string
  photo?: string
  role?: string
}

export interface AuthState {
  isAuthenticated: boolean
  user: AuthUser | null
  loading: boolean
  error: string
  login: (username: string) => Promise<boolean>
  logout: () => void
}

export function useAuth(): AuthState {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Validate any stored token against the server on load
  useEffect(() => {
    const token = getToken()
    if (!token) { setLoading(false); return }
    fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((me) => {
        const stored = localStorage.getItem(USER_KEY)
        const base = stored ? JSON.parse(stored) : {}
        setUser({ ...base, id: me.id, name: me.name, email: me.email, role: me.role })
        setIsAuthenticated(true)
      })
      .catch(() => { clearToken(); localStorage.removeItem(USER_KEY) })
      .finally(() => setLoading(false))
  }, [])

  // Username-only login (Helpdesk is a low-risk, requester-only surface).
  const login = useCallback(async (username: string) => {
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/auth/helpdesk-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'Login failed'); return false }
      setToken(data.token)
      const u: AuthUser = {
        id: data.user.id, name: data.user.name, lastName: data.user.lastName || '',
        email: data.user.email, position: data.user.position, photo: data.user.photo, role: data.user.role,
      }
      localStorage.setItem(USER_KEY, JSON.stringify(u))
      setUser(u); setIsAuthenticated(true)
      return true
    } catch {
      setError('Unable to reach the server.')
      return false
    }
  }, [])

  const logout = useCallback(() => {
    clearToken(); localStorage.removeItem(USER_KEY)
    setUser(null); setIsAuthenticated(false)
  }, [])

  return { isAuthenticated, user, loading, error, login, logout }
}
