import { COUNTABLES, nameFor, objectBySlug, type ArtSlug } from '@/art/objects'
import type { GenContext, Problem, ShapeName } from '@/curriculum/types'
import { int, numberChoices, pick, shuffle, type Rng } from '@/lib/rng'

/**
 * Pure problem generators. Each takes a difficulty level and representation and
 * returns a fully-specified Problem whose `answer` is guaranteed correct.
 */

const obj = (rng: Rng) => pick(rng, COUNTABLES)
const lvl = <T,>(d: number, xs: readonly T[]): T => xs[Math.min(d, xs.length - 1)]

export function count(ctx: GenContext, ranges: [number, number][]): Problem {
  const [lo, hi] = lvl(ctx.difficulty, ranges)
  const n = int(ctx.rng, lo, hi)
  const o = obj(ctx.rng)
  return {
    kind: 'count', rep: ctx.rep, n, object: o.slug, answer: n,
    choices: numberChoices(ctx.rng, n, 3, Math.max(1, lo - 1), hi + 2),
    prompt: `How many ${o.many}? Tap each one to count.`,
  }
}

export function subitize(ctx: GenContext): Problem {
  const [lo, hi] = lvl(ctx.difficulty, [[1, 3], [1, 4], [2, 5], [3, 6], [4, 8]] as const)
  const n = int(ctx.rng, lo, hi)
  const o = obj(ctx.rng)
  const layout = n <= 6 && ctx.difficulty < 3 ? 'dice' : pick(ctx.rng, ['tenframe', 'scatter'] as const)
  return {
    kind: 'subitize', rep: ctx.rep, n, object: o.slug, layout, answer: n,
    flashMs: lvl(ctx.difficulty, [2500, 2000, 1600, 1300, 1100]),
    choices: numberChoices(ctx.rng, n, 3, 1, hi + 2),
    prompt: `Quick look! How many ${o.many}?`,
  }
}

export function tenFrameBuild(ctx: GenContext, upTo20 = false): Problem {
  const target = upTo20
    ? int(ctx.rng, lvl(ctx.difficulty, [11, 11, 13]), lvl(ctx.difficulty, [14, 17, 20]))
    : int(ctx.rng, lvl(ctx.difficulty, [1, 3, 5]), lvl(ctx.difficulty, [5, 8, 10]))
  return {
    kind: 'tenframe', mode: 'build', rep: ctx.rep, target, answer: target, frames: upTo20 ? 2 : 1,
    prompt: `Fill the ten frame to make ${target}. Then press the check.`,
  }
}

export function moreToTen(ctx: GenContext): Problem {
  const filled = int(ctx.rng, lvl(ctx.difficulty, [5, 3, 1]), 9)
  const answer = 10 - filled
  return {
    kind: 'tenframe', mode: 'more-to-10', rep: ctx.rep, filled, answer, frames: 1,
    choices: numberChoices(ctx.rng, answer, lvl(ctx.difficulty, [3, 3, 4]), 1, 9),
    prompt: `How many more to make ten?`,
  }
}

export function compare(ctx: GenContext): Problem {
  const max = lvl(ctx.difficulty, [5, 8, 10, 10])
  const allowSame = ctx.difficulty >= 2
  const a = int(ctx.rng, 1, max)
  let b = allowSame && ctx.rng() < 0.2 ? a : int(ctx.rng, 1, max)
  // Early levels: make the difference obvious (≥2) and never equal.
  const minGap = lvl(ctx.difficulty, [2, 1, 0, 0])
  let guard = 0
  while (((!allowSame && a === b) || (a !== b && Math.abs(a - b) < minGap)) && guard++ < 50) b = int(ctx.rng, 1, max)
  if (!allowSame && a === b) b = a === max ? a - 1 : a + 1
  const ask = ctx.difficulty >= 1 && ctx.rng() < 0.4 ? 'fewer' : 'more'
  const answer = a === b ? 'same' : (ask === 'more') === a > b ? 'left' : 'right'
  const o = obj(ctx.rng)
  return {
    kind: 'compare', rep: ctx.rep, a, b, object: o.slug, ask, answer, allowSame,
    prompt: ctx.rep === 'abstract'
      ? `Which number is ${ask === 'more' ? 'bigger' : 'smaller'}?`
      : `Which group has ${ask} ${o.many}?`,
  }
}

