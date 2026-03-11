'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useChatStore } from '@/store/useChatStore'
import { ThinkingSequence } from '@/components/chat/ThinkingSequence'
import { ComponentResultCard } from '@/components/chat/results/ComponentResultCard'
import { matchScenario } from '@/lib/scenarios'

// ── Thinking steps by intent ──────────────────────────────────────────────────

function getThinkingSteps(text: string): string[] {
  const t = text.toLowerCase()
  if (t.includes('agent') || t.includes('advisor') || t.includes('anxieux') || t.includes('escalade')) {
    return [
      'Analyse de l\'intention comportementale…',
      'Extraction des contraintes AgentSpec…',
      'Calibrage des nœuds persona + guardrails…',
      'Génération de la spec agent…',
    ]
  }
  if (t.includes('watch') || t.includes('wearable') || t.includes('adapt') || t.includes('series')) {
    return [
      'Détection de la plateforme cible…',
      'Identification des mutations nécessaires…',
      'Propagation des tokens hérités…',
      'Génération du diff d\'adaptation…',
    ]
  }
  return [
    'Analyse du contexte produit…',
    'Extraction des tokens sémantiques…',
    'Résolution des règles et contraintes…',
    'Génération du composant…',
  ]
}

// ── Quick prompts ─────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  {
    label: 'ConfirmationTransfer',
    text: 'Un composant de confirmation de virement pour une appli fintech. Rassurant, sobre, biométrie requise au-dessus de 5 000 €.',
  },
  {
    label: 'VoltaAdvisor',
    text: "Un agent conseiller financier pour Volta. Empathique, lent, humble face à l'incertitude. Escalade humain si anxiété > 85%.",
  },
  {
    label: 'AmountDisplay → Watch',
    text: "Adapter le composant AmountDisplay pour Apple Watch Series 9. Réduire, haptic feedback, 2 lignes max.",
  },
]

// ── ChatView ──────────────────────────────────────────────────────────────────

export function ChatView() {
  const { messages, addUserMessage, addResult, clearMessages } = useChatStore()
  const [draft, setDraft] = useState('')
  const [thinkingId, setThinkingId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef    = useRef<HTMLDivElement>(null)
  const bottomRef    = useRef<HTMLDivElement>(null)
  const hasMessages  = messages.length > 0
  const isThinking   = thinkingId !== null

  /* ── Auto-resize textarea ── */
  const resize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [])

  useEffect(() => { resize() }, [draft, resize])

  /* ── Scroll to bottom on new message ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  /* ── Submit ── */
  const submit = useCallback(() => {
    const text = draft.trim()
    if (!text || isThinking) return
    const id = addUserMessage(text)
    setThinkingId(id)
    setDraft('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }, [draft, addUserMessage, isThinking])

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const fillQuick = (text: string) => {
    setDraft(text)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const canSend = draft.trim().length > 0 && !isThinking

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - var(--nav-h))',
        overflow: 'hidden',
      }}
    >
      {/* ── Content area ─────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflow: 'hidden', position: 'relative' }}
      >

        {/* Empty state ─────────────────────────────────────────────────── */}
        {!hasMessages && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
              padding: '0 var(--page-pad) 80px',
            }}
          >
            {/* Title */}
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(22px, 3vw, 30px)',
                fontWeight: 400,
                color: 'var(--text)',
                textAlign: 'center',
                letterSpacing: '-0.01em',
                lineHeight: 1.3,
                maxWidth: 500,
              }}
            >
              Décrivez ce que vous voulez créer.
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--text-muted)',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              tokens · composants · agents · adapt
            </p>

            {/* Quick prompt pills */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                justifyContent: 'center',
                marginTop: 6,
              }}
            >
              {QUICK_PROMPTS.map(({ label, text }) => (
                <QuickPill key={label} label={label} onClick={() => fillQuick(text)} />
              ))}
            </div>
          </div>
        )}

        {/* Messages list ──────────────────────────────────────────────── */}
        {hasMessages && (
          <div
            style={{
              height: '100%',
              overflowY: 'auto',
              padding: '40px var(--page-pad) 24px',
            }}
          >
            <div
              style={{
                maxWidth: 900,
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
              }}
            >
              {messages.map((msg) => (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* User bubble */}
                  {msg.type === 'user' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div
                        style={{
                          maxWidth: '72%',
                          padding: '10px 16px',
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--r-lg)',
                          borderBottomRightRadius: 'var(--r-sm)',
                          fontFamily: 'var(--font-serif)',
                          fontSize: 14,
                          color: 'var(--text)',
                          lineHeight: 1.65,
                        }}
                      >
                        {msg.text}
                      </div>
                    </div>
                  )}

                  {/* Thinking sequence — shown after user message while processing */}
                  {msg.type === 'user' && thinkingId === msg.id && msg.text && (
                    <div style={{ paddingLeft: 4 }}>
                      <ThinkingSequence
                        steps={getThinkingSteps(msg.text)}
                        onComplete={() => {
                          const scenario = matchScenario(msg.text ?? '', messages.length)
                          addResult(scenario, null)
                          setThinkingId(null)
                        }}
                      />
                    </div>
                  )}

                  {/* Result card — component type */}
                  {msg.type === 'result' && msg.scenario?.type === 'component' && (
                    <ComponentResultCard scenario={msg.scenario} />
                  )}

                </div>
              ))}

              {/* Anchor */}
              <div ref={bottomRef} />
            </div>
          </div>
        )}
      </div>

      {/* ── Input bar ────────────────────────────────────────────────────── */}
      <InputBar
        draft={draft}
        canSend={canSend}
        hasMessages={hasMessages}
        textareaRef={textareaRef}
        onChange={setDraft}
        onKey={handleKey}
        onSubmit={submit}
        onClear={clearMessages}
      />
    </div>
  )
}

