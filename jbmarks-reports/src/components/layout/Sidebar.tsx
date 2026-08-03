'use client'

import { ReportView } from '@/app/page'

interface SidebarProps {
  activeReport: ReportView
  onNavigate: (view: ReportView) => void
}

const navItems: { id: ReportView; label: string; icon: string }[] = [
  { id: 'task-summary', label: 'Task Summary', icon: '📊' },
  { id: 'overdue', label: 'Overdue & Deadlines', icon: '⏰' },
  { id: 'time-tracking', label: 'Time Tracking', icon: '🕐' },
  { id: 'team-workload', label: 'Team Workload', icon: '👥' },
  { id: 'water-levels', label: 'Water Levels', icon: '💧' },
]

export function Sidebar({ activeReport, onNavigate }: SidebarProps) {
  return (
    <aside className="w-[260px] h-full bg-white/95 backdrop-blur-2xl border-r border-ios-separator flex flex-col">
      {/* Logo */}
      <div className="p-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-[10px] overflow-hidden shadow-ios bg-white p-0.5">
          <img
            src="/logo.png"
            alt="JBmarks"
            className="w-full h-full object-contain"
          />
        </div>
        <div>
          <h1 className="text-[15px] font-semibold text-ios-label tracking-tight">JBmarks</h1>
          <p className="text-[11px] text-ios-secondary">Reports</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2">
        <p className="px-3 text-[11px] font-semibold text-ios-tertiary uppercase tracking-wider mb-2">
          Analytics
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 ${
                  activeReport === item.id
                    ? 'bg-brand-dark text-white shadow-ios'
                    : 'text-ios-label hover:bg-gray-100/80'
                }`}
              >
                <span className="text-[18px] leading-none">{item.icon}</span>
                <span className="font-medium text-[13px]">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Connection status */}
      <div className="p-4 mx-3 mb-3 rounded-2xl bg-primary-50/60">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-medium animate-pulse"></span>
          <p className="text-[11px] font-medium text-brand-medium">
            Connected to Bitrix24
          </p>
        </div>
      </div>
    </aside>
  )
}
