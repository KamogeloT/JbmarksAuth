'use client'

import { useState } from 'react'

interface LoginPageProps {
  /** Returns true on success. Errors surfaced via the `error` prop from useAuth. */
  onLogin: (username: string, password: string) => Promise<boolean>
  error?: string
}

export function LoginPage({ onLogin, error }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    setLoading(true)
    try {
      await onLogin(username.trim(), password)
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
          <p className="text-sm text-gray-500 mt-1">Sign in with your SDiM credentials</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Username or Email</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Your SDiM login or email"
              required
              autoFocus
              autoComplete="username"
              className="w-full px-4 py-3 bg-gray-100/60 border-0 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-brand-medium/50 focus:bg-white outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Your SDiM password"
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 bg-gray-100/60 border-0 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-brand-medium/50 focus:bg-white outline-none transition"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="w-full bg-brand-dark text-white py-3.5 rounded-2xl font-semibold text-base hover:bg-brand-medium transition-all duration-200 disabled:opacity-50 shadow-ios"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          IT Support staff &amp; management only
        </p>
      </div>
    </div>
  )
}
