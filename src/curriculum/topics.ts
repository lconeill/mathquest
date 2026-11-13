import type { ArtSlug } from '@/art/objects'
import { isUnlocked, type SkillState } from '@/engine/mastery'
import type { Grade } from './types'
import { skillById } from './skills'

/**
 * Practice topics: a grown-up (or child) can pick one kind of maths and get a
 * whole session of just that, rotating through its skills and formats.
 */
export interface Topic { id: string; title: string; icon: ArtSlug; grade: Grade; skills: string[] }

export const TOPICS: Topic[] = [
  { id: 'patterns', title: 'Patterns', icon: 'flower', grade: 0, skills: ['k.patterns', 'k.patterns2'] },
  { id: 'addsub10', title: '+ and − to 10', icon: 'cupcake', grade: 0, skills: ['k.add5', 'k.sub5', 'k.make10', 'k.add10', 'k.sub10'] },
  { id: 'tens', title: 'Tens: +10 −10', icon: 'rocket', grade: 0, skills: ['k.tens100', 'k.teens', 'g1.tens100'] },
  { id: 'counting', title: 'Counting', icon: 'duck', grade: 0, skills: ['k.count5', 'k.subitize5', 'k.count10', 'k.compare10', 'k.next20', 'k.count20'] },
  { id: 'shapes', title: 'Shapes', icon: 'star', grade: 0, skills: ['k.shapes'] },
  { id: 'addsub20', title: '+ and − to 20', icon: 'turtle', grade: 1, skills: ['g1.add20', 'g1.sub20', 'g1.missing'] },
  { id: 'tens1', title: 'Tens and ones', icon: 'bus', grade: 1, skills: ['g1.placevalue', 'g1.tens100'] },
]

export const topicById = (id: string) => TOPICS.find((t) => t.id === id)

/**
 * Skills a topic session draws from: everything already open, plus the next
 * locked one so a chosen topic always has something to stretch into.
 */
export function topicSkills(topic: Topic, states: Map<string, SkillState>): string[] {
  const open = topic.skills.filter((id) => isUnlocked(skillById(id), states))
  const nextLocked = topic.skills.find((id) => !open.includes(id))
  return nextLocked ? [...open, nextLocked] : open
}
