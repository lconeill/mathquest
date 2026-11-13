import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Activity } from '@/activities'
import { encourage, praise, say, sfx, stopSpeaking } from '@/audio'
import { Mascot, petStage, type Pose } from '@/components/Mascot'
import { Art } from '@/components/visuals'
import { skillById, SKILLS } from '@/curriculum/skills'
import type { Problem } from '@/curriculum/types'
import { db, getSettings } from '@/db'
import { awardSticker, loadStates, minutesToday, recordAttempt } from '@/db/repo'
import { repFor, type SkillState } from '@/engine/mastery'
import { planSession, type Slot } from '@/engine/scheduler'
import { topicById, topicSkills } from '@/curriculum/topics'
import { useProfile, useProfileId } from '@/hooks'

const MAX_TRIES = 3

interface Current { slot: Slot; problem: Problem; startedAt: number }

interface Summary { firstTry: number; total: number; stars: number; stickers: string[]; mastered: string[]; unlocked: string[]; needBreak: boolean }

function answerText(p: Problem): string {
  const w = (op: '+' | '-') => (op === '+' ? 'plus' : 'take away')
  switch (p.kind) {
    case 'compare': return p.answer === 'same' ? 'They are the same!' : `This group has ${p.ask}.`
    case 'shape': return `Here is the ${p.target}.`
    case 'pattern': return p.answers.length > 1 ? 'These finish the pattern.' : 'This one fits the pattern.'
    case 'patternfix': return "This one doesn't belong."
    case 'patternpick': return p.ask === 'match' ? 'This row has the same pattern.' : 'This part repeats.'
    case 'hide': return `${p.answer} ${p.answer === 1 ? 'is' : 'are'} hiding.`
    case 'truefalse': return p.answer === 'yes' ? 'Yes, that is right!' : `No. ${p.a} ${w(p.op)} ${p.b} equals ${p.op === '+' ? p.a + p.b : p.a - p.b}.`
    case 'matcheq': return `It's ${p.a} ${w(p.op)} ${p.b}.`
    case 'pairs': return `Lots of pairs make ${p.target}!`
    default: return `It's ${p.answer}.`
  }
}

/** Format signature: regenerate when the next problem would look just like the last one. */
const sig = (p: Problem) => `${p.kind}:${p.style ?? ''}`.replace(/-(art|color|shape|size|turn)$/, '')

