'use client'

import { useState, useEffect, useCallback } from 'react'
import { initBitrixApi, BitrixUser, BitrixWorkgroup } from '@/lib/bitrix-api'

interface AuthState {
  isAuthenticated: boolean
  user: BitrixUser | null
  workgroups: BitrixWorkgroup[]
  loading: boolean
  login: (user: BitrixUser, workgroups: BitrixWorkgroup[]) => void
  logout: () => void
}

const STORAGE_KEY = 'jbmarks_reports_auth'
const WEBHOOK_URL = 'https://jbmarks.sdinmotion.co.za/rest/1/accwtpjw1vnywkss'

interface StoredAuth {
  user: BitrixUser
  workgroups: BitrixWorkgroup[]
}

export function useAuth(): AuthState {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<BitrixUser | null>(null)
  const [workgroups, setWorkgroups] = useState<BitrixWorkgroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Always initialize the Bitrix API client with the webhook
    initBitrixApi(WEBHOOK_URL, '')

    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const auth: StoredAuth = JSON.parse(stored)
        setUser(auth.user)
        setWorkgroups(auth.workgroups || [])
        setIsAuthenticated(true)
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback((authUser: BitrixUser, authWorkgroups: BitrixWorkgroup[]) => {
    setUser(authUser)
    setWorkgroups(authWorkgroups)
    setIsAuthenticated(true)
    const authData: StoredAuth = { user: authUser, workgroups: authWorkgroups }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authData))
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
    setWorkgroups([])
    setIsAuthenticated(false)
  }, [])

  return { isAuthenticated, user, workgroups, loading, login, logout }
}

/**
 * Get the logged-in user's workgroup IDs from stored auth
 */
export function getUserWorkgroupIds(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const auth: StoredAuth = JSON.parse(stored)
    return (auth.workgroups || []).map(g => g.GROUP_ID)
  } catch {
    return []
  }
}
