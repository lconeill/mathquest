import { useEffect, useState } from 'react'
import { NUMBER_WORDS, say, sfx } from '@/audio'
import { NumberChoices } from '@/components/inputs'
import { Art, ObjectGroup, Shape } from '@/components/visuals'
import { tokenKey, type Problem, type Token } from '@/curriculum/types'
import type { ActivityProps } from './index'

type Of<K extends Problem['kind']> = ActivityProps<Extract<Problem, { kind: K }>>

const Stage = ({ children }: { children: React.ReactNode }) => (
  <div className="flex w-full flex-1 flex-col items-center justify-center gap-6 anim-fade-up">{children}</div>
)

const pickNum = (answer: number, onAnswer: (c: boolean) => void) => (c: number | string) => onAnswer(c === answer)
const opWord = (op: '+' | '-') => (op === '+' ? '+' : '−')

// ---- Pattern tokens ----------------------------------------------------------

export function TokenView({ x, size = 52 }: { x: Token; size?: number }) {
  if (x.t === 'stack') {
    const s = Math.max(18, Math.min(30, Math.floor(size * 0.55)))
    return (
      <div className="flex flex-col-reverse items-center justify-start" style={{ minHeight: size }}>
        {Array.from({ length: x.n }, (_, i) => <Art key={i} slug={x.slug} size={s} className="-my-0.5" />)}
      </div>
    )
  }
  const scale = x.big === false ? 0.55 : 1
  const inner = Math.round(size * scale)
  return (
    <div className="grid place-items-center" style={{ width: size, height: size }}>
      <div style={{ transform: x.rot ? `rotate(${x.rot}deg)` : undefined }}>
        {x.t === 'art' ? <Art slug={x.slug} size={inner} /> : <Shape shape={x.shape} color={x.color} size={inner} />}
      </div>
    </div>
  )
}

const tokSize = (n: number) => (n > 9 ? 40 : n > 6 ? 46 : 54)

/** Shade alternate repeats of the unit (hint) so the "chunk" becomes visible. */
const band = (i: number, unit: number | 'grow', on: boolean) => (on && unit !== 'grow' && Math.floor(i / unit) % 2 === 0 ? 'bg-warm-soft' : '')

// ---- Patterns: next / missing / fill / growing ------------------------------

