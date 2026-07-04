import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'it_helpdesk_auth'

export interface AuthUser {
  id: string
  name: string
  lastName: string
  email: string
  phone?: string
  position?: string
  department?: string
  photo?: string
}

export interface AuthState {
  isAuthenticated: boolean
  user: AuthUser | null
  loading: boolean
  login: (user: AuthUser) => void
  logout: () => void
}

export function useAuth(): AuthState {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setUser(parsed)
        setIsAuthenticated(true)
      } catch { /* ignore */ }
    }
    setLoading(false)
  }, [])

  const login = useCallback((authUser: AuthUser) => {
    setUser(authUser)
    setIsAuthenticated(true)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser))
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
    setIsAuthenticated(false)
  }, [])

  return { isAuthenticated, user, loading, login, logout }
}
