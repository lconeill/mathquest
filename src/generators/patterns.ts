import type { ArtSlug } from '@/art/objects'
import { tokenKey, type GenContext, type Problem, type ShapeName, type Token } from '@/curriculum/types'
import { int, pick, shuffle, type Rng } from '@/lib/rng'

/**
 * Patterns: repeating units written as letters (AB, AAB, ABC, ABCD…) "spelled"
 * with different attributes — pictures, colours, shapes, size, turning — and
 * asked in different ways (next, missing, fill several, spot the mistake,
 * same-pattern match, find the repeating part, growing patterns).
 */

const ART: ArtSlug[] = ['apple', 'star', 'duck', 'flower', 'car', 'fish', 'balloon', 'cat', 'bee', 'cookie', 'frog',
  'ladybug', 'strawberry', 'rocket', 'turtle', 'butterfly', 'sun', 'moon', 'cupcake', 'penguin', 'owl', 'carrot']
const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6']
const SHAPES: ShapeName[] = ['circle', 'square', 'triangle', 'star', 'heart', 'hexagon']

export const UNITS_BY_LEVEL = [
  ['AB'],
  ['AB', 'AAB', 'ABB', 'AABB', 'ABC'],
  ['ABC', 'AABB', 'AABC', 'ABBC', 'ABCC', 'ABAC'],
  ['ABCD', 'ABCB', 'AABCC', 'ABBCD'],
]

type Attr = 'art' | 'color' | 'shape' | 'size' | 'turn'

const distinct = (unit: string) => new Set(unit).size

function attrsFor(level: number, letters: number): Attr[] {
  const pool: Attr[] = level === 0 ? ['art', 'color'] : level === 1 ? ['art', 'color', 'shape', 'size'] : ['art', 'color', 'shape', 'size', 'turn']
  return pool.filter((a) => (a === 'size' ? letters === 2 : a === 'turn' ? letters <= 4 : true))
}

/** `n` distinct tokens of one attribute, plus one extra of the same kind for distractors. */
function alphabet(rng: Rng, attr: Attr, n: number): Token[] {
  switch (attr) {
    case 'art': return shuffle(rng, ART).slice(0, n + 1).map((slug) => ({ t: 'art', slug }))
    case 'color': return shuffle(rng, COLORS).slice(0, n + 1).map((color) => ({ t: 'shape', shape: 'circle', color }))
    case 'shape': {
      const color = pick(rng, COLORS)
      const varyColor = rng() < 0.4
      const cols = shuffle(rng, COLORS)
      return shuffle(rng, SHAPES).slice(0, n + 1).map((shape, i) => ({ t: 'shape', shape, color: varyColor ? cols[i] : color }))
    }
    case 'size': {
      const [s1, s2] = shuffle(rng, ART)
      return [{ t: 'art', slug: s1, big: true }, { t: 'art', slug: s1, big: false }, { t: 'art', slug: s2, big: true }]
    }
    case 'turn': {
      const color = pick(rng, COLORS)
      const start = pick(rng, [0, 90, 180, 270])
      // n ≤ 4 rotations; the extra (5th) is a different colour so it is still a "wrong" choice.
      const toks: Token[] = [0, 90, 180, 270].slice(0, n).map((r) => ({ t: 'shape', shape: 'triangle', color, rot: (start + r) % 360 }))
      toks.push({ t: 'shape', shape: 'triangle', color: COLORS.find((c) => c !== color)!, rot: start })
      return toks
    }
  }
}

const spell = (unit: string, abc: Token[], len: number): Token[] =>
  Array.from({ length: len }, (_, i) => abc[unit.charCodeAt(i % unit.length) - 65])

/** Letters by first appearance, e.g. 🍎🍎🐟 → "AAB". Used to compare pattern structure. */
const shapeOf = (seq: Token[]) => {
  const seen = new Map<string, string>()
  return seq.map((x) => { const k = tokenKey(x); if (!seen.has(k)) seen.set(k, String.fromCharCode(65 + seen.size)); return seen.get(k) }).join('')
}