export function PatternActivity({ p, hint, reveal, locked, onAnswer }: Of<'pattern'>) {
  const holes = p.seq.map((x, i) => (x === null ? i : -1)).filter((i) => i >= 0)
  const [filled, setFilled] = useState<Token[]>([])
  const [shake, setShake] = useState<string | null>(null)
  useEffect(() => { if (reveal) setFilled(p.answers) }, [reveal, p.answers])
  const size = tokSize(p.seq.length)
  const tap = (x: Token) => {
    if (locked || reveal || filled.length >= p.answers.length) return
    sfx('tap')
    if (tokenKey(x) === tokenKey(p.answers[filled.length])) {
      const next = [...filled, x]
      setFilled(next)
      if (next.length === p.answers.length) onAnswer(true)
      else sfx('pop')
    } else {
      setShake(tokenKey(x)); setTimeout(() => setShake(null), 500)
      onAnswer(false)
    }
  }
  return (
    <Stage>
      <div className="flex flex-wrap items-end justify-center gap-1">
        {p.seq.map((s, i) => {
          const h = holes.indexOf(i)
          const val = s ?? filled[h]
          const isNext = s === null && h === filled.length
          return (
            <div key={i} className="flex flex-col items-center">
              {s === null
                ? <div className={`grid place-items-center rounded-xl border-4 border-dashed ${isNext ? 'border-brand anim-glow' : 'border-border'} bg-surface-2`} style={{ minWidth: size + 8, minHeight: size + 8 }}>
                    {val ? <span className="anim-pop"><TokenView x={val} size={size} /></span> : <span className="text-3xl font-black text-brand">?</span>}
                  </div>
                : <div className={`rounded-xl p-1 ${band(i, p.unit, hint >= 2)}`}><TokenView x={s} size={size} /></div>}
              {p.unit === 'grow' && (hint >= 1 || reveal) && val?.t === 'stack' && <span className="text-xl font-black text-text-2">{val.n}</span>}
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        {p.palette.map((x) => (
          <button key={tokenKey(x)} type="button" disabled={locked || reveal} onClick={() => tap(x)}
            className={`btn h-auto! min-h-24 min-w-24 p-2! ${shake === tokenKey(x) ? 'anim-shake' : ''}`}>
            <TokenView x={x} size={x.t === 'stack' ? 80 : 64} />
          </button>
        ))}
      </div>
    </Stage>
  )
}

// ---- Spot the mistake ----------------------------------------------------------

export function PatternFixActivity({ p, hint, reveal, locked, onAnswer }: Of<'patternfix'>) {
  const [wrong, setWrong] = useState<Set<number>>(new Set())
  const size = tokSize(p.seq.length)
  const fixed = p.seq[p.answer - p.unit]
  return (
    <Stage>
      <div className="flex flex-wrap items-end justify-center gap-1">
        {p.seq.map((s, i) => {
          const isAns = (reveal || hint >= 2) && i === p.answer // reveal swaps in the right item
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <button type="button" disabled={locked || reveal || wrong.has(i)}
                onClick={() => { sfx('tap'); if (i !== p.answer) setWrong((w) => new Set(w).add(i)); onAnswer(i === p.answer) }}
                className={`rounded-xl border-4 p-1 ${isAns ? (reveal ? 'border-good' : 'border-pink anim-glow') : 'border-transparent'} ${wrong.has(i) ? 'opacity-30 anim-shake' : ''} ${band(i, p.unit, hint >= 1)}`}>
                {reveal && i === p.answer
                  ? <span className="block rounded-lg bg-good-soft anim-pop"><TokenView x={fixed} size={size} /></span>
                  : <TokenView x={s} size={size} />}
              </button>
            </div>
          )
        })}
      </div>
    </Stage>
  )
}

// ---- Same pattern? / which part repeats? -----------------------------------------

export function PatternPickActivity({ p, hint, reveal, locked, onAnswer }: Of<'patternpick'>) {
  const [wrong, setWrong] = useState<Set<number>>(new Set())
  const unit = p.ask === 'core' ? p.options[p.answer].length : 0
  const size = tokSize(p.seq.length)
  return (
    <Stage>
      <div className="flex flex-wrap justify-center gap-1 rounded-2xl bg-surface-2 p-2">
        {p.seq.map((s, i) => <div key={i} className={`rounded-lg ${unit && hint >= 2 ? band(i, unit, true) : ''}`}><TokenView x={s} size={size} /></div>)}
      </div>
      <div className="flex w-full max-w-xl flex-col gap-3">
        {p.options.map((row, k) => (
          <button key={k} type="button" disabled={locked || reveal || wrong.has(k)}
            onClick={() => { sfx('tap'); if (k !== p.answer) setWrong((w) => new Set(w).add(k)); onAnswer(k === p.answer) }}
            className={`card flex flex-wrap items-center justify-center gap-1 p-2 ${wrong.has(k) ? 'opacity-30 anim-shake' : ''} ${reveal && k === p.answer ? 'ring-8 ring-good' : ''}`}>
            {row.map((s, i) => <TokenView key={i} x={s} size={p.ask === 'core' ? 52 : Math.min(size, 42)} />)}
          </button>
        ))}
      </div>
    </Stage>
  )
}

// ---- Hiding under the blanket ------------------------------------------------------

export function HideActivity({ p, hint, reveal, locked, onAnswer }: Of<'hide'>) {
  const objSize = p.total > 10 ? 34 : 44
  return (
    <Stage>
      <div className="flex items-center gap-3 text-4xl font-black">
        <span className="rounded-2xl bg-brand px-4 py-1 text-white">{p.total}</span><span className="text-2xl text-text-2">altogether</span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <ObjectGroup slug={p.object} n={p.shown} size={objSize} />
          {hint >= 1 && <span className="text-3xl font-black text-text-2">{p.shown}</span>}
        </div>
        <div className="relative grid min-h-36 min-w-40 place-items-center rounded-[40px] border-4 border-[#c47800] bg-warm p-3 shadow-[inset_0_-10px_0_rgba(0,0,0,.08)]">
          {reveal || hint >= 2
            ? <div className={reveal ? 'anim-pop' : 'opacity-40'}><ObjectGroup slug={p.object} n={p.answer} size={objSize} /></div>
            : <span className="text-6xl">🙈</span>}
          {reveal && <span className="absolute -bottom-4 rounded-full bg-good px-3 text-3xl font-black text-white">{p.answer}</span>}
        </div>
      </div>
      <NumberChoices choices={p.choices} answer={p.answer} reveal={reveal} disabled={locked} onPick={pickNum(p.answer, onAnswer)} />
    </Stage>
  )
}

// ---- Act it out: add more / send some home ---------------------------------------

export function ActActivity({ p, hint, reveal, locked, onAnswer }: Of<'act'>) {
  const [done, setDone] = useState(0)
  const [gone, setGone] = useState<Set<number>>(new Set())
  const finished = done >= p.b || reveal
  const objSize = p.a + p.b > 10 ? 38 : 50
  useEffect(() => { if (done === p.b) setTimeout(() => say(p.op === '+' ? 'How many now?' : 'How many are left?'), 500) }, [done, p.b, p.op])
  useEffect(() => {
    if (!reveal || p.op === '+') return
    setGone(new Set(Array.from({ length: p.b }, (_, i) => p.a - 1 - i)))
  }, [reveal, p.op, p.a, p.b])
  const added = p.op === '+' ? (reveal ? p.b : done) : 0
  // Hint 2: number the ones that are left / all of them.
  const left = Array.from({ length: p.a }, (_, i) => i).filter((i) => !gone.has(i))
  const labels = new Map(left.map((i, k) => [i, k + 1]))
  return (
    <Stage>
      {p.op === '+' ? (
        <div className="flex flex-wrap items-center justify-center gap-4">
          <ObjectGroup slug={p.object} n={p.a} size={objSize} tapped={hint >= 2 && finished ? new Set(left) : undefined} label={(i) => i + 1} />
          <span className="text-5xl font-black text-text-2">+</span>
          {added > 0
            ? <ObjectGroup slug={p.object} n={added} size={objSize} tapped={hint >= 2 && finished ? new Set(Array.from({ length: added }, (_, i) => i)) : undefined} label={(i) => p.a + i + 1} />
            : <div className="grid h-20 w-20 place-items-center rounded-2xl border-4 border-dashed border-border text-4xl text-text-2">?</div>}
        </div>
      ) : (
        <ObjectGroup slug={p.object} n={p.a} size={objSize} crossedSet={gone}
          tapped={hint >= 2 && finished ? new Set(left) : undefined} label={(i) => labels.get(i)} highlight={!finished && hint >= 1}
          onTap={finished || locked ? undefined : (i) => {
            if (gone.has(i)) return
            sfx('pop'); say(NUMBER_WORDS[gone.size + 1])
            setGone((g) => new Set(g).add(i)); setDone((d) => d + 1)
          }} />
      )}
      {!finished && p.op === '+' && (
        <button type="button" disabled={locked} className="btn btn-brand h-24 w-24 text-6xl! anim-glow"
          onClick={() => { sfx('pop'); say(NUMBER_WORDS[p.a + done + 1] ?? String(p.a + done + 1)); setDone((d) => d + 1) }}>+</button>
      )}
      {!finished && p.op === '-' && <div className="text-2xl font-bold text-text-2">Tap {p.b - done} more</div>}
      {finished && <NumberChoices choices={p.choices} answer={p.answer} reveal={reveal} disabled={locked} onPick={pickNum(p.answer, onAnswer)} />}
    </Stage>
  )
}

// ---- Domino -----------------------------------------------------------------

const PIPS: Record<number, [number, number][]> = {
  0: [], 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]], 6: [[0, 0], [1, 0], [2, 0], [0, 2], [1, 2], [2, 2]],
}

function Half({ n, color }: { n: number; color: string }) {
  return (
    <div className="grid h-36 w-36 grid-cols-3 grid-rows-3 p-3">
      {Array.from({ length: 9 }, (_, k) => {
        const on = PIPS[n].some(([r, c]) => r * 3 + c === k)
        return <div key={k} className="grid place-items-center">{on && <span className="block h-8 w-8 rounded-full" style={{ background: color }} />}</div>
      })}
    </div>
  )
}

export function DominoActivity({ p, hint, reveal, locked, onAnswer }: Of<'domino'>) {
  return (
    <Stage>
      <div className="flex items-center rounded-3xl border-4 border-text/70 bg-surface shadow-[0_6px_0_rgba(43,35,64,.15)]">
        <Half n={p.a} color="var(--brand)" />
        <div className="h-28 w-1.5 rounded bg-text/60" />
        <Half n={p.b} color="var(--pink)" />
      </div>
      {(hint >= 1 || reveal) && <div className="text-4xl font-black text-text-2">{p.a} + {p.b}{reveal ? ` = ${p.answer}` : ''}</div>}
      <NumberChoices choices={p.choices} answer={p.answer} reveal={reveal} disabled={locked} onPick={pickNum(p.answer, onAnswer)} />
    </Stage>
  )
}

// ---- True or not? -------------------------------------------------------------

export function TrueFalseActivity({ p, hint, reveal, locked, onAnswer }: Of<'truefalse'>) {
  const [wrong, setWrong] = useState<string | null>(null)
  const real = p.op === '+' ? p.a + p.b : p.a - p.b
  const small = p.a <= 10 && p.b <= 10
  const btn = (v: 'yes' | 'no', label: string) => (
    <button type="button" disabled={locked || reveal || wrong === v}
      onClick={() => { sfx('tap'); if (v !== p.answer) setWrong(v); onAnswer(v === p.answer) }}
      className={`btn h-28 w-36 text-6xl! ${reveal && v === p.answer ? 'btn-good anim-glow' : ''} ${wrong === v ? 'opacity-30 anim-shake' : ''}`}>{label}</button>
  )
  return (
    <Stage>
      <div className="flex flex-wrap items-center justify-center gap-3 text-6xl font-black">
        <span>{p.a}</span><span>{opWord(p.op)}</span><span>{p.b}</span><span>=</span>
        <span className={`rounded-2xl border-4 px-3 ${reveal ? (p.answer === 'yes' ? 'border-good text-good' : 'border-pink text-pink line-through') : 'border-brand text-brand'}`}>{p.shown}</span>
        {reveal && p.answer === 'no' && <span className="text-good anim-pop">{real}</span>}
      </div>
      {hint >= 1 && small && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {p.op === '+'
            ? <><Dots n={p.a} /><span className="text-4xl font-black text-text-2">+</span><Dots n={p.b} color="var(--warm)" /></>
            : <Dots n={p.a} crossed={p.b} />}
        </div>
      )}
      <div className="flex gap-6">{btn('yes', '👍')}{btn('no', '👎')}</div>
    </Stage>
  )
}

