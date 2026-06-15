'use client'

interface StatCardProps {
  label: string
  value: string | number
  icon: string
  highlight?: 'red' | 'yellow' | 'green'
  onClick?: () => void
}

export function StatCard({ label, value, icon, highlight, onClick }: StatCardProps) {
  const highlightClasses = {
    red: 'from-red-50/80 to-white/80 border-red-100/50',
    yellow: 'from-gold-50/80 to-white/80 border-gold-100/50',
    green: 'from-primary-50/80 to-white/80 border-primary-100/50',
  }

  return (
    <div
      onClick={onClick}
      className={`stat-card bg-gradient-to-br ${highlight ? highlightClasses[highlight] : 'from-white/90 to-white/70'} ${onClick ? 'cursor-pointer ring-0 hover:ring-2 hover:ring-brand-medium/20' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] text-ios-secondary font-medium uppercase tracking-wide">{label}</p>
          <p className="text-[28px] font-bold text-ios-label mt-1 tracking-tight">{value}</p>
        </div>
        <span className="text-[28px] opacity-80">{icon}</span>
      </div>
      {onClick && (
        <p className="text-[10px] text-ios-tertiary mt-2">Tap to view list →</p>
      )}
    </div>
  )
}
