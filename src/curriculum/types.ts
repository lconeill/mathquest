import type { ArtSlug } from '@/art/objects'

/** Concrete → Pictorial → Abstract (Singapore-math CPA). */
export type Rep = 'concrete' | 'pictorial' | 'abstract'

export type ShapeName = 'circle' | 'square' | 'triangle' | 'rectangle' | 'star' | 'heart' | 'hexagon' | 'oval'

interface Base {
  /** Spoken (and shown, for grown-ups) instruction. */
  prompt: string
  rep: Rep
  /** Which presentation variant produced this problem (used to avoid back-to-back repeats). */
  style?: string
}

/** One item in a pattern: a picture, a coloured shape, or a growing stack. */
export type Token =
  | { t: 'art'; slug: ArtSlug; big?: boolean; rot?: number }
  | { t: 'shape'; shape: ShapeName; color: string; big?: boolean; rot?: number }
  | { t: 'stack'; slug: ArtSlug; n: number }

export const tokenKey = (x: Token) => JSON.stringify(x)

export type Problem =
  | (Base & { kind: 'count'; n: number; object: ArtSlug; choices: number[]; answer: number })
  | (Base & { kind: 'subitize'; n: number; object: ArtSlug; layout: 'dice' | 'tenframe' | 'scatter'; flashMs: number; choices: number[]; answer: number })
  | (Base & { kind: 'tenframe'; mode: 'build'; target: number; answer: number; frames: 1 | 2 })
  | (Base & { kind: 'tenframe'; mode: 'more-to-10'; filled: number; choices: number[]; answer: number; frames: 1 })
  | (Base & { kind: 'compare'; a: number; b: number; object: ArtSlug; ask: 'more' | 'fewer'; answer: 'left' | 'right' | 'same'; allowSame: boolean })
  | (Base & { kind: 'bond'; whole: number; part: number; object: ArtSlug; choices: number[]; answer: number })
  | (Base & { kind: 'equation'; a: number; op: '+' | '-'; b: number; c: number; blank: 'a' | 'b' | 'c'; object: ArtSlug; choices: number[]; answer: number })
  | (Base & { kind: 'sequence'; numbers: (number | null)[]; step: number; choices: number[]; answer: number })
  | (Base & { kind: 'shape'; target: ShapeName; options: { shape: ShapeName; color: string }[]; answer: number })
  /** Fill the empty slots (null) in order. `unit` is the repeating length, or 'grow' for growing stacks. */
  | (Base & { kind: 'pattern'; seq: (Token | null)[]; unit: number | 'grow'; palette: Token[]; answers: Token[]; answer: string })
  /** Tap the one item that breaks the pattern. */
  | (Base & { kind: 'patternfix'; seq: Token[]; unit: number; answer: number })
  /** Pick the row that has the same pattern (match), or the part that repeats (core). */
  | (Base & { kind: 'patternpick'; ask: 'match' | 'core'; seq: Token[]; options: Token[][]; answer: number })
  /** Some objects are hiding under a blanket: how many? */
  | (Base & { kind: 'hide'; total: number; shown: number; object: ArtSlug; choices: number[]; answer: number })
  /** Act it out: tap to add more / send some away, then say how many. */
  | (Base & { kind: 'act'; op: '+' | '-'; a: number; b: number; object: ArtSlug; choices: number[]; answer: number })
  | (Base & { kind: 'domino'; a: number; b: number; choices: number[]; answer: number })
  | (Base & { kind: 'truefalse'; a: number; op: '+' | '-'; b: number; shown: number; answer: 'yes' | 'no' })
  /** Which number sentence matches the picture? */
  | (Base & { kind: 'matcheq'; a: number; op: '+' | '-'; b: number; object: ArtSlug; choices: string[]; answer: string })
  /** Pick two cards that make the target. Any correct pair counts. */
  | (Base & { kind: 'pairs'; target: number; cards: number[]; answer: number })
  /** Hundred chart: start somewhere, jump by `delta`, tap where you land. */
  | (Base & { kind: 'chart'; start: number; delta: number; answer: number })
  | (Base & { kind: 'numberline'; min: number; max: number; step: number; start: number; delta: number; answer: number })
  | (Base & { kind: 'placevalue'; mode: 'read' | 'build'; tens: number; ones: number; answer: number; choices: number[] })

export type ProblemKind = Problem['kind']

export type Grade = 0 | 1 | 2 | 3 | 4 | 5 // 0 = Kindergarten

export type Strand = 'counting' | 'operations' | 'place-value' | 'geometry'

export interface Skill {
  id: string
  title: string
  /** Short kid-facing label for the map. */
  short: string
  grade: Grade
  strand: Strand
  prereqs: string[]
  /** Highest difficulty level the generator supports (0-based). */
  maxDifficulty: number
  /** Art for the map node. */
  icon: ArtSlug
  generate: (ctx: GenContext) => Problem
}

export interface GenContext {
  difficulty: number
  rep: Rep
  rng: () => number
}
