export type Rng = () => number

/** Deterministic PRNG (mulberry32) so generators are testable. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const int = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1))
export const pick = <T,>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)]
export function shuffle<T>(rng: Rng, xs: readonly T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** `count` distinct numeric choices including `answer`, all within [min, max], shuffled. */
export function numberChoices(rng: Rng, answer: number, count: number, min: number, max: number): number[] {
  const set = new Set<number>([answer])
  const span = Math.max(3, Math.ceil((max - min) / 4))
  let guard = 0
  while (set.size < Math.min(count, max - min + 1) && guard++ < 200) {
    const off = int(rng, -span, span)
    const c = answer + (off === 0 ? 1 : off)
    if (c >= min && c <= max) set.add(c)
  }
  return shuffle(rng, [...set])
}
