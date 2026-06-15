'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { TaskSummaryReport } from '@/components/reports/TaskSummaryReport'
import { OverdueReport } from '@/components/reports/OverdueReport'
import { TimeTrackingReport } from '@/components/reports/TimeTrackingReport'
import { TeamWorkloadReport } from '@/components/reports/TeamWorkloadReport'
import { LoginPage } from '@/components/auth/LoginPage'
import { useAuth } from '@/hooks/useAuth'

export type ReportView = 'task-summary' | 'overdue' | 'time-tracking' | 'team-workload'

export default function Home() {
  const { isAuthenticated, user, login, logout, loading } = useAuth()
  const [activeReport, setActiveReport] = useState<ReportView>('task-summary')

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
      <Sidebar activeReport={activeReport} onNavigate={setActiveReport} />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Background logo watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <img
            src="/logo.png"
            alt=""
            className="w-[400px] h-[400px] object-contain opacity-[0.035]"
          />
        </div>
        <Header user={user} onLogout={logout} />
        <main className="flex-1 overflow-y-auto p-6 relative z-[1]">
          <div className="max-w-7xl mx-auto">
            {activeReport === 'task-summary' && <TaskSummaryReport />}
            {activeReport === 'overdue' && <OverdueReport />}
            {activeReport === 'time-tracking' && <TimeTrackingReport />}
            {activeReport === 'team-workload' && <TeamWorkloadReport />}
          </div>
        </main>
      </div>
    </div>
  )
}