function Dots({ n, crossed = 0, color = 'var(--brand)' }: { n: number; crossed?: number; color?: string }) {
  return (
    <div className="grid grid-cols-5 gap-1">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="relative block h-7 w-7 rounded-full" style={{ background: color, opacity: i >= n - crossed ? 0.3 : 1 }}>
          {i >= n - crossed && <span className="absolute inset-0 grid place-items-center text-lg font-black text-pink">✕</span>}
        </span>
      ))}
    </div>
  )
}

// ---- Which number sentence matches? ---------------------------------------------

export function MatchEqActivity({ p, reveal, locked, onAnswer }: Of<'matcheq'>) {
  const size = p.a + p.b > 10 ? 34 : 44
  return (
    <Stage>
      {p.op === '+' ? (
        <div className="flex flex-wrap items-center justify-center gap-4">
          <ObjectGroup slug={p.object} n={p.a} size={size} />
          <span className="text-4xl font-black text-text-2">and</span>
          <ObjectGroup slug={p.object} n={p.b} size={size} />
        </div>
      ) : <ObjectGroup slug={p.object} n={p.a} size={size} crossed={p.b} />}
      <NumberChoices choices={p.choices} answer={p.answer} reveal={reveal} disabled={locked}
        onPick={(c) => onAnswer(c === p.answer)} render={(c) => <span className="px-2 text-4xl">{c}</span>} />
    </Stage>
  )
}

