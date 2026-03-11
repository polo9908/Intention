'use client'

const MOCK_AGENTS = [
  { name: 'VoltaAdvisor',    status: 'live',  convs: '1.2k',  esc: '3.1%',  color: '#c8ff00' },
  { name: 'OnboardingGuide', status: 'draft', convs: '—',     esc: '—',     color: '#444' },
  { name: 'SupportBot v2',   status: 'live',  convs: '4.8k',  esc: '8.7%',  color: '#1a6bff' },
]

export function AgentsView() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--page-pad)',
        maxWidth: 720,
        margin: '0 auto',
        width: '100%',
        gap: 2,
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          paddingBottom: 12,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.18em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
          }}
        >
          Deployed agents
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--accent)',
            letterSpacing: '0.1em',
            cursor: 'pointer',
          }}
        >
          + New agent
        </span>
      </header>

      {MOCK_AGENTS.map((agent) => (
        <div
          key={agent.name}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto auto auto',
            alignItems: 'center',
            gap: 24,
            padding: '12px 14px',
            borderRadius: 'var(--r-md)',
            cursor: 'pointer',
            transition: 'background 0.1s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-hover)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
        >
          {/* Name + dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: agent.color,
                boxShadow: agent.status === 'live' ? `0 0 6px ${agent.color}66` : 'none',
                flexShrink: 0,
              }}
            />
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--text)' }}>
              {agent.name}
            </span>
          </div>

          {/* Conversations */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
              {agent.convs}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
              convs
            </div>
          </div>

          {/* Escalation */}
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: agent.esc !== '—' && parseFloat(agent.esc) > 5 ? 'var(--status-warning)' : 'var(--text-secondary)',
              }}
            >
              {agent.esc}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
              escalation
            </div>
          </div>

          {/* Status badge */}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: agent.status === 'live' ? 'var(--accent)' : 'var(--text-muted)',
              padding: '3px 8px',
              border: `1px solid ${agent.status === 'live' ? 'var(--accent-border)' : 'var(--border)'}`,
              borderRadius: 100,
              background: agent.status === 'live' ? 'var(--accent-dim)' : 'transparent',
            }}
          >
            {agent.status}
          </span>
        </div>
      ))}
    </div>
  )
}
