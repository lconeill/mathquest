import type { Skill } from '@/curriculum/types'
import { shuffle, type Rng } from '@/lib/rng'
import { isUnlocked, needsPractice, type SkillState } from './mastery'

export type SlotKind = 'focus' | 'review' | 'stretch'
export interface Slot { skillId: string; kind: SlotKind }

export const SESSION_LENGTH = 12

/** Skills the child is currently learning: unlocked and not yet mastered (or slipping). */
export function frontier(skills: Skill[], states: Map<string, SkillState>): Skill[] {
  return skills.filter((s) => {
    const st = states.get(s.id)
    if (st?.mastered) return needsPractice(st)
    return isUnlocked(s, states)
  })
}

/** Mastered skills whose spaced review is due, most overdue first. */
export function dueReviews(skills: Skill[], states: Map<string, SkillState>, now: number): Skill[] {
  return skills
    .filter((s) => {
      const st = states.get(s.id)
      return st?.mastered && !needsPractice(st) && (st.nextReview ?? 0) <= now
    })
    .sort((a, b) => (states.get(a.id)!.nextReview ?? 0) - (states.get(b.id)!.nextReview ?? 0))
}

/** Locked skills that are one step away: every prereq is unlocked and at least one is close to mastery. */
export function stretchCandidates(skills: Skill[], states: Map<string, SkillState>): Skill[] {
  return skills.filter((s) => {
    if (isUnlocked(s, states) || s.prereqs.length === 0) return false
    const prereqSkills = s.prereqs.map((p) => skills.find((x) => x.id === p)).filter((x): x is Skill => !!x)
    return prereqSkills.every((p) => isUnlocked(p, states)) && s.prereqs.some((p) => (states.get(p)?.mastery ?? 0) >= 0.6)
  })
}

/**
 * Plan a session: ~70% focus (at most 2 frontier skills, in curriculum order),
 * ~20% spaced review, ~10% stretch. Problems themselves are generated lazily so
 * difficulty can adapt mid-session.
 */
export function planSession(
  skills: Skill[],
  states: Map<string, SkillState>,
  now: number,
  rng: Rng,
  opts: { length?: number; onlySkill?: string } = {},
): Slot[] {
  const length = opts.length ?? SESSION_LENGTH
  if (opts.onlySkill) return Array.from({ length }, () => ({ skillId: opts.onlySkill!, kind: 'focus' as const }))

  const focus = frontier(skills, states).slice(0, 2)
  const reviews = dueReviews(skills, states, now)
  const stretch = stretchCandidates(skills, states)
  const mastered = skills.filter((s) => states.get(s.id)?.mastered)

  let nReview = Math.min(reviews.length * 2, Math.round(length * 0.2))
  let nStretch = stretch.length ? Math.max(1, Math.round(length * 0.1)) : 0
  if (!focus.length) {
    // Nothing new to learn: everything is review (or the whole tree is mastered).
    const pool = reviews.length ? reviews : mastered
    if (!pool.length) return []
    return Array.from({ length }, (_, i) => ({ skillId: pool[i % pool.length].id, kind: 'review' as const }))
  }
  const nFocus = length - nReview - nStretch

  const focusSlots: Slot[] = Array.from({ length: nFocus }, (_, i) => ({
    // First focus skill gets ~2/3 of focus time.
    skillId: focus.length > 1 && i % 3 === 2 ? focus[1].id : focus[0].id,
    kind: 'focus',
  }))
  const reviewSlots: Slot[] = Array.from({ length: nReview }, (_, i) => ({ skillId: reviews[i % reviews.length].id, kind: 'review' }))
  const stretchSlots: Slot[] = shuffle(rng, stretch).slice(0, nStretch).map((s) => ({ skillId: s.id, kind: 'stretch' }))
  nReview = reviewSlots.length
  nStretch = stretchSlots.length

  // Warm up with an easy review, keep stretch away from the very start, end on a focus item.
  const middle = shuffle(rng, [...focusSlots.slice(1, -1), ...reviewSlots.slice(1), ...stretchSlots])
  const first = reviewSlots[0] ?? focusSlots[0]
  const rest = reviewSlots[0] ? [focusSlots[0], ...middle] : middle
  return [first, ...rest, focusSlots[focusSlots.length - 1]].filter(Boolean).slice(0, length)
}
