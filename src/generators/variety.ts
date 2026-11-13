import type { GenContext, Problem, Rep } from '@/curriculum/types'
import { int, numberChoices, pick, shuffle, type Rng } from '@/lib/rng'
import { addSub, obj, parts } from './index'

/**
 * Many ways to practise the same add/subtract fact, so a session isn't a row
 * of identical "calculator" sums. Each format is a separate activity on screen.
 */
type Fmt = 'story' | 'equation' | 'missing' | 'act' | 'hide' | 'domino' | 'numberline' | 'truefalse' | 'matcheq' | 'pairs'

const WEIGHTS: Record<Rep, Partial<Record<Fmt, number>>> = {
  concrete: { story: 2, act: 3, hide: 2, domino: 2, matcheq: 1 },
  pictorial: { story: 1, equation: 1, act: 1, hide: 2, domino: 2, numberline: 2, matcheq: 2, truefalse: 1 },
  abstract: { equation: 2, missing: 2, truefalse: 2, pairs: 2, numberline: 2, matcheq: 1, hide: 1 },
}

function weighted<T extends string>(rng: Rng, w: Partial<Record<T, number>>): T {
  const entries = Object.entries(w) as [T, number][]
  let r = rng() * entries.reduce((s, [, n]) => s + n, 0)
  for (const [k, n] of entries) if ((r -= n) < 0) return k
  return entries[entries.length - 1][0]
}

export function addSubMix(ctx: GenContext, op: '+' | '-', maxSum: number): Problem {
  const w = { ...WEIGHTS[ctx.rep] }
  if (op === '-') { delete w.domino; delete w.pairs }
  if (maxSum > 10) delete w.domino
  // "Missing number" sums are their own Grade 1 skill; only preview them in the bigger ranges.
  if (maxSum <= 5) delete w.missing
  const fmt = weighted(ctx.rng, w)
  return makeFormat(ctx, op, maxSum, fmt) ?? addSub(ctx, op, maxSum)
}

function makeFormat(ctx: GenContext, op: '+' | '-', maxSum: number, fmt: Fmt): Problem | null {
  const { rng, rep } = ctx
  const o = obj(rng)
  const { a, b, c } = parts(ctx, op, maxSum)
  const choiceMax = Math.max(maxSum, a, c) + 2
  switch (fmt) {
    case 'story': return addSub({ ...ctx, rep: 'concrete' }, op, maxSum)
    case 'equation': return addSub({ ...ctx, rep: rep === 'concrete' ? 'pictorial' : rep }, op, maxSum)
    case 'missing': return addSub(ctx, op, maxSum, { missing: true })
    case 'act': {
      if (b === 0) return null
      return {
        kind: 'act', style: 'act', rep, op, a, b, object: o.slug, answer: c,
        choices: numberChoices(rng, c, 3, 0, choiceMax),
        prompt: op === '+'
          ? `${a} ${a === 1 ? o.one : o.many}. Tap the plus to add ${b} more!`
          : `${a} ${a === 1 ? o.one : o.many}. Tap ${b} to send ${b === 1 ? 'it' : 'them'} home!`,
      }
    }
    case 'hide': {
      if (b === 0) return null
      const total = op === '+' ? c : a
      const shown = op === '+' ? a : c
      return {
        kind: 'hide', style: 'hide', rep, total, shown, object: o.slug, answer: b,
        choices: numberChoices(rng, b, 3, 0, total),
        prompt: `There are ${total} ${o.many}. Some are hiding under the blanket. How many are hiding?`,
      }
    }
    case 'domino': {
      if (a > 6 || b > 6) return null
      return {
        kind: 'domino', style: 'domino', rep, a, b, answer: c,
        choices: numberChoices(rng, c, 3, 0, 12),
        prompt: pick(rng, ['How many dots on the domino?', 'Count all the dots. How many?']),
      }
    }
    case 'numberline': {
      if (b === 0) return null
      const max = maxSum <= 10 ? 10 : 20
      return {
        kind: 'numberline', style: 'numberline', rep, min: 0, max, step: 1, start: a, delta: op === '+' ? b : -b, answer: c,
        prompt: op === '+' ? `Start at ${a}. Hop ${b} forward. Where do you land?` : `Start at ${a}. Hop ${b} back. Where do you land?`,
      }
    }
    case 'truefalse': {
      const right = rng() < 0.5
      const offs = [-2, -1, 1, 2].filter((d) => c + d >= 0)
      const shown = right ? c : c + pick(rng, offs)
      return {
        kind: 'truefalse', style: 'truefalse', rep, a, op, b, shown, answer: right ? 'yes' : 'no',
        prompt: `Is this right? ${a} ${op === '+' ? 'plus' : 'take away'} ${b} equals ${shown}.`,
      }
    }
    case 'matcheq': {
      if (b === 0) return null
      const M = '−'
      const answer = op === '+' ? `${a} + ${b}` : `${a} ${M} ${b}`
      const banned = new Set([answer, `${b} + ${a}`, op === '-' ? `${a} ${M} ${c}` : ''])
      const cands = op === '+'
        ? [a >= b ? `${a} ${M} ${b}` : '', `${a} + ${b + 1}`, `${a + 1} + ${b}`, b > 1 ? `${a} + ${b - 1}` : '']
        : [`${a} + ${b}`, b + 1 <= a ? `${a} ${M} ${b + 1}` : '', `${a + 1} ${M} ${b}`, b > 1 ? `${a} ${M} ${b - 1}` : '']
      const wrong = shuffle(rng, [...new Set(cands.filter((x) => x && !banned.has(x)))]).slice(0, 2)
      return {
        kind: 'matcheq', style: 'matcheq', rep, a, op, b, object: o.slug, answer,
        choices: shuffle(rng, [answer, ...wrong]),
        prompt: 'Which one matches the picture?',
      }
    }
    case 'pairs': {
      if (c < 3) return null
      const n = c >= 5 ? 6 : 4
      const lo = ctx.difficulty >= 2 ? 0 : 1
      const x = int(rng, lo, c - lo)
      const cards = [x, c - x]
      while (cards.length < n) cards.push(int(rng, lo, Math.min(c + 2, maxSum)))
      return {
        kind: 'pairs', style: 'pairs', rep, target: c, cards: shuffle(rng, cards), answer: c,
        prompt: `Find two numbers that make ${c}.`,
      }
    }
  }
}

