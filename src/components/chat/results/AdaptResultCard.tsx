'use client'

import { useState } from 'react'
import type { AdaptScenario, Mutation } from '@/types'

// ── Adapt accent ──────────────────────────────────────────────────────────────

const ADAPT_ACCENT = '#ff9f43'
const ADAPT_DIM    = 'rgba(255, 159, 67, 0.1)'
const ADAPT_BORDER = 'rgba(255, 159, 67, 0.25)'

// ── AdaptResultCard ───────────────────────────────────────────────────────────

export function AdaptResultCard({ scenario }: { scenario: AdaptScenario }) {
  const [exportDone, setExportDone] = useState(false)
  const [showRefine, setShowRefine] = useState(false)

  const handleExport = () => {
    navigator.clipboard?.writeText(scenario.mcp).catch(() => {})
    setExportDone(true)
    setTimeout(() => setExportDone(false), 2000)
  }

  // Parse title for "Source → Target"
  const [source, target] = scenario.title.split('→').map((s) => s.trim())

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
      <AdaptHeader title={scenario.title} />

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 176px' }}>

        {/* Left column */}
        <div
          style={{
            padding: '20px 20px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
            borderRight: '1px solid var(--border)',
          }}
        >
          <MutationsSection mutations={scenario.mutations} />
          <InheritedSection inherited={scenario.inherited} />
          <ExportBadge
            modified={scenario.mutations.length}
            inherited={scenario.inherited.length}
          />
          <div style={{ height: 0 }} />
        </div>

        {/* Right column: before / after preview */}
        <AdaptPreview source={source} target={target ?? source} />
      </div>

      {/* ── Action bar ─────────────────────────────────────────────────── */}
      <AdaptActionBar
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

// ── AdaptHeader ───────────────────────────────────────────────────────────────

function AdaptHeader({ title }: { title: string }) {
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
          background: ADAPT_ACCENT,
          boxShadow: `0 0 6px ${ADAPT_ACCENT}`,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          color: ADAPT_ACCENT,
          textTransform: 'uppercase',
        }}
      >
        ContextLayer
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
        /
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.1em',
          color: ADAPT_ACCENT,
          padding: '2px 6px',
          background: ADAPT_DIM,
          border: `1px solid ${ADAPT_BORDER}`,
          borderRadius: 3,
          textTransform: 'uppercase',
        }}
      >
        adapt
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
          color: ADAPT_ACCENT,
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

// ── MutationsSection ──────────────────────────────────────────────────────────

function MutationsSection({ mutations }: { mutations: Mutation[] }) {
  return (
    <div>
      <SectionLabel>
        Mutations&nbsp;
        <span style={{ color: ADAPT_ACCENT, letterSpacing: 0 }}>({mutations.length})</span>
      </SectionLabel>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {mutations.map((m, i) => (
          <MutationRow key={i} mutation={m} />
        ))}
      </div>
    </div>
  )
}

// ── MutationRow ───────────────────────────────────────────────────────────────

function MutationRow({ mutation }: { mutation: Mutation }) {
  return (
    <div
      style={{
        padding: '7px 10px',
        background: 'var(--surface-1)',
        borderRadius: 'var(--r-sm)',
        borderLeft: `2px solid ${ADAPT_ACCENT}44`,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {/* FROM — red strikethrough */}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: '#ff6b6b',
          textDecoration: 'line-through',
          textDecorationColor: '#ff6b6b88',
          letterSpacing: '0.03em',
          opacity: 0.8,
          lineHeight: 1.4,
        }}
      >
        {mutation.from}
      </span>

      {/* Arrow */}
      <span style={{ color: 'var(--text-muted)', fontSize: 10, flexShrink: 0 }}>→</span>

      {/* TO — green + reason below */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: '#69ff9c',
            letterSpacing: '0.03em',
            lineHeight: 1.4,
          }}
        >
          {mutation.to}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 10,
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            lineHeight: 1.3,
          }}
        >
          · {mutation.why}
        </span>
      </div>
    </div>
  )
}

// ── InheritedSection ──────────────────────────────────────────────────────────

function InheritedSection({ inherited }: { inherited: string[] }) {
  return (
    <div>
      <SectionLabel>
        Tokens hérités&nbsp;
        <span style={{ color: 'var(--text-secondary)', letterSpacing: 0 }}>({inherited.length})</span>
      </SectionLabel>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px 10px',
        }}
      >
        {inherited.map((token) => (
          <div key={token} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                width: 3,
                height: 3,
                borderRadius: '50%',
                background: 'var(--text-muted)',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--text-muted)',
                letterSpacing: '0.03em',
              }}
            >
              {token}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── ExportBadge ───────────────────────────────────────────────────────────────

