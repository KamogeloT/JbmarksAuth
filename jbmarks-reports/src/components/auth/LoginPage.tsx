'use client'

import { useState } from 'react'

interface LoginPageProps {
  onLogin: (portalUrl: string, accessToken: string) => Promise<void>
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [portalUrl, setPortalUrl] = useState('https://jbmarks.sdinmotion.co.za')
  const [accessToken, setAccessToken] = useState('')
  const [authMode, setAuthMode] = useState<'webhook' | 'token'>('webhook')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (authMode === 'webhook') {
        await onLogin(webhookUrl, '')
      } else {
        await onLogin(portalUrl, accessToken)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-700 via-brand-medium to-primary-400" />
      
      {/* Floating blurred circles for depth */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-brand-light/30 blur-3xl" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-gold-400/20 blur-3xl" />

      {/* Card */}
      <div className="relative z-10 glass rounded-3xl p-10 w-full max-w-[420px] shadow-ios-xl">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <div className="w-20 h-20 rounded-[22px] overflow-hidden shadow-ios-lg bg-white p-2">
              <img
                src="/logo.png"
                alt="JBmarks"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <h1 className="text-[28px] font-bold text-ios-label tracking-tight">JBmarks Reports</h1>
          <p className="text-ios-secondary text-[15px] mt-1">Sign in to access your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Segmented control */}
          <div className="bg-gray-100/80 p-1 rounded-xl flex">
            <button
              type="button"
              onClick={() => setAuthMode('webhook')}
              className={`flex-1 py-2 px-3 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
                authMode === 'webhook'
                  ? 'bg-white text-ios-label shadow-ios'
                  : 'text-ios-secondary hover:text-ios-label'
              }`}
            >
              Webhook URL
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('token')}
              className={`flex-1 py-2 px-3 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
                authMode === 'token'
                  ? 'bg-white text-ios-label shadow-ios'
                  : 'text-ios-secondary hover:text-ios-label'
              }`}
            >
              Access Token
            </button>
          </div>

          {authMode === 'webhook' ? (
            <div>
              <label htmlFor="webhookUrl" className="block text-[13px] font-medium text-ios-secondary mb-1.5 pl-1">
                Webhook URL
              </label>
              <input
                id="webhookUrl"
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://portal.bitrix24.com/rest/1/token"
                className="w-full px-4 py-3 bg-gray-100/60 border-0 rounded-xl text-[15px] text-ios-label placeholder:text-ios-tertiary focus:ring-2 focus:ring-brand-medium/50 focus:bg-white outline-none transition-all duration-200"
                required
              />
              <p className="text-[11px] text-ios-tertiary mt-1.5 pl-1">
                Developer resources → Inbound webhooks
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="portalUrl" className="block text-[13px] font-medium text-ios-secondary mb-1.5 pl-1">
                  Portal URL
                </label>
                <input
                  id="portalUrl"
                  type="url"
                  value={portalUrl}
                  onChange={(e) => setPortalUrl(e.target.value)}
                  placeholder="https://your-portal.bitrix24.com"
                  className="w-full px-4 py-3 bg-gray-100/60 border-0 rounded-xl text-[15px] text-ios-label placeholder:text-ios-tertiary focus:ring-2 focus:ring-brand-medium/50 focus:bg-white outline-none transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label htmlFor="accessToken" className="block text-[13px] font-medium text-ios-secondary mb-1.5 pl-1">
                  Access Token
                </label>
                <input
                  id="accessToken"
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="OAuth access token"
                  className="w-full px-4 py-3 bg-gray-100/60 border-0 rounded-xl text-[15px] text-ios-label placeholder:text-ios-tertiary focus:ring-2 focus:ring-brand-medium/50 focus:bg-white outline-none transition-all duration-200"
                  required
                />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50/80 backdrop-blur-sm text-red-600 px-4 py-3 rounded-xl text-[13px] font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-dark text-white py-3.5 rounded-2xl font-semibold text-[16px] hover:brightness-110 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 shadow-ios"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></span>
                Connecting...
              </span>
            ) : (
              'Continue'
            )}
          </button>
        </form>

        <p className="text-[11px] text-ios-tertiary text-center mt-6">
          Credentials stored locally. Never shared.
        </p>
      </div>
    </div>
  )
}