// ---- Tens: +10 / −10 and friends --------------------------------------------

/** start ± delta, both on the hundred chart (1–100). */
function tensJump(ctx: GenContext): { start: number; delta: number; end: number } {
  const { rng, difficulty } = ctx
  const k = difficulty >= 2 ? int(rng, 1, 4) : 1
  const dir = rng() < 0.5 ? 1 : -1
  for (let guard = 0; guard < 100; guard++) {
    const ones = difficulty === 0 ? 0 : int(rng, 1, 9)
    const start = int(rng, ones === 0 ? 1 : 0, 9) * 10 + ones
    const end = start + dir * k * 10
    if (end >= 1 && end <= 100 && start >= 1) return { start, delta: dir * k * 10, end }
  }
  return { start: 30, delta: 10, end: 40 }
}

/** Distractors for tens questions target the classic slips: ±1 instead of ±10, the wrong way, no change. */
function tensChoices(rng: Rng, start: number, end: number): number[] {
  const set = new Set([end])
  for (const x of shuffle(rng, [end + 1, end - 1, start, 2 * start - end, end + 10, end - 10])) {
    if (set.size >= 4) break
    if (x >= 0 && x <= 100) set.add(x)
  }
  return shuffle(rng, [...set])
}

export function tensMix(ctx: GenContext): Problem {
  const { rng, rep } = ctx
  const w: Record<string, number> = rep === 'abstract'
    ? { equation: 3, chart: 2, sequence: 2, truefalse: 2 }
    : { blocks: 3, chart: 3, sequence: 2, truefalse: 1 }
  const fmt = weighted(rng, w)
  const { start, delta, end } = tensJump(ctx)
  const op = delta > 0 ? '+' : '-'
  const d = Math.abs(delta)
  const word = op === '+' ? 'plus' : 'take away'
  switch (fmt) {
    case 'chart':
      return {
        kind: 'chart', style: 'chart', rep, start, delta, answer: end,
        prompt: d === 10
          ? `Start at ${start}. Find ten ${op === '+' ? 'more' : 'less'}. Tap it!`
          : `Start at ${start}. Jump ${op === '+' ? 'forward' : 'back'} ${d}. Tap where you land!`,
      }
    case 'sequence': {
      const step = op === '+' ? 10 : -10
      const len = 4
      // Keep the whole run on 0–100.
      let first = start
      while (first + step * (len - 1) > 100 || first + step * (len - 1) < 1) first -= step
      const nums = Array.from({ length: len }, (_, i) => first + i * step)
      const hole = ctx.difficulty === 0 ? len - 1 : int(rng, 1, len - 1)
      const answer = nums[hole]
      return {
        kind: 'sequence', style: 'sequence', rep, step, answer,
        numbers: nums.map((n, i) => (i === hole ? null : n)),
        choices: shuffle(rng, [answer, ...tensChoices(rng, nums[hole - 1], answer).filter((x) => x > 0 && x !== answer).slice(0, 2)]),
        prompt: op === '+' ? 'Jump up by tens! What number is missing?' : 'Jump down by tens! What number is missing?',
      }
    }
    case 'truefalse': {
      const right = rng() < 0.5
      const shown = right ? end : pick(rng, [end + 1, end - 1, 2 * start - end].filter((x) => x >= 0 && x <= 100 && x !== end))
      return {
        kind: 'truefalse', style: 'truefalse', rep, a: start, op, b: d, shown, answer: right ? 'yes' : 'no',
        prompt: `Is this right? ${start} ${word} ${d} equals ${shown}.`,
      }
    }
    default: // 'equation' (abstract, typed) or 'blocks' (tens rods shown above the sum)
      return {
        kind: 'equation', style: fmt, rep, a: start, op, b: d, c: end, blank: 'c', object: obj(rng).slug, answer: end,
        choices: tensChoices(rng, start, end),
        prompt: `${start} ${word} ${d} equals what?`,
      }
  }
}

