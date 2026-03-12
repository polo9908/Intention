// ── Tokens ──────────────────────────────────────────────────────────────────

export interface DesignToken {
  name: string
  value: string
  swatch: string | null // hex color or null for non-color tokens
}

// ── Scenarios ────────────────────────────────────────────────────────────────

export type ScenarioType = 'component' | 'agent' | 'adapt'

export interface ComponentScenario {
  type: 'component'
  title: string
  tokens: DesignToken[]
  components: string[]
  rules: string[]
  refine: string[]
  mcp: string
  story: string
}

export interface AgentNode {
  label: string
  status: 'active' | 'warning' | 'rule' | 'passive'
  sub?: string
  detail: string
}

export interface AgentSlider {
  name: string
  key: string
  value: number
}

export interface AgentScenario {
  type: 'agent'
  title: string
  nodes: AgentNode[]
  persona: [string, string][] // [value, key]
  sliders: AgentSlider[]
  refine: string[]
  mcp: string
  story: string
}

export interface Mutation {
  from: string
  to: string
  why: string
}

export interface AdaptScenario {
  type: 'adapt'
  title: string
  mutations: Mutation[]
  inherited: string[]
  refine: string[]
  mcp: string
  story: string
}

export type Scenario = ComponentScenario | AgentScenario | AdaptScenario

// ── Persisted Specs ───────────────────────────────────────────────────────────
// Extend each Scenario with store identity fields (id, prompt, createdAt).
// These are the types held in the Zustand spec store and written to IndexedDB.

export interface ComponentSpec extends ComponentScenario {
  id:        string
  prompt:    string
  createdAt: number
}

export interface AgentSpec extends AgentScenario {
  id:        string
  prompt:    string
  createdAt: number
}

export interface AdaptSpec extends AdaptScenario {
  id:        string
  prompt:    string
  createdAt: number
}

/** Tagged union of all persisted spec types. */
export type SpecResult = ComponentSpec | AgentSpec | AdaptSpec

// ── History ──────────────────────────────────────────────────────────────────

export interface HistoryEntry {
  id: string
  time: string
  title: string
  type: 'COMPONENT' | 'AGENT' | 'ADAPT'
  color: string
}

// ── Agents ───────────────────────────────────────────────────────────────────

export interface AgentEntry {
  name: string
  status: 'live' | 'draft'
  convs?: string
  esc?: string
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  type: 'user' | 'result'
  text?: string
  scenario?: Scenario
  prevScenario?: Scenario | null
  timestamp: number
}
