import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { configureAudio, listVoices, say, whenVoicesReady } from '@/audio'
import { AVATARS } from '@/art/objects'
import { Art } from '@/components/visuals'
import { GRADE_NAMES, GRADES_AVAILABLE, SKILLS } from '@/curriculum/skills'
import { db, getSettings, saveSettings, type Profile } from '@/db'
import { createProfile, deleteProfile, exportAll, importAll, resetSkill, setUnlocked } from '@/db/repo'
import { statusOf } from '@/engine/mastery'

/** Unlocked for the rest of this app run once a grown-up passes the gate. */
let parentOk = false

export default function Parent() {
  const [ok, setOk] = useState(parentOk)
  if (!ok) return <Gate onPass={() => { parentOk = true; setOk(true) }} />
  return (
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path="new" element={<ProfileForm />} />
      <Route path="edit/:pid" element={<ProfileForm />} />
    </Routes>
  )
}

// ---- Grown-up gate -------------------------------------------------------------

function Gate({ onPass }: { onPass: () => void }) {
  const [held, setHeld] = useState(false)
  const [progress, setProgress] = useState(0)
  const [q] = useState(() => ({ a: 6 + Math.floor(Math.random() * 4), b: 6 + Math.floor(Math.random() * 4) }))
  const [val, setVal] = useState('')
  const timer = useRef<ReturnType<typeof setInterval>>(undefined)
  const nav = useNavigate()
  const start = () => {
    const t0 = Date.now()
    timer.current = setInterval(() => {
      const p = (Date.now() - t0) / 2000
      setProgress(Math.min(1, p))
      if (p >= 1) { clearInterval(timer.current); setHeld(true) }
    }, 30)
  }
  const stop = () => { clearInterval(timer.current); if (!held) setProgress(0) }
  useEffect(() => () => clearInterval(timer.current), [])
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-black">Grown-ups only</h1>
      {!held ? (
        <button type="button" onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onContextMenu={(e) => e.preventDefault()}
          className="btn relative w-72 overflow-hidden">
          <span className="absolute inset-y-0 left-0 bg-brand/25" style={{ width: `${progress * 100}%` }} />
          <span className="relative">Press and hold</span>
        </button>
      ) : (
        <form className="flex flex-col items-center gap-4" onSubmit={(e) => { e.preventDefault(); if (Number(val) === q.a * q.b) onPass(); else setVal('') }}>
          <label className="text-2xl font-bold">What is {q.a} × {q.b}?</label>
          <input autoFocus inputMode="numeric" value={val} onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))}
            className="h-16 w-40 rounded-2xl border-4 border-border bg-surface text-center text-4xl font-black" />
          <button type="submit" className="btn btn-brand">Enter</button>
        </form>
      )}
      <button type="button" onClick={() => nav('/')} className="text-lg font-bold text-text-2 underline">Back</button>
    </div>
  )
}

// ---- Dashboard -----------------------------------------------------------------

const DAY = 86400000
const STATUS_LABEL = { locked: 'Locked', open: 'Learning', practice: 'Needs practice', mastered: 'Mastered' } as const
const STATUS_CLS = { locked: 'text-text-2', open: 'text-brand', practice: 'text-warm', mastered: 'text-good' } as const

function Dashboard() {
  const profiles = useLiveQuery(() => db.profiles.toArray())
  const [sel, setSel] = useState<number | null>(null)
  const pid = sel ?? profiles?.[0]?.id ?? null
  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-5 p-4 pb-16 text-base">
      <header className="flex items-center gap-3">
        <Link to="/" className="btn btn-sm">← Kids</Link>
        <h1 className="text-3xl font-black">Grown-ups</h1>
      </header>

      <section className="flex flex-wrap gap-2">
        {profiles?.map((p) => (
          <button key={p.id} type="button" onClick={() => setSel(p.id!)} className={`btn btn-sm ${p.id === pid ? 'btn-brand' : ''}`}>
            <Art slug={p.avatar} size={28} />{p.name}
          </button>
        ))}
        <Link to="/parent/new" className="btn btn-sm">+ Add player</Link>
      </section>

      {pid != null && <ProfileReport pid={pid} />}
      <SettingsCard />
      <BackupCard />
      <section className="card p-4 text-sm text-text-2">
        <h2 className="mb-1 text-lg font-black text-text">Credits</h2>
        Illustrations by <a className="underline" href="https://openmoji.org" target="_blank" rel="noreferrer">OpenMoji</a> (CC BY-SA 4.0).
        Font: Nunito (SIL OFL). Mascot, math manipulatives and sounds made for this app. Version {__APP_VERSION__}.
        <br />All progress is stored only on this device. Use Backup to keep a copy.
      </section>
    </div>
  )
}

