'use client'

import { useState } from 'react'

// ── Data ──────────────────────────────────────────────────────────────────────

type Tier = 'NOW' | 'SOON' | 'LATER'

interface RoadmapItem {
  title:  string
  detail: string
  status: string
}

interface RoadmapTier {
  id:     Tier
  label:  string
  color:  string
  dim:    string
  items:  RoadmapItem[]
}

const TIERS: RoadmapTier[] = [
  {
    id:    'NOW',
    label: 'Now',
    color: '#69ff9c',
    dim:   'rgba(105, 255, 156, 0.1)',
    items: [
      {
        title:  'Génération de specs',
        detail: 'Composant, agent, adapt en ~340 ms — ContextLayer + AgentSpec',
        status: 'LIVE',
      },
      {
        title:  'Design tokens éditables',
        detail: 'Color picker natif + édition inline + preview instantané en temps réel',
        status: 'LIVE',
      },
      {
        title:  'États du composant',
        detail: 'State switcher Default / Hover / Error / Success sur le mini preview',
        status: 'LIVE',
      },
      {
        title:  'Refine panel',
        detail: 'Panel collapsible avec diff visuel au survol des 4 options de raffinement',
        status: 'LIVE',
      },
      {
        title:  'Export MCP + Storybook',
        detail: 'JSON ContextLayer configurable et story Storybook générée + copie presse-papier',
        status: 'LIVE',
      },
      {
        title:  'History & replay',
        detail: '10 specs en historique groupées par date, replay en un clic vers le chat',
        status: 'LIVE',
      },
    ],
  },
  {
    id:    'SOON',
    label: 'Soon',
    color: '#4a9eff',
    dim:   'rgba(74, 158, 255, 0.1)',
    items: [
      {
        title:  'Annotation vocale',
        detail: 'Décrire un composant à l\'oral — transcription live → spec générée',
        status: 'Avril',
      },
      {
        title:  'Collaboration temps réel',
        detail: 'Partager une spec et co-éditer les tokens avec un collègue simultanément',
        status: 'Avril',
      },
      {
        title:  'Versioning de tokens',
        detail: 'Git-like diff entre deux versions d\'un design system — undo / redo granulaire',
        status: 'Juin',
      },
      {
        title:  'Preview mobile natif',
        detail: 'Rendu dans un simulateur iOS / Android embarqué, frame device réel',
        status: 'Juin',
      },
    ],
  },
  {
    id:    'LATER',
    label: 'Later',
    color: '#a855f7',
    dim:   'rgba(168, 85, 247, 0.1)',
    items: [
      {
        title:  'ContextLayer CLI',
        detail: 'npx contextlayer init dans n\'importe quel repo — sync tokens → code',
        status: '2027',
      },
      {
        title:  'Plugin Figma',
        detail: 'Synchronisation bidirectionnelle tokens Figma ↔ ContextLayer en live',
        status: '2027',
      },
      {
        title:  'MCP marketplace',
        detail: 'Partage public de specs et tokens entre équipes produit et design systems',
        status: 'Concept',
      },
      {
        title:  'Agents autonomes',
        detail: 'Agents qui se déploient, s\'auto-évaluent et proposent des améliorations',
        status: 'Vision',
      },
    ],
  },
]

// ── RoadmapView ───────────────────────────────────────────────────────────────

