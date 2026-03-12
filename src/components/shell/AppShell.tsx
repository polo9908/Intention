'use client'

import { useViewStore } from '@/store/useViewStore'
import { TopNav } from './TopNav'
import { ChatView }    from '@/components/views/ChatView'
import { HistoryView } from '@/components/views/HistoryView'
import { AgentsView }  from '@/components/views/AgentsView'
import { RoadmapView } from '@/components/views/RoadmapView'

const VIEWS = {
  chat:    ChatView,
  history: HistoryView,
  agents:  AgentsView,
  roadmap: RoadmapView,
}

export function AppShell() {
  const { activeView } = useViewStore()
  const View = VIEWS[activeView]

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
      }}
    >
      <TopNav />

      {/* Main content — offset by nav height */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          marginTop: 'var(--nav-h)',
          minHeight: 'calc(100vh - var(--nav-h))',
        }}
      >
        <View />
      </main>
    </div>
  )
}