function pickUnit(rng: Rng, level: number): { unit: string; abc: Token[]; attr: Attr } {
  const unit = pick(rng, UNITS_BY_LEVEL[Math.min(level, UNITS_BY_LEVEL.length - 1)])
  const attr = pick(rng, attrsFor(level, distinct(unit)))
  return { unit, abc: alphabet(rng, attr, distinct(unit)), attr }
}

const PROMPT_ATTR: Partial<Record<Attr, string>> = { size: ' Look at the size!', turn: ' Watch how it turns!', color: ' Look at the colours!' }

/** The everyday pattern skill: next / missing / fill a few. */
export function pattern(ctx: GenContext): Problem {
  const { rng } = ctx
  const level = Math.min(ctx.difficulty, 2)
  const mode = ctx.difficulty === 0 ? pick(rng, ['next', 'next', 'missing'] as const) : pick(rng, ['next', 'missing', 'fill'] as const)
  return fillProblem(rng, level, mode)
}

function fillProblem(rng: Rng, level: number, mode: 'next' | 'missing' | 'fill'): Problem {
  const { unit, abc, attr } = pickUnit(rng, level)
  const U = unit.length
  // Every token in the unit, plus one look-alike distractor when there's room for it.
  const palette = (used: Token[]) => shuffle(rng, used.length >= 4 ? used : [...used, abc[abc.length - 1]])
  const extra = PROMPT_ATTR[attr] ?? ''
  if (mode === 'missing') {
    const len = Math.min(U * 3, 12)
    const full = spell(unit, abc, len)
    const hole = int(rng, 1, len - 2)
    const answers = [full[hole]]
    return {
      kind: 'pattern', style: `pattern-missing-${attr}`, rep: 'pictorial', unit: U, answers, answer: answers.map(tokenKey).join('|'),
      seq: full.map((x, i) => (i === hole ? null : x)), palette: palette(abc.slice(0, distinct(unit))),
      prompt: `Something is missing! What goes in the empty spot?${extra}`,
    }
  }
  const holes = mode === 'fill' ? Math.min(3, U) + (U === 2 ? 1 : 0) : 1
  const shown = Math.min(U * 2 + int(rng, 0, U - 1), 11 - holes)
  const full = spell(unit, abc, shown + holes)
  const answers = full.slice(shown)
  return {
    kind: 'pattern', style: `pattern-${mode}-${attr}`, rep: 'pictorial', unit: U, answers, answer: answers.map(tokenKey).join('|'),
    seq: [...full.slice(0, shown), ...Array<null>(holes).fill(null)], palette: palette(abc.slice(0, distinct(unit))),
    prompt: mode === 'fill' ? `Finish the pattern! Fill the ${holes} empty spots.${extra}` : `What comes next in the pattern?${extra}`,
  }
}

/** Harder puzzles once the basics are easy. */
export function patternPuzzle(ctx: GenContext): Problem {
  const { rng } = ctx
  const level = Math.min(ctx.difficulty + 1, 3)
  const mode = pick(rng, ['fix', 'match', 'core', 'grow', 'fill'] as const)
  switch (mode) {
    case 'fill': return fillProblem(rng, level, 'fill')
    case 'grow': return growing(ctx)
    case 'fix': return fixProblem(rng, level)
    case 'match': return matchProblem(rng, level)
    case 'core': return coreProblem(rng, level)
  }
}

function growing(ctx: GenContext): Problem {
  const { rng } = ctx
  const step = ctx.difficulty >= 2 ? 2 : 1
  const start = ctx.difficulty === 0 ? 1 : int(rng, 1, step === 2 ? 2 : 3)
  const len = ctx.difficulty === 0 ? 3 : 4
  const slug = pick(rng, ART)
  const ns = Array.from({ length: len + 1 }, (_, i) => start + i * step)
  const stack = (n: number): Token => ({ t: 'stack', slug, n })
  const next = ns[len]
  const opts = [...new Set([next, ns[len - 1], next + step, next + 1])].slice(0, 3)
  return {
    kind: 'pattern', style: 'pattern-grow', rep: 'pictorial', unit: 'grow', answers: [stack(next)], answer: tokenKey(stack(next)),
    seq: [...ns.slice(0, len).map(stack), null], palette: shuffle(rng, opts.map(stack)),
    prompt: 'This pattern grows! What comes next?',
  }
}