// ---- Two cards that make the number -----------------------------------------------

export function PairsActivity({ p, hint, reveal, locked, onAnswer }: Of<'pairs'>) {
  const [sel, setSel] = useState<number[]>([])
  const [bad, setBad] = useState(false)
  const pair = (() => {
    for (let i = 0; i < p.cards.length; i++) for (let j = i + 1; j < p.cards.length; j++) if (p.cards[i] + p.cards[j] === p.target) return [i, j]
    return []
  })()
  const shown = reveal ? pair : sel
  const tap = (i: number) => {
    if (locked || reveal) return
    sfx('tap'); say(NUMBER_WORDS[p.cards[i]])
    if (sel.includes(i)) return setSel(sel.filter((x) => x !== i))
    const next = [...sel, i]
    setSel(next)
    if (next.length === 2) {
      const ok = p.cards[next[0]] + p.cards[next[1]] === p.target
      if (!ok) { setBad(true); setTimeout(() => { setBad(false); setSel([]) }, 700) }
      onAnswer(ok)
    }
  }
  return (
    <Stage>
      <div className="grid h-28 w-28 place-items-center rounded-full border-4 border-brand bg-surface text-6xl font-black text-brand">{p.target}</div>
      <div className="grid grid-cols-3 gap-3">
        {p.cards.map((c, i) => (
          <button key={i} type="button" disabled={locked || reveal} onClick={() => tap(i)}
            className={`btn h-24 w-24 text-5xl! ${shown.includes(i) ? (bad ? 'bg-pink! text-white! anim-shake' : 'btn-brand') : ''} ${hint >= 2 && !reveal && i === pair[0] && !sel.length ? 'anim-glow' : ''}`}>{c}</button>
        ))}
      </div>
      {sel.length > 0 && !reveal && <div className="text-3xl font-black text-text-2">{sel.map((i) => p.cards[i]).join(' + ')}{sel.length === 1 ? ' + ?' : ''}</div>}
      {reveal && <div className="text-3xl font-black text-good">{p.cards[pair[0]]} + {p.cards[pair[1]]} = {p.target}</div>}
      {hint >= 1 && !reveal && <div className="text-xl font-bold text-text-2">Pick one number. What goes with it to make {p.target}?</div>}
    </Stage>
  )
}

