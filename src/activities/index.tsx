import { useEffect, useRef, useState } from 'react'
import { NUMBER_WORDS, say, sfx } from '@/audio'
import { CheckButton, Keypad, NumberChoices } from '@/components/inputs'
import { Arrangement, Art, NumberCard, ObjectGroup, Shape, TenFrame } from '@/components/visuals'
import type { Problem } from '@/curriculum/types'
import * as M from './more'

export interface ActivityProps<P extends Problem = Problem> {
  p: P
  /** Number of wrong attempts so far (drives escalating hints). */
  hint: number
  /** Show the right answer (after too many misses). */
  reveal: boolean
  /** Disable input while feedback plays. */
  locked: boolean
  onAnswer: (correct: boolean) => void
}

type Of<K extends Problem['kind']> = ActivityProps<Extract<Problem, { kind: K }>>

export function Activity(props: ActivityProps) {
  const { p } = props
  switch (p.kind) {
    case 'count': return <CountActivity {...(props as Of<'count'>)} />
    case 'subitize': return <SubitizeActivity {...(props as Of<'subitize'>)} />
    case 'tenframe': return p.mode === 'build' ? <TenFrameBuild {...(props as ActivityProps<Extract<Problem, { kind: 'tenframe'; mode: 'build' }>>)} /> : <MoreToTen {...(props as ActivityProps<Extract<Problem, { kind: 'tenframe'; mode: 'more-to-10' }>>)} />
    case 'compare': return <CompareActivity {...(props as Of<'compare'>)} />
    case 'bond': return <BondActivity {...(props as Of<'bond'>)} />
    case 'equation': return <EquationActivity {...(props as Of<'equation'>)} />
    case 'sequence': return <SequenceActivity {...(props as Of<'sequence'>)} />
    case 'shape': return <ShapeActivity {...(props as Of<'shape'>)} />
    case 'pattern': return <M.PatternActivity {...(props as Of<'pattern'>)} />
    case 'numberline': return <NumberLineActivity {...(props as Of<'numberline'>)} />
    case 'placevalue': return <PlaceValueActivity {...(props as Of<'placevalue'>)} />
    case 'patternfix': return <M.PatternFixActivity {...(props as Of<'patternfix'>)} />
    case 'patternpick': return <M.PatternPickActivity {...(props as Of<'patternpick'>)} />
    case 'hide': return <M.HideActivity {...(props as Of<'hide'>)} />
    case 'act': return <M.ActActivity {...(props as Of<'act'>)} />
    case 'domino': return <M.DominoActivity {...(props as Of<'domino'>)} />
    case 'truefalse': return <M.TrueFalseActivity {...(props as Of<'truefalse'>)} />
    case 'matcheq': return <M.MatchEqActivity {...(props as Of<'matcheq'>)} />
    case 'pairs': return <M.PairsActivity {...(props as Of<'pairs'>)} />
    case 'chart': return <M.ChartActivity {...(props as Of<'chart'>)} />
  }
}

const Stage = ({ children }: { children: React.ReactNode }) => (
  <div className="flex w-full flex-1 flex-col items-center justify-center gap-6 anim-fade-up">{children}</div>
)

const pickNum = (answer: number, onAnswer: (c: boolean) => void) => (c: number | string) => onAnswer(c === answer)

// ---- 1. Count & tap --------------------------------------------------------

function CountActivity({ p, hint, reveal, locked, onAnswer }: Of<'count'>) {
  const [tapped, setTapped] = useState<number[]>([])
  const auto = hint >= 2 || reveal
  // Hint 2+: count them together, one at a time.
  useEffect(() => {
    if (!auto) return
    setTapped([])
    let i = 0
    const t = setInterval(() => {
      if (i >= p.n) return clearInterval(t)
      const k = i++
      setTapped((xs) => [...xs, k])
      sfx('pop')
      say(NUMBER_WORDS[k + 1] ?? String(k + 1))
    }, 750)
    return () => clearInterval(t)
  }, [auto, p.n])
  const order = new Map(tapped.map((i, k) => [i, k + 1]))
  return (
    <Stage>
      <ObjectGroup
        slug={p.object} n={p.n} size={p.n > 10 ? 44 : p.n > 5 ? 56 : 76}
        tapped={new Set(tapped)} highlight={hint >= 1}
        onTap={locked || auto ? undefined : (i) => {
          if (order.has(i)) return
          sfx('pop')
          const k = tapped.length + 1
          say(NUMBER_WORDS[k] ?? String(k))
          setTapped((xs) => [...xs, i])
        }}
        label={(i) => order.get(i)}
      />
      <NumberChoices choices={p.choices} answer={p.answer} reveal={reveal} disabled={locked} onPick={pickNum(p.answer, onAnswer)} />
    </Stage>
  )
}

