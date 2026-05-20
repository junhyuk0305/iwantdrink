import { useState } from 'react'
import { useDrinkStore } from '../../store/useDrinkStore.js'
import { sendMagicLink, signOut, isSupabaseConfigured } from '../../lib/supabase.js'
import ModalShell from './ModalShell.jsx'

export default function LoginModal() {
  const openModal = useDrinkStore((s) => s.openModal)
  const close = useDrinkStore((s) => s.closeModal)
  const user = useDrinkStore((s) => s.user)

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [errMsg, setErrMsg] = useState('')

  if (openModal !== 'login') return null

  async function handleSend(e) {
    e.preventDefault()
    if (!email.includes('@')) return
    setStatus('sending')
    setErrMsg('')
    try {
      await sendMagicLink(email.trim())
      setStatus('sent')
    } catch (err) {
      setStatus('error')
      setErrMsg(err.message ?? '전송 실패')
    }
  }

  return (
    <ModalShell onClose={close}>
      <div className="p-6">
        {user ? (
          <SignedInView user={user} onSignOut={async () => { await signOut(); close() }} onClose={close} />
        ) : !isSupabaseConfigured ? (
          <NotConfigured onClose={close} />
        ) : status === 'sent' ? (
          <SentView email={email} onClose={close} />
        ) : (
          <SignInForm
            email={email}
            setEmail={setEmail}
            onSubmit={handleSend}
            sending={status === 'sending'}
            err={errMsg}
          />
        )}
      </div>
    </ModalShell>
  )
}

function SignInForm({ email, setEmail, onSubmit, sending, err }) {
  return (
    <form onSubmit={onSubmit}>
      <p className="text-[11px] uppercase tracking-[0.25em] text-amber-200/60">
        매직링크 로그인
      </p>
      <h2 className="mt-1 font-handwriting text-3xl text-amber-100">
        이메일만 알려주세요
      </h2>
      <p className="mt-2 text-sm text-white/55">
        보내드린 메일의 링크를 클릭하면 자동 로그인됩니다. 비밀번호 따로 없어요.
      </p>

      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="mt-5 w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 focus:border-amber-300/60 outline-none text-white placeholder-white/30"
      />

      {err && <p className="mt-2 text-xs text-red-400">⚠ {err}</p>}

      <button
        type="submit"
        disabled={sending || !email.includes('@')}
        className="mt-4 w-full px-5 py-3 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-black font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] transition-all"
      >
        {sending ? '보내는 중…' : '링크 받기'}
      </button>
    </form>
  )
}

function SentView({ email, onClose }) {
  return (
    <div className="text-center py-4">
      <div className="text-5xl mb-3">📬</div>
      <h2 className="font-handwriting text-3xl text-amber-100">메일을 보냈어요</h2>
      <p className="mt-2 text-sm text-white/55">
        <span className="text-amber-200/80">{email}</span> 으로 매직링크를 보냈습니다.
        <br />
        링크를 클릭하면 자동으로 로그인돼요.
      </p>
      <button
        onClick={onClose}
        className="mt-5 px-5 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm transition-all"
      >
        확인
      </button>
    </div>
  )
}

function SignedInView({ user, onSignOut, onClose }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.25em] text-amber-200/60">
        로그인 됨
      </p>
      <h2 className="mt-1 font-handwriting text-2xl text-amber-100 break-all">
        {user.email}
      </h2>
      <p className="mt-2 text-sm text-white/55">
        무제한으로 마실 수 있어요. 인벤토리와 답변은 자동 동기화됩니다.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onSignOut}
          className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-all"
        >
          로그아웃
        </button>
        <button
          onClick={onClose}
          className="px-5 py-2 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-black text-sm font-semibold transition-all"
        >
          닫기
        </button>
      </div>
    </div>
  )
}

function NotConfigured({ onClose }) {
  return (
    <div>
      <h2 className="font-handwriting text-2xl text-amber-100">로그인 비활성</h2>
      <p className="mt-2 text-sm text-white/55">
        Supabase가 아직 설정되지 않았습니다. <code className="text-amber-200/80">app/.env.local</code> 에 키를 넣으면 활성화돼요.
        자세한 건 <code className="text-amber-200/80">SETUP.md</code> 참고.
      </p>
      <button
        onClick={onClose}
        className="mt-4 w-full px-5 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm transition-all"
      >
        닫기
      </button>
    </div>
  )
}
