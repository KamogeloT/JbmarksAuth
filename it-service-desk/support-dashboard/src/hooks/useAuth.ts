'use client'

import { useState, useEffect, useCallback } from 'react'
import { SDiMUser } from '@/lib/sdim-api'

const STORAGE_KEY = 'it_support_auth'

interface AuthState {
  isAuthenticated: boolean
  user: SDiMUser | null
  loading: boolean
  login: (user: SDiMUser) => void
  logout: () => void
}

export function useAuth(): AuthState {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<SDiMUser | null>(null)
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

  const login = useCallback((authUser: SDiMUser) => {
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
