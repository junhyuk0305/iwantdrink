import { useEffect, useState, useRef } from 'react'
import { CHATTER_LINES } from '../data/chatter.js'
import { fetchAmbientLines } from '../lib/supabase.js'

// 화면 사방에 1-3개씩 떠오르는 다른 사람들의 토로.
// 각 메시지는 랜덤 슬롯에 등장 → 살짝 떠오르며 fade in → 머물기 → fade out.

const SLOTS = [
  // 화면 4분면 안에서 약간 안쪽 — 중앙 잔/입력창 피해서
  { side: 'TL', topPct: 18, leftPct: 14, rot: -2 },
  { side: 'TR', topPct: 22, rightPct: 12, rot: 2 },
  { side: 'BL', bottomPct: 35, leftPct: 13, rot: -1 },
  { side: 'BR', bottomPct: 38, rightPct: 11, rot: 3 },
  { side: 'TM', topPct: 10, leftPct: 38, rot: 0 },
]

const MAX_ACTIVE = 3
const APPEAR_INTERVAL_MS = 1800
const LIFETIME_MS = 6500

let nextId = 1

function pickRandom(arr, excludeIds = []) {
  const pool = arr.filter((_, i) => !excludeIds.includes(i))
  return pool[Math.floor(Math.random() * pool.length)]
}

export default function AmbientChatter() {
  const [active, setActive] = useState([])
  const usedLineIdxRef = useRef([])
  // 실제 DB의 최근 글 + 로컬 풀 (실제 글을 60%, 로컬을 40% 비율로 섞음)
  const linesPoolRef = useRef(CHATTER_LINES)

  useEffect(() => {
    let cancelled = false
    // 실제 DB의 최근 글을 가져와 풀에 추가
    fetchAmbientLines(40).then((dbLines) => {
      if (cancelled) return
      if (dbLines.length === 0) return
      // 너무 긴 글은 자름
      const trimmed = dbLines.map((t) => (t.length > 36 ? t.slice(0, 34) + '…' : t))
      linesPoolRef.current = [...trimmed, ...CHATTER_LINES]
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let timer

    function spawn() {
      if (cancelled) return
      setActive((curr) => {
        if (curr.length >= MAX_ACTIVE) return curr
        const usedSlots = curr.map((c) => c.slotIdx)
        const availableSlots = SLOTS.map((_, i) => i).filter(
          (i) => !usedSlots.includes(i),
        )
        if (!availableSlots.length) return curr
        const slotIdx = availableSlots[Math.floor(Math.random() * availableSlots.length)]

        const pool = linesPoolRef.current
        const usedLines = usedLineIdxRef.current
        let lineIdx = Math.floor(Math.random() * pool.length)
        let tries = 0
        while (usedLines.includes(lineIdx) && tries < 8) {
          lineIdx = Math.floor(Math.random() * pool.length)
          tries++
        }
        usedLineIdxRef.current = [...usedLines, lineIdx].slice(-8)

        const id = nextId++
        const item = {
          id,
          slotIdx,
          text: pool[lineIdx],
        }

        // 수명 후 제거
        setTimeout(() => {
          if (cancelled) return
          setActive((s) => s.filter((x) => x.id !== id))
        }, LIFETIME_MS)

        return [...curr, item]
      })
    }

    // 첫 등장: 약간 빠르게 1개
    timer = setTimeout(spawn, 400)

    const interval = setInterval(spawn, APPEAR_INTERVAL_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
      {active.map((item) => {
        const slot = SLOTS[item.slotIdx]
        const style = {
          position: 'absolute',
          ...(slot.topPct != null && { top: `${slot.topPct}%` }),
          ...(slot.bottomPct != null && { bottom: `${slot.bottomPct}%` }),
          ...(slot.leftPct != null && { left: `${slot.leftPct}%` }),
          ...(slot.rightPct != null && { right: `${slot.rightPct}%` }),
          transform: `rotate(${slot.rot}deg)`,
        }
        return (
          <div key={item.id} style={style} className="select-none">
            <ChatterBubble text={item.text} />
          </div>
        )
      })}
    </div>
  )
}

function ChatterBubble({ text }) {
  return (
    <div
      className="relative"
      style={{
        animation: `chatter ${LIFETIME_MS}ms ease-out forwards`,
      }}
    >
      {/* 흐릿한 잔 실루엣 (간단한 SVG) */}
      <svg
        width="28"
        height="36"
        viewBox="0 0 28 36"
        className="opacity-25 mx-auto mb-1"
        style={{ filter: 'blur(0.5px)' }}
      >
        <path
          d="M 5 4 L 23 4 L 22 26 L 24 28 L 24 31 L 4 31 L 4 28 L 6 26 Z"
          fill="rgba(255,255,255,0.4)"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="0.5"
        />
        <rect
          x="6"
          y="14"
          width="16"
          height="12"
          fill="rgba(255,200,140,0.5)"
          rx="0.5"
        />
      </svg>

      {/* 글씨 — 손글씨 폰트, 살짝 글로우 */}
      <p
        className="font-handwriting text-base text-white/85 whitespace-nowrap"
        style={{
          textShadow:
            '0 0 12px rgba(255,180,100,0.45), 0 2px 6px rgba(0,0,0,0.7)',
        }}
      >
        {text}
      </p>

      <style>{`
        @keyframes chatter {
          0% { opacity: 0; transform: translateY(8px); filter: blur(2px); }
          18% { opacity: 1; transform: translateY(0); filter: blur(0); }
          70% { opacity: 1; transform: translateY(-6px); filter: blur(0); }
          100% { opacity: 0; transform: translateY(-22px); filter: blur(2px); }
        }
      `}</style>
    </div>
  )
}
