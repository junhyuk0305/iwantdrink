import { useDrinkStore, DAILY_LIMIT_ANON } from '../../store/useDrinkStore.js'
import ModalShell from './ModalShell.jsx'

// 4잔째 시도 시 뜨는 게이트. 로그인 또는 설문 풀기 안내.
export default function LoginGate() {
  const openModal = useDrinkStore((s) => s.openModal)
  const close = useDrinkStore((s) => s.closeModal)
  const openLogin = useDrinkStore((s) => s.openLogin)
  const openSurvey = useDrinkStore((s) => s.openSurvey)

  if (openModal !== 'gate') return null

  return (
    <ModalShell onClose={close}>
      <div className="p-6">
        <p className="text-[11px] uppercase tracking-[0.25em] text-amber-200/60">
          오늘 {DAILY_LIMIT_ANON}잔 채우셨네요
        </p>
        <h2 className="mt-1 font-handwriting text-3xl text-amber-100">
          한 모금 더 마시고 싶다면…
        </h2>
        <p className="mt-2 text-sm text-white/55">
          비로그인은 하루 {DAILY_LIMIT_ANON}잔까지예요. 두 가지 길이 있어요.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3">
          <button
            onClick={openLogin}
            className="text-left p-4 rounded-xl bg-white/[0.04] border border-white/10 hover:border-amber-300/60 hover:bg-white/[0.08] transition-all group"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">📬</span>
              <div className="flex-1">
                <p className="font-semibold text-white">이메일로 로그인</p>
                <p className="text-xs text-white/55 mt-0.5">
                  무제한으로 마시기 + 모든 기기에서 잔/술 보존
                </p>
              </div>
              <span className="text-white/40 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
          </button>

          <button
            onClick={() => openSurvey()}
            className="text-left p-4 rounded-xl bg-white/[0.04] border border-white/10 hover:border-amber-300/60 hover:bg-white/[0.08] transition-all group"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">📝</span>
              <div className="flex-1">
                <p className="font-semibold text-white">한 병 풀고 술 받기</p>
                <p className="text-xs text-white/55 mt-0.5">
                  5문항 → 술 1병 (5잔) 인벤토리에. 다른 사람에게 따라줄 때도 사용 가능
                </p>
              </div>
              <span className="text-white/40 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
          </button>
        </div>

        <button
          onClick={close}
          className="mt-4 w-full text-center text-xs text-white/30 hover:text-white/60 py-2 transition-colors"
        >
          내일 다시 마시기
        </button>
      </div>
    </ModalShell>
  )
}
