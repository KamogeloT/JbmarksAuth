import { useState } from 'react'

interface LoginPageProps {
  onSignIn: () => Promise<void>
  error?: string
}

export function LoginPage({ onSignIn, error }: LoginPageProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try { await onSignIn() } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-dark via-brand-medium to-primary-400 px-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-[400px]">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="JBmarks" className="w-16 h-16 mx-auto mb-4 rounded-2xl shadow-md" />
          <h1 className="text-2xl font-bold text-gray-900">IT Helpdesk</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in securely with your SDiM account</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm mb-4">{error}</div>
        )}

        <button
          onClick={handleClick}
          disabled={loading}
          className="w-full bg-brand-dark text-white py-3 rounded-xl font-semibold hover:bg-brand-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Redirecting…' : 'Sign in with SDiM'}
        </button>

        <p className="text-xs text-gray-400 text-center mt-6">
          You'll be taken to the SDiM portal to sign in, then returned here to log and track your IT requests.
        </p>
      </div>
    </div>
  )
}
