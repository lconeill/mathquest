import { describe, expect, it } from 'vitest'
import { SKILLS } from '@/curriculum/skills'
import { tokenKey, type Problem, type Rep, type Token } from '@/curriculum/types'
import { singleFixes } from '@/generators/patterns'
import { TOPICS } from '@/curriculum/topics'
import { makeRng } from '@/lib/rng'

/** Independently re-derive the right answer from the problem's visible data. */
function solve(p: Problem): unknown {
  switch (p.kind) {
    case 'count': case 'subitize': return p.n
    case 'tenframe': return p.mode === 'build' ? p.target : 10 - p.filled
    case 'compare': return p.a === p.b ? 'same' : (p.ask === 'more') === p.a > p.b ? 'left' : 'right'
    case 'bond': return p.whole - p.part
    case 'equation': {
      const ok = p.op === '+' ? p.a + p.b === p.c : p.a - p.b === p.c
      if (!ok) throw new Error(`bad equation ${p.a}${p.op}${p.b}=${p.c}`)
      return p[p.blank]
    }
    case 'sequence': {
      const i = p.numbers.indexOf(null)
      const known = p.numbers.findIndex((n) => n !== null)
      return (p.numbers[known] as number) + (i - known) * p.step
    }
    case 'shape': return p.answer
    case 'pattern': {
      const holes = p.seq.map((x, i) => (x === null ? i : -1)).filter((i) => i >= 0)
      if (p.unit === 'grow') {
        const ns = p.seq.filter((x) => x !== null).map((x) => (x as Extract<Token, { t: 'stack' }>).n)
        const step = ns[1] - ns[0]
        ns.forEach((n, i) => expect(n).toBe(ns[0] + i * step))
        return holes.map((h) => tokenKey({ ...(p.seq[0] as Token), n: ns[0] + h * step } as Token)).join('|')
      }
      const U = p.unit
      const known = (i: number) => p.seq.find((x, j) => x !== null && j % U === i % U)!
      p.seq.forEach((x, i) => { if (x) expect(tokenKey(x)).toBe(tokenKey(known(i))) })
      return holes.map((h) => tokenKey(known(h))).join('|')
    }
    case 'patternfix': {
      const fixes = singleFixes(p.seq)
      expect(fixes.size).toBe(1)
      return [...fixes][0]
    }
    case 'patternpick': {
      const shapeOf = (row: Token[]) => { const m = new Map<string, number>(); return row.map((x) => { const k = tokenKey(x); if (!m.has(k)) m.set(k, m.size); return m.get(k) }).join() }
      const hits = p.options.map((row, i) => [row, i] as const).filter(([row]) => p.ask === 'match'
        ? shapeOf(row) === shapeOf(p.seq)
        : p.seq.every((x, i) => tokenKey(x) === tokenKey(row[i % row.length])) && row.length < p.seq.length)
      expect(hits).toHaveLength(1)
      return hits[0][1]
    }
    case 'hide': return p.total - p.shown
    case 'act': case 'domino': return p.kind === 'domino' || p.op === '+' ? p.a + p.b : p.a - p.b
    case 'truefalse': return (p.op === '+' ? p.a + p.b : p.a - p.b) === p.shown ? 'yes' : 'no'
    case 'matcheq': {
      const right = p.choices.filter((c) => c === `${p.a} ${p.op === '+' ? '+' : '−'} ${p.b}`)
      expect(right).toHaveLength(1)
      // No other choice may also describe the picture (e.g. the swapped sum).
      if (p.a !== p.b) expect(p.choices).not.toContain(`${p.b} + ${p.a}`)
      return right[0]
    }
    case 'pairs': {
      let found = false
      p.cards.forEach((x, i) => p.cards.forEach((y, j) => { if (i < j && x + y === p.target) found = true }))
      expect(found).toBe(true)
      return p.target
    }
    case 'chart': {
      expect(p.start).toBeGreaterThanOrEqual(1); expect(p.start).toBeLessThanOrEqual(100)
      expect(p.start + p.delta).toBeGreaterThanOrEqual(1); expect(p.start + p.delta).toBeLessThanOrEqual(100)
      return p.start + p.delta
    }
    case 'numberline': return p.start + p.delta
    case 'placevalue': return p.tens * 10 + p.ones
  }
}

const REPS: Rep[] = ['concrete', 'pictorial', 'abstract']

