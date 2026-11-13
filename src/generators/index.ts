import { COUNTABLES, nameFor, objectBySlug } from '@/art/objects'
import type { GenContext, Problem, ShapeName } from '@/curriculum/types'
import { int, numberChoices, pick, shuffle, type Rng } from '@/lib/rng'

/**
 * Pure problem generators. Each takes a difficulty level and representation and
 * returns a fully-specified Problem whose `answer` is guaranteed correct.
 */

export const obj = (rng: Rng) => pick(rng, COUNTABLES)
export const lvl = <T,>(d: number, xs: readonly T[]): T => xs[Math.min(d, xs.length - 1)]

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
      kind: 'sequence', style: 'count-tens', rep: ctx.rep, step: 10, answer,
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

/** Pick the numbers for an add/subtract problem: a + b = c, or a − b = c. */
export function parts(ctx: GenContext, op: '+' | '-', maxSum: number): { a: number; b: number; c: number } {
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
  return op === '+' ? { a: a0, b: c0 - a0, c: c0 } : { a: c0, b: c0 - a0, c: a0 }
}

const s = (n: number, one: string, many: string) => (n === 1 ? one : many)

/** Little stories so word problems don't all sound the same. */
export function story(rng: Rng, op: '+' | '-', a: number, b: number, o: { one: string; many: string }): string {
  const A = `${a} ${a === 1 ? o.one : o.many}`
  if (op === '+') {
    return pick(rng, [
      `${A} ${s(a, 'is', 'are')} playing. ${b} more ${s(b, 'comes', 'come')} to play. How many now?`,
      `${A} in the basket. You put in ${b} more. How many altogether?`,
      `You have ${A}. A friend gives you ${b} more. How many do you have?`,
      `${A} at the party. ${b} more ${s(b, 'arrives', 'arrive')}. How many at the party?`,
      `${A} and ${b} more. How many altogether?`,
    ])
  }
  return pick(rng, [
    `${A}. ${b} ${s(b, 'goes', 'go')} away. How many are left?`,
    `There ${s(a, 'is', 'are')} ${A}. ${b} ${s(b, 'runs', 'run')} home. How many stay?`,
    `You have ${A}. You give ${b} to a friend. How many do you have left?`,
    `${A} on the hill. ${b} ${s(b, 'rolls', 'roll')} away. How many are still there?`,
  ])
}

export function addSub(ctx: GenContext, op: '+' | '-', maxSum: number, opts: { missing?: boolean } = {}): Problem {
  const o = obj(ctx.rng)
  const { a, b, c } = parts(ctx, op, maxSum)
  const blank: 'a' | 'b' | 'c' = opts.missing ? (ctx.rng() < 0.5 ? 'b' : 'a') : 'c'
  const answer = blank === 'a' ? a : blank === 'b' ? b : c
  const word = op === '+' ? 'plus' : 'take away'
  const say = (x: number, k: 'a' | 'b' | 'c') => (k === blank ? 'what' : String(x))
  const isStory = ctx.rep === 'concrete' && !opts.missing
  const prompt = isStory ? story(ctx.rng, op, a, b, o) : `${say(a, 'a')} ${word} ${say(b, 'b')} equals ${say(c, 'c')}?`
  return {
    kind: 'equation', rep: ctx.rep, a, op, b, c, blank, object: o.slug, answer, prompt,
    style: opts.missing ? 'missing' : isStory ? 'story' : 'equation',
    choices: numberChoices(ctx.rng, answer, 4, 0, Math.max(maxSum, answer + 2)),
  }
}

const SHAPES_BY_LEVEL: ShapeName[][] = [
  ['circle', 'square', 'triangle'],
  ['circle', 'square', 'triangle', 'rectangle', 'star'],
  ['circle', 'square', 'triangle', 'rectangle', 'star', 'heart', 'hexagon', 'oval'],
]
export const SHAPE_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899']

export function shape(ctx: GenContext): Problem {
  const pool = lvl(ctx.difficulty, SHAPES_BY_LEVEL)
  const n = lvl(ctx.difficulty, [3, 3, 4])
  const shapes = shuffle(ctx.rng, pool).slice(0, n)
  const answer = int(ctx.rng, 0, n - 1)
  // Same colour at level 0 would make it a colour game; vary colours from level 1.
  const options = shapes.map((s) => ({ shape: s, color: ctx.difficulty === 0 ? '#3b82f6' : pick(ctx.rng, SHAPE_COLORS) }))
  return { kind: 'shape', rep: ctx.rep, target: shapes[answer], options, answer, prompt: `Find the ${shapes[answer]}!` }
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

export { objectBySlug }
export * from './patterns'
export * from './variety'