// ---- Teens: ten and some more (10 + 4, 14 − 10) ----------------------------

export function teensMix(ctx: GenContext): Problem {
  const { rng, rep } = ctx
  const n = int(rng, 1, ctx.difficulty === 0 ? 5 : 9)
  const t = 10 + n
  const o = obj(rng)
  const choices = (ans: number) => shuffle(rng, [...new Set([ans, ans === n ? t : n, ans + 1, ans - 1 > 0 ? ans - 1 : ans + 2])].slice(0, 4))
  const fmt = weighted(rng, rep === 'abstract'
    ? { add: 2, sub10: 2, subn: 1, chart: 2, truefalse: 2, hide: 1 }
    : { add: 3, sub10: 2, subn: 1, chart: 2, hide: 2 })
  const eq = (a: number, op: '+' | '-', b: number, c: number): Problem => ({
    kind: 'equation', style: `teens-${fmt}`, rep, a, op, b, c, blank: 'c', object: o.slug, answer: c, choices: choices(c),
    prompt: rep === 'concrete' && op === '+' ? `${a} ${a === 1 ? o.one : o.many} and ${b} more. How many altogether?` : `${a} ${op === '+' ? 'plus' : 'take away'} ${b} equals what?`,
  })
  switch (fmt) {
    case 'add': return ctx.difficulty >= 1 && rng() < 0.4 ? eq(n, '+', 10, t) : eq(10, '+', n, t)
    case 'sub10': return eq(t, '-', 10, n)
    case 'subn': return eq(t, '-', n, 10)
    case 'chart': {
      const up = rng() < 0.6
      return {
        kind: 'chart', style: 'teens-chart', rep, start: up ? n : t, delta: up ? 10 : -10, answer: up ? t : n,
        prompt: `Start at ${up ? n : t}. Find ten ${up ? 'more' : 'less'}. Tap it!`,
      }
    }
    case 'hide': return {
      kind: 'hide', style: 'teens-hide', rep, total: t, shown: 10, object: o.slug, answer: n, choices: choices(n),
      prompt: `There are ${t} ${o.many}. Ten are showing. How many are hiding under the blanket?`,
    }
    default: {
      const right = rng() < 0.5
      const shown = right ? t : pick(rng, [t + 1, t - 1, n])
      return {
        kind: 'truefalse', style: 'teens-truefalse', rep, a: 10, op: '+', b: n, shown, answer: right ? 'yes' : 'no',
        prompt: `Is this right? 10 plus ${n} equals ${shown}.`,
      }
    }
  }
}
