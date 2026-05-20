import { useEffect, useId, useRef, useState } from 'react'

// 액체 표면 wave path 생성 (sin 기반)
function buildWavePath(leftX, rightX, baseY, amp, phase, samples = 24) {
  const step = (rightX - leftX) / samples
  let d = `M ${leftX} ${baseY + 18} L ${leftX} ${baseY}`
  for (let i = 0; i <= samples; i++) {
    const x = leftX + step * i
    const t = (i / samples) * Math.PI * 4 + phase
    const y = baseY + Math.sin(t) * amp + Math.sin(t * 1.7 + 0.4) * amp * 0.4
    d += ` L ${x} ${y}`
  }
  d += ` L ${rightX} ${baseY + 18} Z`
  return d
}

export default function Glass({
  glass,
  fillRatio = 0,
  tilt = 0, // 원샷 시 기울기 (degrees)
  drainBoost = 0, // 원샷 애니메이션 — 양수면 빨리 비워짐
  liquidColor, // 술 색 (없으면 잔 첫 술 사용)
  liquidEdge,
}) {
  const fallbackDrink = glass.drinks?.[0] ?? { color: '#f7faf7', edge: '#cfe0d2' }
  const liqColor = liquidColor ?? fallbackDrink.color
  const liqEdge = liquidEdge ?? fallbackDrink.edge
  const uid = useId().replace(/:/g, '-')
  const [phase, setPhase] = useState(0)
  const [animatedRatio, setAnimatedRatio] = useState(0)
  const rafRef = useRef()
  const lastRef = useRef(performance.now())

  const target = Math.max(0, Math.min(fillRatio, 1)) * (1 - drainBoost)

  useEffect(() => {
    const tick = (now) => {
      const dt = Math.min((now - lastRef.current) / 1000, 0.05)
      lastRef.current = now
      setPhase((p) => p + dt * 2.2)
      setAnimatedRatio((r) => {
        const k = drainBoost > 0 ? 12 : 8
        return r + (target - r) * (1 - Math.exp(-k * dt))
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, drainBoost])

  const { viewBox, width, outerPath, innerPath, extraPath, facets, rim, liquidRange, iceCubes } = glass
  const { top: liqTop, bottom: liqBot } = liquidRange
  const fillH = (liqBot - liqTop) * animatedRatio
  const liquidTopY = liqBot - fillH

  // viewBox 가로/세로
  const [, , vw, vh] = viewBox.split(' ').map(Number)
  const height = (width * vh) / vw
  // tilt 회전 중심을 잔 바닥 중앙으로 — viewBox 단위가 아닌 픽셀 단위
  const pivotX = width / 2
  const pivotY = (glass.groundY * height) / vh

  const wavePath =
    animatedRatio > 0.01
      ? buildWavePath(rim.innerLeftX + 1, rim.innerRightX - 1, liquidTopY, 0.9, phase)
      : null

  return (
    <svg
      width={width}
      height={height}
      viewBox={viewBox}
      style={{
        overflow: 'visible',
        transform: `rotate(${tilt}deg)`,
        transformOrigin: `${pivotX}px ${pivotY}px`,
        transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }}
    >
      <defs>
        {/* 잔 안쪽 영역 clip — 액체가 잔 밖으로 안 새도록 */}
        <clipPath id={`liq-clip-${uid}`}>
          <path d={innerPath} />
        </clipPath>

        {/* 유리 광택 그라데이션 (왼쪽 흰빛, 가운데 투명, 오른쪽 어두움) */}
        <linearGradient id={`glass-grad-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
          <stop offset="20%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0)" />
          <stop offset="85%" stopColor="rgba(0,0,0,0.18)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
        </linearGradient>

        {/* 액체 세로 그라데이션 (위는 밝게, 아래는 진하게) */}
        <linearGradient id={`liq-grad-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={liqColor} stopOpacity="0.95" />
          <stop offset="100%" stopColor={liqEdge} stopOpacity="0.95" />
        </linearGradient>

        {/* 액체 표면 글로스 */}
        <linearGradient id={`liq-top-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>

        {/* 유리 외곽 부드러운 그림자 */}
        <filter id={`glass-shadow-${uid}`} x="-30%" y="-10%" width="160%" height="130%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" />
          <feOffset dx="0" dy="2" result="off" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.5" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 유리 본체 — 살짝 청록빛 도는 투명 */}
      <path
        d={outerPath}
        fill="rgba(220, 230, 235, 0.12)"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="0.7"
      />
      {extraPath && (
        <path
          d={extraPath}
          fill="rgba(220, 230, 235, 0.10)"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="0.7"
        />
      )}

      {/* 액체 (clip 안에서만 보임) */}
      <g clipPath={`url(#liq-clip-${uid})`}>
        {animatedRatio > 0.005 && (
          <>
            {/* 액체 본체 */}
            <rect
              x={rim.innerLeftX - 2}
              y={liquidTopY}
              width={rim.innerRightX - rim.innerLeftX + 4}
              height={liqBot - liquidTopY + 4}
              fill={`url(#liq-grad-${uid})`}
            />
            {/* 출렁이는 표면 wave */}
            {wavePath && (
              <>
                <path d={wavePath} fill={`url(#liq-grad-${uid})`} />
                <path
                  d={wavePath}
                  fill="none"
                  stroke="rgba(255,255,255,0.55)"
                  strokeWidth="0.6"
                />
              </>
            )}
            {/* 표면 글로스 (상단 5% 영역) */}
            <rect
              x={rim.innerLeftX}
              y={liquidTopY}
              width={rim.innerRightX - rim.innerLeftX}
              height={4}
              fill={`url(#liq-top-${uid})`}
            />
          </>
        )}

        {/* 위스키잔 — 얼음 큐브 (액체보다 위에서 살짝 떠 있게) */}
        {iceCubes && animatedRatio > 0.2 && (
          <>
            <IceCube
              cx={(rim.innerLeftX + rim.innerRightX) / 2 - 12}
              cy={liquidTopY + 5}
              size={18}
              rotate={-12}
            />
            <IceCube
              cx={(rim.innerLeftX + rim.innerRightX) / 2 + 15}
              cy={liquidTopY + 10}
              size={16}
              rotate={20}
            />
          </>
        )}
      </g>

      {/* 육각 면 라인 */}
      {facets.map((f, i) => (
        <line
          key={i}
          x1={f.x1}
          y1={f.y1}
          x2={f.x2}
          y2={f.y2}
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="0.5"
          opacity={f.opacity}
        />
      ))}

      {/* 유리 광택 오버레이 (전체 위에) */}
      <path
        d={outerPath}
        fill={`url(#glass-grad-${uid})`}
        style={{ mixBlendMode: 'screen' }}
      />

      {/* 잔 입구(rim) 윗면 라이트 라인 */}
      <line
        x1={rim.leftX}
        y1={rim.y}
        x2={rim.rightX}
        y2={rim.y}
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="0.6"
      />
    </svg>
  )
}

function IceCube({ cx, cy, size, rotate }) {
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rotate})`}>
      <rect
        x={-size / 2}
        y={-size / 2}
        width={size}
        height={size}
        rx="2"
        fill="rgba(255,255,255,0.35)"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="0.5"
      />
      <rect
        x={-size / 2 + 2}
        y={-size / 2 + 2}
        width={size / 3}
        height={size / 3}
        rx="1"
        fill="rgba(255,255,255,0.5)"
      />
    </g>
  )
}
