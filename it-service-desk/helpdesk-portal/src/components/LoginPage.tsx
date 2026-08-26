import { useState } from 'react'

interface LoginPageProps {
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-dark via-brand-medium to-primary-400 px-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-[400px]">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="JBmarks" className="w-16 h-16 mx-auto mb-4 rounded-2xl shadow-md" />
          <h1 className="text-2xl font-bold text-gray-900">IT Helpdesk</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in with your SDiM account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username or Email</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Your SDiM login or email"
              required
              autoFocus
              autoComplete="username"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-medium/40 focus:border-brand-medium outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Your SDiM password"
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-medium/40 focus:border-brand-medium outline-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="w-full bg-brand-dark text-white py-3 rounded-xl font-semibold hover:bg-brand-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          Use your SDiM credentials to log and track your IT requests
        </p>
      </div>
    </div>
  )
}
