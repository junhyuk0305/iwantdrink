import { useState, useEffect } from 'react'
import { useVenue } from '../store/useDrinkStore.js'

// 배경 사진 + 분위기 오버레이.
// 사진은 public/venues/{id}.png 에 있으면 자동 로드.
// 사진이 들어와도 잔/입력창/사이드바가 또렷이 보이도록 여러 겹 오버레이.
export default function Venue() {
  const venue = useVenue()
  const [imageOk, setImageOk] = useState(false)

  useEffect(() => {
    if (!venue) return
    setImageOk(false)
    const img = new Image()
    img.onload = () => setImageOk(true)
    img.onerror = () => setImageOk(false)
    img.src = venue.bg
  }, [venue])

  if (!venue) return null

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      {/* 1. 사진 (있으면) — 약간 더 어둡고 채도 낮춰서 배경다움 강조 */}
      {imageOk && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${venue.bg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'saturate(0.85) brightness(0.55) contrast(1.05)',
          }}
        />
      )}
      {!imageOk && (
        <div className="absolute inset-0" style={{ background: venue.fallback.base }} />
      )}

      {/* 2. 분위기 glow (사진 위에서 색감 보강) */}
      <div
        className="absolute inset-0"
        style={{ background: venue.fallback.glow, mixBlendMode: 'screen' }}
      />

      {/* 3. 가독성 비네트 — 가장자리 어둡게 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 25%, rgba(0,0,0,0.65) 90%)',
        }}
      />

      {/* 4. 잔 중앙 영역 살짝 어둡게 — 잔이 사진 위에서 잘 떠오르도록 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 32% 38% at 50% 44%, rgba(0,0,0,0.45) 0%, transparent 70%)',
        }}
      />

      {/* 5. 사이드바 영역 — 좌측 어두운 그라데이션 (Sidebar 가독성) */}
      <div
        className="absolute inset-y-0 left-0 w-[170px]"
        style={{
          background:
            'linear-gradient(90deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.45) 60%, transparent 100%)',
        }}
      />

      {/* 6. 입력창 영역 — 하단 어두운 그라데이션 */}
      <div
        className="absolute inset-x-0 bottom-0 h-[200px]"
        style={{
          background:
            'linear-gradient(0deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
        }}
      />

      {/* 7. 상단도 살짝 어둡게 — 떠다니는 글씨 가독성 */}
      <div
        className="absolute inset-x-0 top-0 h-[120px]"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 100%)',
        }}
      />

      {/* 8. 비 (포차 전용) */}
      {venue.rain && <RainOverlay />}

      {/* 9. 미세 노이즈 — 사진과 어울려 필름 느낌 */}
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='180' height='180' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  )
}

function RainOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260' viewBox='0 0 260 260'><g stroke='rgba(190,215,240,0.7)' stroke-width='0.9' stroke-linecap='round'><line x1='20' y1='10' x2='13' y2='42'/><line x1='80' y1='30' x2='73' y2='62'/><line x1='150' y1='8' x2='143' y2='40'/><line x1='190' y1='55' x2='184' y2='92'/><line x1='40' y1='90' x2='34' y2='126'/><line x1='110' y1='110' x2='104' y2='144'/><line x1='170' y1='130' x2='164' y2='164'/><line x1='60' y1='170' x2='54' y2='200'/><line x1='130' y1='180' x2='124' y2='210'/><line x1='220' y1='35' x2='214' y2='68'/><line x1='235' y1='145' x2='229' y2='178'/><line x1='10' y1='195' x2='4' y2='228'/><line x1='95' y1='220' x2='89' y2='250'/><line x1='175' y1='205' x2='169' y2='238'/></g></svg>\")",
          backgroundSize: '260px 260px',
          animation: 'rain 0.6s linear infinite',
        }}
      />
      <style>{`
        @keyframes rain {
          0% { background-position: 0 0; }
          100% { background-position: -30px 260px; }
        }
      `}</style>
    </div>
  )
}
