'use client'

import { useState } from 'react'

// ── Data ──────────────────────────────────────────────────────────────────────

interface LiveAgent {
  name:   string
  convs:  string
  esc:    number   // percent
  model:  string
}

interface DraftAgent {
  name:   string
  model:  string
  note:   string
}

interface ServiceRow {
  name:    string
  ms:      number
  label:   string
}

const LIVE_AGENTS: LiveAgent[] = [
  { name: 'VoltaAdvisor',    convs: '1.2k', esc: 3.1, model: 'claude-3-5-sonnet' },
  { name: 'SupportBot v2',   convs: '4.8k', esc: 8.7, model: 'claude-3-haiku'    },
  { name: 'RiskProfiler',    convs: '847',  esc: 5.2, model: 'claude-3-5-sonnet' },
]

const DRAFT_AGENTS: DraftAgent[] = [
  { name: 'OnboardingGuide',    model: 'claude-3-5-sonnet', note: 'Finalisation guardrails' },
  { name: 'EscalationRouter',   model: 'claude-3-haiku',    note: 'Tests A/B en attente'    },
  { name: 'ComplianceChecker',  model: 'claude-3-opus',     note: 'Validation juridique'    },
]

const SERVICES: ServiceRow[] = [
  { name: 'ContextLayer MCP', ms: 340,  label: '340ms' },
  { name: 'AgentSpec MCP',    ms: 128,  label: '128ms' },
  { name: 'Figma MCP',        ms: 1240, label: '1.2s'  },
]

// ── Derived stats ─────────────────────────────────────────────────────────────

const TOTAL_CONVS = '6.8k'
const AVG_ESC     = (LIVE_AGENTS.reduce((s, a) => s + a.esc, 0) / LIVE_AGENTS.length).toFixed(1)
const N_LIVE      = LIVE_AGENTS.length
const N_DRAFT     = DRAFT_AGENTS.length

const STATS = [
  { label: 'Total convs',   value: TOTAL_CONVS, unit: 'msgs'     },
  { label: 'Moy. escalade', value: AVG_ESC + '%', unit: 'avg'    },
  { label: 'Agents live',   value: String(N_LIVE),  unit: 'actifs' },
  { label: 'Brouillons',    value: String(N_DRAFT), unit: 'draft'  },
]

// ── AgentsView ────────────────────────────────────────────────────────────────

export function AgentsView() {
  return (
    <div
      style={{
        display:       'flex',
        flexDirection: 'column',
        padding:       'var(--page-pad)',
        maxWidth:      720,
        margin:        '0 auto',
        width:         '100%',
        gap:           28,
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          paddingBottom:  12,
          borderBottom:   '1px solid var(--border)',
        }}
      >
        <span
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      10,
            letterSpacing: '0.18em',
            color:         'var(--text-muted)',
            textTransform: 'uppercase',
          }}
        >
          Agents déployés
        </span>
        <button
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      10,
            letterSpacing: '0.1em',
            color:         'var(--accent)',
            padding:       '4px 10px',
            border:        '1px solid var(--accent-border)',
            borderRadius:  100,
            background:    'var(--accent-dim)',
            cursor:        'pointer',
            transition:    'background 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,255,0,0.2)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-dim)' }}
        >
          + Nouvel agent
        </button>
      </div>

      {/* ── Stats grid ────────────────────────────────────────────────────── */}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          border:              '1px solid var(--border)',
          borderRadius:        'var(--r-md)',
          overflow:            'hidden',
        }}
      >
        {STATS.map((stat, i) => (
          <StatCard key={stat.label} stat={stat} divider={i < 3} />
        ))}
      </div>

      {/* ── Live agents ───────────────────────────────────────────────────── */}
      <section>
        <SectionLabel>Live</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 6 }}>
          {LIVE_AGENTS.map((agent) => (
            <LiveAgentRow key={agent.name} agent={agent} />
          ))}
        </div>
      </section>

      {/* ── Draft agents ──────────────────────────────────────────────────── */}
      <section>
        <SectionLabel>Brouillons</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 6 }}>
          {DRAFT_AGENTS.map((agent) => (
            <DraftAgentRow key={agent.name} agent={agent} />
          ))}
        </div>
      </section>

      {/* ── Service latency ───────────────────────────────────────────────── */}
      <section>
        <SectionLabel>Service latency</SectionLabel>
        <div
          style={{
            display:       'flex',
            flexDirection: 'column',
            marginTop:     6,
            border:        '1px solid var(--border)',
            borderRadius:  'var(--r-md)',
            overflow:      'hidden',
          }}
        >
          {SERVICES.map((svc, i) => (
            <LatencyRow key={svc.name} svc={svc} divider={i < SERVICES.length - 1} />
          ))}
        </div>
      </section>
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
  stat,
  divider,
}: {
  stat:    { label: string; value: string; unit: string }
  divider: boolean
}) {
  return (
    <div
      style={{
        padding:       '16px 18px',
        background:    'var(--surface-1)',
        borderRight:   divider ? '1px solid var(--border)' : 'none',
        display:       'flex',
        flexDirection: 'column',
        gap:           4,
      }}
    >
      <span
        style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      8,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color:         'var(--text-muted)',
        }}
      >
        {stat.label}
      </span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
        <span
          style={{
            fontFamily:    'var(--font-serif)',
            fontSize:      24,
            color:         'var(--text)',
            lineHeight:    1,
            letterSpacing: '-0.02em',
          }}
        >
          {stat.value}
        </span>
        <span
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      8,
            color:         'var(--text-muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {stat.unit}
        </span>
      </div>
    </div>
  )
}

