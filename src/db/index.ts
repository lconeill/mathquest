import Dexie, { type EntityTable } from 'dexie'
import type { SkillState } from '@/engine/mastery'

export interface Profile {
  id?: number
  name: string
  avatar: string
  startGrade: number
  createdAt: number
  stars: number
}

export interface Attempt {
  id?: number
  profileId: number
  skillId: string
  correct: boolean
  hints: number
  ms: number
  at: number
  kind: 'focus' | 'review' | 'stretch'
}

export interface SessionLog {
  id?: number
  profileId: number
  start: number
  end: number
  problems: number
  firstTry: number
  stars: number
}

export interface Sticker {
  id?: number
  profileId: number
  slug: string
  at: number
}

export interface Settings {
  key: 'app'
  breakMinutes: number
  voiceURI?: string
  rate: number
  sound: boolean
  voiceChecked: boolean
}

export const DEFAULT_SETTINGS: Settings = { key: 'app', breakMinutes: 15, rate: 0.9, sound: true, voiceChecked: false }

export class MathDB extends Dexie {
  profiles!: EntityTable<Profile, 'id'>
  skillStates!: Dexie.Table<SkillState, [number, string]>
  attempts!: EntityTable<Attempt, 'id'>
  sessions!: EntityTable<SessionLog, 'id'>
  stickers!: EntityTable<Sticker, 'id'>
  settings!: Dexie.Table<Settings, string>

  constructor(name = 'mathquest') {
    super(name)
    this.version(1).stores({
      profiles: '++id, name',
      skillStates: '[profileId+skillId], profileId',
      attempts: '++id, profileId, [profileId+skillId], at',
      sessions: '++id, profileId, start',
      stickers: '++id, profileId, [profileId+slug]',
      settings: 'key',
    })
  }
}

export const db = new MathDB()

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await db.settings.get('app')) }
}
export async function saveSettings(patch: Partial<Settings>) {
  await db.settings.put({ ...(await getSettings()), ...patch, key: 'app' })
}
