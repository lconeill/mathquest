import { describe, expect, it } from 'vitest'
import { SKILLS } from '@/curriculum/skills'
import type { Problem, Rep } from '@/curriculum/types'
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
    case 'pattern': return p.answer
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
            if (p.kind === 'pattern') expect(p.choices).toContain(p.answer)
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
        if (p.kind !== 'equation') throw new Error('expected equation')
        expect(Math.min(p.a, p.b, p.c)).toBeGreaterThan(0)
      }
    }
  })
})