// ── SectionLabel ──────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display:    'flex',
        alignItems: 'center',
        gap:        10,
        marginBottom: 2,
      }}
    >
      <span
        style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      9,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color:         'var(--text-muted)',
          whiteSpace:    'nowrap',
        }}
      >
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}

// ── LiveAgentRow ──────────────────────────────────────────────────────────────

function LiveAgentRow({ agent }: { agent: LiveAgent }) {
  const [hovered, setHovered] = useState(false)
  const escHigh = agent.esc > 7

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:             'grid',
        gridTemplateColumns: '1fr auto auto auto',
        alignItems:          'center',
        gap:                 20,
        padding:             '11px 12px',
        borderRadius:        'var(--r-md)',
        background:          hovered ? 'var(--surface-hover)' : 'transparent',
        cursor:              'pointer',
        transition:          'background 0.12s',
      }}
    >
      {/* Dot + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          className="dot-live"
          style={{
            width:        7,
            height:       7,
            borderRadius: '50%',
            background:   '#69ff9c',
            flexShrink:   0,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span
            style={{
              fontFamily:    'var(--font-serif)',
              fontSize:      14,
              color:         hovered ? 'var(--text)' : 'var(--text-secondary)',
              transition:    'color 0.12s',
              letterSpacing: '-0.01em',
            }}
          >
            {agent.name}
          </span>
          <span
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      9,
              color:         'var(--text-muted)',
              letterSpacing: '0.06em',
            }}
          >
            {agent.model}
          </span>
        </div>
      </div>

      {/* Conv count */}
      <div style={{ textAlign: 'right' }}>
        <div
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      13,
            color:         'var(--text-secondary)',
            letterSpacing: '0.02em',
          }}
        >
          {agent.convs}
        </div>
        <div
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      8,
            color:         'var(--text-muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          convs
        </div>
      </div>

      {/* Escalation */}
      <div style={{ textAlign: 'right', minWidth: 52 }}>
        <div
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      13,
            color:         escHigh ? 'var(--status-warning)' : 'var(--text-secondary)',
            letterSpacing: '0.02em',
          }}
        >
          {agent.esc}%
        </div>
        <div
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      8,
            color:         'var(--text-muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          escalade
        </div>
      </div>

      {/* Live pill */}
      <span
        style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color:         '#69ff9c',
          padding:       '3px 9px',
          border:        '1px solid rgba(105,255,156,0.3)',
          borderRadius:  100,
          background:    'rgba(105,255,156,0.08)',
          whiteSpace:    'nowrap',
        }}
      >
        LIVE
      </span>
    </div>
  )
}

// ── DraftAgentRow ─────────────────────────────────────────────────────────────

