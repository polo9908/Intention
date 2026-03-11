'use client'

import { useRef, useState } from 'react'
import type { ComponentScenario, DesignToken } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

type PreviewState = 'Default' | 'Hover' | 'Error' | 'Success'

// ── ComponentResultCard ───────────────────────────────────────────────────────

export function ComponentResultCard({ scenario }: { scenario: ComponentScenario }) {
  const [tokens, setTokens] = useState<DesignToken[]>(scenario.tokens)
  const [previewState, setPreviewState] = useState<PreviewState>('Default')
  const [exportDone, setExportDone] = useState(false)

  const updateToken = (idx: number, updated: DesignToken) =>
    setTokens((prev) => prev.map((t, i) => (i === idx ? updated : t)))

  const handleExport = () => {
    navigator.clipboard?.writeText(scenario.mcp).catch(() => {})
    setExportDone(true)
    setTimeout(() => setExportDone(false), 2000)
  }

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
      <CardHeader title={scenario.title} />

      {/* ── Body (2 columns) ───────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 188px',
          gap: 0,
        }}
      >
        {/* Left column */}
        <div
          style={{
            padding: '20px 20px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            borderRight: '1px solid var(--border)',
          }}
        >
          <TokensSection tokens={tokens} onUpdate={updateToken} />
          <ComponentsSection components={scenario.components} />
          <RulesSection rules={scenario.rules} />
        </div>

        {/* Right column — phone preview */}
        <PhonePreview
          title={scenario.title}
          activeState={previewState}
          onStateChange={setPreviewState}
          primaryColor={tokens[0]?.swatch ?? '#1a6bff'}
        />
      </div>

      {/* ── Action bar ─────────────────────────────────────────────────── */}
      <ActionBar
        onExport={handleExport}
        exportDone={exportDone}
        story={scenario.story}
        refines={scenario.refine}
      />
    </div>
  )
}

// ── CardHeader ────────────────────────────────────────────────────────────────

function CardHeader({ title }: { title: string }) {
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
      {/* Status dot */}
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--accent)',
          boxShadow: '0 0 6px var(--accent)',
          flexShrink: 0,
        }}
      />

      {/* Source label */}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          color: 'var(--accent)',
          textTransform: 'uppercase',
        }}
      >
        ContextLayer
      </span>

      {/* Separator + component name */}
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

      {/* Response time */}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--accent)',
          opacity: 0.7,
          letterSpacing: '0.06em',
        }}
      >
        ~340ms
      </span>

      {/* Version badge */}
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

// ── TokensSection ─────────────────────────────────────────────────────────────

function TokensSection({
  tokens,
  onUpdate,
}: {
  tokens: DesignToken[]
  onUpdate: (idx: number, t: DesignToken) => void
}) {
  return (
    <div>
      <SectionLabel>Design Tokens</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {tokens.map((token, i) => (
          <TokenRow key={token.name} token={token} onChange={(t) => onUpdate(i, t)} />
        ))}
      </div>
    </div>
  )
}

// ── TokenRow ──────────────────────────────────────────────────────────────────

function TokenRow({ token, onChange }: { token: DesignToken; onChange: (t: DesignToken) => void }) {
  const [editing, setEditing]   = useState(false)
  const [draft, setDraft]       = useState(token.value)
  const [swatchHover, setSwatchHover] = useState(false)
  const colorRef = useRef<HTMLInputElement>(null)
  const isColor  = token.swatch !== null

  const commit = () => {
    setEditing(false)
    onChange({ ...token, value: draft })
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '20px 1fr auto',
        alignItems: 'center',
        gap: 10,
        padding: '5px 0',
      }}
    >
      {/* Swatch / color picker trigger */}
      <div
        onClick={() => isColor && colorRef.current?.click()}
        onMouseEnter={() => setSwatchHover(true)}
        onMouseLeave={() => setSwatchHover(false)}
        style={{
          position: 'relative',
          width: 14,
          height: 14,
          borderRadius: 3,
          background: token.swatch ?? 'transparent',
          border: token.swatch ? 'none' : '1px solid var(--border)',
          cursor: isColor ? 'crosshair' : 'default',
          outline: swatchHover && isColor ? '2px solid var(--accent)' : 'none',
          outlineOffset: 1,
          transition: 'outline 0.1s',
          flexShrink: 0,
        }}
      >
        {isColor && (
          <input
            ref={colorRef}
            type="color"
            value={token.swatch ?? '#000000'}
            onChange={(e) =>
              onChange({ ...token, swatch: e.target.value, value: e.target.value })
            }
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0,
              width: '100%',
              height: '100%',
              cursor: 'crosshair',
              padding: 0,
              border: 'none',
            }}
          />
        )}
      </div>

      {/* Token name */}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-secondary)',
          letterSpacing: '0.03em',
        }}
      >
        {token.name}
      </span>

      {/* Value — inline editable */}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--accent)',
            background: 'var(--surface-2)',
            border: '1px solid var(--accent-border)',
            borderRadius: 3,
            padding: '1px 6px',
            width: 90,
            outline: 'none',
            textAlign: 'right',
          }}
        />
      ) : (
        <span
          onClick={() => { setEditing(true); setDraft(token.value) }}
          title="Cliquer pour éditer"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: token.swatch ? token.swatch : 'var(--text-secondary)',
            letterSpacing: '0.03em',
            cursor: 'text',
            padding: '1px 6px',
            borderRadius: 3,
            borderBottom: '1px dotted var(--text-muted)',
            transition: 'border-color 0.1s, background 0.1s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--text-secondary)'
            ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--text-muted)'
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
          }}
        >
          {token.value}
        </span>
      )}
    </div>
  )
}