const periodic = (keys: string[]) => {
  for (let p = 1; p <= Math.floor(keys.length / 2); p++) if (keys.every((k, i) => k === keys[i % p])) return true
  return false
}

/** Every index where changing just that one item makes the row a repeating pattern. */
export function singleFixes(seq: Token[]): Set<number> {
  const keys = seq.map(tokenKey)
  const alphabet = [...new Set(keys)]
  const out = new Set<number>()
  keys.forEach((k, i) => {
    for (const a of alphabet) if (a !== k && periodic(keys.map((x, j) => (j === i ? a : x)))) out.add(i)
  })
  return out
}

function fixProblem(rng: Rng, level: number): Problem {
  for (let guard = 0; guard < 50; guard++) {
    const { unit, abc, attr } = pickUnit(rng, level)
    const U = unit.length
    const len = Math.min(U * 3, 12)
    const seq = spell(unit, abc, len)
    const m = int(rng, U, len - 1)
    const wrong = shuffle(rng, abc.slice(0, distinct(unit))).find((x) => tokenKey(x) !== tokenKey(seq[m]))!
    seq[m] = wrong
    const fixes = singleFixes(seq)
    if (fixes.size === 1 && fixes.has(m)) {
      return { kind: 'patternfix', style: `patternfix-${attr}`, rep: 'pictorial', seq, unit: U, answer: m, prompt: 'Oops! One does not belong. Tap the mistake!' }
    }
  }
  return fillProblem(rng, level, 'next')
}

function matchProblem(rng: Rng, level: number): Problem {
  const { unit, abc, attr } = pickUnit(rng, level)
  const len = Math.min(unit.length * 2 + 1, 9)
  const seq = spell(unit, abc, len)
  const target = shapeOf(seq)
  // Options use a different look so the child matches structure, not pictures.
  const otherAttr = pick(rng, (['art', 'color', 'shape'] as Attr[]).filter((a) => a !== attr))
  const pool = shuffle(rng, [...new Set(UNITS_BY_LEVEL.flat())])
  const rows: Token[][] = [spell(unit, alphabet(rng, otherAttr, distinct(unit)), len)]
  for (const u of pool) {
    if (rows.length >= 3) break
    const row = spell(u, alphabet(rng, otherAttr, distinct(u)), len)
    if (!rows.some((r) => shapeOf(r) === shapeOf(row)) && shapeOf(row) !== target) rows.push(row)
  }
  const order = shuffle(rng, [0, 1, 2])
  return {
    kind: 'patternpick', ask: 'match', style: 'patternpick-match', rep: 'pictorial', seq,
    options: order.map((i) => rows[i]), answer: order.indexOf(0),
    prompt: 'Which row has the same pattern?',
  }
}

function coreProblem(rng: Rng, level: number): Problem {
  const { unit, abc, attr } = pickUnit(rng, level)
  const U = unit.length
  const seq = spell(unit, abc, Math.min(U * 3, 12))
  const core = seq.slice(0, U)
  // Wrong answers never repeat to make the row: too long, too short, or one item changed.
  const cands = [seq.slice(0, U + 1), seq.slice(0, U - 1), [...core.slice(0, -1), abc[abc.length - 1]]]
  const rows = [core]
  for (const c of shuffle(rng, cands)) {
    if (rows.length >= 3) break
    if (!rows.some((r) => r.map(tokenKey).join() === c.map(tokenKey).join())) rows.push(c)
  }
  const order = shuffle(rng, rows.map((_, i) => i))
  return {
    kind: 'patternpick', ask: 'core', style: `patternpick-core-${attr}`, rep: 'pictorial', seq,
    options: order.map((i) => rows[i]), answer: order.indexOf(0),
    prompt: 'Which part repeats over and over?',
  }
}
