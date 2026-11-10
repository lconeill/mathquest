import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { say, sfx } from '@/audio'
import { Art } from '@/components/visuals'
import { STICKER_COLLECTIONS } from '@/art/objects'
import { db } from '@/db'
import { useProfileId } from '@/hooks'

export default function Stickers() {
  const id = useProfileId()
  const owned = useLiveQuery(async () => new Set((await db.stickers.where('profileId').equals(id).toArray()).map((s) => s.slug)), [id])
  if (!owned) return null
  return (
    <div className="flex min-h-full flex-col gap-5 p-4 pb-10">
      <header className="flex items-center gap-3">
        <Link to={`/p/${id}`} className="btn btn-sm" aria-label="Back">←</Link>
        <h1 className="text-3xl font-black">My Stickers</h1>
      </header>
      {STICKER_COLLECTIONS.map((c) => {
        const have = c.stickers.filter((s) => owned.has(s)).length
        return (
          <section key={c.id} className="card p-4">
            <h2 className="mb-3 flex items-center justify-between text-2xl font-black">
              {c.name}<span className="text-lg text-text-2">{have} / {c.stickers.length}</span>
            </h2>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
              {c.stickers.map((s) => owned.has(s) ? (
                <button key={s} type="button" onClick={() => { sfx('pop'); say(s.replace('-', ' ')) }} className="grid aspect-square place-items-center rounded-2xl bg-surface-2">
                  <Art slug={s} size={64} />
                </button>
              ) : (
                <div key={s} className="grid aspect-square place-items-center rounded-2xl border-4 border-dashed border-border text-3xl font-black text-locked">?</div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