// ── QuickPill ─────────────────────────────────────────────────────────────────

function QuickPill({ label, onClick }: { label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        letterSpacing: '0.06em',
        color: hovered ? 'var(--text)' : 'var(--text-secondary)',
        padding: '6px 14px',
        border: `1px solid ${hovered ? 'var(--border-strong)' : 'var(--border)'}`,
        borderRadius: 100,
        background: hovered ? 'var(--surface-hover)' : 'transparent',
        cursor: 'pointer',
        transition: 'border-color 0.15s, color 0.15s, background 0.15s',
      }}
    >
      {label}
    </button>
  )
}

// ── InputBar ──────────────────────────────────────────────────────────────────

function InputBar({
  draft,
  canSend,
  hasMessages,
  textareaRef,
  onChange,
  onKey,
  onSubmit,
  onClear,
}: {
  draft: string
  canSend: boolean
  hasMessages: boolean
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onChange: (v: string) => void
  onKey: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onSubmit: () => void
  onClear: () => void
}) {
  const [focused, setFocused] = useState(false)

  return (
    <div
      style={{
        flexShrink: 0,
        borderTop: '1px solid var(--border)',
        padding: '14px var(--page-pad) 16px',
        background: 'var(--bg)',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Row: textarea + send button */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>

          {/* Textarea wrapper */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'flex-end',
              border: `1px solid ${focused ? 'var(--border-strong)' : 'var(--border)'}`,
              borderRadius: 'var(--r-md)',
              background: 'var(--surface-1)',
              padding: '10px 14px',
              transition: 'border-color 0.15s',
            }}
          >
            <textarea
              ref={textareaRef}
              className="chat-input"
              value={draft}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKey}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              rows={1}
              placeholder="ex. un composant de confirmation de virement pour une appli fintech…"
              style={{
                display: 'block',
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: 14,
                color: 'var(--text)',
                lineHeight: 1.65,
                overflow: 'hidden',
                minHeight: '22px',
              }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={onSubmit}
            disabled={!canSend}
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--r-md)',
              background: canSend ? 'var(--accent)' : 'var(--surface-1)',
              border: `1px solid ${canSend ? 'transparent' : 'var(--border)'}`,
              color: canSend ? '#080809' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: canSend ? 'pointer' : 'default',
              transition: 'background 0.15s, color 0.15s',
              flexShrink: 0,
              fontSize: 17,
              fontWeight: 600,
            }}
          >
            ↑
          </button>
        </div>

        {/* Hint row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-muted)',
              letterSpacing: '0.07em',
            }}
          >
            ↵ envoyer &nbsp;·&nbsp; ⇧↵ nouvelle ligne
          </span>

          {hasMessages && (
            <button
              onClick={onClear}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--text-muted)',
                letterSpacing: '0.07em',
                padding: 0,
                cursor: 'pointer',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
            >
              Effacer la conversation
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
