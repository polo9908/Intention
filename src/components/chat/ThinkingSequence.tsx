'use client'

import { useEffect, useRef, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type StepState = 'pending' | 'active' | 'done'

export interface ThinkingSequenceProps {
  steps: string[]
  /** Called after the last step transitions to 'done' */
  onComplete?: () => void
}

// ── Timing constants ──────────────────────────────────────────────────────────

const STEP_DURATION = 600  // ms a step stays 'active'
const STEP_OVERLAP  = 300  // ms between consecutive step activations

// ── ThinkingSequence ──────────────────────────────────────────────────────────

export function ThinkingSequence({ steps, onComplete }: ThinkingSequenceProps) {
  const [states, setStates] = useState<StepState[]>(() => steps.map(() => 'pending'))
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    // Reset if steps prop changes
    setStates(steps.map(() => 'pending'))

    const timers: ReturnType<typeof setTimeout>[] = []

    steps.forEach((_, i) => {
      const activateAt = i * (STEP_DURATION - STEP_OVERLAP) // = i * 300ms
      const doneAt     = activateAt + STEP_DURATION          // = i * 300 + 600ms

      // pending → active
      timers.push(
        setTimeout(() => {
          setStates((prev) => prev.map((s, j) => (j === i ? 'active' : s)))
        }, activateAt)
      )

      // active → done
      timers.push(
        setTimeout(() => {
          setStates((prev) => prev.map((s, j) => (j === i ? 'done' : s)))
          if (i === steps.length - 1) {
            onCompleteRef.current?.()
          }
        }, doneAt)
      )
    })

    return () => timers.forEach(clearTimeout)
  }, [steps])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
        padding: '2px 0',
      }}
    >
      {steps.map((step, i) => (
        <StepRow key={i} text={step} state={states[i]} index={i} />
      ))}
    </div>
  )
}

// ── StepRow ───────────────────────────────────────────────────────────────────

function StepRow({ text, state }: { text: string; state: StepState; index: number }) {
  // Row opacity: pending → 0.08, active → 0.65, done → 1
  const rowOpacity =
    state === 'pending' ? 0.08 :
    state === 'active'  ? 0.65 :
    1

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        opacity: rowOpacity,
        transition: state === 'done'
          ? 'opacity 0.25s ease-out'
          : 'opacity 0.2s ease-in',
      }}
    >
      <Dot state={state} />

      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.05em',
          color: state === 'done' ? 'var(--text-secondary)' : 'var(--accent)',
          transition: 'color 0.3s ease',
          lineHeight: 1.4,
        }}
      >
        {text}
      </span>

      {/* Checkmark on done */}
      {state === 'done' && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--accent)',
            opacity: 0.5,
            marginLeft: -2,
          }}
        >
          ✓
        </span>
      )}
    </div>
  )
}

// ── Dot ───────────────────────────────────────────────────────────────────────

function Dot({ state }: { state: StepState }) {
  const size    = state === 'pending' ? 4 : 5
  const color   = state === 'pending' ? 'var(--text-muted)' : 'var(--accent)'
  const shadow  = state !== 'pending' ? '0 0 6px var(--accent)' : 'none'

  return (
    <span
      className={state === 'active' ? 'dot-active' : undefined}
      style={{
        display: 'block',
        width:  size,
        height: size,
        borderRadius: '50%',
        background: color,
        boxShadow: shadow,
        flexShrink: 0,
        transition: 'width 0.15s, height 0.15s, background 0.15s, box-shadow 0.15s',
      }}
    />
  )
}
