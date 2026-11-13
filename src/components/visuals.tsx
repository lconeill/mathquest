import type { CSSProperties, ReactNode } from 'react'
import { artUrl } from '@/art/objects'
import type { ShapeName } from '@/curriculum/types'

export function Art({ slug, size = 56, className = '', style }: { slug: string; size?: number; className?: string; style?: CSSProperties }) {
  return <img src={artUrl(slug)} alt="" draggable={false} width={size} height={size} className={`pointer-events-none select-none ${className}`} style={style} />
}

/**
 * A group of objects laid out in rows of five (the "five-structure" that helps
 * children see quantities). Supports tapping (counting), crossing out (take away)
 * and highlighting (hints).
 */
export function ObjectGroup({
  slug, n, size = 56, tapped, crossed = 0, crossedSet, highlight = false, onTap, label,
}: {
  slug: string; n: number; size?: number; tapped?: Set<number>; crossed?: number; crossedSet?: Set<number>; highlight?: boolean
  onTap?: (i: number) => void; label?: (i: number) => ReactNode
}) {
  const rows: number[][] = []
  for (let i = 0; i < n; i += 5) rows.push(Array.from({ length: Math.min(5, n - i) }, (_, k) => i + k))
  return (
    <div className="flex flex-col items-center gap-2">
      {rows.map((row, r) => (
        <div key={r} className="flex gap-2">
          {row.map((i) => {
            const isTapped = tapped?.has(i)
            const isCrossed = i >= n - crossed || !!crossedSet?.has(i)
            return (
              <Cell
                key={i}
                onTap={onTap && (() => onTap(i))}
                className={`relative grid place-items-center rounded-2xl transition ${isTapped ? 'bg-good-soft ring-4 ring-good' : ''} ${highlight && !isTapped ? 'anim-glow' : ''}`}
                style={{ width: size + 12, height: size + 12 }}
              >
                <Art slug={slug} size={size} className={isCrossed ? 'opacity-35' : isTapped ? 'anim-pop' : ''} />
                {isCrossed && <span className="absolute inset-0 grid place-items-center text-5xl font-black text-pink">✕</span>}
                {label && isTapped && (
                  <span className="absolute -top-2 -right-2 grid h-8 w-8 place-items-center rounded-full bg-brand text-lg font-black text-white anim-pop">{label(i)}</span>
                )}
              </Cell>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/** A tappable button when interactive, otherwise a plain div (never nest disabled buttons inside tap targets). */
function Cell({ onTap, className, style, children }: { onTap?: () => void; className: string; style: CSSProperties; children: ReactNode }) {
  return onTap
    ? <button type="button" onPointerDown={onTap} className={className} style={style}>{children}</button>
    : <div className={className} style={style}>{children}</div>
}

/** Classic 2×5 ten-frame. `onToggle` makes it interactive. */
export function TenFrame({
  filled, size = 60, color = 'var(--brand)', onToggle, highlightEmpty = false, slug,
}: { filled: number; size?: number; color?: string; onToggle?: (i: number) => void; highlightEmpty?: boolean; slug?: string }) {
  return (
    <div className="inline-grid grid-cols-5 gap-1 rounded-2xl border-4 border-text/70 bg-surface p-1.5">
      {Array.from({ length: 10 }, (_, i) => {
        const on = i < filled
        return (
          <Cell
            key={i}
            onTap={onToggle && (() => onToggle(i))}
            className={`grid place-items-center rounded-xl border-2 border-border bg-bg ${highlightEmpty && !on ? 'anim-glow' : ''}`}
            style={{ width: size, height: size }}
          >
            {on && (slug
              ? <Art slug={slug} size={size * 0.78} className="anim-pop" />
              : <span className="block rounded-full anim-pop" style={{ width: size * 0.7, height: size * 0.7, background: color }} />)}
          </Cell>
        )
      })}
    </div>
  )
}

/** Dot/object arrangements for "quick look" subitizing. */
const DICE: Record<number, [number, number][]> = {
  1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]], 6: [[0, 0], [1, 0], [2, 0], [0, 2], [1, 2], [2, 2]],
}

export function Arrangement({ n, slug, layout, seed = 1, size = 64 }: { n: number; slug: string; layout: 'dice' | 'tenframe' | 'scatter'; seed?: number; size?: number }) {
  if (layout === 'tenframe') return <TenFrame filled={n} size={size} slug={slug} />
  if (layout === 'dice' && DICE[n]) {
    const cell = size + 16
    return (
      <div className="relative rounded-3xl border-4 border-text/70 bg-surface" style={{ width: cell * 3 + 16, height: cell * 3 + 16 }}>
        {DICE[n].map(([r, c], i) => (
          <Art key={i} slug={slug} size={size} className="absolute" style={{ top: 8 + r * cell + 8, left: 8 + c * cell + 8 }} />
        ))}
      </div>
    )
  }
  // Scatter: deterministic jittered grid so objects never overlap.
  const positions: [number, number][] = []
  let s = seed * 9301 + n
  const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  const slots = Array.from({ length: 12 }, (_, i) => i).sort(() => rand() - 0.5).slice(0, n)
  for (const k of slots) positions.push([Math.floor(k / 4), k % 4])
  const cell = size + 20
  return (
    <div className="relative rounded-3xl border-4 border-text/70 bg-surface" style={{ width: cell * 4 + 16, height: cell * 3 + 16 }}>
      {positions.map(([r, c], i) => (
        <Art key={i} slug={slug} size={size} className="absolute"
          style={{ top: 8 + r * cell + rand() * 14, left: 8 + c * cell + rand() * 14, transform: `rotate(${(rand() - 0.5) * 30}deg)` }} />
      ))}
    </div>
  )
}

export function Shape({ shape, color, size = 110 }: { shape: ShapeName; color: string; size?: number }) {
  const common = { fill: color, stroke: 'rgba(43,35,64,.55)', strokeWidth: 4, strokeLinejoin: 'round' as const }
  const el = (() => {
    switch (shape) {
      case 'circle': return <circle cx="50" cy="50" r="40" {...common} />
      case 'square': return <rect x="12" y="12" width="76" height="76" rx="4" {...common} />
      case 'rectangle': return <rect x="4" y="26" width="92" height="48" rx="4" {...common} />
      case 'triangle': return <polygon points="50,8 92,88 8,88" {...common} />
      case 'oval': return <ellipse cx="50" cy="50" rx="44" ry="28" {...common} />
      case 'hexagon': return <polygon points="27,10 73,10 96,50 73,90 27,90 4,50" {...common} />
      case 'star': return <polygon points="50,5 61,38 96,38 68,59 79,93 50,72 21,93 32,59 4,38 39,38" {...common} />
      case 'heart': return <path d="M50 88 C20 66 6 50 6 32 C6 18 17 8 30 8 C40 8 46 14 50 22 C54 14 60 8 70 8 C83 8 94 18 94 32 C94 50 80 66 50 88Z" {...common} />
    }
  })()
  return <svg viewBox="0 0 100 100" width={size} height={size} aria-label={shape}>{el}</svg>
}

/** Big numeral cards, e.g. for sequences and abstract equations. */
export function NumberCard({ value, highlight, size = 'lg' }: { value: number | string | null; highlight?: boolean; size?: 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'h-24 min-w-20 text-6xl' : 'h-16 min-w-14 text-4xl'
  return (
    <div className={`grid place-items-center rounded-2xl border-4 px-3 font-black ${dim} ${value === null ? 'border-dashed border-brand bg-surface-2 text-brand' : 'border-border bg-surface'} ${highlight ? 'anim-glow' : ''}`}>
      {value ?? '?'}
    </div>
  )
}