export function sequence(ctx: GenContext, kind: 'within20' | 'tens'): Problem {
  if (kind === 'tens') {
    const len = 4
    const startTen = int(ctx.rng, 0, 10 - len) // 0..6 → sequences end ≤ 100
    const nums = Array.from({ length: len }, (_, i) => (startTen + i + 1) * 10)
    const hole = ctx.difficulty === 0 ? len - 1 : int(ctx.rng, 1, len - 1)
    const answer = nums[hole]
    return {
      kind: 'sequence', rep: ctx.rep, step: 10, answer,
      numbers: nums.map((n, i) => (i === hole ? null : n)),
      choices: shuffle(ctx.rng, [...new Set([answer, answer + 10 > 100 ? answer - 20 : answer + 10, answer - 10 < 10 ? answer + 20 : answer - 10, answer + 1])].slice(0, 3)),
      prompt: 'Count by tens! What number is missing?',
    }
  }
  const max = lvl(ctx.difficulty, [10, 15, 20])
  const len = 4
  const start = int(ctx.rng, 1, max - len + 1)
  const nums = Array.from({ length: len }, (_, i) => start + i)
  const hole = ctx.difficulty === 0 ? len - 1 : int(ctx.rng, 0, len - 1)
  const answer = nums[hole]
  return {
    kind: 'sequence', rep: ctx.rep, step: 1, answer,
    numbers: nums.map((n, i) => (i === hole ? null : n)),
    choices: numberChoices(ctx.rng, answer, 3, 1, max + 1),
    prompt: hole === len - 1 ? 'What number comes next?' : hole === 0 ? 'What number comes before?' : 'What number is missing?',
  }
}

export function bond(ctx: GenContext, whole: 5 | 10): Problem {
  const w = whole === 5 ? int(ctx.rng, lvl(ctx.difficulty, [3, 4, 5]), 5) : int(ctx.rng, lvl(ctx.difficulty, [6, 8, 10]), 10)
  const part = int(ctx.rng, 0, w)
  const answer = w - part
  const o = obj(ctx.rng)
  return {
    kind: 'bond', rep: ctx.rep, whole: w, part, object: o.slug, answer,
    choices: numberChoices(ctx.rng, answer, 3, 0, w),
    prompt: `${w} ${nameFor(o, w)} altogether. ${part} here. How many in the other part?`,
  }
}

export function addSub(ctx: GenContext, op: '+' | '-', maxSum: number, opts: { missing?: boolean } = {}): Problem {
  const o = obj(ctx.rng)
  // Difficulty widens the range up to maxSum.
  const caps = maxSum <= 5 ? [3, 4, 5] : maxSum <= 10 ? [6, 8, 10] : [12, 15, 18, 20]
  const cap = Math.min(maxSum, lvl(ctx.difficulty, caps))
  const floor = maxSum > 10 ? 11 : 2
  const c0 = int(ctx.rng, Math.min(floor, cap), cap)
  // Zero ("0 frogs and 2 more") confuses young children; only introduce it at the top level.
  const allowZero = ctx.difficulty >= 2
  const a0 = allowZero
    ? int(ctx.rng, maxSum > 10 ? Math.max(1, c0 - 9) : 0, c0)
    : int(ctx.rng, maxSum > 10 ? Math.max(1, c0 - 9) : 1, Math.max(1, c0 - 1))
  // For + : a + b = c ; for - : c - b = a  → reuse parts
  let a: number, b: number, c: number
  if (op === '+') { a = a0; b = c0 - a0; c = c0 } else { a = c0; b = c0 - a0; c = a0 }
  const blank: 'a' | 'b' | 'c' = opts.missing ? (ctx.rng() < 0.5 ? 'b' : 'a') : 'c'
  const answer = blank === 'a' ? a : blank === 'b' ? b : c
  const word = op === '+' ? 'plus' : 'take away'
  const say = (x: number, k: 'a' | 'b' | 'c') => (k === blank ? 'what' : String(x))
  let prompt: string
  if (ctx.rep === 'concrete' && !opts.missing) {
    prompt = op === '+'
      ? `${a} ${nameFor(o, a)} and ${b} more. How many altogether?`
      : `${a} ${nameFor(o, a)}. ${b} go away. How many are left?`
  } else {
    prompt = `${say(a, 'a')} ${word} ${say(b, 'b')} equals ${say(c, 'c')}?`
  }
  return {
    kind: 'equation', rep: ctx.rep, a, op, b, c, blank, object: o.slug, answer, prompt,
    choices: numberChoices(ctx.rng, answer, 4, 0, Math.max(maxSum, answer + 2)),
  }
}

const SHAPES_BY_LEVEL: ShapeName[][] = [
  ['circle', 'square', 'triangle'],
  ['circle', 'square', 'triangle', 'rectangle', 'star'],
  ['circle', 'square', 'triangle', 'rectangle', 'star', 'heart', 'hexagon', 'oval'],
]
const SHAPE_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899']