// ---- Hundred chart --------------------------------------------------------------

export function ChartActivity({ p, hint, reveal, locked, onAnswer }: Of<'chart'>) {
  const [wrong, setWrong] = useState<Set<number>>(new Set())
  const [hop, setHop] = useState<number | null>(null)
  const rows = Math.abs(p.delta) / 10
  // Only show the rows that matter (plus one either side) so cells stay big on a phone.
  const lo = Math.min(p.start, p.answer), hi = Math.max(p.start, p.answer)
  const r0 = Math.max(0, Math.floor((lo - 1) / 10) - 1), r1 = Math.min(9, Math.floor((hi - 1) / 10) + 1)
  useEffect(() => {
    if (hint < 2 && !reveal) return
    let k = 0
    setHop(p.start)
    const t = setInterval(() => {
      if (k >= rows) return clearInterval(t)
      k++
      const v = p.start + Math.sign(p.delta) * 10 * k
      setHop(v); sfx('pop'); say(String(v))
    }, 900)
    return () => clearInterval(t)
  }, [hint, reveal, p.start, p.delta, rows])
  const col = (p.start - 1) % 10
  return (
    <Stage>
      <div className="grid w-full max-w-lg grid-cols-10 gap-1 px-1">
        {Array.from({ length: (r1 - r0 + 1) * 10 }, (_, k) => {
          const v = r0 * 10 + k + 1
          const isStart = v === p.start
          const inCol = hint >= 1 && (v - 1) % 10 === col
          return (
            <button key={v} type="button" disabled={locked || reveal || wrong.has(v) || isStart}
              onClick={() => { sfx('tap'); if (v !== p.answer) setWrong((w) => new Set(w).add(v)); onAnswer(v === p.answer) }}
              className={`grid aspect-square place-items-center rounded-lg border-2 text-base font-black sm:text-xl
                ${isStart ? 'border-brand bg-brand text-white' : reveal && v === p.answer ? 'border-good bg-good text-white anim-glow' : hop === v ? 'border-warm bg-warm' : inCol ? 'border-warm bg-warm-soft' : 'border-border bg-surface'}
                ${wrong.has(v) ? 'opacity-30' : ''}`}>
              {v}
            </button>
          )
        })}
      </div>
      <div className="text-2xl font-black text-text-2">{p.start} {p.delta > 0 ? '+' : '−'} {Math.abs(p.delta)} = ?</div>
    </Stage>
  )
}
