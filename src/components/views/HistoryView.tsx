'use client'

import { useState } from 'react'
import { useChatStore } from '@/store/useChatStore'
import { useViewStore } from '@/store/useViewStore'
import { SC_CONFIRMATION, SC_ADVISOR, SC_WEARABLE } from '@/lib/scenarios'
import type { Scenario } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

type SpecType = 'COMPONENT' | 'AGENT' | 'ADAPT'

interface HistEntry {
  id:       string
  title:    string
  type:     SpecType
  date:     string
  time:     string
  scenario: Scenario
  prompt:   string
}

// ── Mock history ──────────────────────────────────────────────────────────────

const HISTORY: HistEntry[] = [
  { id: 'h01', title: 'ConfirmationTransfer',  type: 'COMPONENT', date: "Aujourd'hui", time: '14:32', scenario: SC_CONFIRMATION, prompt: 'un composant de confirmation de virement pour une appli fintech'    },
  { id: 'h02', title: 'VoltaAdvisor',           type: 'AGENT',     date: "Aujourd'hui", time: '11:15', scenario: SC_ADVISOR,      prompt: 'un agent conseiller financier pour Volta. Empathique, escalade 85%' },
  { id: 'h03', title: 'AmountDisplay → Watch',  type: 'ADAPT',     date: "Aujourd'hui", time: '09:47', scenario: SC_WEARABLE,     prompt: 'adapter AmountDisplay pour Apple Watch Series 9, 2 lignes max'      },
  { id: 'h04', title: 'OnboardingFlow',          type: 'COMPONENT', date: 'Hier',        time: '17:22', scenario: SC_CONFIRMATION, prompt: 'composant onboarding fintech avec étapes de vérification KYC'         },
  { id: 'h05', title: 'RiskProfiler',            type: 'AGENT',     date: 'Hier',        time: '14:08', scenario: SC_ADVISOR,      prompt: 'agent profilage risque investisseur avec escalade humain'             },
  { id: 'h06', title: 'Dashboard → Tablet',      type: 'ADAPT',     date: 'Hier',        time: '10:55', scenario: SC_WEARABLE,     prompt: 'adapter dashboard mobile vers tablette landscape'                    },
  { id: 'h07', title: 'PaymentSummary',          type: 'COMPONENT', date: '10 mars',     time: '16:33', scenario: SC_CONFIRMATION, prompt: 'résumé de paiement avec breakdown des frais et TVA'                  },
  { id: 'h08', title: 'EscalationRouter',        type: 'AGENT',     date: '10 mars',     time: '11:20', scenario: SC_ADVISOR,      prompt: 'agent routage des escalades vers conseillers humains urgences'       },
  { id: 'h09', title: 'CardWidget → TV',         type: 'ADAPT',     date: '9 mars',      time: '15:44', scenario: SC_WEARABLE,     prompt: 'adapter carte produit vers interface smart TV 10 pieds'             },
  { id: 'h10', title: 'BiometricPrompt',         type: 'COMPONENT', date: '9 mars',      time: '09:12', scenario: SC_CONFIRMATION, prompt: 'composant prompt biométrique fintech pour transactions sensibles'    },
]

// ── Color config per type ─────────────────────────────────────────────────────

const TYPE_CFG: Record<SpecType, {
  dot:    string
  bg:     string
  border: string
  text:   string
}> = {
  COMPONENT: {
    dot:    '#1a6bff',
    bg:     'rgba(26, 107, 255, 0.1)',
    border: 'rgba(26, 107, 255, 0.3)',
    text:   '#4a9eff',
  },
  AGENT: {
    dot:    '#ff4444',
    bg:     'rgba(255, 68, 68, 0.1)',
    border: 'rgba(255, 68, 68, 0.3)',
    text:   '#ff6b6b',
  },
  ADAPT: {
    dot:    '#69ff9c',
    bg:     'rgba(105, 255, 156, 0.1)',
    border: 'rgba(105, 255, 156, 0.3)',
    text:   '#69ff9c',
  },
}

// ── Derived stats ─────────────────────────────────────────────────────────────

const STATS = [
  { label: 'Specs générés',  value: HISTORY.length,                                    unit: 'total'  },
  { label: 'Agents actifs',  value: HISTORY.filter(h => h.type === 'AGENT').length,    unit: 'live'   },
  { label: 'Adapts',         value: HISTORY.filter(h => h.type === 'ADAPT').length,    unit: 'target' },
]

// ── Grouped by date (preserving insertion order) ──────────────────────────────

const DATE_ORDER = [...new Set(HISTORY.map(h => h.date))]
const GROUPED    = HISTORY.reduce<Record<string, HistEntry[]>>((acc, e) => {
  ;(acc[e.date] ??= []).push(e)
  return acc
}, {})

// ── HistoryView ───────────────────────────────────────────────────────────────