// ---- 2. Subitize (quick look) ---------------------------------------------

function SubitizeActivity({ p, hint, reveal, locked, onAnswer }: Of<'subitize'>) {
  const [visible, setVisible] = useState(true)
  const keep = hint >= 2 || reveal
  useEffect(() => {
    setVisible(true)
    if (keep) return
    const t = setTimeout(() => setVisible(false), p.flashMs + hint * 1200)
    return () => clearTimeout(t)
  }, [hint, keep, p.flashMs])
  return (
    <Stage>
      <div className="relative">
        <div className={visible ? '' : 'invisible'}><Arrangement n={p.n} slug={p.object} layout={p.layout} seed={p.n * 7 + p.object.length} /></div>
        {!visible && (
          <button type="button" className="absolute inset-0 grid place-items-center rounded-3xl border-4 border-dashed border-brand bg-surface-2 text-6xl" onClick={() => { sfx('tap'); setVisible(true); setTimeout(() => setVisible(false), 900) }} aria-label="peek">
            👀
          </button>
        )}
      </div>
      <NumberChoices choices={p.choices} answer={p.answer} reveal={reveal} disabled={locked} onPick={pickNum(p.answer, onAnswer)} />
    </Stage>
  )
}

// ---- 3. Ten frames ---------------------------------------------------------

function TenFrameBuild({ p, hint, reveal, locked, onAnswer }: ActivityProps<Extract<Problem, { kind: 'tenframe'; mode: 'build' }>>) {
  const [filled, setFilled] = useState(0)
  useEffect(() => { if (reveal) setFilled(p.target) }, [reveal, p.target])
  const toggle = (i: number) => {
    if (locked || reveal) return
    // Frames fill in order (left-to-right, top row first) — tapping a filled cell removes the last one.
    const n = i < filled ? filled - 1 : Math.min(filled + 1, p.frames * 10)
    sfx(n > filled ? 'pop' : 'tap')
    if (n > filled) say(NUMBER_WORDS[n] ?? String(n))
    setFilled(n)
  }
  const size = p.frames === 2 ? 46 : 60
  return (
    <Stage>
      <div className="text-7xl font-black text-brand">{p.target}</div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: p.frames }, (_, f) => (
          <TenFrame key={f} size={size} filled={Math.max(0, Math.min(10, filled - f * 10))}
            color={f === 0 ? 'var(--brand)' : 'var(--warm)'}
            onToggle={(i) => toggle(f * 10 + i)} highlightEmpty={hint >= 2 && filled < p.target} />
        ))}
      </div>
      {hint >= 1 && <div className="text-3xl font-black text-text-2">{filled}</div>}
      <CheckButton disabled={locked || filled === 0} onClick={() => onAnswer(filled === p.target)} />
    </Stage>
  )
}

function MoreToTen({ p, hint, reveal, locked, onAnswer }: ActivityProps<Extract<Problem, { kind: 'tenframe'; mode: 'more-to-10' }>>) {
  return (
    <Stage>
      <div className="relative">
        <TenFrame filled={p.filled} size={64} highlightEmpty={hint >= 1 || reveal} />
        {(hint >= 2 || reveal) && (
          <div className="pointer-events-none absolute inset-0 grid grid-cols-5 gap-1 p-1.5">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="grid place-items-center text-3xl font-black text-warm">{i >= p.filled ? i - p.filled + 1 : ''}</div>
            ))}
          </div>
        )}
      </div>
      <NumberChoices choices={p.choices} answer={p.answer} reveal={reveal} disabled={locked} onPick={pickNum(p.answer, onAnswer)} />
    </Stage>
  )
}

// ---- 4. Compare ------------------------------------------------------------

