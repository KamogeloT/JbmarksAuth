'use client'

import { useState, useEffect, useCallback } from 'react'
import { API_BASE, setToken, getToken, clearToken } from '@/lib/api'

export type Role = 'admin' | 'agent' | 'manager' | 'requester'

export interface AuthUser {
  id: string
  name: string
  lastName?: string
  email: string
  position?: string
  photo?: string | null
  role: Role
}

interface AuthState {
  isAuthenticated: boolean
  user: AuthUser | null
  loading: boolean
  error: string
  startLogin: () => Promise<void>
  logout: () => void
}

const USER_KEY = 'it_support_user'

/** The app's own URL is the OAuth redirect target (Bitrix returns ?code= here). */
function redirectUri(): string {
  if (typeof window === 'undefined') return ''
  return window.location.origin + window.location.pathname
}

export function useAuth(): AuthState {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      // 1) Handle OAuth callback if Bitrix redirected back with ?code=
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
          // Clean the code from the URL regardless of outcome
          window.history.replaceState({}, '', redirectUri())
          if (res.ok) {
            if (!['admin', 'agent', 'manager'].includes(data.user.role)) {
              setError('Access denied. This console is for IT Support staff and management only.')
            } else {
              setToken(data.token)
              localStorage.setItem(USER_KEY, JSON.stringify(data.user))
              setUser(data.user); setIsAuthenticated(true)
              setLoading(false); return
            }
          } else {
            setError(data.message || 'Sign-in failed')
          }
        } catch {
          setError('Unable to complete sign-in.')
        }
      }

      // 2) Otherwise validate any stored token
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

  /** Redirect the browser to Bitrix's login page. */
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
