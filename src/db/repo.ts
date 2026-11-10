import { SKILLS, skillById } from '@/curriculum/skills'
import { newState, placementStates, update, type AttemptResult, type SkillState } from '@/engine/mastery'
import type { SlotKind } from '@/engine/scheduler'
import { ALL_STICKERS } from '@/art/objects'
import { db, type MathDB, type Profile } from './index'

export async function loadStates(profileId: number, d: MathDB = db): Promise<Map<string, SkillState>> {
  const rows = await d.skillStates.where('profileId').equals(profileId).toArray()
  return new Map(rows.map((r) => [r.skillId, r]))
}

export async function createProfile(p: Omit<Profile, 'id' | 'createdAt' | 'stars'>, d: MathDB = db): Promise<number> {
  return d.transaction('rw', d.profiles, d.skillStates, async () => {
    const id = (await d.profiles.add({ ...p, createdAt: Date.now(), stars: 0 })) as number
    await d.skillStates.bulkPut(placementStates(id, p.startGrade, SKILLS))
    return id
  })
}

export async function deleteProfile(id: number, d: MathDB = db) {
  await d.transaction('rw', [d.profiles, d.skillStates, d.attempts, d.sessions, d.stickers], async () => {
    await d.profiles.delete(id)
    await d.skillStates.where('profileId').equals(id).delete()
    await d.attempts.where('profileId').equals(id).delete()
    await d.sessions.where('profileId').equals(id).delete()
    await d.stickers.where('profileId').equals(id).delete()
  })
}

/** Record an answer; returns the new state and whether this answer mastered the skill. */
export async function recordAttempt(profileId: number, skillId: string, r: AttemptResult & { kind: SlotKind }, d: MathDB = db) {
  return d.transaction('rw', d.skillStates, d.attempts, async () => {
    const prev = (await d.skillStates.get([profileId, skillId])) ?? newState(profileId, skillId)
    const next = update(prev, { ...r, review: r.kind === 'review' }, skillById(skillId))
    await d.skillStates.put(next)
    await d.attempts.add({ profileId, skillId, correct: r.correct, hints: r.hints, ms: r.ms, at: Date.now(), kind: r.kind })
    return { state: next, justMastered: !prev.mastered && next.mastered }
  })
}

export async function setUnlocked(profileId: number, skillId: string, unlocked: boolean, d: MathDB = db) {
  const s = (await d.skillStates.get([profileId, skillId])) ?? newState(profileId, skillId)
  await d.skillStates.put({ ...s, unlocked })
}

export async function resetSkill(profileId: number, skillId: string, d: MathDB = db) {
  await d.skillStates.put(newState(profileId, skillId))
}

/** Award a random sticker the child doesn't have yet (or null when the book is full). */
export async function awardSticker(profileId: number, rng = Math.random, d: MathDB = db): Promise<string | null> {
  const owned = new Set((await d.stickers.where('profileId').equals(profileId).toArray()).map((s) => s.slug))
  const left = ALL_STICKERS.filter((s) => !owned.has(s))
  if (!left.length) return null
  const slug = left[Math.floor(rng() * left.length)]
  await d.stickers.add({ profileId, slug, at: Date.now() })
  return slug
}

/** Minutes played today, from session logs. */
export async function minutesToday(profileId: number, d: MathDB = db, now = Date.now()): Promise<number> {
  const start = new Date(now); start.setHours(0, 0, 0, 0)
  const rows = await d.sessions.where('profileId').equals(profileId).filter((s) => s.start >= start.getTime()).toArray()
  return rows.reduce((m, s) => m + (s.end - s.start) / 60000, 0)
}

// ---- Backup -----------------------------------------------------------------

export interface Backup { app: 'mathquest'; version: 1; exportedAt: number; tables: Record<string, unknown[]> }
const TABLES = ['profiles', 'skillStates', 'attempts', 'sessions', 'stickers', 'settings'] as const

export async function exportAll(d: MathDB = db): Promise<Backup> {
  const tables: Record<string, unknown[]> = {}
  for (const t of TABLES) tables[t] = await d.table(t).toArray()
  return { app: 'mathquest', version: 1, exportedAt: Date.now(), tables }
}

export async function importAll(b: Backup, d: MathDB = db) {
  if (b?.app !== 'mathquest' || b.version !== 1) throw new Error('This is not a Math Quest backup file.')
  await d.transaction('rw', TABLES.map((t) => d.table(t)), async () => {
    for (const t of TABLES) {
      await d.table(t).clear()
      await d.table(t).bulkAdd(b.tables[t] ?? [])
    }
  })
}
