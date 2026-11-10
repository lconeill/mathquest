import { HashRouter, Route, Routes } from 'react-router-dom'
import ProfilePicker from './pages/ProfilePicker'
import Home from './pages/Home'
import Session from './pages/Session'
import Stickers from './pages/Stickers'
import Parent from './pages/Parent'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ProfilePicker />} />
        <Route path="/p/:id" element={<Home />} />
        <Route path="/p/:id/play" element={<Session />} />
        <Route path="/p/:id/stickers" element={<Stickers />} />
        <Route path="/parent/*" element={<Parent />} />
      </Routes>
    </HashRouter>
  )
}
