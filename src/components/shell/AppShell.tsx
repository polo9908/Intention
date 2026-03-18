'use client'

import { useEffect } from 'react'
import { useViewStore, type View } from '@/store/useViewStore'
import { TopNav }      from './TopNav'
import { ChatView }    from '@/components/views/ChatView'
import { HistoryView } from '@/components/views/HistoryView'
import { AgentsView }  from '@/components/views/AgentsView'
import { RoadmapView } from '@/components/views/RoadmapView'

// ── Route ↔ View mappings ─────────────────────────────────────────────────────

const PATH_TO_VIEW: Record<string, View> = {
  '/':         'chat',
  '/chat':     'chat',
  '/history':  'history',
  '/agents':   'agents',
  '/roadmap':  'roadmap',
}

const VIEW_TO_PATH: Record<View, string> = {
  chat:    '/chat',
  history: '/history',
  agents:  '/agents',
  roadmap: '/roadmap',
}

// ── View registry ─────────────────────────────────────────────────────────────

const VIEWS: Record<View, React.ComponentType> = {
  chat:    ChatView,
  history: HistoryView,
  agents:  AgentsView,
  roadmap: RoadmapView,
}

// ── AppShell ──────────────────────────────────────────────────────────────────

export function AppShell() {
  const { activeView, setView } = useViewStore()

  // 1 — On mount: initialise Zustand from current URL path (handles deep links)
  useEffect(() => {
    const view = PATH_TO_VIEW[window.location.pathname] ?? 'chat'
    setView(view)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally run once

  // 2 — Zustand → URL: push a history entry whenever the active view changes
  useEffect(() => {
    const target = VIEW_TO_PATH[activeView]
    if (window.location.pathname !== target) {
      window.history.pushState({ view: activeView }, '', target)
    }
  }, [activeView])

  // 3 — URL → Zustand: handle browser Back / Forward buttons
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const stateView = e.state?.view as View | undefined
      const pathView  = PATH_TO_VIEW[window.location.pathname] ?? 'chat'
      setView(stateView ?? pathView)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [setView])

  const View = VIEWS[activeView]

  return (
    <div
      style={{
        minHeight:     '100vh',
        display:       'flex',
        flexDirection: 'column',
        background:    'var(--bg)',
      }}
    >
      <TopNav />

      <main
        style={{
          flex:          1,
          display:       'flex',
          flexDirection: 'column',
          marginTop:     'var(--nav-h)',
          minHeight:     'calc(100vh - var(--nav-h))',
        }}
      >
        <View />
      </main>
    </div>
  )
}