function DraftAgentRow({ agent }: { agent: DraftAgent }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:             'grid',
        gridTemplateColumns: '1fr auto auto',
        alignItems:          'center',
        gap:                 20,
        padding:             '11px 12px',
        borderRadius:        'var(--r-md)',
        background:          hovered ? 'var(--surface-hover)' : 'transparent',
        cursor:              'pointer',
        transition:          'background 0.12s',
        opacity:             hovered ? 1 : 0.8,
      }}
    >
      {/* Dot + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width:        7,
            height:       7,
            borderRadius: '50%',
            background:   '#ffaa00',
            boxShadow:    '0 0 5px rgba(255,170,0,0.5)',
            flexShrink:   0,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span
            style={{
              fontFamily:    'var(--font-serif)',
              fontSize:      14,
              color:         hovered ? 'var(--text)' : 'var(--text-muted)',
              transition:    'color 0.12s',
              letterSpacing: '-0.01em',
            }}
          >
            {agent.name}
          </span>
          <span
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      9,
              color:         'var(--text-muted)',
              letterSpacing: '0.06em',
              opacity:       0.7,
            }}
          >
            {agent.note}
          </span>
        </div>
      </div>

      {/* Model */}
      <span
        style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      9,
          color:         'var(--text-muted)',
          letterSpacing: '0.06em',
        }}
      >
        {agent.model}
      </span>

      {/* Brouillon badge */}
      <span
        style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color:         '#ffaa00',
          padding:       '3px 9px',
          border:        '1px solid rgba(255,170,0,0.3)',
          borderRadius:  100,
          background:    'rgba(255,170,0,0.08)',
          whiteSpace:    'nowrap',
        }}
      >
        Brouillon
      </span>
    </div>
  )
}

// ── LatencyRow ────────────────────────────────────────────────────────────────

const LATENCY_MAX = 1500 // ms — scale for bar

function LatencyRow({
  svc,
  divider,
}: {
  svc:     ServiceRow
  divider: boolean
}) {
  const ratio   = Math.min(svc.ms / LATENCY_MAX, 1)
  const isOk    = svc.ms < 400
  const isSlow  = svc.ms >= 400 && svc.ms < 900
  const dotColor = isOk ? '#69ff9c' : isSlow ? '#ffaa00' : '#ff4444'
  const barColor = isOk ? '#69ff9c' : isSlow ? '#ffaa00' : '#ff4444'
  const statusLabel = isOk ? 'OK' : isSlow ? 'LENT' : 'ERR'

  return (
    <div
      style={{
        display:             'grid',
        gridTemplateColumns: '160px 1fr 52px 48px',
        alignItems:          'center',
        gap:                 16,
        padding:             '12px 16px',
        background:          'var(--surface-1)',
        borderBottom:        divider ? '1px solid var(--border)' : 'none',
      }}
    >
      {/* Service name */}
      <span
        style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      10,
          color:         'var(--text-secondary)',
          letterSpacing: '0.04em',
          whiteSpace:    'nowrap',
        }}
      >
        {svc.name}
      </span>

      {/* Bar track */}
      <div
        style={{
          position:     'relative',
          height:       3,
          borderRadius: 2,
          background:   'var(--border)',
          overflow:     'hidden',
        }}
      >
        <div
          style={{
            position:     'absolute',
            left:         0,
            top:          0,
            height:       '100%',
            width:        `${ratio * 100}%`,
            borderRadius: 2,
            background:   barColor,
            boxShadow:    `0 0 6px ${barColor}88`,
            animation:    'bar-grow 0.6s ease-out',
          }}
        />
      </div>

      {/* ms value */}
      <span
        style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      11,
          color:         dotColor,
          letterSpacing: '0.04em',
          textAlign:     'right',
        }}
      >
        {svc.label}
      </span>

      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
        <div
          style={{
            width:        5,
            height:       5,
            borderRadius: '50%',
            background:   dotColor,
            boxShadow:    `0 0 5px ${dotColor}`,
            flexShrink:   0,
          }}
        />
        <span
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      8,
            color:         dotColor,
            letterSpacing: '0.12em',
          }}
        >
          {statusLabel}
        </span>
      </div>
    </div>
  )
}
