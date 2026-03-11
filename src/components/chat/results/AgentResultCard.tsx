'use client'

import { useState } from 'react'
import type { AgentScenario, AgentNode, AgentSlider } from '@/types'

// ── Status palette ────────────────────────────────────────────────────────────

const NODE_COLOR: Record<AgentNode['status'], string> = {
  active:  '#69ff9c',
  warning: '#ffd166',
  rule:    '#c8ff00',
  passive: '#555',
}

const NODE_STATUS_LABEL: Record<AgentNode['status'], string> = {
  active:  'actif',
  warning: 'attention',
  rule:    'règle',
  passive: 'passif',
}

// ── AgentResultCard ───────────────────────────────────────────────────────────

export function AgentResultCard({ scenario }: { scenario: AgentScenario }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [sliders, setSliders]         = useState<AgentSlider[]>(scenario.sliders)
  const [exportDone, setExportDone]   = useState(false)
  const [showRefine, setShowRefine]   = useState(false)

  const updateSlider = (key: string, value: number) =>
    setSliders((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)))

  const handleExport = () => {
    navigator.clipboard?.writeText(scenario.mcp).catch(() => {})
    setExportDone(true)
    setTimeout(() => setExportDone(false), 2000)
  }

  const toggleNode = (idx: number) =>
    setExpandedIdx((prev) => (prev === idx ? null : idx))

  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <AgentCardHeader title={scenario.title} />

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 180px',
        }}
      >
        {/* Left column: nodes + sliders */}
        <div
          style={{
            padding: '20px 20px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
            borderRight: '1px solid var(--border)',
          }}
        >
          <NodesSection
            nodes={scenario.nodes}
            expandedIdx={expandedIdx}
            onToggle={toggleNode}
          />
          <SlidersSection sliders={sliders} onChange={updateSlider} />
        </div>

        {/* Right column: persona */}
        <PersonaGrid persona={scenario.persona} />
      </div>

      {/* ── Action bar ─────────────────────────────────────────────────── */}
      <AgentActionBar
        exportDone={exportDone}
        showRefine={showRefine}
        refines={scenario.refine}
        onExport={handleExport}
        onToggleRefine={() => setShowRefine((v) => !v)}
        onCloseRefine={() => setShowRefine(false)}
      />
    </div>
  )
}

// ── AgentCardHeader ───────────────────────────────────────────────────────────

function AgentCardHeader({ title }: { title: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 20px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#69ff9c',
          boxShadow: '0 0 6px #69ff9c',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          color: '#69ff9c',
          textTransform: 'uppercase',
        }}
      >
        AgentSpec
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
        /
      </span>
      <span
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 13,
          color: 'var(--text)',
          flex: 1,
          fontStyle: 'italic',
        }}
      >
        {title}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: '#69ff9c',
          opacity: 0.7,
          letterSpacing: '0.06em',
        }}
      >
        ~340ms
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--text-muted)',
          padding: '2px 6px',
          border: '1px solid var(--border)',
          borderRadius: 100,
          letterSpacing: '0.06em',
        }}
      >
        v2.1
      </span>
    </div>
  )
}

// ── NodesSection ──────────────────────────────────────────────────────────────

function NodesSection({
  nodes,
  expandedIdx,
  onToggle,
}: {
  nodes: AgentNode[]
  expandedIdx: number | null
  onToggle: (i: number) => void
}) {
  return (
    <div>
      <SectionLabel>Behavior Nodes</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {nodes.map((node, i) => (
          <NodeRow
            key={i}
            node={node}
            expanded={expandedIdx === i}
            onToggle={() => onToggle(i)}
          />
        ))}
      </div>
    </div>
  )
}

// ── NodeRow ───────────────────────────────────────────────────────────────────

function NodeRow({
  node,
  expanded,
  onToggle,
}: {
  node: AgentNode
  expanded: boolean
  onToggle: () => void
}) {
  const color = NODE_COLOR[node.status]

  return (
    <div
      onClick={onToggle}
      style={{
        borderLeft: `3px solid ${color}`,
        paddingLeft: 10,
        paddingBlock: 7,
        paddingRight: 10,
        borderRadius: '0 var(--r-sm) var(--r-sm) 0',
        background: expanded ? 'var(--surface-2)' : 'transparent',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!expanded)
          (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-hover)'
      }}
      onMouseLeave={(e) => {
        if (!expanded)
          (e.currentTarget as HTMLDivElement).style.background = 'transparent'
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Label */}
        <span
          style={{
            flex: 1,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: node.status === 'passive' ? 'var(--text-muted)' : 'var(--text-secondary)',
            letterSpacing: '0.03em',
            lineHeight: 1.4,
          }}
        >
          {node.label}
        </span>

        {/* Sub tag */}
        {node.sub && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color,
              padding: '1px 5px',
              border: `1px solid ${color}44`,
              borderRadius: 3,
              letterSpacing: '0.06em',
              whiteSpace: 'nowrap',
              opacity: 0.85,
            }}
          >
            {node.sub}
          </span>
        )}

        {/* Status dot */}
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
            boxShadow: node.status !== 'passive' ? `0 0 4px ${color}88` : 'none',
          }}
          title={NODE_STATUS_LABEL[node.status]}
        />

        {/* Chevron */}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--text-muted)',
            transition: 'transform 0.15s',
            display: 'inline-block',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            lineHeight: 1,
          }}
        >
          ▾
        </span>
      </div>

      {/* Expanded detail */}
      <div
        style={{
          maxHeight: expanded ? '72px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.2s ease',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 12,
            color: 'var(--text-secondary)',
            lineHeight: 1.55,
            paddingTop: 7,
            fontStyle: 'italic',
          }}
        >
          {node.detail}
        </p>
      </div>
    </div>
  )
}

