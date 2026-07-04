'use client'

import { useState } from 'react'

const WEBHOOK_URL = 'https://jbmarks.sdinmotion.co.za/rest/1/accwtpjw1vnywkss'
const IT_GROUP_ID = '14'

interface LoginPageProps {
  onLoginSuccess: (user: any) => void
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    setLoading(true)
    setError('')

    try {
      // Get IT group members first
      const membersResp = await fetch(`${WEBHOOK_URL}/sonet_group.user.get.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ID: IT_GROUP_ID }),
      })
      const membersData = await membersResp.json()
      const memberIds = (membersData.result || []).map((m: any) => m.USER_ID)

      // Fetch all users
      const resp = await fetch(`${WEBHOOK_URL}/user.get.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter: { ACTIVE: true } }),
      })

      if (!resp.ok) throw new Error('Unable to connect to SDiM')
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
        setError('User not found. Please check your username and try again.')
        return
      }

      // Verify user is a member of IT group
      if (!memberIds.includes(found.ID)) {
        setError('Access denied. You must be a member of the IT Support team.')
        return
      }

      onLoginSuccess(found)
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-700 via-brand-medium to-primary-400" />
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-brand-light/20 blur-3xl" />

      <div className="relative z-10 bg-white/90 backdrop-blur-2xl rounded-3xl p-10 w-full max-w-[420px] shadow-ios-lg mx-4">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <div className="w-20 h-20 rounded-[22px] overflow-hidden shadow-ios bg-white p-2">
              <img src="/logo.png" alt="JBmarks" className="w-full h-full object-contain" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">IT Support Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to manage IT tickets</p>
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
              className="w-full px-4 py-3 bg-gray-100/60 border-0 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-brand-medium/50 focus:bg-white outline-none transition"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full bg-brand-dark text-white py-3.5 rounded-2xl font-semibold text-base hover:bg-brand-medium transition-all duration-200 disabled:opacity-50 shadow-ios"
          >
            {loading ? 'Verifying...' : 'Sign In'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          Only IT Support team members can access this dashboard
        </p>
      </div>
    </div>
  )
}
