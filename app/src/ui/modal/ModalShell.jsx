// 공통 모달 셸 — 백드롭 + 카드 + ESC 닫기
import { useEffect } from 'react'

export default function ModalShell({ onClose, children, wide = false, side = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (side) {
    // 우측 슬라이드 패널
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        />
        <div
          className="relative h-full w-full sm:w-[440px] bg-[#0d0a08] border-l border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.6)] animate-[slideInR_0.28s_ease-out] flex flex-col"
        >
          {children}
        </div>
        <style>{`
          @keyframes slideInR { from { transform: translateX(100%); } to { transform: translateX(0); } }
        `}</style>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        onClick={onClose}
        aria-label="닫기"
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
      />
      <div
        className={[
          'relative rounded-2xl border border-white/10 bg-[#0e0a08] shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden',
          wide ? 'w-full max-w-3xl max-h-[88vh]' : 'w-full max-w-md',
          'animate-[modalPop_0.18s_ease-out]',
        ].join(' ')}
      >
        {children}
      </div>
      <style>{`
        @keyframes modalPop {
          0% { opacity: 0; transform: scale(0.96) translateY(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}
