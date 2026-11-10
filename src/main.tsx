import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/nunito'
import './index.css'
import App from './App.tsx'
import { getSettings } from './db'
import { configureAudio } from './audio'

registerSW({ immediate: true })

getSettings().then((s) => {
  configureAudio({ voiceURI: s.voiceURI, rate: s.rate, sound: s.sound })
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
