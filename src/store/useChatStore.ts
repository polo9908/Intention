import { create } from 'zustand'
import type { ChatMessage, Scenario } from '@/types'

interface ChatStore {
  messages: ChatMessage[]
  addUserMessage: (text: string) => string
  addResult: (scenario: Scenario, prevScenario: Scenario | null) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],

  addUserMessage: (text) => {
    const id = 'msg-' + Date.now()
    set((s) => ({
      messages: [
        ...s.messages,
        { id, type: 'user', text, timestamp: Date.now() },
      ],
    }))
    return id
  },

  addResult: (scenario, prevScenario) => {
    const id = 'res-' + Date.now()
    set((s) => ({
      messages: [
        ...s.messages,
        { id, type: 'result', scenario, prevScenario, timestamp: Date.now() },
      ],
    }))
  },

  clearMessages: () => set({ messages: [] }),
}))