export default function Session() {
  const id = useProfileId()
  const profile = useProfile(id)
  const [params] = useSearchParams()
  const onlySkill = params.get('skill') ?? undefined
  const topic = topicById(params.get('topic') ?? '')
  const lastSig = useRef('')
  const nav = useNavigate()

  const [plan, setPlan] = useState<Slot[] | null>(null)
  const [index, setIndex] = useState(0)
  const [cur, setCur] = useState<Current | null>(null)
  const [tries, setTries] = useState(0)
  const [locked, setLocked] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [pose, setPose] = useState<Pose>('idle')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [round, setRound] = useState(0)
  const stats = useRef({ firstTry: 0, mastered: [] as string[], start: Date.now() })
  const states = useRef<Map<string, SkillState>>(new Map())
  const unlockedBefore = useRef<Set<string>>(new Set())

  // Build the session plan once.
  useEffect(() => {
    let alive = true
    loadStates(id).then((m) => {
      if (!alive) return
      states.current = m
      unlockedBefore.current = new Set(SKILLS.filter((s) => s.prereqs.every((p) => m.get(p)?.mastered) || m.get(s.id)?.unlocked).map((s) => s.id))
      setPlan(planSession(SKILLS, m, Date.now(), Math.random,
        onlySkill ? { onlySkill, length: 8 } : topic ? { topicSkills: topicSkills(topic, m) } : {}))
    })
    return () => { alive = false; stopSpeaking() }
  }, [id, onlySkill, topic, round])

  const makeProblem = useCallback((slot: Slot): Problem => {
    const skill = skillById(slot.skillId)
    const st = states.current.get(slot.skillId)
    const stretch = slot.kind === 'stretch'
    const gen = () => skill.generate({
      difficulty: stretch ? 0 : (st?.difficulty ?? 0),
      rep: stretch ? 'concrete' : repFor(st),
      rng: Math.random,
    })
    let p = gen()
    for (let i = 0; i < 6 && sig(p) === lastSig.current; i++) p = gen()
    lastSig.current = sig(p)
    return p
  }, [])

  // Show problem `index`.
  useEffect(() => {
    if (!plan || summary) return
    if (index >= plan.length) return
    const slot = plan[index]
    const problem = makeProblem(slot)
    setCur({ slot, problem, startedAt: Date.now() })
    // Test hook for automated play-throughs (enable with localStorage 'mq-debug').
    try { if (localStorage.getItem('mq-debug')) (window as unknown as { __mq: unknown }).__mq = { slot, problem } } catch { /* storage blocked */ }
    setTries(0); setReveal(false); setLocked(false); setPose('idle')
    const t = setTimeout(() => say(problem.prompt), 350)
    return () => clearTimeout(t)
  }, [plan, index, summary, makeProblem])

  const finish = useCallback(async () => {
    const total = plan?.length ?? 0
    const firstTry = stats.current.firstTry
    const acc = total ? firstTry / total : 0
    // Stars reward effort: always at least one.
    const stars = acc >= 0.9 ? 3 : acc >= 0.65 ? 2 : 1
    const stickers: string[] = []
    const s1 = await awardSticker(id); if (s1) stickers.push(s1)
    for (let i = 0; i < stats.current.mastered.length; i++) { const s = await awardSticker(id); if (s) stickers.push(s) }
    const end = Date.now()
    await db.sessions.add({ profileId: id, start: stats.current.start, end, problems: total, firstTry, stars })
    const p = await db.profiles.get(id)
    if (p) await db.profiles.update(id, { stars: p.stars + stars })
    const after = await loadStates(id)
    const unlocked = SKILLS.filter((s) => !unlockedBefore.current.has(s.id) && s.prereqs.length && s.prereqs.every((x) => after.get(x)?.mastered)).map((s) => s.title)
    const settings = await getSettings()
    const needBreak = (await minutesToday(id)) >= settings.breakMinutes
    setSummary({ firstTry, total, stars, stickers, mastered: stats.current.mastered.map((m) => skillById(m).title), unlocked, needBreak })
    sfx('celebrate')
    say(needBreak ? `Amazing work! You earned ${stars} stars. Time for a little break!` : `Amazing work! You earned ${stars} stars!`)
  }, [id, plan])

  const advance = useCallback(() => {
    if (!plan) return
    if (index + 1 >= plan.length) void finish()
    else setIndex((i) => i + 1)
  }, [plan, index, finish])

  const record = useCallback(async (correct: boolean, hints: number) => {
    if (!cur) return
    const { state, justMastered } = await recordAttempt(id, cur.slot.skillId, { correct, hints, ms: Date.now() - cur.startedAt, kind: cur.slot.kind })
    states.current.set(cur.slot.skillId, state)
    if (correct && hints === 0) stats.current.firstTry++
    if (justMastered) { stats.current.mastered.push(cur.slot.skillId); sfx('unlock') }
  }, [cur, id])

  const onAnswer = useCallback((correct: boolean) => {
    if (!cur || locked) return
    if (correct) {
      setLocked(true); setPose('cheer')
      sfx('correct')
      void record(true, tries)
      say(praise())
      setTimeout(advance, 1500)
      return
    }
    const n = tries + 1
    setTries(n)
    sfx('oops')
    if (n >= MAX_TRIES) {
      setLocked(true); setReveal(true); setPose('think')
      void record(false, n)
      say(`Let's look together. ${answerText(cur.problem)}`)
    } else {
      setPose('think')
      say(encourage(n - 1)).then(() => setPose('idle'))
    }
  }, [cur, locked, tries, record, advance])

  if (!profile || !plan) return null

  if (plan.length === 0) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6">
        <Mascot pose="cheer" size={160} stage={4} />
        <p className="text-3xl font-black">You've learned everything here!</p>
        <button type="button" className="btn btn-brand" onClick={() => nav(`/p/${id}`)}>Back</button>
      </div>
    )
  }

  if (summary) return <Reward summary={summary} stage={petStage(profile.stars)} onHome={() => nav(`/p/${id}`)} onAgain={() => {
    stats.current = { firstTry: 0, mastered: [], start: Date.now() }
    setPlan(null); setSummary(null); setIndex(0); setRound((r) => r + 1)
  }} />

  const progress = (index + (locked && !reveal ? 1 : 0)) / plan.length

  return (
    <div className="flex min-h-full flex-col p-3 sm:p-5">
      <header className="flex items-center gap-3">
        <button type="button" onClick={() => { stopSpeaking(); nav(`/p/${id}`) }} className="btn btn-sm" aria-label="Stop">✕</button>
        <div className="h-5 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-good transition-all duration-500" style={{ width: `${progress * 100}%` }} />
        </div>
        <button type="button" onClick={() => cur && say(cur.problem.prompt)} className="btn btn-sm" aria-label="Hear it again"><Art slug="speaker" size={34} /></button>
      </header>

      <div className="flex items-end gap-2 pt-3">
        <Mascot pose={pose} size={84} stage={petStage(profile.stars)} />
        <div className="card mb-6 px-4 py-2 text-xl font-bold sm:text-2xl">{cur?.problem.prompt}</div>
      </div>

      <main className="flex flex-1 flex-col">
        {cur && <Activity key={index} p={cur.problem} hint={tries} reveal={reveal} locked={locked} onAnswer={onAnswer} />}
      </main>

      {reveal && (
        <div className="flex justify-center pb-4">
          <button type="button" className="btn btn-brand anim-pop" onClick={() => { sfx('tap'); advance() }}>Next ➜</button>
        </div>
      )}
    </div>
  )
}

