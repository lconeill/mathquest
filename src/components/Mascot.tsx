/**
 * "Pip" — the app's guide and the child's pet. Grows with stars earned:
 * stage 0 baby → 1 small → 2 big + party hat → 3 big + hat + cape → 4 crown.
 */
export type Pose = 'idle' | 'cheer' | 'think' | 'wave' | 'sad'

export const PET_STAGES = [0, 10, 30, 60, 120]
export const petStage = (stars: number) => PET_STAGES.filter((t) => stars >= t).length - 1
export const nextStageAt = (stars: number) => PET_STAGES.find((t) => t > stars)

export function Mascot({ pose = 'idle', stage = 0, size = 120, color = '#6d5dfc' }: { pose?: Pose; stage?: number; size?: number; color?: string }) {
  const scale = [0.78, 0.88, 1, 1, 1][Math.min(stage, 4)]
  const anim = pose === 'cheer' ? 'anim-jump' : pose === 'sad' ? '' : pose === 'wave' ? 'anim-wiggle' : 'anim-bob'
  const armsUp = pose === 'cheer'
  const eyesUp = pose === 'think'
  return (
    <div className={anim} style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden>
        <g transform={`translate(60 ${120 - 112 * scale}) scale(${scale}) translate(-60 0)`}>
          {/* cape */}
          {stage >= 3 && <path d="M30 60 Q60 50 90 60 L100 108 Q60 116 20 108 Z" fill="#ff6b9d" stroke="#2b2340" strokeWidth="3" />}
          {/* feet */}
          <ellipse cx="44" cy="106" rx="12" ry="6" fill="#ff9f1c" stroke="#2b2340" strokeWidth="3" />
          <ellipse cx="76" cy="106" rx="12" ry="6" fill="#ff9f1c" stroke="#2b2340" strokeWidth="3" />
          {/* arms */}
          {armsUp ? (
            <>
              <path d="M24 62 Q10 40 16 28" stroke="#2b2340" strokeWidth="9" strokeLinecap="round" fill="none" />
              <path d="M24 62 Q10 40 16 28" stroke={color} strokeWidth="5" strokeLinecap="round" fill="none" />
              <path d="M96 62 Q110 40 104 28" stroke="#2b2340" strokeWidth="9" strokeLinecap="round" fill="none" />
              <path d="M96 62 Q110 40 104 28" stroke={color} strokeWidth="5" strokeLinecap="round" fill="none" />
            </>
          ) : (
            <>
              <path d="M24 66 Q12 76 18 88" stroke="#2b2340" strokeWidth="9" strokeLinecap="round" fill="none" />
              <path d="M24 66 Q12 76 18 88" stroke={color} strokeWidth="5" strokeLinecap="round" fill="none" />
              <path d={pose === 'wave' ? 'M96 66 Q112 52 106 36' : pose === 'think' ? 'M96 70 Q86 84 74 80' : 'M96 66 Q108 76 102 88'} stroke="#2b2340" strokeWidth="9" strokeLinecap="round" fill="none" />
              <path d={pose === 'wave' ? 'M96 66 Q112 52 106 36' : pose === 'think' ? 'M96 70 Q86 84 74 80' : 'M96 66 Q108 76 102 88'} stroke={color} strokeWidth="5" strokeLinecap="round" fill="none" />
            </>
          )}
          {/* ears */}
          <path d="M34 34 L28 8 L52 24 Z" fill={color} stroke="#2b2340" strokeWidth="3" strokeLinejoin="round" />
          <path d="M86 34 L92 8 L68 24 Z" fill={color} stroke="#2b2340" strokeWidth="3" strokeLinejoin="round" />
          <path d="M36 28 L32 14 L46 24 Z" fill="#ffc6dc" />
          <path d="M84 28 L88 14 L74 24 Z" fill="#ffc6dc" />
          {/* body */}
          <ellipse cx="60" cy="64" rx="40" ry="42" fill={color} stroke="#2b2340" strokeWidth="3" />
          <ellipse cx="60" cy="78" rx="24" ry="22" fill="#fff8ec" opacity=".9" />
          {/* eyes */}
          {pose === 'cheer' ? (
            <>
              <path d="M38 54 Q45 46 52 54" stroke="#2b2340" strokeWidth="4" fill="none" strokeLinecap="round" />
              <path d="M68 54 Q75 46 82 54" stroke="#2b2340" strokeWidth="4" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="45" cy="54" r="8" fill="#fff" stroke="#2b2340" strokeWidth="2" />
              <circle cx="75" cy="54" r="8" fill="#fff" stroke="#2b2340" strokeWidth="2" />
              <circle cx={eyesUp ? 47 : 45} cy={eyesUp ? 50 : 55} r="4" fill="#2b2340" />
              <circle cx={eyesUp ? 77 : 75} cy={eyesUp ? 50 : 55} r="4" fill="#2b2340" />
            </>
          )}
          {/* cheeks */}
          <circle cx="36" cy="66" r="5" fill="#ff6b9d" opacity=".45" />
          <circle cx="84" cy="66" r="5" fill="#ff6b9d" opacity=".45" />
          {/* mouth */}
          {pose === 'sad' ? <path d="M52 72 Q60 66 68 72" stroke="#2b2340" strokeWidth="3" fill="none" strokeLinecap="round" />
            : pose === 'think' ? <circle cx="62" cy="70" r="3" fill="#2b2340" />
            : <path d={pose === 'cheer' ? 'M48 66 Q60 82 72 66 Z' : 'M52 67 Q60 75 68 67'} stroke="#2b2340" strokeWidth="3" fill={pose === 'cheer' ? '#ff6b9d' : 'none'} strokeLinecap="round" />}
          {/* hat / crown */}
          {stage >= 2 && stage < 4 && <path d="M50 26 L60 -2 L70 26 Z" fill="#ffd23f" stroke="#2b2340" strokeWidth="3" strokeLinejoin="round" />}
          {stage >= 2 && stage < 4 && <circle cx="60" cy="-3" r="5" fill="#ff6b9d" stroke="#2b2340" strokeWidth="2" />}
          {stage >= 4 && <path d="M40 26 L42 4 L52 16 L60 0 L68 16 L78 4 L80 26 Z" fill="#ffd23f" stroke="#2b2340" strokeWidth="3" strokeLinejoin="round" />}
        </g>
      </svg>
    </div>
  )
}