function CompareActivity({ p, hint, reveal, locked, onAnswer }: Of<'compare'>) {
  const showNums = hint >= 2 || reveal || p.rep === 'abstract'
  const side = (n: number, which: 'left' | 'right') => (
    <button
      type="button" disabled={locked}
      onClick={() => { sfx('tap'); onAnswer(p.answer === which) }}
      className={`card flex min-h-40 w-full flex-1 flex-col items-center justify-center gap-3 p-4 ${reveal && p.answer === which ? 'ring-8 ring-good' : ''}`}
    >
      {p.rep === 'abstract' ? <span className="text-8xl font-black">{n}</span>
        : p.rep === 'pictorial' ? <TenFrame filled={n} size={30} />
        : <ObjectGroup slug={p.object} n={n} size={44} highlight={hint >= 1} />}
      {showNums && p.rep !== 'abstract' && <span className="text-4xl font-black text-brand">{n}</span>}
    </button>
  )
  return (
    <Stage>
      <div className="flex w-full max-w-3xl flex-col items-stretch justify-center gap-4 px-2 sm:flex-row">
        {side(p.a, 'left')}
        {side(p.b, 'right')}
      </div>
      {p.allowSame && (
        <button type="button" disabled={locked} onClick={() => { sfx('tap'); onAnswer(p.answer === 'same') }} className={`btn ${reveal && p.answer === 'same' ? 'btn-good' : ''}`}>
          = Same
        </button>
      )}
    </Stage>
  )
}

// ---- 5. Number bonds -------------------------------------------------------

function BondCircle({ children, dashed, glow }: { children: React.ReactNode; dashed?: boolean; glow?: boolean }) {
  return (
    <div className={`grid min-h-28 min-w-28 place-items-center rounded-full border-4 bg-surface p-3 ${dashed ? 'border-dashed border-brand bg-surface-2' : 'border-text/60'} ${glow ? 'anim-glow' : ''}`}>
      {children}
    </div>
  )
}

function BondActivity({ p, hint, reveal, locked, onAnswer }: Of<'bond'>) {
  const showObjects = p.rep !== 'abstract' || hint >= 1
  const objSize = p.whole > 5 ? 26 : 34
  return (
    <Stage>
      <BondCircle>
        {showObjects ? <ObjectGroup slug={p.object} n={p.whole} size={objSize} crossed={hint >= 1 || reveal ? p.part : 0} /> : <span className="text-6xl font-black">{p.whole}</span>}
      </BondCircle>
      <svg width="220" height="40" aria-hidden><path d="M110 0 L40 40 M110 0 L180 40" stroke="#2b2340" strokeOpacity=".6" strokeWidth="5" strokeLinecap="round" /></svg>
      <div className="flex gap-10">
        <BondCircle>
          {showObjects ? <ObjectGroup slug={p.object} n={p.part} size={objSize} /> : null}
          <span className="text-5xl font-black">{p.part}</span>
        </BondCircle>
        <BondCircle dashed glow={hint >= 2}>
          {reveal ? <><ObjectGroup slug={p.object} n={p.answer} size={objSize} /><span className="text-5xl font-black text-good">{p.answer}</span></> : <span className="text-6xl font-black text-brand">?</span>}
        </BondCircle>
      </div>
      <NumberChoices choices={p.choices} answer={p.answer} reveal={reveal} disabled={locked} onPick={pickNum(p.answer, onAnswer)} />
    </Stage>
  )
}

// ---- 8. Equations (with CPA visuals) --------------------------------------

