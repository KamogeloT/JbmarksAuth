import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'JBmarks Reports',
  description: 'Reporting dashboard for JBmarks - Task analytics, time tracking, and team productivity',
  icons: {
    icon: '/logo.png',
    apple: '/apple-touch-icon.png',
    shortcut: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