export function RoadmapView() {
  return (
    <div
      style={{
        display:       'flex',
        flexDirection: 'column',
        padding:       'var(--page-pad)',
        maxWidth:      660,
        margin:        '0 auto',
        width:         '100%',
        gap:           36,
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          paddingBottom:  12,
          borderBottom:   '1px solid var(--border)',
        }}
      >
        <span
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      10,
            letterSpacing: '0.18em',
            color:         'var(--text-muted)',
            textTransform: 'uppercase',
          }}
        >
          Build roadmap
        </span>
        {/* Tier legend */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {TIERS.map((tier) => (
            <div key={tier.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div
                style={{
                  width:        5,
                  height:       5,
                  borderRadius: '50%',
                  background:   tier.color,
                  boxShadow:    `0 0 5px ${tier.color}88`,
                }}
              />
              <span
                style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      9,
                  letterSpacing: '0.1em',
                  color:         tier.color,
                  textTransform: 'uppercase',
                }}
              >
                {tier.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tiers ─────────────────────────────────────────────────────────── */}
      {TIERS.map((tier) => (
        <TierSection key={tier.id} tier={tier} />
      ))}
    </div>
  )
}

// ── TierSection ───────────────────────────────────────────────────────────────

function TierSection({ tier }: { tier: RoadmapTier }) {
  return (
    <section>
      {/* Tier header */}
      <div
        style={{
          display:    'flex',
          alignItems: 'center',
          gap:        12,
          marginBottom: 10,
        }}
      >
        {/* Colored bar accent */}
        <div
          style={{
            width:        3,
            height:       16,
            borderRadius: 2,
            background:   tier.color,
            boxShadow:    `0 0 8px ${tier.color}66`,
            flexShrink:   0,
          }}
        />
        <span
          style={{
            fontFamily:    'var(--font-serif)',
            fontSize:      17,
            color:         tier.color,
            letterSpacing: '-0.01em',
          }}
        >
          {tier.label}
        </span>
        <div
          style={{
            flex:       1,
            height:     1,
            background: `linear-gradient(to right, ${tier.color}33, transparent)`,
          }}
        />
        <span
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      9,
            letterSpacing: '0.14em',
            color:         tier.color,
            opacity:       0.5,
            textTransform: 'uppercase',
          }}
        >
          {tier.items.length} features
        </span>
      </div>

      {/* Items */}
      <div
        style={{
          display:       'flex',
          flexDirection: 'column',
          gap:           2,
          paddingLeft:   15,   /* indent under bar accent */
        }}
      >
        {tier.items.map((item) => (
          <RoadmapRow key={item.title} item={item} tier={tier} />
        ))}
      </div>
    </section>
  )
}

// ── RoadmapRow ────────────────────────────────────────────────────────────────

function RoadmapRow({
  item,
  tier,
}: {
  item: RoadmapItem
  tier: RoadmapTier
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:             'grid',
        gridTemplateColumns: '10px 1fr auto',
        alignItems:          'center',
        gap:                 14,
        padding:             '10px 12px',
        borderRadius:        'var(--r-md)',
        background:          hovered ? tier.dim : 'transparent',
        transition:          'background 0.15s',
        cursor:              'default',
      }}
    >
      {/* Colored dot */}
      <div
        style={{
          width:        6,
          height:       6,
          borderRadius: '50%',
          background:   tier.color,
          boxShadow:    hovered ? `0 0 8px ${tier.color}bb` : `0 0 3px ${tier.color}55`,
          transition:   'box-shadow 0.15s',
          justifySelf:  'center',
          flexShrink:   0,
        }}
      />

      {/* Title + detail */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          style={{
            fontFamily:    'var(--font-serif)',
            fontSize:      14,
            fontStyle:     'italic',
            letterSpacing: '-0.01em',
            color:         hovered ? 'var(--text)' : 'var(--text-secondary)',
            transition:    'color 0.15s',
          }}
        >
          {item.title}
        </span>
        <span
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      10,
            color:         hovered ? 'var(--text-muted)' : '#3a3a3a',
            letterSpacing: '0.02em',
            lineHeight:    1.5,
            transition:    'color 0.15s',
          }}
        >
          {item.detail}
        </span>
      </div>

      {/* Status label */}
      <span
        style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color:         tier.color,
          padding:       '2px 8px',
          background:    hovered ? tier.dim : 'transparent',
          border:        `1px solid ${tier.color}${hovered ? '55' : '28'}`,
          borderRadius:  100,
          whiteSpace:    'nowrap',
          transition:    'border-color 0.15s, background 0.15s',
        }}
      >
        {item.status}
      </span>
    </div>
  )
}
