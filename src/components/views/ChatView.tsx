'use client'

export function ChatView() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 16,
        padding: 'var(--page-pad)',
      }}
    >
      {/* Eyebrow */}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.2em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
        }}
      >
        Describe a component or agent
      </span>

      {/* Input bar — placeholder */}
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
        }}
      >
        <span
          style={{
            flex: 1,
            fontFamily: 'var(--font-serif)',
            fontSize: 14,
            color: 'var(--text-muted)',
            fontStyle: 'italic',
          }}
        >
          e.g. "a transfer confirmation component for a fintech app…"
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-muted)',
            padding: '3px 6px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)',
            letterSpacing: '0.05em',
          }}
        >
          ↵
        </span>
      </div>

      {/* Scenario chips */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        {['Confirmation transfer', 'Volta Advisor agent', 'AmountDisplay → Watch'].map((label) => (
          <span
            key={label}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.06em',
              color: 'var(--text-secondary)',
              padding: '4px 10px',
              border: '1px solid var(--border)',
              borderRadius: 100,
              cursor: 'pointer',
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
