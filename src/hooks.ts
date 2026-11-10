import { useLiveQuery } from 'dexie-react-hooks'
import { useParams } from 'react-router-dom'
import { db } from './db'
import type { SkillState } from './engine/mastery'

export function useProfileId(): number {
  return Number(useParams().id)
}

export function useProfile(id: number) {
  return useLiveQuery(() => db.profiles.get(id), [id])
}

export function useSkillStates(id: number): Map<string, SkillState> | undefined {
  const rows = useLiveQuery(() => db.skillStates.where('profileId').equals(id).toArray(), [id])
  return rows && new Map(rows.map((r) => [r.skillId, r]))
}
