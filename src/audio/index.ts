/**
 * Voice: Web Speech TTS (works offline on Android when a voice is installed).
 * Everything goes through say() so recorded clips can replace TTS later.
 * Sound effects are synthesized with Web Audio — no files, no licences.
 */

let voiceURI: string | undefined
let rate = 0.9
let soundOn = true

export function configureAudio(o: { voiceURI?: string; rate?: number; sound?: boolean }) {
  if ('voiceURI' in o) voiceURI = o.voiceURI
  if (o.rate !== undefined) rate = o.rate
  if (o.sound !== undefined) soundOn = o.sound
}

export const ttsSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export function listVoices(): SpeechSynthesisVoice[] {
  if (!ttsSupported()) return []
  return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'))
}

/** Voices load asynchronously on Chrome/Android. */
export function whenVoicesReady(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!ttsSupported()) return resolve([])
    const v = listVoices()
    if (v.length) return resolve(v)
    const done = () => resolve(listVoices())
    speechSynthesis.addEventListener('voiceschanged', done, { once: true })
    setTimeout(done, 1500)
  })
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const vs = listVoices()
  return vs.find((v) => v.voiceURI === voiceURI)
    ?? vs.find((v) => /en[-_]US/i.test(v.lang) && v.localService)
    ?? vs.find((v) => v.localService)
    ?? vs[0]
}

/** Speak text, interrupting anything already being said. Resolves when finished. */
export function say(text: string, opts: { interrupt?: boolean } = {}): Promise<void> {
  if (!ttsSupported()) return Promise.resolve()
  if (opts.interrupt !== false) speechSynthesis.cancel()
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    const v = pickVoice()
    if (v) { u.voice = v; u.lang = v.lang } else u.lang = 'en-US'
    u.rate = rate
    u.pitch = 1.15
    u.onend = () => resolve()
    u.onerror = () => resolve()
    speechSynthesis.speak(u)
    // Safety net: some engines never fire onend.
    setTimeout(resolve, 600 + text.length * 90)
  })
}

export const stopSpeaking = () => ttsSupported() && speechSynthesis.cancel()

// ---- Sound effects --------------------------------------------------------

let ctx: AudioContext | undefined
function ac(): AudioContext | undefined {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return undefined
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.18) {
  const c = ac()
  if (!c) return
  const t = c.currentTime + start
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(c.destination)
  o.start(t)
  o.stop(t + dur + 0.05)
}

export type Sfx = 'tap' | 'pop' | 'correct' | 'oops' | 'celebrate' | 'unlock'

export function sfx(kind: Sfx) {
  if (!soundOn) return
  switch (kind) {
    case 'tap': tone(660, 0, 0.08, 'triangle', 0.12); break
    case 'pop': tone(880, 0, 0.06, 'sine', 0.15); tone(1320, 0.04, 0.08, 'sine', 0.1); break
    case 'correct': [523, 659, 784].forEach((f, i) => tone(f, i * 0.09, 0.22, 'triangle')); break
    // Gentle, not punishing: a soft descending "hmm".
    case 'oops': tone(392, 0, 0.18, 'sine', 0.1); tone(330, 0.14, 0.24, 'sine', 0.08); break
    case 'celebrate': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.25, 'triangle', 0.16)); break
    case 'unlock': [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.3, 'sine', 0.14)); break
  }
}

export const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']

const PRAISE = ['Great job!', 'You got it!', 'Awesome!', 'Yes! Well done!', 'Super!', 'Nice counting!', 'Woo hoo!', 'Brilliant!']
const ENCOURAGE = ['Hmm, not quite. Let\'s try again!', 'Almost! Have another look.', 'Good try! Let\'s look together.']
export const praise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)]
export const encourage = (i: number) => ENCOURAGE[Math.min(i, ENCOURAGE.length - 1)]
