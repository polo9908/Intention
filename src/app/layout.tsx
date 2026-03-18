import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ContextLayer',
  description: 'Design system vivant pour agents IA — ContextLayer + AgentSpec',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