describe('every skill generator', () => {
  for (const skill of SKILLS) {
    it(`${skill.id}: answers are correct, in range, and among the choices`, () => {
      const rng = makeRng(skill.id.length * 7919)
      for (let d = 0; d <= skill.maxDifficulty; d++) {
        for (const rep of REPS) {
          for (let i = 0; i < 150; i++) {
            const p = skill.generate({ difficulty: d, rep, rng })
            expect(solve(p)).toEqual(p.answer)
            expect(p.prompt.length).toBeGreaterThan(5)
            if ('choices' in p) {
              expect(p.choices).toContain(p.answer)
              expect(new Set(p.choices as unknown[]).size).toBe(p.choices.length)
              expect(p.choices.length).toBeGreaterThanOrEqual(2)
            }
            if (p.kind === 'equation') {
              for (const x of [p.a, p.b, p.c]) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(100) }
              for (const x of p.choices) expect(x).toBeGreaterThanOrEqual(0)
            }
            if (p.kind === 'numberline') { expect(p.answer).toBeGreaterThanOrEqual(p.min); expect(p.answer).toBeLessThanOrEqual(p.max) }
            if (p.kind === 'count' || p.kind === 'subitize') expect(p.n).toBeGreaterThanOrEqual(1)
            if (p.kind === 'tenframe' && p.mode === 'build') expect(p.target).toBeLessThanOrEqual(p.frames * 10)
            if (p.kind === 'sequence') {
              expect(p.numbers.filter((n) => n === null)).toHaveLength(1)
              expect(p.answer).toBeGreaterThan(0)
              expect(p.answer).toBeLessThanOrEqual(100)
            }
            if (p.kind === 'compare' && !p.allowSame) expect(p.a).not.toBe(p.b)
            if (p.kind === 'pattern') for (const a of p.answers) expect(p.palette.map(tokenKey)).toContain(tokenKey(a))
            if (p.kind === 'pattern' || p.kind === 'patternfix' || p.kind === 'patternpick') expect(p.seq.length).toBeLessThanOrEqual(12)
            if (p.kind === 'patternpick') expect(new Set(p.options.map((r) => r.map(tokenKey).join())).size).toBe(p.options.length)
            if (p.kind === 'shape') expect(p.options[p.answer].shape).toBe(p.target)
          }
        }
      }
    })
  }
})

describe('skill graph', () => {
  const ids = new Set(SKILLS.map((s) => s.id))
  it('has unique ids', () => expect(ids.size).toBe(SKILLS.length))
  it('only references existing prerequisites that come earlier', () => {
    SKILLS.forEach((s, i) => s.prereqs.forEach((p) => {
      expect(ids.has(p)).toBe(true)
      expect(SKILLS.findIndex((x) => x.id === p)).toBeLessThan(i)
    }))
  })
  it('has at least one starting skill', () => expect(SKILLS.some((s) => s.prereqs.length === 0)).toBe(true))
})

describe('early add/subtract', () => {
  it('never uses zero below the top difficulty level', () => {
    const rng = makeRng(42)
    for (const id of ['k.add5', 'k.sub5', 'k.add10', 'k.sub10']) {
      const skill = SKILLS.find((s) => s.id === id)!
      for (let d = 0; d < 2; d++) for (let i = 0; i < 300; i++) {
        const p = skill.generate({ difficulty: d, rep: 'concrete', rng })
        const nums = p.kind === 'equation' ? [p.a, p.b, p.c] : p.kind === 'act' ? [p.a, p.b, p.answer] : p.kind === 'hide' ? [p.shown, p.answer]
          : p.kind === 'domino' || p.kind === 'matcheq' ? [p.a, p.b] : [1]
        expect(Math.min(...nums)).toBeGreaterThan(0)
      }
    }
  })
})

describe('variety', () => {
  it('add/subtract skills use many different formats', () => {
    const rng = makeRng(7)
    for (const id of ['k.add10', 'k.sub10']) {
      const skill = SKILLS.find((s) => s.id === id)!
      for (const rep of REPS) {
        const kinds = new Set(Array.from({ length: 200 }, () => skill.generate({ difficulty: 1, rep, rng }).kind))
        expect(kinds.size, `${id} ${rep}`).toBeGreaterThanOrEqual(4)
      }
    }
  })
  it('patterns vary in structure, look and question', () => {
    const rng = makeRng(9)
    const skill = SKILLS.find((s) => s.id === 'k.patterns2')!
    const styles = new Set(Array.from({ length: 300 }, () => skill.generate({ difficulty: 1, rep: 'pictorial', rng }).style))
    expect(styles.size).toBeGreaterThanOrEqual(8)
  })
  it('topics only reference real skills', () => {
    const ids = new Set(SKILLS.map((s) => s.id))
    for (const t of TOPICS) for (const id of t.skills) expect(ids.has(id), `${t.id}: ${id}`).toBe(true)
  })
})
