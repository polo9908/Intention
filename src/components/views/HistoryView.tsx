'use client'

const MOCK_HISTORY = [
  { id: '1', type: 'COMPONENT', label: 'ConfirmationTransfer', time: '2 min ago',  color: '#1a6bff' },
  { id: '2', type: 'AGENT',     label: 'VoltaAdvisor',         time: '18 min ago', color: '#c8ff00' },
  { id: '3', type: 'ADAPT',     label: 'AmountDisplay → Watch', time: '1 h ago',   color: '#ff6b35' },
]

export function HistoryView() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--page-pad)',
        maxWidth: 680,
        margin: '0 auto',
        width: '100%',
        gap: 2,
      }}
    >
      <header
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.18em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          marginBottom: 20,
          paddingBottom: 12,
          borderBottom: '1px solid var(--border)',
        }}
      >
        Conversation history
      </header>

      {MOCK_HISTORY.map((entry) => (
        <div
          key={entry.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '12px 14px',
            borderRadius: 'var(--r-md)',
            cursor: 'pointer',
            transition: 'background 0.1s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-hover)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
        >
          {/* Color dot */}
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: entry.color,
              flexShrink: 0,
              marginTop: 1,
            }}
          />

          {/* Label */}
          <span
            style={{
              flex: 1,
              fontFamily: 'var(--font-serif)',
              fontSize: 14,
              color: 'var(--text)',
            }}
          >
            {entry.label}
          </span>

          {/* Type tag */}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
              padding: '2px 7px',
              border: '1px solid var(--border)',
              borderRadius: 100,
            }}
          >
            {entry.type}
          </span>

          {/* Time */}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-muted)',
              minWidth: 70,
              textAlign: 'right',
            }}
          >
            {entry.time}
          </span>
        </div>
      ))}
    </div>
  )
}