function ExportBadge({ modified, inherited }: { modified: number; inherited: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        background: ADAPT_DIM,
        border: `1px solid ${ADAPT_BORDER}`,
        borderRadius: 'var(--r-md)',
        marginBottom: 20,
      }}
    >
      {/* Ready indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: ADAPT_ACCENT,
            boxShadow: `0 0 5px ${ADAPT_ACCENT}`,
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.18em',
            color: ADAPT_ACCENT,
            textTransform: 'uppercase',
          }}
        >
          Export prêt
        </span>
      </div>

      {/* Separator */}
      <span style={{ width: 1, height: 20, background: ADAPT_BORDER, flexShrink: 0 }} />

      {/* Diff summary */}
      <div style={{ display: 'flex', gap: 14 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
          MCP diff
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#ff6b6b', letterSpacing: '0.04em' }}>
          {modified} modifiés
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
          {inherited} hérités
        </span>
      </div>
    </div>
  )
}

// ── AdaptPreview ──────────────────────────────────────────────────────────────

function AdaptPreview({ source, target }: { source: string; target: string }) {
  const isWatch = target.toLowerCase().includes('watch')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        padding: '20px 14px',
      }}
    >
      <SectionLabel>Avant / Après</SectionLabel>

      {/* Mobile — before */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {source}
        </span>
        <MobileFrame />
      </div>

      {/* Adapt arrow */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <div
          style={{
            width: 1,
            height: 8,
            background: `linear-gradient(to bottom, transparent, ${ADAPT_ACCENT}88)`,
          }}
        />
        <span style={{ fontSize: 9, color: ADAPT_ACCENT }}>↓</span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            color: ADAPT_ACCENT,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          adapt
        </span>
        <div
          style={{
            width: 1,
            height: 8,
            background: `linear-gradient(to bottom, ${ADAPT_ACCENT}88, transparent)`,
          }}
        />
      </div>

      {/* Target device — after */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            alignSelf: 'flex-start',
          }}
        >
          {target}
        </span>
        {isWatch ? <WatchFrame /> : <MobileFrame compact />}
      </div>

      {/* Diff pill */}
      <div
        style={{
          marginTop: 4,
          padding: '3px 8px',
          background: ADAPT_DIM,
          border: `1px solid ${ADAPT_BORDER}`,
          borderRadius: 100,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: ADAPT_ACCENT,
          letterSpacing: '0.08em',
          whiteSpace: 'nowrap',
        }}
      >
        3 mod / 14 hérités
      </div>
    </div>
  )
}

// ── MobileFrame ───────────────────────────────────────────────────────────────

function MobileFrame({ compact = false }: { compact?: boolean }) {
  return (
    <div
      style={{
        width: '100%',
        height: compact ? 56 : 80,
        borderRadius: compact ? 8 : 12,
        border: '1.5px solid var(--border-strong)',
        background: '#0c0c0e',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: compact ? '6px 10px' : '10px 12px',
        gap: 4,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {!compact && (
        <div
          style={{
            position: 'absolute',
            top: 5,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 24,
            height: 3,
            borderRadius: 2,
            background: 'var(--border-strong)',
          }}
        />
      )}
      <span
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: compact ? 14 : 18,
          color: 'var(--text)',
          lineHeight: 1.1,
          letterSpacing: '-0.01em',
          marginTop: compact ? 0 : 8,
        }}
      >
        {compact ? '€8 450' : '€ 8 450'}
      </span>
      {!compact && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            color: 'var(--text-muted)',
            letterSpacing: '0.04em',
          }}
        >
          Marie Dupont · 3 lignes · 32px
        </span>
      )}
    </div>
  )
}

// ── WatchFrame ────────────────────────────────────────────────────────────────

function WatchFrame() {
  return (
    <div
      style={{
        width: 88,
        height: 96,
        borderRadius: 22,
        border: '2px solid var(--border-strong)',
        background: '#0a0a0c',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        position: 'relative',
        overflow: 'hidden',
        alignSelf: 'center',
      }}
    >
      {/* Crown button */}
      <div
        style={{
          position: 'absolute',
          right: -4,
          top: '40%',
          width: 4,
          height: 16,
          borderRadius: 2,
          background: 'var(--border-strong)',
        }}
      />

      {/* Amount — adapted size */}
      <span
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 16,
          color: 'var(--text)',
          lineHeight: 1,
          letterSpacing: '-0.02em',
          fontWeight: 400,
        }}
      >
        €8 450
      </span>

      {/* Haptic indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <span style={{ fontSize: 7, color: ADAPT_ACCENT }}>◈</span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 7,
            color: 'var(--text-muted)',
            letterSpacing: '0.06em',
          }}
        >
          haptic
        </span>
      </div>

      {/* 2-line constraint indicator */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
        {[1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: i === 1 ? 40 : 28,
              height: 2,
              borderRadius: 1,
              background: 'var(--border)',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ── AdaptActionBar ────────────────────────────────────────────────────────────

function AdaptActionBar({
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

// ── Shared ────────────────────────────────────────────────────────────────────

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
