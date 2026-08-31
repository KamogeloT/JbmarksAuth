import { useState } from 'react'

interface LoginPageProps {
  onLogin: (username: string) => Promise<boolean>
  error?: string
}

export function LoginPage({ onLogin, error }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return
    setLoading(true)
    try { await onLogin(username.trim()) } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-dark via-brand-medium to-primary-400 px-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-[400px]">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="JBmarks" className="w-16 h-16 mx-auto mb-4 rounded-2xl shadow-md" />
          <h1 className="text-2xl font-bold text-gray-900">IT Helpdesk</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to log &amp; track your IT requests</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username or Email</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your name, login, or email"
              required
              autoFocus
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-medium/40 focus:border-brand-medium outline-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full bg-brand-dark text-white py-3 rounded-xl font-semibold hover:bg-brand-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          Enter your SDiM username, full name, or email address
        </p>
      </div>
    </div>
  )
}