function EquationActivity({ p, hint, reveal, locked, onAnswer }: Of<'equation'>) {
  // Hints step *down* the CPA ladder: abstract → pictorial → concrete.
  const order = ['abstract', 'pictorial', 'concrete'] as const
  const rep = order[Math.min(2, Math.max(order.indexOf(p.rep), hint))]
  const small = p.a <= 20 && p.b <= 20
  const visual = small && p.blank === 'c' ? (
    p.op === '+' ? (
      <div className="flex flex-wrap items-center justify-center gap-4">
        {rep === 'concrete' ? <ObjectGroup slug={p.object} n={p.a} size={40} /> : <Frames n={p.a} />}
        <span className="text-5xl font-black text-text-2">+</span>
        {rep === 'concrete' ? <ObjectGroup slug={p.object} n={p.b} size={40} /> : <Frames n={p.b} color="var(--warm)" />}
      </div>
    ) : (
      rep === 'concrete' ? <ObjectGroup slug={p.object} n={p.a} size={40} crossed={p.b} /> : <Frames n={p.a} crossed={p.b} />
    )
  ) : p.blank === 'c' && p.b % 10 === 0 && p.a > 10 ? (
    // Tens: show the rods so "ten more" is one more rod, "ten less" one rod taken away.
    <TensVisual a={p.a} b={p.b} op={p.op} />
  ) : null
  const cell = (k: 'a' | 'b' | 'c', v: number) => <NumberCard value={k === p.blank && !reveal ? null : v} highlight={k === p.blank && reveal} size={p.c > 99 || p.a > 99 ? 'md' : 'lg'} />
  const useKeypad = p.rep === 'abstract' && p.style !== 'blocks'
  return (
    <Stage>
      {rep !== 'abstract' && visual}
      <div className="flex items-center gap-3 text-6xl font-black">
        {cell('a', p.a)}<span>{p.op === '+' ? '+' : '−'}</span>{cell('b', p.b)}<span>=</span>{cell('c', p.c)}
      </div>
      {useKeypad
        ? <Keypad disabled={locked || reveal} maxLen={String(p.answer).length + 1} onSubmit={(n) => onAnswer(n === p.answer)} />
        : <NumberChoices choices={p.choices} answer={p.answer} reveal={reveal} disabled={locked} onPick={pickNum(p.answer, onAnswer)} />}
    </Stage>
  )
}