function Confetti() {
  const colors = ['#ff6b9d', '#ffd23f', '#4cc9f0', '#22b573', '#6d5dfc', '#ff9f1c']
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 40 }, (_, i) => (
        <span key={i} className="absolute top-0 block h-4 w-2.5 rounded-sm"
          style={{ left: `${(i * 37) % 100}%`, background: colors[i % colors.length], animation: `confetti-fall ${2.5 + (i % 5) * 0.4}s linear ${(i % 10) * 0.15}s 2` }} />
      ))}
    </div>
  )
}

function Reward({ summary, stage, onHome, onAgain }: { summary: Summary; stage: number; onHome: () => void; onAgain: () => void }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center">
      <Confetti />
      <Mascot pose="cheer" size={150} stage={stage} />
      <div className="flex gap-2">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`anim-pop ${n <= summary.stars ? '' : 'opacity-20 grayscale'}`} style={{ animationDelay: `${n * 0.25}s` }}>
            <Art slug="glowing-star" size={80} />
          </span>
        ))}
      </div>
      {summary.stickers.length > 0 && (
        <div className="card flex flex-col items-center gap-2 p-4">
          <span className="text-xl font-black">New sticker{summary.stickers.length > 1 ? 's' : ''}!</span>
          <div className="flex gap-3">{summary.stickers.map((s, i) => <span key={s} className="anim-pop" style={{ animationDelay: `${1 + i * 0.3}s` }}><Art slug={s} size={84} /></span>)}</div>
        </div>
      )}
      {summary.mastered.map((m) => <div key={m} className="rounded-full bg-good-soft px-4 py-2 text-xl font-black text-good">🏅 You learned: {m}</div>)}
      {summary.unlocked.map((u) => <div key={u} className="rounded-full bg-surface-2 px-4 py-2 text-xl font-black text-brand">🔓 New: {u}</div>)}
      {summary.needBreak ? (
        <div className="card max-w-sm p-4 text-2xl font-black">Time for a break! 🧃 Come back later to play more.</div>
      ) : null}
      <div className="flex gap-4">
        <button type="button" className="btn" onClick={() => { sfx('tap'); onHome() }}>🏠 Home</button>
        {!summary.needBreak && <button type="button" className="btn btn-brand" onClick={() => { sfx('tap'); onAgain() }}>▶ Again!</button>}
      </div>
    </div>
  )
}
