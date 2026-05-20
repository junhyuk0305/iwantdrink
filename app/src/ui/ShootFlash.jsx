import { useEffect, useState } from 'react'
import { useDrinkStore } from '../store/useDrinkStore.js'

// 원샷 직후 "캬~" 짧은 풀스크린 깜빡임 + 텍스트
export default function ShootFlash() {
  const shooting = useDrinkStore((s) => s.shooting)
  const shots = useDrinkStore((s) => s.shots)
  const [show, setShow] = useState(false)
  const [unlocked, setUnlocked] = useState(null)

  useEffect(() => {
    if (!shooting) return
    setShow(true)
    const t = setTimeout(() => setShow(false), 1300)

    // 잔 해금 알림 (이번 잔으로 해금된 게 있는지)
    const NEW_UNLOCKS = { 3: '맥주잔', 7: '와인잔', 15: '위스키잔' }
    if (NEW_UNLOCKS[shots]) {
      setUnlocked(NEW_UNLOCKS[shots])
      setTimeout(() => setUnlocked(null), 3200)
    }

    return () => clearTimeout(t)
  }, [shooting, shots])

  return (
    <>
      {show && (
        <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center">
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 45%, rgba(255,200,120,0.35) 0%, rgba(0,0,0,0) 60%)',
              animation: 'flash 1.2s ease-out forwards',
            }}
          />
          <div
            className="font-handwriting text-amber-100 text-7xl"
            style={{
              textShadow: '0 4px 30px rgba(0,0,0,0.6)',
              animation: 'kya 1.2s ease-out forwards',
            }}
          >
            캬~
          </div>
        </div>
      )}

      {unlocked && (
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
          style={{ animation: 'unlock 3.2s ease-out forwards' }}
        >
          <div className="rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 shadow-[0_8px_30px_rgba(255,140,40,0.5)]">
            <p className="text-black text-sm font-bold">
              🔓 새 잔이 해금됐어요 — {unlocked}
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes flash {
          0% { opacity: 0; }
          15% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes kya {
          0% { opacity: 0; transform: scale(0.7) translateY(20px); }
          20% { opacity: 1; transform: scale(1.05) translateY(0); }
          60% { opacity: 1; transform: scale(1) translateY(-10px); }
          100% { opacity: 0; transform: scale(0.95) translateY(-40px); }
        }
        @keyframes unlock {
          0% { opacity: 0; transform: translate(-50%, -10px); }
          10% { opacity: 1; transform: translate(-50%, 0); }
          85% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -10px); }
        }
      `}</style>
    </>
  )
}
