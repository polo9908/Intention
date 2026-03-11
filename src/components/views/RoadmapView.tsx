'use client'

const ROADMAP = [
  {
    phase: '01',
    label: 'Shell & navigation',
    items: ['Top nav, view router', 'CSS variable system', 'Georgia serif + mono stack'],
    status: 'done',
  },
  {
    phase: '02',
    label: 'Chat interface',
    items: ['Input bar', 'Scenario detection', 'Result cards (component / agent / adapt)'],
    status: 'next',
  },
  {
    phase: '03',
    label: 'Token panel',
    items: ['Live token editing', 'Color swatches + picker', 'State previews (Default / Hover / Error)'],
    status: 'planned',
  },
  {
    phase: '04',
    label: 'Agent nodes',
    items: ['Behavior node graph', 'Slider controls (empathy, tempo…)', 'Guardrail display'],
    status: 'planned',
  },
  {
    phase: '05',
    label: 'Export',
    items: ['MCP JSON export', 'Storybook story export', 'Code modal'],
    status: 'planned',
  },
]

const STATUS_COLOR: Record<string, string> = {
  done:    '#c8ff00',
  next:    '#ffaa00',
  planned: '#333',
}

const STATUS_LABEL: Record<string, string> = {
  done:    'Done',
  next:    'Up next',
  planned: 'Planned',
}

export function RoadmapView() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--page-pad)',
        maxWidth: 660,
        margin: '0 auto',
        width: '100%',
        gap: 0,
      }}
    >
      <header
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.18em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          marginBottom: 28,
          paddingBottom: 12,
          borderBottom: '1px solid var(--border)',
        }}
      >
        Build roadmap
      </header>

      {ROADMAP.map((phase, i) => (
        <div
          key={phase.phase}
          style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr auto',
            gap: '0 20px',
            paddingBottom: 28,
            marginBottom: i < ROADMAP.length - 1 ? 0 : 0,
            position: 'relative',
          }}
        >
          {/* Phase number + vertical line */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: STATUS_COLOR[phase.status],
                letterSpacing: '0.08em',
              }}
            >
              {phase.phase}
            </span>
            {i < ROADMAP.length - 1 && (
              <div
                style={{
                  flex: 1,
                  width: 1,
                  background: `linear-gradient(to bottom, ${STATUS_COLOR[phase.status]}44, transparent)`,
                  minHeight: 40,
                }}
              />
            )}
          </div>

          {/* Content */}
          <div>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 15,
                color: phase.status === 'planned' ? 'var(--text-muted)' : 'var(--text)',
                marginBottom: 8,
                fontStyle: phase.status === 'planned' ? 'italic' : 'normal',
              }}
            >
              {phase.label}
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {phase.items.map((item) => (
                <li
                  key={item}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: phase.status === 'planned' ? 'var(--text-muted)' : 'var(--text-secondary)',
                    letterSpacing: '0.04em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 3,
                      height: 3,
                      borderRadius: '50%',
                      background: STATUS_COLOR[phase.status],
                      flexShrink: 0,
                    }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Status badge */}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: STATUS_COLOR[phase.status],
              padding: '3px 8px',
              border: `1px solid ${STATUS_COLOR[phase.status]}44`,
              borderRadius: 100,
              height: 'fit-content',
              whiteSpace: 'nowrap',
            }}
          >
            {STATUS_LABEL[phase.status]}
          </span>
        </div>
      ))}
    </div>
  )
}
