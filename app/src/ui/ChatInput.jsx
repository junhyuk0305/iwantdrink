import { useEffect, useRef } from 'react'
import { useDrinkStore, useGlass, useRemainingShots } from '../store/useDrinkStore.js'

export default function ChatInput() {
  const text = useDrinkStore((s) => s.text)
  const setText = useDrinkStore((s) => s.setText)
  const shoot = useDrinkStore((s) => s.shoot)
  const shooting = useDrinkStore((s) => s.shooting)
  const openGate = useDrinkStore((s) => s.openGate)
  const user = useDrinkStore((s) => s.user)
  const glass = useGlass()
  const remaining = useRemainingShots()

  const taRef = useRef()
  const max = glass.maxChars
  const overflowing = text.length > max
  const ratio = Math.min(text.length / max, 1)
  const limitReached = !user && remaining <= 0
  const canShoot =
    text.length >= Math.max(3, Math.floor(max * 0.5)) && !shooting && !limitReached

  useEffect(() => {
    if (taRef.current && !limitReached) taRef.current.focus()
  }, [glass.id, limitReached])

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 pointer-events-none">
      <div className="mx-auto max-w-md px-4 pb-5 pointer-events-auto">
        {/* 글자수 + 일일 잔 잔여 */}
        <div className="flex items-center justify-between mb-1 px-1">
          {!user && (
            <span className="text-[10px] text-white/40">
              오늘 남은 잔
              <span className={remaining > 0 ? 'text-amber-200 font-semibold ml-1' : 'text-red-400 font-semibold ml-1'}>
                {remaining}
              </span>
            </span>
          )}
          <span
            className={[
              'text-[10px] font-mono ml-auto',
              overflowing ? 'text-red-400 font-semibold' : 'text-white/40',
            ].join(' ')}
          >
            {text.length} / {max}
            {overflowing ? '  ⚠' : ''}
          </span>
        </div>

        {/* 입력창 본체 */}
        <div
          className={[
            'relative rounded-xl backdrop-blur-md bg-black/55 border transition-all',
            overflowing
              ? 'border-red-500/80 shadow-[0_0_22px_rgba(239,68,68,0.4)] animate-pulse-warn'
              : limitReached
                ? 'border-amber-400/50'
                : 'border-white/15',
          ].join(' ')}
        >
          {limitReached ? (
            <button
              onClick={openGate}
              className="w-full px-3 py-4 text-left text-amber-100/85 text-sm hover:bg-white/[0.04] transition-colors"
            >
              오늘 3잔을 다 채우셨어요.{' '}
              <span className="underline text-amber-200">한 잔 더 받기</span>
            </button>
          ) : (
            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  if (canShoot) shoot()
                }
              }}
              placeholder="비어 있는 잔에 오늘 하루를 부어보세요..."
              rows={2}
              disabled={shooting}
              className="no-scrollbar w-full resize-none bg-transparent text-white placeholder-white/35 px-3 py-2 outline-none text-[13px] leading-relaxed"
            />
          )}

          <div className="h-1 rounded-b-xl bg-amber-50/5 overflow-hidden">
            <div
              className={[
                'h-full transition-all duration-150',
                overflowing
                  ? 'bg-gradient-to-r from-red-400 to-red-600'
                  : 'bg-gradient-to-r from-amber-200 to-amber-500',
              ].join(' ')}
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <p className="text-[10px] text-white/35">
            <kbd className="px-1 py-0.5 rounded bg-white/10 text-[9px]">Ctrl</kbd>{' '}
            <kbd className="px-1 py-0.5 rounded bg-white/10 text-[9px]">Enter</kbd> 원샷
          </p>
          <button
            onClick={shoot}
            disabled={!canShoot}
            className={[
              'px-4 py-1.5 rounded-full font-semibold text-xs transition-all',
              canShoot
                ? 'bg-gradient-to-br from-amber-400 to-orange-600 text-black shadow-[0_2px_16px_rgba(255,140,40,0.4)] hover:scale-[1.04] active:scale-[0.98]'
                : 'bg-white/8 text-white/35 cursor-not-allowed',
            ].join(' ')}
          >
            <span className="mr-1">{glass.emoji}</span>
            원샷하기
          </button>
        </div>
      </div>
    </div>
  )
}
