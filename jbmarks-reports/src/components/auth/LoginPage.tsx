'use client'

import { useState } from 'react'
import { BitrixUser, BitrixWorkgroup } from '@/lib/bitrix-api'

const WEBHOOK_URL = 'https://jbmarks.sdinmotion.co.za/rest/1/accwtpjw1vnywkss'

interface LoginPageProps {
  onLogin: (user: BitrixUser, workgroups: BitrixWorkgroup[]) => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    setLoading(true)
    setError('')

    try {
      // Look up the user by name/email/login
      const resp = await fetch(`${WEBHOOK_URL}/user.get.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter: { ACTIVE: true } }),
      })

      if (!resp.ok) throw new Error('Unable to connect to Bitrix24')
      const data = await resp.json()
      if (!data.result) throw new Error('Unable to fetch users')

      const loginLower = username.trim().toLowerCase()
      const found = data.result.find((u: any) =>
        u.EMAIL?.toLowerCase() === loginLower ||
        u.LOGIN?.toLowerCase() === loginLower ||
        `${u.NAME} ${u.LAST_NAME}`.toLowerCase() === loginLower ||
        u.NAME?.toLowerCase() === loginLower ||
        u.LAST_NAME?.toLowerCase() === loginLower
      )

      if (!found) {
        setError('User not found. Please check your name or email and try again.')
        return
      }

      // Get the user's workgroups
      // We use the webhook to fetch all groups, then check which ones this user belongs to
      const groupsResp = await fetch(`${WEBHOOK_URL}/sonet_group.user.groups.json?USER_ID=${found.ID}`, {
        method: 'GET',
      })
      
      let userWorkgroups: BitrixWorkgroup[] = []
      if (groupsResp.ok) {
        const groupsData = await groupsResp.json()
        userWorkgroups = groupsData.result || []
      }

      if (userWorkgroups.length === 0) {
        setError('You are not a member of any workgroup. Access denied.')
        return
      }

      onLogin(found as BitrixUser, userWorkgroups)
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-700 via-brand-medium to-primary-400" />
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-brand-light/20 blur-3xl" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-gold-400/20 blur-3xl" />

      <div className="relative z-10 bg-white/90 backdrop-blur-2xl rounded-3xl p-10 w-full max-w-[420px] shadow-ios-lg mx-4">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <div className="w-20 h-20 rounded-[22px] overflow-hidden shadow-ios-lg bg-white p-2">
              <img src="/logo.png" alt="JBmarks" className="w-full h-full object-contain" />
            </div>
          </div>
          <h1 className="text-[28px] font-bold text-gray-900 tracking-tight">JBmarks Reports</h1>
          <p className="text-gray-500 text-[15px] mt-1">Sign in to access your reports</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your name, login, or email"
              required
              autoFocus
              className="w-full px-4 py-3 bg-gray-100/60 border-0 rounded-xl text-[15px] text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-brand-medium/50 focus:bg-white outline-none transition-all duration-200"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-[13px] font-medium">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full bg-brand-dark text-white py-3.5 rounded-2xl font-semibold text-[16px] hover:brightness-110 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 shadow-ios"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></span>
                Verifying...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="text-[11px] text-gray-400 text-center mt-6">
          Only workgroup members can access reports
        </p>
      </div>
    </div>
  )
}
