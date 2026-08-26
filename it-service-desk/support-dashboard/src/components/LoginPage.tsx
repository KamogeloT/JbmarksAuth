'use client'

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
          <p className="text-sm text-gray-500 mt-1">Sign in securely with your SDiM account</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium mb-4">{error}</div>
        )}

        <button
          onClick={handleClick}
          disabled={loading}
          className="w-full bg-brand-dark text-white py-3.5 rounded-2xl font-semibold text-base hover:bg-brand-medium transition-all duration-200 disabled:opacity-50 shadow-ios flex items-center justify-center gap-2"
        >
          {loading ? 'Redirecting…' : 'Sign in with SDiM'}
        </button>

        <p className="text-xs text-gray-400 text-center mt-6">
          You'll be taken to the SDiM portal to sign in. IT Support staff &amp; management only.
        </p>
      </div>
    </div>
  )
}
