import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { say, sfx, ttsSupported, whenVoicesReady } from '@/audio'
import { Mascot } from '@/components/Mascot'
import { Art } from '@/components/visuals'
import { db, getSettings, saveSettings } from '@/db'

export default function ProfilePicker() {
  const profiles = useLiveQuery(() => db.profiles.toArray())
  const settings = useLiveQuery(() => getSettings())
  const nav = useNavigate()
  const [noVoice, setNoVoice] = useState(false)
  useEffect(() => { whenVoicesReady().then((v) => setNoVoice(!ttsSupported() || v.length === 0)) }, [])

  const hello = async () => {
    sfx('celebrate')
    await say("Hi! I'm Pip. Let's play with numbers!")
    await saveSettings({ voiceChecked: true })
  }

  return (
    <div className="flex min-h-full flex-col items-center gap-8 p-6 pt-10">
      <div className="flex items-center gap-4">
        <button type="button" onClick={hello} aria-label="Say hello"><Mascot pose="wave" size={110} /></button>
        <h1 className="text-5xl font-black text-brand sm:text-6xl">Math Quest</h1>
      </div>

      {settings && !settings.voiceChecked && (
        <button type="button" onClick={hello} className="card flex max-w-md items-center gap-3 border-hint! p-4 text-left anim-fade-up">
          <Art slug="speaker" size={48} />
          <span className="text-lg font-bold">Turn the sound up, then tap here to hear Pip talk!</span>
        </button>
      )}
      {noVoice && (
        <div className="card max-w-md border-warm! p-4 text-base">
          <b>Grown-ups:</b> no text-to-speech voice found. On Android, open <i>Settings → Accessibility → Text-to-speech</i> and install
          the Google speech engine with an English voice (download it for offline use).
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-6">
        {profiles?.map((p) => (
          <button key={p.id} type="button" onClick={() => { sfx('pop'); say(`Hi ${p.name}!`); nav(`/p/${p.id}`) }} className="card flex w-40 flex-col items-center gap-2 p-5 anim-pop">
            <Art slug={p.avatar} size={96} />
            <span className="text-2xl font-black">{p.name}</span>
          </button>
        ))}
        <Link to="/parent/new" className="card flex w-40 flex-col items-center justify-center gap-2 border-dashed! p-5 text-text-2">
          <span className="text-6xl font-black">+</span>
          <span className="text-lg font-bold">Add player</span>
        </Link>
      </div>

      <Link to="/parent" className="mt-auto text-base font-bold text-text-2 underline">Grown-ups</Link>
    </div>
  )
}
