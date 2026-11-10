// Copies the OpenMoji SVGs listed in src/art/art-list.json into public/art/<slug>.svg.
// OpenMoji is CC BY-SA 4.0 — see public/art/CREDITS.md.
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const root = dirname(require.resolve('openmoji/package.json'))
const data = JSON.parse(readFileSync(join(root, 'data/openmoji.json'), 'utf8'))
const list = JSON.parse(readFileSync('src/art/art-list.json', 'utf8'))
mkdirSync('public/art', { recursive: true })

const missing = []
for (const [slug, annotation] of Object.entries(list)) {
  const e = data.find((x) => x.annotation === annotation)
  if (!e) { missing.push(`${slug} (${annotation})`); continue }
  copyFileSync(join(root, 'color/svg', `${e.hexcode}.svg`), `public/art/${slug}.svg`)
}
if (missing.length) {
  console.error('Missing OpenMoji annotations:', missing.join(', '))
  process.exit(1)
}
writeFileSync('public/art/CREDITS.md', `# Art credits

Illustrations: **OpenMoji** – the open-source emoji and icon project.
License: CC BY-SA 4.0 — https://openmoji.org — https://creativecommons.org/licenses/by-sa/4.0/

The mascot, ten-frames, counters, number lines, shapes and place-value blocks are drawn in code for this app.
Sound effects are synthesized in the browser with the Web Audio API.
Font: Nunito (SIL Open Font License 1.1).
`)
console.log(`Copied ${Object.keys(list).length} OpenMoji SVGs to public/art/`)
