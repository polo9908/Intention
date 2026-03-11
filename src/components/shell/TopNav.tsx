'use client'

import { useViewStore, NAV_ITEMS, type View } from '@/store/useViewStore'

export function TopNav() {
  const { activeView, setView } = useViewStore()

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 'var(--nav-h)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingInline: 'var(--page-pad)',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(8, 8, 9, 0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <button
        onClick={() => setView('chat')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: 0,
          userSelect: 'none',
        }}
      >
        {/* Pulsing dot */}
        <span
          style={{
            display: 'block',
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 8px var(--accent), 0 0 16px rgba(200,255,0,0.3)',
            flexShrink: 0,
          }}
        />
        {/* Wordmark */}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.16em',
            color: 'var(--accent)',
            textTransform: 'uppercase',
          }}
        >
          ContextLayer
        </span>
      </button>

      {/* ── Nav items ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {NAV_ITEMS.map(({ id, label }) => (
          <NavButton
            key={id}
            label={label}
            active={activeView === id}
            onClick={() => setView(id)}
          />
        ))}
      </div>
    </nav>
  )
}

/* ── NavButton ─────────────────────────────────────────────────────────────── */

function NavButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.08em',
        color: active ? 'var(--text)' : 'var(--text-muted)',
        padding: '6px 12px',
        borderRadius: 'var(--r-sm)',
        background: active ? 'var(--surface-2)' : 'transparent',
        transition: 'color 0.15s, background 0.15s',
        textTransform: 'uppercase',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          const el = e.currentTarget
          el.style.color = 'var(--text-secondary)'
          el.style.background = 'var(--surface-1)'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          const el = e.currentTarget
          el.style.color = 'var(--text-muted)'
          el.style.background = 'transparent'
        }
      }}
    >
      {label}
      {/* Active underline */}
      {active && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            left: '12px',
            right: '12px',
            height: '1px',
            background: 'var(--accent)',
            borderRadius: '1px',
          }}
        />
      )}
    </button>
  )
}
