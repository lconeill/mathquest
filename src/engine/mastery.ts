import type { Rep, Skill } from '@/curriculum/types'

export interface SkillState {
  profileId: number
  skillId: string
  /** 0–1 exponentially-weighted mastery estimate. */
  mastery: number
  attempts: number
  correct: number
  streak: number
  missStreak: number
  difficulty: number
  mastered: boolean
  masteredAt?: number
  /** Spaced review: index into REVIEW_DAYS. */
  reviewLevel: number
  nextReview?: number
  lastSeen?: number
  /** Parent unlocked it manually, or placement assumed it. */
  unlocked?: boolean
}

export interface AttemptResult {
  correct: boolean
  /** Number of hints shown before answering (0 = first try). */
  hints: number
  ms: number
  /** Was this a scheduled spaced-review item? */
  review?: boolean
}

export const ALPHA = 0.25
export const MASTERY_THRESHOLD = 0.85
export const MIN_ATTEMPTS = 8
export const NEEDS_PRACTICE = 0.65
export const REVIEW_DAYS = [1, 3, 7, 21, 60]
const DAY = 24 * 60 * 60 * 1000
/** Answers slower than this get slightly less credit (still counted as correct). */
const SLOW_MS = 20_000

export function newState(profileId: number, skillId: string): SkillState {
  return { profileId, skillId, mastery: 0, attempts: 0, correct: 0, streak: 0, missStreak: 0, difficulty: 0, mastered: false, reviewLevel: 0 }
}

/** Credit for one attempt: first-try fast = 1, with hints less, wrong = 0. */
export function score(r: AttemptResult): number {
  if (!r.correct) return 0
  const hintFactor = [1, 0.6, 0.35][Math.min(r.hints, 2)]
  const speed = r.ms > SLOW_MS ? 0.9 : 1
  return hintFactor * speed
}

export function update(s: SkillState, r: AttemptResult, skill: Pick<Skill, 'maxDifficulty'>, now = Date.now()): SkillState {
  const n: SkillState = { ...s, attempts: s.attempts + 1, lastSeen: now }
  const sc = score(r)
  n.mastery = s.mastery * (1 - ALPHA) + sc * ALPHA
  const firstTry = r.correct && r.hints === 0
  if (r.correct) n.correct = s.correct + 1

  // Adaptive difficulty within the skill.
  if (firstTry) {
    n.streak = s.streak + 1
    n.missStreak = 0
    if (n.streak >= 3 && n.difficulty < skill.maxDifficulty) { n.difficulty++; n.streak = 0 }
  } else {
    n.streak = 0
    n.missStreak = r.correct ? 0 : s.missStreak + 1
    if (n.missStreak >= 2 && n.difficulty > 0) { n.difficulty--; n.missStreak = 0 }
  }

  if (!s.mastered) {
    if (n.mastery >= MASTERY_THRESHOLD && n.attempts >= MIN_ATTEMPTS) {
      n.mastered = true
      n.masteredAt = now
      n.reviewLevel = 0
      n.nextReview = now + REVIEW_DAYS[0] * DAY
    }
  } else if (r.review) {
    if (firstTry) n.reviewLevel = Math.min(s.reviewLevel + 1, REVIEW_DAYS.length - 1)
    else { n.reviewLevel = Math.max(0, s.reviewLevel - 1); n.mastery = Math.max(0, n.mastery - 0.15) }
    n.nextReview = now + REVIEW_DAYS[n.reviewLevel] * DAY
  }
  return n
}

/** Mastered skills stay mastered (so dependents stay unlocked) but can slip into "needs practice". */
export const needsPractice = (s: SkillState) => s.mastered && s.mastery < NEEDS_PRACTICE

/** Concrete → pictorial → abstract as mastery grows. */
export function repFor(s: SkillState | undefined): Rep {
  const m = s?.mastery ?? 0
  if (m < 0.4) return 'concrete'
  if (m < 0.7) return 'pictorial'
  return 'abstract'
}

export type SkillStatus = 'locked' | 'open' | 'practice' | 'mastered'

export function isUnlocked(skill: Skill, states: Map<string, SkillState>): boolean {
  const own = states.get(skill.id)
  if (own?.unlocked || own?.mastered) return true
  return skill.prereqs.every((p) => states.get(p)?.mastered)
}

export function statusOf(skill: Skill, states: Map<string, SkillState>): SkillStatus {
  const s = states.get(skill.id)
  if (s?.mastered) return needsPractice(s) ? 'practice' : 'mastered'
  return isUnlocked(skill, states) ? 'open' : 'locked'
}

/** Starting a child above Kindergarten: treat earlier grades as already mastered. */
export function placementStates(profileId: number, startGrade: number, skills: Skill[], now = Date.now()): SkillState[] {
  return skills
    .filter((s) => s.grade < startGrade)
    .map((s) => ({
      ...newState(profileId, s.id),
      mastery: MASTERY_THRESHOLD, mastered: true, masteredAt: now, unlocked: true,
      difficulty: s.maxDifficulty, reviewLevel: 0, nextReview: now + DAY,
    }))
}