// ── SlidersSection ────────────────────────────────────────────────────────────

function SlidersSection({
  sliders,
  onChange,
}: {
  sliders: AgentSlider[]
  onChange: (key: string, value: number) => void
}) {
  return (
    <div style={{ paddingBottom: 20 }}>
      <SectionLabel>Calibration</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sliders.map((s) => (
          <SliderRow key={s.key} slider={s} onChange={(v) => onChange(s.key, v)} />
        ))}
      </div>
    </div>
  )
}

// ── SliderRow ─────────────────────────────────────────────────────────────────

function SliderRow({
  slider,
  onChange,
}: {
  slider: AgentSlider
  onChange: (v: number) => void
}) {
  const pct = slider.value  // 0-100

  // Color the value based on intensity
  const valueColor =
    pct >= 70 ? '#69ff9c'
    : pct >= 40 ? 'var(--text-secondary)'
    : '#ffd166'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Label */}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--text-muted)',
          letterSpacing: '0.06em',
          width: 100,
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        {slider.name}
      </span>

      {/* Range input */}
      <input
        type="range"
        min={0}
        max={100}
        value={pct}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          flex: 1,
          background: `linear-gradient(to right, var(--accent) ${pct}%, rgba(255,255,255,0.1) ${pct}%)`,
        }}
      />

      {/* Value */}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: valueColor,
          width: 28,
          textAlign: 'right',
          flexShrink: 0,
          transition: 'color 0.2s',
          letterSpacing: '0.04em',
        }}
      >
        {pct}
      </span>
    </div>
  )
}

// ── PersonaGrid ───────────────────────────────────────────────────────────────

function PersonaGrid({ persona }: { persona: [string, string][] }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 16px',
        gap: 12,
      }}
    >
      <SectionLabel>Persona</SectionLabel>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 1,
          background: 'var(--border)',
          borderRadius: 'var(--r-md)',
          overflow: 'hidden',
          border: '1px solid var(--border)',
        }}
      >
        {persona.map(([value, key]) => (
          <PersonaTile key={key} value={value} label={key} />
        ))}
      </div>
    </div>
  )
}

function PersonaTile({ value, label }: { value: string; label: string }) {
  return (
    <div
      style={{
        background: 'var(--bg)',
        padding: '12px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        alignItems: 'flex-start',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 14,
          color: 'var(--text)',
          lineHeight: 1.2,
          fontWeight: 400,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--text-muted)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </div>
  )
}

// ── AgentActionBar ────────────────────────────────────────────────────────────

function AgentActionBar({
  exportDone,
  showRefine,
  refines,
  onExport,
  onToggleRefine,
  onCloseRefine,
}: {
  exportDone: boolean
  showRefine: boolean
  refines: string[]
  onExport: () => void
  onToggleRefine: () => void
  onCloseRefine: () => void
}) {
  return (
    <div
      style={{
        borderTop: '1px solid var(--border)',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <ActionBtn
        label={exportDone ? '✓ Copié' : 'Export MCP'}
        accent={exportDone}
        onClick={onExport}
      />
      <ActionBtn label="Voir story" onClick={() => {}} />

      <div style={{ flex: 1 }} />

      <div style={{ position: 'relative' }}>
        <ActionBtn label="Affiner ↓" tinted onClick={onToggleRefine} />

        {showRefine && (
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 6px)',
              right: 0,
              background: '#101012',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--r-md)',
              padding: '6px 4px',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              minWidth: 200,
              zIndex: 10,
            }}
          >
            {refines.map((r) => (
              <button
                key={r}
                onClick={onCloseRefine}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.04em',
                  padding: '7px 12px',
                  borderRadius: 'var(--r-sm)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: 'transparent',
                  border: 'none',
                  transition: 'background 0.1s, color 0.1s',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                }}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ActionBtn({
  label,
  accent = false,
  tinted = false,
  onClick,
}: {
  label: string
  accent?: boolean
  tinted?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        letterSpacing: '0.06em',
        color:  accent ? '#080809' : tinted ? 'var(--accent)' : 'var(--text-secondary)',
        background: accent ? 'var(--accent)' : tinted ? 'var(--accent-dim)' : 'transparent',
        border: `1px solid ${accent ? 'transparent' : tinted ? 'var(--accent-border)' : 'var(--border)'}`,
        borderRadius: 'var(--r-sm)',
        padding: '5px 12px',
        cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!accent) {
          ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'
          ;(e.currentTarget as HTMLElement).style.color = tinted ? 'var(--accent)' : 'var(--text)'
          ;(e.currentTarget as HTMLElement).style.background = tinted ? 'var(--accent-dim)' : 'var(--surface-hover)'
        }
      }}
      onMouseLeave={(e) => {
        if (!accent) {
          ;(e.currentTarget as HTMLElement).style.borderColor = tinted ? 'var(--accent-border)' : 'var(--border)'
          ;(e.currentTarget as HTMLElement).style.color = tinted ? 'var(--accent)' : 'var(--text-secondary)'
          ;(e.currentTarget as HTMLElement).style.background = tinted ? 'var(--accent-dim)' : 'transparent'
        }
      }}
    >
      {label}
    </button>
  )
}

// ── SectionLabel ──────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        letterSpacing: '0.2em',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  )
}
