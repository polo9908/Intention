'use client'

import { useEffect, useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

type Tab = 'mcp' | 'story'

// ── ExportModal ────────────────────────────────────────────────────────────────

export function ExportModal({
  open,
  onClose,
  title,
  mcp,
  story,
  accentColor,
}: {
  open:        boolean
  onClose:     () => void
  title:       string
  mcp:         string
  story:       string
  accentColor: string
}) {
  const [tab,    setTab]    = useState<Tab>('mcp')
  const [copied, setCopied] = useState(false)

  // Reset tab & copy state when re-opened
  useEffect(() => {
    if (open) { setTab('mcp'); setCopied(false) }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const content = tab === 'mcp' ? mcp : story
  const lang    = tab === 'mcp' ? 'JSON' : 'TSX'

  const handleCopy = () => {
    navigator.clipboard?.writeText(content).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    // ── Backdrop ────────────────────────────────────────────────────────────
    <div
      onClick={onClose}
      style={{
        position:       'fixed',
        inset:          0,
        background:     'rgba(8, 8, 9, 0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex:         200,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        20,
      }}
    >
      {/* ── Panel ─────────────────────────────────────────────────────────── */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width:        560,
          maxWidth:     '100%',
          background:   'var(--bg)',
          border:       '1px solid var(--border-strong)',
          borderRadius: 'var(--r-lg)',
          overflow:     'hidden',
          animation:    'modal-slide-up 0.22s ease',
        }}
      >

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          10,
            padding:      '14px 20px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {/* Accent dot */}
          <span
            style={{
              width:        6,
              height:       6,
              borderRadius: '50%',
              background:   accentColor,
              boxShadow:    `0 0 6px ${accentColor}`,
              flexShrink:   0,
            }}
          />

          {/* Title */}
          <span
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      10,
              letterSpacing: '0.12em',
              color:         accentColor,
              textTransform: 'uppercase',
              flex:          1,
            }}
          >
            Export
          </span>
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize:   13,
              color:      'var(--text)',
              fontStyle:  'italic',
              marginRight: 8,
            }}
          >
            {title}
          </span>

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              width:        24,
              height:       24,
              borderRadius: 'var(--r-sm)',
              background:   'transparent',
              border:       '1px solid var(--border)',
              color:        'var(--text-secondary)',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              cursor:       'pointer',
              fontSize:     14,
              lineHeight:   1,
              flexShrink:   0,
              transition:   'border-color 0.12s, color 0.12s, background 0.12s',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.borderColor = 'var(--border-strong)'
              el.style.color       = 'var(--text)'
              el.style.background  = 'var(--surface-2)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.borderColor = 'var(--border)'
              el.style.color       = 'var(--text-secondary)'
              el.style.background  = 'transparent'
            }}
          >
            ×
          </button>
        </div>

        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <div
          style={{
            display:      'flex',
            gap:          0,
            borderBottom: '1px solid var(--border)',
            padding:      '0 20px',
          }}
        >
          {(['mcp', 'story'] as Tab[]).map((t) => {
            const active = tab === t
            const label  = t === 'mcp' ? 'MCP · JSON' : 'Story · TSX'
            return (
              <button
                key={t}
                onClick={() => { setTab(t); setCopied(false) }}
                style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      10,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color:         active ? accentColor : 'var(--text-muted)',
                  background:    'transparent',
                  border:        'none',
                  borderBottom:  active ? `2px solid ${accentColor}` : '2px solid transparent',
                  padding:       '10px 0',
                  marginRight:   20,
                  cursor:        'pointer',
                  transition:    'color 0.12s',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* ── Code block ──────────────────────────────────────────────────── */}
        <div style={{ position: 'relative' }}>

          {/* Lang label */}
          <span
            style={{
              position:      'absolute',
              top:           12,
              left:          20,
              fontFamily:    'var(--font-mono)',
              fontSize:      9,
              letterSpacing: '0.18em',
              color:         'var(--text-muted)',
              textTransform: 'uppercase',
              userSelect:    'none',
            }}
          >
            {lang}
          </span>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            style={{
              position:      'absolute',
              top:           8,
              right:         12,
              fontFamily:    'var(--font-mono)',
              fontSize:      9,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color:         copied ? accentColor : 'var(--text-secondary)',
              background:    copied ? `${accentColor}14` : 'var(--surface-2)',
              border:        `1px solid ${copied ? `${accentColor}40` : 'var(--border)'}`,
              borderRadius:  'var(--r-sm)',
              padding:       '4px 10px',
              cursor:        'pointer',
              transition:    'color 0.15s, background 0.15s, border-color 0.15s',
            }}
          >
            {copied ? 'COPIÉ ✓' : 'COPIER'}
          </button>

          {/* Code content */}
          <pre
            style={{
              margin:      0,
              padding:     '38px 20px 20px',
              maxHeight:   340,
              overflowY:   'auto',
              fontFamily:  'var(--font-mono)',
              fontSize:    11,
              lineHeight:  1.65,
              color:       'var(--text-secondary)',
              background:  'var(--surface-1)',
              whiteSpace:  'pre',
              overflowX:   'auto',
              tabSize:     2,
            }}
          >
            {content}
          </pre>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div
          style={{
            padding:    '10px 20px',
            borderTop:  '1px solid var(--border)',
            display:    'flex',
            alignItems: 'center',
            gap:        8,
          }}
        >
          <span
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      9,
              color:         'var(--text-muted)',
              letterSpacing: '0.08em',
            }}
          >
            contextlayer · export
          </span>
          <div style={{ flex: 1 }} />
          <span
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      9,
              color:         'var(--text-muted)',
              letterSpacing: '0.06em',
            }}
          >
            esc pour fermer
          </span>
        </div>

      </div>
    </div>
  )
}