// ── ComponentsSection ─────────────────────────────────────────────────────────

function ComponentsSection({ components }: { components: string[] }) {
  return (
    <div>
      <SectionLabel>Components</SectionLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {components.map((c) => (
          <span
            key={c}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.06em',
              color: '#4a9eff',
              padding: '3px 9px',
              background: 'rgba(26, 107, 255, 0.1)',
              border: '1px solid rgba(26, 107, 255, 0.25)',
              borderRadius: 100,
            }}
          >
            {c}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── RulesSection ──────────────────────────────────────────────────────────────

function RulesSection({ rules }: { rules: string[] }) {
  return (
    <div style={{ paddingBottom: 20 }}>
      <SectionLabel>Behavior Rules</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rules.map((rule) => (
          <div key={rule} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
            {/* Purple diamond */}
            <span
              style={{
                fontSize: 8,
                color: '#a855f7',
                marginTop: 3,
                flexShrink: 0,
                display: 'inline-block',
                transform: 'rotate(45deg)',
                lineHeight: 1,
              }}
            >
              ■
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--text-secondary)',
                letterSpacing: '0.03em',
                lineHeight: 1.5,
              }}
            >
              {rule}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── PhonePreview ──────────────────────────────────────────────────────────────

const PREVIEW_STATES: PreviewState[] = ['Default', 'Hover', 'Error', 'Success']

function PhonePreview({
  title,
  activeState,
  onStateChange,
  primaryColor,
}: {
  title: string
  activeState: PreviewState
  onStateChange: (s: PreviewState) => void
  primaryColor: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '20px 16px',
      }}
    >
      {/* Phone frame */}
      <div
        style={{
          width: 112,
          height: 200,
          borderRadius: 16,
          border: '1.5px solid var(--border-strong)',
          background: '#0c0c0e',
          overflow: 'hidden',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {/* Phone notch */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 32,
            height: 4,
            borderRadius: 2,
            background: 'var(--border-strong)',
          }}
        />

        {/* Screen content */}
        <div
          style={{
            position: 'absolute',
            inset: '18px 8px 8px',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <PreviewScreen state={activeState} primaryColor={primaryColor} title={title} />
        </div>
      </div>

      {/* State switcher */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
        {PREVIEW_STATES.map((s) => (
          <StateButton
            key={s}
            label={s}
            active={activeState === s}
            onClick={() => onStateChange(s)}
          />
        ))}
      </div>
    </div>
  )
}

function StateButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  const stateColor: Record<string, string> = {
    Default: 'var(--text-secondary)',
    Hover:   '#4a9eff',
    Error:   'var(--status-error)',
    Success: 'var(--accent)',
  }

  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: active ? stateColor[label] : 'var(--text-muted)',
        background: active ? 'var(--surface-2)' : 'transparent',
        border: `1px solid ${active ? 'var(--border-strong)' : 'transparent'}`,
        borderRadius: 'var(--r-sm)',
        padding: '4px 8px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'color 0.15s, background 0.15s',
      }}
    >
      {label}
    </button>
  )
}

// ── PreviewScreen ─────────────────────────────────────────────────────────────

function PreviewScreen({
  state,
  primaryColor,
  title,
}: {
  state: PreviewState
  primaryColor: string
  title: string
}) {
  const _ = title // consumed to avoid unused var warning

  const bg        = state === 'Error'   ? 'rgba(255, 68, 68, 0.06)'
                  : state === 'Success' ? 'rgba(200, 255, 0, 0.04)'
                  : '#0f0f12'

  const accentBg  = state === 'Error'   ? '#ff4444'
                  : state === 'Success' ? '#c8ff00'
                  : state === 'Hover'   ? primaryColor + 'cc'
                  : primaryColor

  const accentText = state === 'Success' ? '#080809' : '#fff'
  const label      = state === 'Error'   ? 'Réessayer'
                   : state === 'Success' ? '✓ Confirmé'
                   : 'Confirmer'

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: bg,
        display: 'flex',
        flexDirection: 'column',
        padding: '10px 8px 8px',
        gap: 6,
        transition: 'background 0.2s',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ width: 28, height: 4, borderRadius: 2, background: 'var(--border-strong)' }} />
        {state === 'Error' && (
          <span style={{ fontSize: 9, color: '#ff4444', fontFamily: 'var(--font-mono)' }}>ERR</span>
        )}
        {state === 'Success' && (
          <span style={{ fontSize: 9, color: '#c8ff00', fontFamily: 'var(--font-mono)' }}>✓</span>
        )}
      </div>

      {/* Amount block */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 15,
            color: state === 'Error' ? '#ff4444'
                 : state === 'Success' ? '#c8ff00'
                 : 'var(--text)',
            letterSpacing: '-0.02em',
            fontWeight: 400,
            lineHeight: 1,
            transition: 'color 0.2s',
          }}
        >
          €8 450
        </div>

        {state !== 'Success' && (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              color: state === 'Error' ? '#ff4444' : 'var(--text-muted)',
              letterSpacing: '0.04em',
              transition: 'color 0.2s',
            }}
          >
            {state === 'Error' ? 'Solde insuffisant' : 'Marie Dupont'}
          </div>
        )}

        {state === 'Success' && (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              color: 'var(--text-muted)',
              letterSpacing: '0.04em',
            }}
          >
            Virement confirmé
          </div>
        )}
      </div>

      {/* Biometric hint */}
      {(state === 'Default' || state === 'Hover') && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 6px',
            background: 'var(--surface-2)',
            borderRadius: 4,
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1px solid var(--border-strong)' }} />
          <div style={{ flex: 1, height: 2, borderRadius: 1, background: 'var(--border)' }} />
        </div>
      )}

      {/* Action button */}
      <div
        style={{
          padding: '6px 8px',
          background: accentBg,
          borderRadius: 5,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: accentText,
          textAlign: 'center',
          letterSpacing: '0.08em',
          boxShadow: state === 'Hover' ? `0 0 10px ${primaryColor}66` : 'none',
          transition: 'all 0.2s',
        }}
      >
        {label}
      </div>
    </div>
  )
}

