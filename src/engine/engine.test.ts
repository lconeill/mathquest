import { describe, expect, it } from 'vitest'
import { SKILLS } from '@/curriculum/skills'
import { makeRng } from '@/lib/rng'
import { MASTERY_THRESHOLD, MIN_ATTEMPTS, isUnlocked, newState, placementStates, repFor, statusOf, update, type SkillState } from './mastery'
import { dueReviews, frontier, planSession } from './scheduler'

const skill = { maxDifficulty: 2 }
const right = { correct: true, hints: 0, ms: 3000 }
const wrong = { correct: false, hints: 2, ms: 9000 }
const repeat = (s: SkillState, r: typeof right, n: number, now = 0) => { for (let i = 0; i < n; i++) s = update(s, r, skill, now); return s }

describe('mastery update', () => {
  it('needs MIN_ATTEMPTS before mastering, even with perfect answers', () => {
    const s = repeat(newState(1, 'x'), right, MIN_ATTEMPTS - 1)
    expect(s.mastery).toBeGreaterThan(0.8)
    expect(s.mastered).toBe(false)
    expect(update(s, right, skill).mastered).toBe(true)
  })
  it('hints give less credit than first-try answers', () => {
    const a = update(newState(1, 'x'), right, skill)
    const b = update(newState(1, 'x'), { correct: true, hints: 1, ms: 3000 }, skill)
    expect(b.mastery).toBeLessThan(a.mastery)
    expect(b.mastery).toBeGreaterThan(0)
  })
  it('raises difficulty after a streak of 3 and lowers it after 2 misses', () => {
    let s = repeat(newState(1, 'x'), right, 3)
    expect(s.difficulty).toBe(1)
    s = repeat(s, wrong, 2)
    expect(s.difficulty).toBe(0)
  })
  it('never exceeds maxDifficulty', () => expect(repeat(newState(1, 'x'), right, 30).difficulty).toBe(2))
  it('schedules spaced review and expands the interval on success', () => {
    const DAY = 86400000
    let s = repeat(newState(1, 'x'), right, 10, 0)
    expect(s.mastered).toBe(true)
    expect(s.nextReview).toBe(s.masteredAt! + DAY)
    s = update(s, { ...right, review: true }, skill, 2 * DAY)
    expect(s.reviewLevel).toBe(1)
    expect(s.nextReview).toBe(2 * DAY + 3 * DAY)
    const failed = update(s, { ...wrong, review: true }, skill, 6 * DAY)
    expect(failed.reviewLevel).toBe(0)
    expect(failed.mastery).toBeLessThan(s.mastery)
    expect(failed.mastered).toBe(true) // stays unlocked for dependents
  })
  it('moves from concrete to abstract as mastery grows', () => {
    expect(repFor(undefined)).toBe('concrete')
    expect(repFor({ ...newState(1, 'x'), mastery: 0.5 })).toBe('pictorial')
    expect(repFor({ ...newState(1, 'x'), mastery: 0.9 })).toBe('abstract')
  })
})

describe('unlocking', () => {
  const states = new Map<string, SkillState>()
  const by = (id: string) => SKILLS.find((s) => s.id === id)!
  it('starts with root skills open and others locked', () => {
    expect(isUnlocked(by('k.count5'), states)).toBe(true)
    expect(statusOf(by('k.count10'), states)).toBe('locked')
  })
  it('unlocks a skill once all prerequisites are mastered', () => {
    const m = new Map(states)
    m.set('k.count5', { ...newState(1, 'k.count5'), mastered: true, mastery: 0.9 })
    expect(isUnlocked(by('k.count10'), m)).toBe(true)
    expect(isUnlocked(by('k.count20'), m)).toBe(false)
  })
  it('placement at grade 1 masters every Kindergarten skill', () => {
    const p = placementStates(1, 1, SKILLS)
    expect(p.length).toBe(SKILLS.filter((s) => s.grade === 0).length)
    const m = new Map(p.map((s) => [s.skillId, s]))
    expect(isUnlocked(by('g1.add20'), m)).toBe(true)
    expect(p.every((s) => s.mastery >= MASTERY_THRESHOLD)).toBe(true)
  })
})

describe('session planning', () => {
  it('a brand-new child gets only starting skills (plus a stretch at most)', () => {
    const plan = planSession(SKILLS, new Map(), 0, makeRng(1))
    expect(plan).toHaveLength(12)
    const focus = plan.filter((s) => s.kind === 'focus').map((s) => s.skillId)
    expect(new Set(focus)).toEqual(new Set(frontier(SKILLS, new Map()).slice(0, 2).map((s) => s.id)))
  })
  it('mixes in due reviews and stretch items', () => {
    const states = new Map<string, SkillState>()
    states.set('k.count5', { ...newState(1, 'k.count5'), mastered: true, mastery: 0.9, nextReview: 10 })
    states.set('k.count10', { ...newState(1, 'k.count10'), mastery: 0.7, attempts: 5 })
    const plan = planSession(SKILLS, states, 100, makeRng(2))
    expect(plan).toHaveLength(12)
    expect(plan[0]).toEqual({ skillId: 'k.count5', kind: 'review' })
    expect(plan.filter((s) => s.kind === 'review').length).toBeGreaterThanOrEqual(1)
    expect(plan.some((s) => s.kind === 'stretch')).toBe(true)
    expect(plan.filter((s) => s.kind === 'focus').length).toBeGreaterThanOrEqual(8)
    expect(dueReviews(SKILLS, states, 100).map((s) => s.id)).toEqual(['k.count5'])
  })
  it('practising a single skill only uses that skill', () => {
    const plan = planSession(SKILLS, new Map(), 0, makeRng(3), { onlySkill: 'k.shapes', length: 5 })
    expect(plan.every((s) => s.skillId === 'k.shapes')).toBe(true)
  })
  it('an all-mastered tree yields a review session', () => {
    const m = new Map(placementStates(1, 9, SKILLS, 0).map((s) => [s.skillId, s]))
    const plan = planSession(SKILLS, m, 10 ** 12, makeRng(4))
    expect(plan.length).toBe(12)
    expect(plan.every((s) => s.kind === 'review')).toBe(true)
  })
})