export function shape(ctx: GenContext): Problem {
  const pool = lvl(ctx.difficulty, SHAPES_BY_LEVEL)
  const n = lvl(ctx.difficulty, [3, 3, 4])
  const shapes = shuffle(ctx.rng, pool).slice(0, n)
  const answer = int(ctx.rng, 0, n - 1)
  // Same colour at level 0 would make it a colour game; vary colours from level 1.
  const options = shapes.map((s) => ({ shape: s, color: ctx.difficulty === 0 ? '#3b82f6' : pick(ctx.rng, SHAPE_COLORS) }))
  return { kind: 'shape', rep: ctx.rep, target: shapes[answer], options, answer, prompt: `Find the ${shapes[answer]}!` }
}

const PATTERN_ART: ArtSlug[] = ['apple', 'star', 'duck', 'flower', 'car', 'fish', 'balloon', 'cat', 'bee', 'cookie']

export function pattern(ctx: GenContext): Problem {
  const unitLen = lvl(ctx.difficulty, [2, 2, 3, 3])
  const units = shuffle(ctx.rng, PATTERN_ART).slice(0, unitLen)
  // Level 1+: AAB / ABB style; level 3: ABC with doubled parts.
  let unit: ArtSlug[]
  if (ctx.difficulty === 0) unit = [units[0], units[1]]
  else if (ctx.difficulty === 1) unit = pick(ctx.rng, [[units[0], units[1]], [units[0], units[0], units[1]], [units[0], units[1], units[1]]])
  else unit = units
  const total = unit.length * 2 + int(ctx.rng, 1, unit.length) // show at least 2 repeats
  const full = Array.from({ length: total + 1 }, (_, i) => unit[i % unit.length])
  const answer = full[total]
  const distract = shuffle(ctx.rng, PATTERN_ART.filter((x) => !unit.includes(x)))[0]
  const choices = shuffle(ctx.rng, [...new Set([...unit, distract])]).slice(0, 3)
  if (!choices.includes(answer)) choices[0] = answer
  return { kind: 'pattern', rep: ctx.rep, seq: full.slice(0, total), choices: shuffle(ctx.rng, choices), answer, prompt: 'What comes next in the pattern?' }
}

export function numberLine(ctx: GenContext, op: '+' | '-', max = 20): Problem {
  const maxDelta = lvl(ctx.difficulty, [3, 5, 8, 9])
  const delta = int(ctx.rng, 1, maxDelta)
  const start = op === '+' ? int(ctx.rng, 0, max - delta) : int(ctx.rng, delta, max)
  const answer = op === '+' ? start + delta : start - delta
  return {
    kind: 'numberline', rep: ctx.rep, min: 0, max, step: 1, start, delta: op === '+' ? delta : -delta, answer,
    prompt: op === '+' ? `Start at ${start}. Hop ${delta} forward. Where do you land?` : `Start at ${start}. Hop ${delta} back. Where do you land?`,
  }
}

export function placeValue(ctx: GenContext): Problem {
  const maxTens = lvl(ctx.difficulty, [1, 3, 6, 9])
  const tens = int(ctx.rng, 1, maxTens)
  const ones = int(ctx.rng, 0, 9)
  const answer = tens * 10 + ones
  const mode = ctx.rep === 'concrete' || ctx.rng() < 0.5 ? 'read' : 'build'
  // Distractors target the classic confusions: swapped digits, off-by-ten.
  const opts = new Set([answer])
  if (ones !== 0 && ones !== tens) opts.add(ones * 10 + tens)
  opts.add(answer + 10 <= 99 ? answer + 10 : answer - 10)
  opts.add(answer + 1 <= 99 ? answer + 1 : answer - 1)
  return {
    kind: 'placevalue', rep: ctx.rep, mode, tens, ones, answer,
    choices: shuffle(ctx.rng, [...opts]),
    prompt: mode === 'read' ? 'How many altogether? Tens and ones!' : `Build ${answer} with tens and ones.`,
  }
}

export function tensAddSub(ctx: GenContext): Problem {
  const op = ctx.rng() < 0.5 ? '+' : '-'
  const o = obj(ctx.rng)
  const t1 = int(ctx.rng, 1, 8)
  const t2 = int(ctx.rng, 1, 9 - t1)
  const ones = ctx.difficulty >= 1 ? int(ctx.rng, 0, 9) : 0
  let a: number, b: number, c: number
  if (op === '+') { a = t1 * 10 + ones; b = t2 * 10; c = a + b } else { a = (t1 + t2) * 10 + ones; b = t2 * 10; c = a - b }
  return {
    kind: 'equation', rep: ctx.rep, a, op, b, c, blank: 'c', object: o.slug, answer: c,
    choices: numberChoices(ctx.rng, c, 4, 0, 99),
    prompt: `${a} ${op === '+' ? 'plus' : 'take away'} ${b} equals what?`,
  }
}

export { objectBySlug }