// ── ActionBar ─────────────────────────────────────────────────────────────────

function ActionBar({
  onExport,
  exportDone,
  story,
  refines,
}: {
  onExport: () => void
  exportDone: boolean
  story: string
  refines: string[]
}) {
  const [showRefine, setShowRefine] = useState(false)
  const _ = story // consumed

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
      {/* Export MCP */}
      <ActionButton
        label={exportDone ? '✓ Copié' : 'Export MCP'}
        accent={exportDone}
        onClick={onExport}
      />

      {/* Voir story */}
      <ActionButton
        label="Voir story"
        onClick={() => {}}
      />

      <div style={{ flex: 1 }} />

      {/* Affiner — dropdown */}
      <div style={{ position: 'relative' }}>
        <ActionButton
          label="Affiner ↓"
          tinted
          onClick={() => setShowRefine((v) => !v)}
        />

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
                onClick={() => setShowRefine(false)}
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

function ActionButton({
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
        color: accent ? '#080809'
             : tinted ? 'var(--accent)'
             : 'var(--text-secondary)',
        background: accent ? 'var(--accent)'
                  : tinted ? 'var(--accent-dim)'
                  : 'transparent',
        border: `1px solid ${
          accent ? 'transparent'
         : tinted ? 'var(--accent-border)'
         : 'var(--border)'
        }`,
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