function ProfileReport({ pid }: { pid: number }) {
  const profile = useLiveQuery(() => db.profiles.get(pid), [pid])
  const rows = useLiveQuery(() => db.skillStates.where('profileId').equals(pid).toArray(), [pid])
  const attempts = useLiveQuery(() => db.attempts.where('profileId').equals(pid).toArray(), [pid])
  const sessions = useLiveQuery(() => db.sessions.where('profileId').equals(pid).toArray(), [pid])
  const states = useMemo(() => new Map((rows ?? []).map((r) => [r.skillId, r])), [rows])

  const recentAcc = useMemo(() => {
    const by = new Map<string, boolean[]>()
    for (const a of (attempts ?? []).sort((x, y) => x.at - y.at)) {
      const xs = by.get(a.skillId) ?? []
      xs.push(a.correct && a.hints === 0)
      by.set(a.skillId, xs.slice(-10))
    }
    return by
  }, [attempts])

  const days = useMemo(() => {
    const out: { label: string; min: number }[] = []
    const today = new Date(); today.setHours(0, 0, 0, 0)
    for (let i = 6; i >= 0; i--) {
      const d0 = today.getTime() - i * DAY
      const min = (sessions ?? []).filter((s) => s.start >= d0 && s.start < d0 + DAY).reduce((m, s) => m + (s.end - s.start) / 60000, 0)
      out.push({ label: new Date(d0).toLocaleDateString(undefined, { weekday: 'short' }), min: Math.round(min) })
    }
    return out
  }, [sessions])

  if (!profile || !rows || !attempts) return null

  const struggling = SKILLS.filter((s) => {
    const acc = recentAcc.get(s.id)
    if (!acc || acc.length < 6) return false
    return acc.filter(Boolean).length / acc.length < 0.6
  })
  const mastered = SKILLS.filter((s) => states.get(s.id)?.mastered).length

  return (
    <>
      <section className="card flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <Art slug={profile.avatar} size={48} />
          <div className="flex-1">
            <div className="text-2xl font-black">{profile.name}</div>
            <div className="text-text-2">{mastered} of {SKILLS.length} skills mastered · {profile.stars} stars · {sessions?.length ?? 0} sessions</div>
          </div>
          <Link to={`/parent/edit/${pid}`} className="btn btn-sm">Edit</Link>
        </div>
        <div>
          <h3 className="mb-1 font-black">Minutes played, last 7 days</h3>
          <ul className="grid grid-cols-7 gap-1 text-center text-sm">
            {days.map((d, i) => <li key={i} className="rounded-lg bg-surface-2 p-1"><div className="font-black">{d.min}</div><div className="text-text-2">{d.label}</div></li>)}
          </ul>
        </div>
        {struggling.length > 0 && (
          <div className="rounded-xl bg-warm-soft p-3">
            <h3 className="font-black">Finding these tricky</h3>
            <p className="text-text-2">Fewer than 6 of the last 10 answered right first time. The app will keep giving easier versions and hints. Practising together with real objects (coins, blocks, snacks) helps a lot.</p>
            <ul className="mt-1 list-disc pl-5">{struggling.map((s) => <li key={s.id}>{s.title}</li>)}</ul>
          </div>
        )}
      </section>

      {GRADES_AVAILABLE.map((g) => (
        <section key={g} className="card overflow-hidden">
          <h2 className="bg-surface-2 px-4 py-2 text-lg font-black">{GRADE_NAMES[g]}</h2>
          <ul>
            {SKILLS.filter((s) => s.grade === g).map((s) => {
              const st = states.get(s.id)
              const status = statusOf(s, states)
              const acc = recentAcc.get(s.id)
              return (
                <li key={s.id} className="flex items-center gap-3 border-t-2 border-border px-3 py-2">
                  <Art slug={s.icon} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">{s.title}</div>
                    <div className={`text-sm font-bold ${STATUS_CLS[status]}`}>
                      {STATUS_LABEL[status]}
                      <span className="font-normal text-text-2">
                        {st ? ` · ${st.attempts} tries · level ${st.difficulty + 1}/${s.maxDifficulty + 1}` : ''}
                        {acc?.length ? ` · ${acc.filter(Boolean).length}/${acc.length} recent` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="hidden h-2.5 w-24 shrink-0 overflow-hidden rounded-full bg-surface-2 sm:block" title={`Mastery ${Math.round((st?.mastery ?? 0) * 100)}%`}>
                    <div className="h-full rounded-full bg-good" style={{ width: `${Math.round((st?.mastery ?? 0) * 100)}%` }} />
                  </div>
                  {status === 'locked'
                    ? <button type="button" className="btn btn-sm" onClick={() => setUnlocked(pid, s.id, true)}>Unlock</button>
                    : st && <button type="button" className="btn btn-sm" onClick={() => { if (confirm(`Reset progress on “${s.title}”?`)) void resetSkill(pid, s.id) }}>Reset</button>}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </>
  )
}

// ---- Profile add / edit --------------------------------------------------------

function ProfileForm() {
  const { pid } = useParams()
  const editing = pid ? Number(pid) : null
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<string>(AVATARS[0])
  const [grade, setGrade] = useState(0)
  const [existing, setExisting] = useState<Profile | null>(null)
  useEffect(() => {
    if (editing == null) return
    db.profiles.get(editing).then((p) => { if (p) { setExisting(p); setName(p.name); setAvatar(p.avatar); setGrade(p.startGrade) } })
  }, [editing])

  const save = async () => {
    if (!name.trim()) return
    if (existing) await db.profiles.update(existing.id!, { name: name.trim(), avatar })
    else await createProfile({ name: name.trim(), avatar, startGrade: grade })
    nav(existing ? '/parent' : '/')
  }

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col gap-5 p-4">
      <header className="flex items-center gap-3">
        <button type="button" onClick={() => nav(-1)} className="btn btn-sm">←</button>
        <h1 className="text-3xl font-black">{existing ? 'Edit player' : 'New player'}</h1>
      </header>
      <label className="flex flex-col gap-1 font-bold">Name
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} className="h-14 rounded-2xl border-4 border-border bg-surface px-4 text-2xl font-black" />
      </label>
      <div>
        <div className="mb-2 font-bold">Picture</div>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
          {AVATARS.map((a) => (
            <button key={a} type="button" onClick={() => setAvatar(a)} className={`grid aspect-square place-items-center rounded-2xl border-4 ${a === avatar ? 'border-brand bg-surface-2' : 'border-transparent'}`}>
              <Art slug={a} size={56} />
            </button>
          ))}
        </div>
      </div>
      {!existing && (
        <div>
          <div className="mb-2 font-bold">Start at</div>
          <div className="flex flex-wrap gap-2">
            {GRADES_AVAILABLE.map((g) => <button key={g} type="button" onClick={() => setGrade(g)} className={`btn btn-sm ${g === grade ? 'btn-brand' : ''}`}>{GRADE_NAMES[g]}</button>)}
          </div>
          <p className="mt-2 text-sm text-text-2">Earlier grades count as already learned and come back now and then for review. If unsure, start lower: the app moves quickly when things are easy.</p>
        </div>
      )}
      <button type="button" onClick={save} disabled={!name.trim()} className="btn btn-brand">{existing ? 'Save' : 'Create'}</button>
      {existing && (
        <button type="button" className="btn btn-sm mt-6 text-pink!" onClick={async () => {
          if (confirm(`Delete ${existing.name} and all their progress? This cannot be undone.`)) { await deleteProfile(existing.id!); nav('/parent') }
        }}>Delete player</button>
      )}
    </div>
  )
}

// ---- Settings & backup -----------------------------------------------------------

function SettingsCard() {
  const s = useLiveQuery(() => getSettings())
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  useEffect(() => { whenVoicesReady().then(setVoices) }, [])
  if (!s) return null
  const update = async (patch: Parameters<typeof saveSettings>[0]) => {
    await saveSettings(patch)
    configureAudio({ ...s, ...patch })
  }
  return (
    <section className="card flex flex-col gap-4 p-4">
      <h2 className="text-xl font-black">Settings</h2>
      <label className="flex items-center justify-between gap-3 font-bold">Suggest a break after
        <select value={s.breakMinutes} onChange={(e) => update({ breakMinutes: Number(e.target.value) })} className="rounded-xl border-2 border-border bg-surface p-2">
          {[5, 10, 15, 20, 30, 45, 600].map((m) => <option key={m} value={m}>{m === 600 ? 'Never' : `${m} min a day`}</option>)}
        </select>
      </label>
      <label className="flex items-center justify-between gap-3 font-bold">Voice
        <select value={s.voiceURI ?? ''} onChange={(e) => update({ voiceURI: e.target.value || undefined })} className="max-w-56 rounded-xl border-2 border-border bg-surface p-2">
          <option value="">Automatic</option>
          {(voices.length ? voices : listVoices()).map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name}{v.localService ? '' : ' (online)'}</option>)}
        </select>
      </label>
      <label className="flex items-center justify-between gap-3 font-bold">Speaking speed
        <input type="range" min={0.6} max={1.2} step={0.05} value={s.rate} onChange={(e) => update({ rate: Number(e.target.value) })} />
      </label>
      <label className="flex items-center justify-between gap-3 font-bold">Sound effects
        <input type="checkbox" className="h-6 w-6" checked={s.sound} onChange={(e) => update({ sound: e.target.checked })} />
      </label>
      <button type="button" className="btn btn-sm self-start" onClick={() => say('Three plus four equals seven. Great job!')}>🔊 Test voice</button>
    </section>
  )
}

function BackupCard() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const doExport = async () => {
    const data = await exportAll()
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `mathquest-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const doImport = async (f: File) => {
    try {
      if (!confirm('Replace ALL progress on this device with the backup?')) return
      await importAll(JSON.parse(await f.text()))
      setMsg('Backup restored.')
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not read that file.') }
  }
  return (
    <section className="card flex flex-col gap-3 p-4">
      <h2 className="text-xl font-black">Backup</h2>
      <p className="text-text-2">Progress is saved only on this device. Save a backup file to move to a new phone or tablet, or to keep it safe.</p>
      <div className="flex gap-2">
        <button type="button" className="btn btn-sm" onClick={doExport}>Save backup</button>
        <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}>Restore…</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void doImport(f); e.target.value = '' }} />
      </div>
      {msg && <p className="font-bold">{msg}</p>}
    </section>
  )
}
