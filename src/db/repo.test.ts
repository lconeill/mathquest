import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { ALL_STICKERS } from '@/art/objects'
import { MathDB } from './index'
import { awardSticker, createProfile, deleteProfile, exportAll, importAll, loadStates, recordAttempt } from './repo'

let d: MathDB
beforeEach(async () => { d = new MathDB(`t${Math.random()}`); await d.open() })

describe('repo', () => {
  it('creates a grade-1 profile with Kindergarten placed as mastered', async () => {
    const id = await createProfile({ name: 'Ava', avatar: 'lion', startGrade: 1 }, d)
    const states = await loadStates(id, d)
    expect(states.get('k.count5')?.mastered).toBe(true)
    expect(states.has('g1.add20')).toBe(false)
  })
  it('records attempts and reports the moment of mastery', async () => {
    const id = await createProfile({ name: 'Ben', avatar: 'fox', startGrade: 0 }, d)
    let mastered = 0
    for (let i = 0; i < 12; i++) {
      const r = await recordAttempt(id, 'k.count5', { correct: true, hints: 0, ms: 2000, kind: 'focus' }, d)
      if (r.justMastered) mastered++
    }
    expect(mastered).toBe(1)
    expect(await d.attempts.count()).toBe(12)
  })
  it('awards unique stickers until the book is full', async () => {
    const seen = new Set<string>()
    for (let i = 0; i < ALL_STICKERS.length; i++) seen.add((await awardSticker(1, Math.random, d))!)
    expect(seen.size).toBe(new Set(ALL_STICKERS).size)
    expect(await awardSticker(1, Math.random, d)).toBeNull()
  })
  it('round-trips a backup and deletes profiles cleanly', async () => {
    const id = await createProfile({ name: 'Cy', avatar: 'panda', startGrade: 0 }, d)
    await recordAttempt(id, 'k.count5', { correct: true, hints: 0, ms: 2000, kind: 'focus' }, d)
    const b = await exportAll(d)
    await deleteProfile(id, d)
    expect(await d.profiles.count()).toBe(0)
    expect(await d.attempts.count()).toBe(0)
    await importAll(JSON.parse(JSON.stringify(b)), d)
    expect(await d.profiles.count()).toBe(1)
    expect((await loadStates(id, d)).get('k.count5')?.attempts).toBe(1)
  })
})
