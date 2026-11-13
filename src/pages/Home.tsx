import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { say, sfx } from '@/audio'
import { Mascot, nextStageAt, petStage } from '@/components/Mascot'
import { Art } from '@/components/visuals'
import { GRADE_NAMES, GRADES_AVAILABLE, SKILLS } from '@/curriculum/skills'
import { statusOf, type SkillStatus } from '@/engine/mastery'
import { TOPICS } from '@/curriculum/topics'
import { useProfile, useProfileId, useSkillStates } from '@/hooks'

const STATUS_STYLE: Record<SkillStatus, string> = {
  locked: 'bg-locked/40 border-locked grayscale opacity-60',
  open: 'bg-surface border-brand anim-glow',
  practice: 'bg-warm-soft border-warm',
  mastered: 'bg-good-soft border-good',
}

export default function Home() {
  const id = useProfileId()
  const profile = useProfile(id)
  const states = useSkillStates(id)
  const nav = useNavigate()
  const startGrade = profile?.startGrade ?? 0
  const [grade, setGrade] = useState<number | null>(null)
  if (!profile || !states) return null

  // Default to the lowest grade that still has unmastered skills.
  const currentGrade = grade ?? (GRADES_AVAILABLE.find((g) => SKILLS.some((s) => s.grade === g && !states.get(s.id)?.mastered)) ?? Math.max(startGrade, 0))
  const skills = SKILLS.filter((s) => s.grade === currentGrade)
  const stage = petStage(profile.stars)
  const next = nextStageAt(profile.stars)

  return (
    <div className="flex min-h-full flex-col gap-4 p-4 pb-10">
      <header className="flex items-center gap-3">
        <Link to="/" className="btn btn-sm" aria-label="Switch player"><Art slug={profile.avatar} size={36} /></Link>
        <span className="text-2xl font-black">{profile.name}</span>
        <span className="ml-auto flex items-center gap-1 rounded-full bg-warm-soft px-3 py-1 text-2xl font-black"><Art slug="glowing-star" size={30} />{profile.stars}</span>
        <Link to={`/p/${id}/stickers`} className="btn btn-sm" aria-label="Sticker book"><Art slug="gift" size={34} /></Link>
      </header>

      <section className="card flex items-center gap-4 p-4">
        <button type="button" onClick={() => { sfx('pop'); say(next ? `I grow bigger at ${next} stars!` : "I'm all grown up! Thank you!") }}>
          <Mascot stage={stage} pose="idle" size={110} />
        </button>
        <div className="flex flex-1 flex-col gap-3">
          <button type="button" onClick={() => { sfx('celebrate'); nav(`/p/${id}/play`) }} className="btn btn-brand h-20 text-4xl!">▶ Play!</button>
          {next && (
            <div className="h-3 overflow-hidden rounded-full bg-surface-2" title={`${next - profile.stars} stars until Pip grows`}>
              <div className="h-full rounded-full bg-warm" style={{ width: `${Math.min(100, (profile.stars / next) * 100)}%` }} />
            </div>
          )}
        </div>
      </section>

      {GRADES_AVAILABLE.length > 1 && (
        <div className="flex gap-2">
          {GRADES_AVAILABLE.map((g) => (
            <button key={g} type="button" onClick={() => setGrade(g)} className={`btn btn-sm ${g === currentGrade ? 'btn-brand' : ''}`}>{GRADE_NAMES[g]}</button>
          ))}
        </div>
      )}

      {/* Practice one kind of maths at a time */}
      {TOPICS.some((t) => t.grade === currentGrade) && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xl font-black text-text-2">Practice</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TOPICS.filter((t) => t.grade === currentGrade).map((t) => (
              <button key={t.id} type="button" onClick={() => { sfx('pop'); say(t.title); nav(`/p/${id}/play?topic=${t.id}`) }}
                className="btn flex h-auto! items-center justify-start gap-2 px-3! py-2! text-lg!">
                <Art slug={t.icon} size={40} /><span className="text-left leading-tight">{t.title}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <h2 className="text-xl font-black text-text-2">Skill path</h2>
      {/* The path: a winding trail of skills */}
      <div className="relative mx-auto flex w-full max-w-md flex-col gap-3">
        {skills.map((s, i) => {
          const st = states.get(s.id)
          const status = statusOf(s, states)
          const stars = status === 'mastered' ? 3 : st ? Math.floor((st.mastery / 0.85) * 3) : 0
          const offset = ['ml-0', 'ml-16', 'ml-28', 'ml-16'][i % 4]
          return (
            <button
              key={s.id}
              type="button"
              disabled={status === 'locked'}
              onClick={() => { sfx('pop'); say(s.title); nav(`/p/${id}/play?skill=${s.id}`) }}
              className={`${offset} flex w-56 items-center gap-3 rounded-full border-4 p-2 pr-4 shadow-[0_5px_0_rgba(43,35,64,.12)] ${STATUS_STYLE[status]}`}
            >
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-surface">
                <Art slug={status === 'locked' ? 'lock' : s.icon} size={46} />
              </span>
              <span className="flex flex-col items-start">
                <span className="text-xl font-black">{s.short}</span>
                <span className="text-lg leading-none">{'★'.repeat(Math.min(3, Math.max(0, stars)))}<span className="opacity-25">{'★'.repeat(3 - Math.min(3, Math.max(0, stars)))}</span></span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
