'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { TaskSummaryReport } from '@/components/reports/TaskSummaryReport'
import { OverdueReport } from '@/components/reports/OverdueReport'
import { TimeTrackingReport } from '@/components/reports/TimeTrackingReport'
import { TeamWorkloadReport } from '@/components/reports/TeamWorkloadReport'
import { WaterLevelsReport } from '@/components/reports/WaterLevelsReport'
import { LoginPage } from '@/components/auth/LoginPage'
import { useAuth } from '@/hooks/useAuth'

export type ReportView = 'task-summary' | 'overdue' | 'time-tracking' | 'team-workload' | 'water-levels'

export default function Home() {
  const { isAuthenticated, user, login, logout, loading } = useAuth()
  const [activeReport, setActiveReport] = useState<ReportView>('task-summary')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f5f5f7]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-[14px] overflow-hidden shadow-ios-lg bg-white p-1.5">
            <img src="/logo.png" alt="JBmarks" className="w-full h-full object-contain" />
          </div>
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-brand-dark"></div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={login} />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f5f7]">
      {/* Sidebar — hidden on mobile, visible on lg+ */}
      <div className="hidden lg:block">
        <Sidebar activeReport={activeReport} onNavigate={setActiveReport} />
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-[280px] h-full">
            <Sidebar
              activeReport={activeReport}
              onNavigate={(view) => { setActiveReport(view); setMobileMenuOpen(false) }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Background logo watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <img
            src="/logo.png"
            alt=""
            className="w-[300px] h-[300px] lg:w-[400px] lg:h-[400px] object-contain opacity-[0.035]"
          />
        </div>
        <Header user={user} onLogout={logout} onMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 relative z-[1]">
          <div className="max-w-7xl mx-auto">
            {activeReport === 'task-summary' && <TaskSummaryReport />}
            {activeReport === 'overdue' && <OverdueReport />}
            {activeReport === 'time-tracking' && <TimeTrackingReport />}
            {activeReport === 'team-workload' && <TeamWorkloadReport />}
            {activeReport === 'water-levels' && <WaterLevelsReport />}
          </div>
        </main>
      </div>
    </div>
  )
}
