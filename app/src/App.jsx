import { useEffect } from 'react'
import Venue from './ui/Venue.jsx'
import GlassStage from './ui/GlassStage.jsx'
import ChatInput from './ui/ChatInput.jsx'
import Sidebar from './ui/Sidebar.jsx'
import AmbientChatter from './ui/AmbientChatter.jsx'
import ShootFlash from './ui/ShootFlash.jsx'
import SurveyModal from './ui/modal/SurveyModal.jsx'
import LoginGate from './ui/modal/LoginGate.jsx'
import LoginModal from './ui/modal/LoginModal.jsx'
import FeedModal from './ui/modal/FeedModal.jsx'
import StatsModal from './ui/modal/StatsModal.jsx'
import { initAuth } from './store/useDrinkStore.js'
import './App.css'

export default function App() {
  useEffect(() => {
    initAuth()
  }, [])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <Venue />
      <AmbientChatter />
      <GlassStage />
      <Sidebar />
      <ChatInput />
      <ShootFlash />

      {/* 모달들 — store.openModal 에 따라 하나만 렌더 */}
      <SurveyModal />
      <LoginGate />
      <LoginModal />
      <FeedModal />
      <StatsModal />
    </div>
  )
}
