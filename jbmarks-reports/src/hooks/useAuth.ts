'use client'

import { useState, useEffect, useCallback } from 'react'
import { initBitrixApi, BitrixUser } from '@/lib/bitrix-api'

interface AuthState {
  isAuthenticated: boolean
  user: BitrixUser | null
  loading: boolean
  login: (portalUrl: string, accessToken: string) => Promise<void>
  logout: () => void
}

const STORAGE_KEY = 'jbmarks_reports_auth'

// Default webhook — pre-configured so users don't need to enter credentials
const DEFAULT_WEBHOOK_URL = 'https://jbmarks.sdinmotion.co.za/rest/1/accwtpjw1vnywkss'

interface StoredAuth {
  portalUrl: string
  accessToken: string
  refreshToken?: string
  user: BitrixUser
}

export function useAuth(): AuthState {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<BitrixUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const tryConnect = async (portalUrl: string, accessToken: string) => {
      try {
        const api = initBitrixApi(portalUrl, accessToken)
        const currentUser = await api.getCurrentUser()
        // Save session so future visits skip this step
        const authData: StoredAuth = { portalUrl, accessToken, user: currentUser }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(authData))
        setUser(currentUser)
        setIsAuthenticated(true)
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      } finally {
        setLoading(false)
      }
    }

    // 1. Check for stored session first
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const auth: StoredAuth = JSON.parse(stored)
        tryConnect(auth.portalUrl, auth.accessToken)
        return
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }

    // 2. No stored session — auto-connect with default webhook
    tryConnect(DEFAULT_WEBHOOK_URL, '')
  }, [])

  const login = useCallback(async (portalUrl: string, accessToken: string) => {
    const api = initBitrixApi(portalUrl, accessToken)
    const currentUser = await api.getCurrentUser()
    const authData: StoredAuth = { portalUrl, accessToken, user: currentUser }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authData))
    setUser(currentUser)
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
    setIsAuthenticated(false)
  }, [])

  return { isAuthenticated, user, loading, login, logout }
}