/** Pictorial: dots in ten-frames, with optional crossed-out dots for subtraction. */
function Frames({ n, crossed = 0, color = 'var(--brand)' }: { n: number; crossed?: number; color?: string }) {
  const frames = Math.max(1, Math.ceil(n / 10))
  return (
    <div className="flex flex-col gap-1">
      {Array.from({ length: frames }, (_, f) => {
        const here = Math.max(0, Math.min(10, n - f * 10))
        return (
          <div key={f} className="inline-grid grid-cols-5 gap-1 rounded-xl border-4 border-text/60 bg-surface p-1">
            {Array.from({ length: 10 }, (_, i) => {
              const idx = f * 10 + i
              const on = i < here
              const x = on && idx >= n - crossed
              return (
                <div key={i} className="grid h-9 w-9 place-items-center rounded-md border-2 border-border">
                  {on && <span className="relative block h-6 w-6 rounded-full" style={{ background: color, opacity: x ? 0.3 : 1 }}>{x && <span className="absolute -inset-1 grid place-items-center text-xl font-black text-pink">✕</span>}</span>}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ---- Sequences (what comes next / count by tens) ---------------------------

function SequenceActivity({ p, hint, reveal, locked, onAnswer }: Of<'sequence'>) {
  const spoken = useRef(0)
  useEffect(() => {
    if (hint >= 1 && spoken.current < hint) {
      spoken.current = hint
      const words = p.numbers.map((n) => (n === null ? 'hmm' : String(n))).join(', ')
      setTimeout(() => say(`Let's count: ${words}`), 900)
    }
  }, [hint, p.numbers])
  const max = Math.max(...p.numbers.map((n) => n ?? 0), p.answer)
  const st = Math.abs(p.step)
  return (
    <Stage>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {p.numbers.map((n, i) => <NumberCard key={i} size={p.answer >= 10 ? 'md' : 'lg'} value={n === null && reveal ? p.answer : n} highlight={n === null && reveal} />)}
      </div>
      {hint >= 2 && !reveal && (
        <div className="flex flex-wrap justify-center gap-1 text-xl font-bold text-text-2">
          {Array.from({ length: Math.floor((max + st) / st) + 1 }, (_, i) => (p.answer % st) + i * st).filter((x) => x > 0 && x <= max + st).map((x) => (
            <span key={x} className={`rounded-lg px-2 ${p.numbers.includes(x) ? 'bg-surface-2 text-brand' : ''}`}>{x}</span>
          ))}
        </div>
      )}
      <NumberChoices choices={p.choices} answer={p.answer} reveal={reveal} disabled={locked} onPick={pickNum(p.answer, onAnswer)} />
    </Stage>
  )
}

// ---- 9. Shapes & patterns ---------------------------------------------------

function ShapeActivity({ p, hint, reveal, locked, onAnswer }: Of<'shape'>) {
  const [wrong, setWrong] = useState<Set<number>>(new Set())
  return (
    <Stage>
      {hint >= 1 && <div className="opacity-30"><Shape shape={p.target} color="#cfc8db" size={80} /></div>}
      <div className="flex flex-wrap justify-center gap-5">
        {p.options.map((o, i) => (
          <button key={i} type="button" disabled={locked || wrong.has(i)}
            onClick={() => { sfx('tap'); if (i !== p.answer) setWrong((w) => new Set(w).add(i)); onAnswer(i === p.answer) }}
            className={`card grid h-40 w-40 place-items-center ${wrong.has(i) ? 'opacity-30 anim-shake' : ''} ${(reveal || hint >= 2) && i === p.answer ? 'ring-8 ring-good anim-glow' : ''}`}>
            <Shape shape={o.shape} color={o.color} />
          </button>
        ))}
      </div>
    </Stage>
  )
}

// ---- 6. Number line hop ------------------------------------------------------

function NumberLineActivity({ p, hint, reveal, locked, onAnswer }: Of<'numberline'>) {
  const [frog, setFrog] = useState(p.start)
  const [wrong, setWrong] = useState<Set<number>>(new Set())
  const hops = Math.abs(p.delta)
  const dir = Math.sign(p.delta)
  // Hint 1+: hop together, counting each hop.
  useEffect(() => {
    if (hint < 1 && !reveal) return
    setFrog(p.start)
    let k = 0
    const t = setInterval(() => {
      if (k >= hops) return clearInterval(t)
      k++
      setFrog(p.start + dir * k)
      sfx('pop')
      say(String(k))
    }, 800)
    return () => clearInterval(t)
  }, [hint, reveal, p.start, hops, dir])
  const lo = Math.min(p.start, p.answer), hi = Math.max(p.start, p.answer)
  // Show a 12-number window around the hops so labels stay big on phones.
  const span = Math.min(11, p.max - p.min)
  const wMin = lo <= 3 ? p.min : Math.max(p.min, Math.min(lo - 1, p.max - span))
  const view = { min: wMin, max: wMin + span }
  const ticks = Array.from({ length: span + 1 }, (_, i) => view.min + i)
  const W = 100 / span
  return (
    <Stage>
      <div className="w-full max-w-4xl px-4">
        <div className="relative h-40">
          {/* hop arcs */}
          {(hint >= 2 || reveal) && Array.from({ length: hops }, (_, i) => {
            const from = p.start + dir * i
            const left = Math.min(from, from + dir) - view.min
            return <div key={i} className="absolute bottom-12 h-10 rounded-t-full border-4 border-b-0 border-warm" style={{ left: `${left * W}%`, width: `${W}%` }} />
          })}
          {/* frog */}
          <div className="absolute bottom-14 -translate-x-1/2 transition-all duration-500" style={{ left: `${(frog - view.min) * W}%` }}>
            <Art slug="frog" size={52} />
          </div>
          {/* line */}
          <div className="absolute bottom-10 left-0 right-0 h-1.5 rounded bg-text/70" />
          {ticks.map((t) => (
            <button key={t} type="button" disabled={locked || reveal || wrong.has(t)}
              onClick={() => { sfx('tap'); if (t !== p.answer) setWrong((w) => new Set(w).add(t)); onAnswer(t === p.answer) }}
              className="absolute bottom-0 flex h-16 w-8 -translate-x-1/2 flex-col items-center justify-end"
              style={{ left: `${(t - view.min) * W}%` }}>
              <span className={`mb-1 h-5 w-1 rounded ${t === p.start ? 'bg-brand' : 'bg-text/70'}`} />
              <span className={`text-2xl font-black leading-none ${t === p.start ? 'text-brand' : ''} ${reveal && t === p.answer ? 'rounded bg-good px-1 text-white' : ''} ${wrong.has(t) ? 'opacity-30' : ''} ${hint >= 2 && t >= lo && t <= hi ? 'text-warm' : ''}`}>{t}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="text-2xl font-bold text-text-2">Tap the number where the frog lands</div>
    </Stage>
  )
}

// ---- 7. Place value -----------------------------------------------------------

function Rod({ label, thin }: { label?: boolean; thin?: boolean }) {
  return (
    <div className="relative flex flex-col overflow-hidden rounded-md border-2 border-[#1d6fa5] bg-sky">
      {Array.from({ length: 10 }, (_, i) => <div key={i} className={`h-3.5 border-b border-[#1d6fa5]/60 last:border-0 ${thin ? 'w-4' : 'w-7'}`} />)}
      {label && <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm font-black text-white">10</span>}
    </div>
  )
}
const Cube = () => <div className="h-7 w-7 rounded-md border-2 border-[#c47800] bg-warm" />

function TensVisual({ a, b, op }: { a: number; b: number; op: '+' | '-' }) {
  const t = Math.floor(a / 10), o = a % 10, k = b / 10
  // Up to 10 rods + ones must fit a phone: go thin when there are many.
  const thin = t + (op === '+' ? k : 0) > 6
  return (
    <div className="flex min-h-40 max-w-full items-end gap-4 px-2">
      <div className={`flex ${thin ? 'gap-1' : 'gap-1.5'}`}>
        {Array.from({ length: t }, (_, i) => (
          <div key={i} className={`relative ${op === '-' && i >= t - k ? 'opacity-35' : ''}`}>
            <Rod thin={thin} />{op === '-' && i >= t - k && <span className="absolute inset-0 grid place-items-center text-4xl font-black text-pink">✕</span>}
          </div>
        ))}
        {op === '+' && Array.from({ length: k }, (_, i) => <div key={`n${i}`} className="anim-pop rounded-md ring-4 ring-warm"><Rod thin={thin} /></div>)}
      </div>
      <div className="grid grid-cols-2 gap-1">{Array.from({ length: o }, (_, i) => <Cube key={i} />)}</div>
    </div>
  )
}

function Blocks({ tens, ones, labels }: { tens: number; ones: number; labels?: boolean }) {
  return (
    <div className="flex min-h-40 items-end gap-6">
      <div className="flex gap-1.5">{Array.from({ length: tens }, (_, i) => <Rod key={i} label={labels} />)}</div>
      <div className="grid grid-cols-2 gap-1">{Array.from({ length: ones }, (_, i) => <Cube key={i} />)}</div>
    </div>
  )
}

function PlaceValueActivity({ p, hint, reveal, locked, onAnswer }: Of<'placevalue'>) {
  const [t, setT] = useState(0)
  const [o, setO] = useState(0)
  useEffect(() => { if (reveal) { setT(p.tens); setO(p.ones) } }, [reveal, p.tens, p.ones])
  if (p.mode === 'read') {
    return (
      <Stage>
        <Blocks tens={p.tens} ones={p.ones} labels={hint >= 1 || reveal} />
        {(hint >= 2 || reveal) && <div className="text-3xl font-black text-text-2">{p.tens} tens and {p.ones} ones</div>}
        <NumberChoices choices={p.choices} answer={p.answer} reveal={reveal} disabled={locked} onPick={pickNum(p.answer, onAnswer)} />
      </Stage>
    )
  }
  const btn = (label: string, f: () => void, dis: boolean) => <button type="button" disabled={locked || reveal || dis} onClick={() => { sfx('pop'); f() }} className="btn btn-sm text-xl!">{label}</button>
  return (
    <Stage>
      <div className="text-7xl font-black text-brand">{p.answer}</div>
      {hint >= 2 && !reveal && <div className="text-2xl font-black text-text-2">{p.tens} tens and {p.ones} ones</div>}
      <Blocks tens={t} ones={o} labels />
      <div className="flex flex-wrap justify-center gap-3">
        <div className="flex flex-col items-center gap-2">
          <span className="text-lg font-bold text-text-2">Tens: {t}</span>
          <div className="flex gap-2">{btn('− ten', () => setT((x) => x - 1), t === 0)}{btn('+ ten', () => setT((x) => x + 1), t >= 9)}</div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-lg font-bold text-text-2">Ones: {o}</span>
          <div className="flex gap-2">{btn('− one', () => setO((x) => x - 1), o === 0)}{btn('+ one', () => setO((x) => x + 1), o >= 9)}</div>
        </div>
      </div>
      {hint >= 1 && <div className="text-3xl font-black">{t * 10 + o}</div>}
      <CheckButton disabled={locked || reveal || t + o === 0} onClick={() => onAnswer(t === p.tens && o === p.ones)} />
    </Stage>
  )
}
