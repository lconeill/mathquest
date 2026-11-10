import { useState } from 'react'
import { NUMBER_WORDS, say, sfx } from '@/audio'

/** Big tappable number choices. Wrong picks wobble and fade; the answer can be revealed. */
export function NumberChoices({
  choices, onPick, disabled, reveal, answer, render,
}: {
  choices: (number | string)[]; onPick: (c: number | string) => void; disabled?: boolean; reveal?: boolean
  answer?: number | string; render?: (c: number | string) => React.ReactNode
}) {
  const [wrong, setWrong] = useState<Set<number | string>>(new Set())
  return (
    <div className="flex flex-wrap justify-center gap-4">
      {choices.map((c) => {
        const isWrong = wrong.has(c)
        const isAnswer = reveal && c === answer
        return (
          <button
            key={String(c)}
            type="button"
            disabled={disabled || isWrong}
            onClick={() => {
              sfx('tap')
              if (typeof c === 'number' && c <= 20) say(NUMBER_WORDS[c])
              if (c !== answer) setWrong((w) => new Set(w).add(c))
              onPick(c)
            }}
            className={`btn min-w-24 text-5xl! h-24 ${isAnswer ? 'btn-good anim-glow' : ''} ${isWrong ? 'anim-shake opacity-30!' : ''}`}
          >
            {render ? render(c) : c}
          </button>
        )
      })}
    </div>
  )
}

/** On-screen keypad for typed answers (abstract representations, bigger numbers). */
export function Keypad({ onSubmit, disabled, maxLen = 3 }: { onSubmit: (n: number) => void; disabled?: boolean; maxLen?: number }) {
  const [val, setVal] = useState('')
  const press = (k: string) => {
    sfx('tap')
    if (k === '⌫') setVal((v) => v.slice(0, -1))
    else if (k === '✓') { if (val) { onSubmit(Number(val)); setVal('') } }
    else setVal((v) => (v.length < maxLen ? (v === '0' ? k : v + k) : v))
  }
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="grid h-20 min-w-32 place-items-center rounded-2xl border-4 border-brand bg-surface px-4 text-6xl font-black text-brand">{val || ' '}</div>
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((k) => (
          <button key={k} type="button" disabled={disabled} onClick={() => press(k)} className="btn h-16 w-16 text-3xl!">{k}</button>
        ))}
      </div>
      <div className="flex gap-3">
        <button type="button" disabled={disabled} onClick={() => press('⌫')} className="btn h-16 w-24 text-3xl!" aria-label="delete">⌫</button>
        <button type="button" disabled={disabled || !val} onClick={() => press('✓')} className="btn btn-good h-16 w-32 text-4xl!" aria-label="check">✓</button>
      </div>
    </div>
  )
}

export function CheckButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={() => { sfx('tap'); onClick() }} className="btn btn-good h-20 w-36 text-5xl!" aria-label="check">✓</button>
}
