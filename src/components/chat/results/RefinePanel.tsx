'use client'

import { useRef, useState } from 'react'
import type { ReactNode } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RefineHint {
  prop:         string
  from:         string
  to:           string
  fromColor?:   string      // optional hex swatch for colour diffs
  toColor?:     string
  previewFrom?: ReactNode   // visual mini "before" render
  previewTo?:   ReactNode   // visual mini "after" render
}

// ── RefinePanel ───────────────────────────────────────────────────────────────

export function RefinePanel({
  open,
  refines,
  hints,
  accentColor,
}: {
  open:        boolean
  refines:     string[]
  hints:       RefineHint[]
  accentColor: string          // actual hex, e.g. '#c8ff00'
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [draft,   setDraft]   = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const activeHint = hovered !== null ? (hints[hovered] ?? null) : null
  const canSend    = draft.trim().length > 0

  const handleSend = () => {
    if (canSend) setDraft('')
  }

  return (
    // ── Outer: grid-row animation (smoother than max-height) ──────────────
    <div
      style={{
        display: 'grid',
        gridTemplateRows: open ? '1fr' : '0fr',
        transition: 'grid-template-rows 0.28s ease',
      }}
    >
      {/* Clip layer — overflow: hidden + min-height: 0 enables collapse */}
      <div style={{ overflow: 'hidden', minHeight: 0 }}>

        {/* Panel shell ─────────────────────────────────────────────────── */}
        <div
          style={{
            background:   'var(--bg)',
            border:       '1px solid var(--border)',
            borderTop:    'none',
            borderRadius: '0 0 var(--r-lg) var(--r-lg)',
            overflow:     'hidden',
          }}
        >

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div
            style={{
              display:         'flex',
              alignItems:      'center',
              gap:             10,
              padding:         '8px 20px',
              borderBottom:    '1px solid var(--border)',
              background:      'var(--surface-1)',
            }}
          >
            <span
              style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      9,
                letterSpacing: '0.2em',
                color:         accentColor,
                textTransform: 'uppercase',
              }}
            >
              Affiner
            </span>

            {/* Rule line */}
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />

            <span
              style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      9,
                color:         'var(--text-secondary)',
                letterSpacing: '0.08em',
              }}
            >
              {refines.length} suggestions
            </span>
          </div>

          {/* ── Body: 2-col — options 30% / preview 70% ────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 7fr' }}>

            {/* Left — option buttons */}
            <div
              style={{
                padding:         '12px 14px',
                display:         'flex',
                flexDirection:   'column',
                gap:             3,
                borderRight:     '1px solid var(--border)',
              }}
            >
              {refines.map((label, i) => (
                <RefineOptionBtn
                  key={i}
                  label={label}
                  accentColor={accentColor}
                  isHovered={hovered === i}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => {
                    setDraft(label)
                    setTimeout(() => inputRef.current?.focus(), 0)
                  }}
                />
              ))}
            </div>

            {/* Right — live diff preview */}
            <DiffPreview hint={activeHint} accentColor={accentColor} />
          </div>

          {/* ── Input row ──────────────────────────────────────────────── */}
          <div
            style={{
              display:     'flex',
              gap:         8,
              padding:     '10px 14px',
              borderTop:   '1px solid var(--border)',
              alignItems:  'center',
            }}
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && canSend) handleSend() }}
              placeholder="Précisez votre demande…"
              style={{
                flex:        1,
                background:  'var(--surface-1)',
                border:      '1px solid var(--border)',
                borderRadius:'var(--r-sm)',
                padding:     '7px 12px',
                fontFamily:  'var(--font-serif)',
                fontStyle:   'italic',
                fontSize:    13,
                color:       'var(--text)',
                outline:     'none',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!canSend}
              style={{
                width:        32,
                height:       32,
                borderRadius: 'var(--r-sm)',
                background:   canSend ? accentColor : 'var(--surface-1)',
                border:       `1px solid ${canSend ? 'transparent' : 'var(--border)'}`,
                color:        canSend ? '#080809' : 'var(--text-muted)',
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                cursor:       canSend ? 'pointer' : 'default',
                fontSize:     15,
                fontWeight:   600,
                flexShrink:   0,
                transition:   'background 0.15s, color 0.15s, border-color 0.15s',
              }}
            >
              ↑
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── RefineOptionBtn ────────────────────────────────────────────────────────────

function RefineOptionBtn({
  label,
  accentColor,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: {
  label:        string
  accentColor:  string
  isHovered:    boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  onClick:      () => void
}) {
  return (
    <button
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          10,
        padding:      '8px 12px',
        borderRadius: 'var(--r-sm)',
        background:   isHovered ? 'var(--surface-2)' : 'transparent',
        border:       `1px solid ${isHovered ? 'var(--border-strong)' : 'transparent'}`,
        cursor:       'pointer',
        textAlign:    'left',
        width:        '100%',
        transition:   'background 0.12s, border-color 0.12s',
      }}
    >
      {/* Status dot */}
      <span
        style={{
          width:      5,
          height:     5,
          borderRadius: '50%',
          background: isHovered ? accentColor : 'var(--text-muted)',
          boxShadow:  isHovered ? `0 0 5px ${accentColor}80` : 'none',
          flexShrink: 0,
          transition: 'background 0.12s, box-shadow 0.12s',
        }}
      />

      {/* Label */}
      <span
        style={{
          flex:          1,
          fontFamily:    'var(--font-mono)',
          fontSize:      11,
          color:         isHovered ? 'var(--text)' : 'var(--text-secondary)',
          letterSpacing: '0.04em',
          lineHeight:    1.4,
          transition:    'color 0.12s',
        }}
      >
        {label}
      </span>

      {/* Arrow — fades in on hover */}
      <span
        style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      10,
          color:         accentColor,
          opacity:       isHovered ? 1 : 0,
          transition:    'opacity 0.12s',
          flexShrink:    0,
        }}
      >
        →
      </span>
    </button>
  )
}

