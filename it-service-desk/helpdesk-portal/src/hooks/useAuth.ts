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
  startLogin: () => Promise<void>
  logout: () => void
}

function redirectUri(): string {
  return window.location.origin + window.location.pathname
}

export function useAuth(): AuthState {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      if (code) {
        try {
          const res = await fetch(`${API_BASE}/api/auth/oauth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, redirect_uri: redirectUri() }),
          })
          const data = await res.json()
          window.history.replaceState({}, '', redirectUri())
          if (res.ok) {
            setToken(data.token)
            const u: AuthUser = {
              id: data.user.id, name: data.user.name, lastName: data.user.lastName || '',
              email: data.user.email, position: data.user.position, photo: data.user.photo, role: data.user.role,
            }
            localStorage.setItem(USER_KEY, JSON.stringify(u))
            setUser(u); setIsAuthenticated(true); setLoading(false); return
          }
          setError(data.message || 'Sign-in failed')
        } catch {
          setError('Unable to complete sign-in.')
        }
      }

      const token = getToken()
      if (!token) { setLoading(false); return }
      try {
        const meRes = await fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        if (!meRes.ok) throw new Error()
        const me = await meRes.json()
        const stored = localStorage.getItem(USER_KEY)
        const base = stored ? JSON.parse(stored) : {}
        setUser({ ...base, id: me.id, name: me.name, email: me.email, role: me.role })
        setIsAuthenticated(true)
      } catch {
        clearToken(); localStorage.removeItem(USER_KEY)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const startLogin = useCallback(async () => {
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/auth/authorize-url?redirect_uri=${encodeURIComponent(redirectUri())}`)
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setError(data.message || 'Sign-in is not configured.')
    } catch {
      setError('Unable to reach the authentication server.')
    }
  }, [])

  const logout = useCallback(() => {
    clearToken(); localStorage.removeItem(USER_KEY)
    setUser(null); setIsAuthenticated(false)
  }, [])

  return { isAuthenticated, user, loading, error, startLogin, logout }
}
