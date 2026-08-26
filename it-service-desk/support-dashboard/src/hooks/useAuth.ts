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
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
}

const USER_KEY = 'it_support_user'

export function useAuth(): AuthState {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // On mount: validate the stored token against the server (no trusting localStorage alone)
  useEffect(() => {
    const token = getToken()
    if (!token) { setLoading(false); return }
    fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((me) => {
        const stored = localStorage.getItem(USER_KEY)
        const base = stored ? JSON.parse(stored) : {}
        const u: AuthUser = { ...base, id: me.id, name: me.name, email: me.email, role: me.role }
        setUser(u); setIsAuthenticated(true)
      })
      .catch(() => { clearToken(); localStorage.removeItem(USER_KEY) })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'Login failed'); return false }

      // Only IT roles may use the support dashboard
      if (!['admin', 'agent', 'manager'].includes(data.user.role)) {
        setError('Access denied. This console is for IT Support staff and management only.')
        return false
      }

      setToken(data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      setUser(data.user); setIsAuthenticated(true)
      return true
    } catch (e: any) {
      setError('Unable to reach the authentication server.')
      return false
    }
  }, [])

  const logout = useCallback(() => {
    clearToken(); localStorage.removeItem(USER_KEY)
    setUser(null); setIsAuthenticated(false)
  }, [])

  return { isAuthenticated, user, loading, error, login, logout }
}
