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
