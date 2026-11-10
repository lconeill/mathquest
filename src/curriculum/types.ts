import type { ArtSlug } from '@/art/objects'

/** Concrete → Pictorial → Abstract (Singapore-math CPA). */
export type Rep = 'concrete' | 'pictorial' | 'abstract'

export type ShapeName = 'circle' | 'square' | 'triangle' | 'rectangle' | 'star' | 'heart' | 'hexagon' | 'oval'

interface Base {
  /** Spoken (and shown, for grown-ups) instruction. */
  prompt: string
  rep: Rep
}

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
  | (Base & { kind: 'pattern'; seq: ArtSlug[]; choices: ArtSlug[]; answer: ArtSlug })
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
