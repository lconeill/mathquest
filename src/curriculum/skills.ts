import * as G from '@/generators'
import type { Skill } from './types'

/**
 * The skill graph. Order matters: it is the default path on the map.
 * Adding a grade = appending skills here (plus generators); the engine is grade-agnostic.
 * Roughly follows the Common Core K–1 progression.
 */
export const SKILLS: Skill[] = [
  // ---- Kindergarten ------------------------------------------------------
  { id: 'k.count5', title: 'Count to 5', short: '1–5', grade: 0, strand: 'counting', prereqs: [], maxDifficulty: 1, icon: 'duck',
    generate: (c) => G.count(c, [[1, 3], [1, 5]]) },
  { id: 'k.shapes', title: 'Shapes', short: 'Shapes', grade: 0, strand: 'geometry', prereqs: [], maxDifficulty: 2, icon: 'star',
    generate: (c) => G.shape(c) },
  { id: 'k.subitize5', title: 'Quick look (to 5)', short: 'Quick look', grade: 0, strand: 'counting', prereqs: ['k.count5'], maxDifficulty: 2, icon: 'ladybug',
    generate: (c) => G.subitize(c) },
  { id: 'k.count10', title: 'Count to 10', short: '1–10', grade: 0, strand: 'counting', prereqs: ['k.count5'], maxDifficulty: 1, icon: 'apple',
    generate: (c) => G.count(c, [[4, 7], [5, 10]]) },
  { id: 'k.patterns', title: 'Patterns', short: 'Patterns', grade: 0, strand: 'geometry', prereqs: ['k.shapes'], maxDifficulty: 2, icon: 'flower',
    generate: (c) => G.pattern(c) },
  { id: 'k.compare10', title: 'More or fewer', short: 'More?', grade: 0, strand: 'counting', prereqs: ['k.count10'], maxDifficulty: 3, icon: 'balloon',
    generate: (c) => G.compare(c) },
  { id: 'k.tenframe', title: 'Ten frames', short: 'Ten frame', grade: 0, strand: 'counting', prereqs: ['k.count10'], maxDifficulty: 2, icon: 'cookie',
    generate: (c) => G.tenFrameBuild(c) },
  { id: 'k.bond5', title: 'Make 5', short: 'Make 5', grade: 0, strand: 'operations', prereqs: ['k.subitize5'], maxDifficulty: 2, icon: 'strawberry',
    generate: (c) => G.bond(c, 5) },
  { id: 'k.next20', title: 'What comes next? (to 20)', short: 'Next #', grade: 0, strand: 'counting', prereqs: ['k.count10'], maxDifficulty: 2, icon: 'train',
    generate: (c) => G.sequence(c, 'within20') },
  { id: 'k.add5', title: 'Add within 5', short: '+ to 5', grade: 0, strand: 'operations', prereqs: ['k.bond5'], maxDifficulty: 2, icon: 'chick',
    generate: (c) => G.addSubMix(c, '+', 5) },
  { id: 'k.count20', title: 'Count to 20', short: '1–20', grade: 0, strand: 'counting', prereqs: ['k.tenframe', 'k.next20'], maxDifficulty: 2, icon: 'fish',
    generate: (c) => G.tenFrameBuild(c, true) },
  { id: 'k.sub5', title: 'Take away within 5', short: '− to 5', grade: 0, strand: 'operations', prereqs: ['k.add5'], maxDifficulty: 2, icon: 'frog',
    generate: (c) => G.addSubMix(c, '-', 5) },
  { id: 'k.make10', title: 'Make 10', short: 'Make 10', grade: 0, strand: 'operations', prereqs: ['k.bond5', 'k.tenframe'], maxDifficulty: 2, icon: 'bee',
    generate: (c) => (c.rng() < 0.5 ? G.moreToTen(c) : G.bond(c, 10)) },
  { id: 'k.tens100', title: 'Count by tens', short: '10s', grade: 0, strand: 'counting', prereqs: ['k.next20'], maxDifficulty: 1, icon: 'rocket',
    generate: (c) => (c.rng() < 0.5 ? G.sequence(c, 'tens') : G.tensMix({ ...c, difficulty: 0 })) },
  { id: 'k.add10', title: 'Add within 10', short: '+ to 10', grade: 0, strand: 'operations', prereqs: ['k.add5', 'k.make10'], maxDifficulty: 2, icon: 'cupcake',
    generate: (c) => G.addSubMix(c, '+', 10) },
  { id: 'k.sub10', title: 'Take away within 10', short: '− to 10', grade: 0, strand: 'operations', prereqs: ['k.sub5', 'k.add10'], maxDifficulty: 2, icon: 'penguin',
    generate: (c) => G.addSubMix(c, '-', 10) },
  { id: 'k.patterns2', title: 'Pattern puzzles', short: 'Puzzles', grade: 0, strand: 'geometry', prereqs: ['k.patterns'], maxDifficulty: 2, icon: 'rainbow',
    generate: (c) => G.patternPuzzle(c) },
  { id: 'k.teens', title: 'Ten and more (10 + 4)', short: '10 + ?', grade: 0, strand: 'place-value', prereqs: ['k.count20', 'k.add10'], maxDifficulty: 1, icon: 'gift',
    generate: (c) => G.teensMix(c) },

  // ---- Grade 1 -----------------------------------------------------------
  { id: 'g1.add20', title: 'Add within 20', short: '+ to 20', grade: 1, strand: 'operations', prereqs: ['k.add10', 'k.count20'], maxDifficulty: 3, icon: 'turtle',
    generate: (c) => G.addSubMix(c, '+', 20) },
  { id: 'g1.sub20', title: 'Take away within 20', short: '− to 20', grade: 1, strand: 'operations', prereqs: ['k.sub10', 'g1.add20'], maxDifficulty: 3, icon: 'owl',
    generate: (c) => G.addSubMix(c, '-', 20) },
  { id: 'g1.missing', title: 'Missing numbers', short: '? + 3', grade: 1, strand: 'operations', prereqs: ['g1.add20'], maxDifficulty: 3, icon: 'butterfly',
    generate: (c) => G.addSub(c, c.rng() < 0.6 ? '+' : '-', 20, { missing: true }) },
  { id: 'g1.placevalue', title: 'Tens and ones', short: 'Tens', grade: 1, strand: 'place-value', prereqs: ['k.count20', 'k.tens100'], maxDifficulty: 3, icon: 'bus',
    generate: (c) => G.placeValue(c) },
  { id: 'g1.tens100', title: 'Add and take away tens', short: '+10s', grade: 1, strand: 'place-value', prereqs: ['g1.placevalue'], maxDifficulty: 2, icon: 'planet',
    generate: (c) => G.tensMix(c) },
]

export const SKILL_BY_ID = new Map(SKILLS.map((s) => [s.id, s]))
export const skillById = (id: string) => {
  const s = SKILL_BY_ID.get(id)
  if (!s) throw new Error(`Unknown skill ${id}`)
  return s
}

export const GRADE_NAMES = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'] as const
export const GRADES_AVAILABLE = [...new Set(SKILLS.map((s) => s.grade))]