// ── DiffPreview ────────────────────────────────────────────────────────────────

function DiffPreview({
  hint,
  accentColor,
}: {
  hint:        RefineHint | null
  accentColor: string
}) {
  return (
    <div
      style={{
        padding:        '16px 14px',
        display:        'flex',
        flexDirection:  'column',
        justifyContent: 'center',
        gap:            10,
      }}
    >
      {hint === null ? (
        /* ── Placeholder ──────────────────────────────────────────────── */
        <div
          style={{
            display:       'flex',
            flexDirection: 'column',
            alignItems:    'center',
            gap:           8,
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>←</span>
          <span
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      9,
              color:         'var(--text-secondary)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              textAlign:     'center',
              lineHeight:    1.6,
            }}
          >
            survolez<br />une option
          </span>
        </div>

      ) : hint.previewFrom != null ? (
        /* ── Visual comparison ─────────────────────────────────────────── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>

          {/* Prop label */}
          <span
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      9,
              color:         'var(--text-secondary)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            {hint.prop}
          </span>

          {/* Side-by-side visual */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>

            {/* Before */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span
                style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      8,
                  color:         '#ff6b6b',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                {hint.from}
              </span>
              {hint.previewFrom}
            </div>

            {/* Arrow */}
            <span style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1 }}>→</span>

            {/* After */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span
                style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      8,
                  color:         accentColor,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                {hint.to}
              </span>
              {hint.previewTo}
            </div>

          </div>
        </div>

      ) : (
        /* ── Text diff fallback ────────────────────────────────────────── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>

          {/* Prop label */}
          <span
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      9,
              color:         'var(--text-secondary)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            {hint.prop}
          </span>

          {/* FROM row */}
          <div
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          6,
              padding:      '5px 8px',
              background:   'rgba(255, 107, 107, 0.08)',
              border:       '1px solid rgba(255, 107, 107, 0.2)',
              borderRadius: 'var(--r-sm)',
            }}
          >
            {hint.fromColor && (
              <div
                style={{
                  width:        9,
                  height:       9,
                  borderRadius: 2,
                  background:   hint.fromColor,
                  flexShrink:   0,
                  border:       '1px solid rgba(255,255,255,0.1)',
                }}
              />
            )}
            <span
              style={{
                fontFamily:      'var(--font-mono)',
                fontSize:        10,
                color:           '#ff6b6b',
                textDecoration:  'line-through',
                textDecorationColor: '#ff6b6b55',
                letterSpacing:   '0.03em',
                lineHeight:      1,
              }}
            >
              {hint.from}
            </span>
          </div>

          {/* Down arrow */}
          <div style={{ paddingLeft: 6 }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', lineHeight: 1 }}>↓</span>
          </div>

          {/* TO row */}
          <div
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          6,
              padding:      '5px 8px',
              background:   `${accentColor}12`,
              border:       `1px solid ${accentColor}30`,
              borderRadius: 'var(--r-sm)',
            }}
          >
            {hint.toColor && (
              <div
                style={{
                  width:        9,
                  height:       9,
                  borderRadius: 2,
                  background:   hint.toColor,
                  flexShrink:   0,
                  border:       '1px solid rgba(255,255,255,0.1)',
                }}
              />
            )}
            <span
              style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      10,
                color:         accentColor,
                letterSpacing: '0.03em',
                lineHeight:    1,
              }}
            >
              {hint.to}
            </span>
          </div>

        </div>
      )}
    </div>
  )
}
