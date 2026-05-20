import { useEffect, useRef, useState, useId } from 'react'

// 잔에서 넘쳐 흐르는 두 줄기 + 바닥 웅덩이
// overflow = (글자수 - max) / max  (0 이상)
// glass = glasses.js 정의

function buildPuddleD(scale = 1, seed = 0) {
  // 부정형 웅덩이 — 7개 lobe sin 변형
  const samples = 80
  const lobes = 6
  let d = ''
  for (let i = 0; i <= samples; i++) {
    const a = (i / samples) * Math.PI * 2
    const r = (1 + Math.sin(a * lobes + seed) * 0.16 + Math.sin(a * 3 + 1.1 + seed) * 0.09) * 90 * scale
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r * 0.32 // y는 납작하게 (원근감)
    d += (i === 0 ? 'M' : 'L') + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ' '
  }
  return d + 'Z'
}

export default function OverflowDrip({
  glass,
  overflow = 0, // 0..∞
  containerWidth, // Glass의 렌더 width(px)
  visible = true,
  liquidColor,
  liquidEdge,
}) {
  const fallback = glass.drinks?.[0] ?? { color: '#f7faf7', edge: '#cfe0d2' }
  const liqColor = liquidColor ?? fallback.color
  const liqEdge = liquidEdge ?? fallback.edge
  const uid = useId().replace(/:/g, '-')
  const [animated, setAnimated] = useState(0)
  const rafRef = useRef()
  const lastRef = useRef(performance.now())

  useEffect(() => {
    const tick = (now) => {
      const dt = Math.min((now - lastRef.current) / 1000, 0.05)
      lastRef.current = now
      setAnimated((v) => v + (overflow - v) * (1 - Math.exp(-4 * dt)))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [overflow])

  if (!visible || animated < 0.001) return null

  // 잔의 viewBox 기준 좌표를 컨테이너 px로 변환
  const [, , vw] = glass.viewBox.split(' ').map(Number)
  const scale = containerWidth / vw

  const dripHeightPx = Math.min(40 + animated * 200, 320) // 흘러내리는 줄기 길이
  const dripWidthPx = Math.max(3, Math.min(2 + animated * 4, 8))

  const puddleScale = Math.min(0.25 + animated * 1.0, 1.6)
  const puddleSeed = 1.3

  // 두 줄기 위치: 잔 rim 양 끝
  const leftDripXPx = glass.rim.leftX * scale + 2
  const rightDripXPx = glass.rim.rightX * scale - 2
  const rimYPx = glass.rim.y * scale
  const groundYPx = glass.groundY * scale

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 flex justify-center"
      style={{ zIndex: 2 }}
    >
      <div
        className="relative"
        style={{ width: containerWidth, height: groundYPx + 80 }}
      >
        {/* 왼쪽 drip — rim 바깥쪽으로 살짝 빠져나가 직선 하강 */}
        <div
          style={{
            position: 'absolute',
            left: leftDripXPx - dripWidthPx / 2 - 2,
            top: rimYPx + 2,
            width: dripWidthPx,
            height: dripHeightPx,
            background: `linear-gradient(180deg, ${liqColor} 0%, ${liqEdge} 100%)`,
            borderRadius: `${dripWidthPx}px ${dripWidthPx}px ${dripWidthPx * 2}px ${dripWidthPx * 2}px`,
            boxShadow: `inset -1px 0 0 rgba(0,0,0,0.25), inset 1px 0 0 rgba(255,255,255,0.35), 0 0 6px ${liqColor}55`,
            opacity: 0.92,
            transition: 'height 120ms linear, width 120ms linear',
          }}
        />
        {/* 오른쪽 drip */}
        <div
          style={{
            position: 'absolute',
            left: rightDripXPx - dripWidthPx / 2 + 2,
            top: rimYPx + 2,
            width: dripWidthPx,
            height: dripHeightPx * 0.85,
            background: `linear-gradient(180deg, ${liqColor} 0%, ${liqEdge} 100%)`,
            borderRadius: `${dripWidthPx}px ${dripWidthPx}px ${dripWidthPx * 2}px ${dripWidthPx * 2}px`,
            boxShadow: `inset -1px 0 0 rgba(0,0,0,0.25), inset 1px 0 0 rgba(255,255,255,0.35), 0 0 6px ${liqColor}55`,
            opacity: 0.88,
            transition: 'height 120ms linear, width 120ms linear',
          }}
        />

        {/* 떨어지는 한 방울 (오른쪽) */}
        <div
          style={{
            position: 'absolute',
            left: rightDripXPx,
            top: rimYPx + dripHeightPx * 0.85,
            width: 6,
            height: 8,
            background: `radial-gradient(circle at 35% 30%, #ffffff80, ${liqColor} 60%, ${liqEdge})`,
            borderRadius: '50% 50% 60% 60%',
            transform: 'translate(-50%, 0)',
            animation: animated > 0.3 ? 'drop 0.9s ease-in infinite' : 'none',
            opacity: animated > 0.25 ? 1 : 0,
          }}
        />

        {/* 바닥 웅덩이 — SVG */}
        <svg
          width={containerWidth * 1.4}
          height={140}
          viewBox="-180 -50 360 140"
          style={{
            position: 'absolute',
            left: containerWidth / 2 - containerWidth * 0.7,
            top: groundYPx + 4,
            overflow: 'visible',
          }}
        >
          <defs>
            <radialGradient id={`puddle-${uid}`} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor={liqColor} stopOpacity="0.95" />
              <stop offset="70%" stopColor={liqEdge} stopOpacity="0.85" />
              <stop offset="100%" stopColor={liqEdge} stopOpacity="0.55" />
            </radialGradient>
            <radialGradient id={`puddle-gloss-${uid}`} cx="0.4" cy="0.3" r="0.6">
              <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
              <stop offset="60%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            <filter id={`puddle-shadow-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
              <feOffset dx="0" dy="2" result="off" />
              <feComponentTransfer><feFuncA type="linear" slope="0.6" /></feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            d={buildPuddleD(puddleScale, puddleSeed)}
            fill={`url(#puddle-${uid})`}
            filter={`url(#puddle-shadow-${uid})`}
          />
          <path
            d={buildPuddleD(puddleScale * 0.85, puddleSeed)}
            fill={`url(#puddle-gloss-${uid})`}
            style={{ mixBlendMode: 'screen' }}
          />
        </svg>
      </div>

      <style>{`
        @keyframes drop {
          0% { transform: translate(-50%, 0); opacity: 1; }
          85% { transform: translate(-50%, ${groundYPx - rimYPx - dripHeightPx * 0.85 - 20}px); opacity: 1; }
          100% { transform: translate(-50%, ${groundYPx - rimYPx - dripHeightPx * 0.85 - 10}px); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
