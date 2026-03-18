import { create } from 'zustand'

export type View = 'chat' | 'history' | 'agents' | 'roadmap'

export const NAV_ITEMS: { id: View; label: string }[] = [
  { id: 'chat',     label: 'Chat'     },
  { id: 'history',  label: 'History'  },
  { id: 'agents',   label: 'Agents'   },
  { id: 'roadmap',  label: 'Roadmap'  },
]

interface ViewStore {
  activeView: View
  setView: (view: View) => void
}

export const useViewStore = create<ViewStore>((set) => ({
  activeView: 'chat',
  setView: (view) => set({ activeView: view }),
}))