export function HistoryView() {
  const { clearMessages, addUserMessage, addResult } = useChatStore()
  const { setView } = useViewStore()

  const replay = (entry: HistEntry) => {
    clearMessages()
    addUserMessage(entry.prompt)
    addResult(entry.scenario, null)
    setView('chat')
  }

  return (
    <div
      style={{
        display:       'flex',
        flexDirection: 'column',
        padding:       'var(--page-pad)',
        maxWidth:      680,
        margin:        '0 auto',
        width:         '100%',
      }}
    >
      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          border:              '1px solid var(--border)',
          borderRadius:        'var(--r-md)',
          overflow:            'hidden',
          marginBottom:        32,
        }}
      >
        {STATS.map((stat, i) => (
          <StatCell key={stat.label} stat={stat} divider={i < 2} />
        ))}
      </div>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      10,
          letterSpacing: '0.18em',
          color:         'var(--text-muted)',
          textTransform: 'uppercase',
          marginBottom:  20,
          paddingBottom: 12,
          borderBottom:  '1px solid var(--border)',
        }}
      >
        Conversation history
      </div>

      {/* ── Grouped rows ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {DATE_ORDER.map((date) => (
          <div key={date}>
            {/* Date divider */}
            <div
              style={{
                display:    'flex',
                alignItems: 'center',
                gap:        10,
                margin:     '10px 0 4px',
              }}
            >
              <span
                style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      9,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color:         'var(--text-muted)',
                  whiteSpace:    'nowrap',
                }}
              >
                {date}
              </span>
              <div
                style={{
                  flex:       1,
                  height:     1,
                  background: 'var(--border)',
                }}
              />
            </div>

            {/* Entries */}
            {GROUPED[date].map((entry) => (
              <HistoryRow key={entry.id} entry={entry} onReplay={replay} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── StatCell ──────────────────────────────────────────────────────────────────

function StatCell({
  stat,
  divider,
}: {
  stat:    { label: string; value: number; unit: string }
  divider: boolean
}) {
  return (
    <div
      style={{
        padding:        '18px 20px',
        background:     'var(--surface-1)',
        borderRight:    divider ? '1px solid var(--border)' : 'none',
        display:        'flex',
        flexDirection:  'column',
        gap:            5,
      }}
    >
      <span
        style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      9,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color:         'var(--text-muted)',
        }}
      >
        {stat.label}
      </span>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span
          style={{
            fontFamily:    'var(--font-serif)',
            fontSize:      30,
            color:         'var(--text)',
            lineHeight:    1,
            letterSpacing: '-0.03em',
          }}
        >
          {stat.value}
        </span>
        <span
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      9,
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

// ── HistoryRow ────────────────────────────────────────────────────────────────

function HistoryRow({
  entry,
  onReplay,
}: {
  entry:    HistEntry
  onReplay: (e: HistEntry) => void
}) {
  const [hovered, setHovered] = useState(false)
  const cfg = TYPE_CFG[entry.type]

  return (
    <div
      onClick={() => onReplay(entry)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:             'grid',
        gridTemplateColumns: '10px 1fr auto auto',
        alignItems:          'center',
        gap:                 12,
        padding:             '9px 10px',
        borderRadius:        'var(--r-sm)',
        cursor:              'pointer',
        background:          hovered ? 'var(--surface-hover)' : 'transparent',
        transition:          'background 0.12s',
      }}
    >
      {/* Colored dot */}
      <div
        style={{
          width:      6,
          height:     6,
          borderRadius: '50%',
          background:  cfg.dot,
          boxShadow:   hovered ? `0 0 7px ${cfg.dot}99` : 'none',
          transition:  'box-shadow 0.15s',
          justifySelf: 'center',
        }}
      />

      {/* Italic title */}
      <span
        style={{
          fontFamily:    'var(--font-serif)',
          fontSize:      14,
          fontStyle:     'italic',
          letterSpacing: '-0.01em',
          color:         hovered ? 'var(--text)' : 'var(--text-secondary)',
          transition:    'color 0.12s',
          overflow:      'hidden',
          textOverflow:  'ellipsis',
          whiteSpace:    'nowrap',
        }}
      >
        {entry.title}
      </span>

      {/* Type pill */}
      <span
        style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      9,
          letterSpacing: '0.12em',
          color:         cfg.text,
          padding:       '2px 8px',
          background:    cfg.bg,
          border:        `1px solid ${cfg.border}`,
          borderRadius:  100,
          whiteSpace:    'nowrap',
        }}
      >
        {entry.type}
      </span>

      {/* Monospace time */}
      <span
        style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      10,
          color:         'var(--text-muted)',
          letterSpacing: '0.04em',
          minWidth:      36,
          textAlign:     'right',
        }}
      >
        {entry.time}
      </span>
    </div>
  )
}
