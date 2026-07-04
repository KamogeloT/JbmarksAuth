'use client'

import { BitrixUser } from '@/lib/bitrix-api'

interface HeaderProps {
  user: BitrixUser | null
  onLogout: () => void
  onMenuToggle?: () => void
}

export function Header({ user, onLogout, onMenuToggle }: HeaderProps) {
  return (
    <header className="bg-white/60 backdrop-blur-2xl border-b border-ios-separator px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        {/* Hamburger menu — mobile only */}
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-ios-label" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div>
          <p className="text-[11px] text-ios-secondary font-medium uppercase tracking-wider">Dashboard</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden sm:block">
              <p className="text-[13px] font-semibold text-ios-label">
                {user.NAME} {user.LAST_NAME}
              </p>
              <p className="text-[11px] text-ios-secondary">{user.WORK_POSITION || 'Team Member'}</p>
            </div>
            {user.PERSONAL_PHOTO ? (
              <img
                src={user.PERSONAL_PHOTO}
                alt={`${user.NAME} ${user.LAST_NAME}`}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-ios"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-medium to-brand-dark text-white flex items-center justify-center text-[12px] font-bold ring-2 ring-white shadow-ios">
                {user.NAME?.[0]}{user.LAST_NAME?.[0]}
              </div>
            )}
          </div>
        )}
        <button
          onClick={onLogout}
          className="text-[13px] font-medium text-ios-secondary hover:text-ios-label transition-colors px-3 py-1.5 rounded-full hover:bg-gray-100/80 hidden sm:block"
        >
          Sign Out
        </button>
      </div>
    </header>
  )
}
