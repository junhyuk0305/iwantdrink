import { useEffect, useMemo, useState } from 'react'
import { useDrinkStore } from '../../store/useDrinkStore.js'
import { BOTTLES, BOTTLE_BY_ID, ROLE_PROBE, questionsForBottle } from '../../data/surveys.js'
import { GLASSES } from '../../data/glasses.js'
import ModalShell from './ModalShell.jsx'

export default function SurveyModal() {
  const openModal = useDrinkStore((s) => s.openModal)
  const close = useDrinkStore((s) => s.closeModal)
  const initialBottleId = useDrinkStore((s) => s.surveyBottleId)
  const persistedRole = useDrinkStore((s) => s.role)
  const surveyAnswers = useDrinkStore((s) => s.surveyAnswers)
  const answerSurvey = useDrinkStore((s) => s.answerSurvey)
  const finishBottle = useDrinkStore((s) => s.finishBottle)

  // 단계: 'pick-bottle' | 'probe' | 'questions' | 'reward'
  const [step, setStep] = useState('pick-bottle')
  const [bottleId, setBottleId] = useState(initialBottleId)
  const [probeRole, setProbeRole] = useState(persistedRole)
  const [qIdx, setQIdx] = useState(0)
  const [pendingReward, setPendingReward] = useState(null)

  // 모달이 열릴 때 초기 단계 결정
  useEffect(() => {
    if (openModal !== 'survey') return
    setBottleId(initialBottleId)
    setQIdx(0)
    setPendingReward(null)
    if (!persistedRole) setStep('probe')
    else if (initialBottleId) setStep('questions')
    else setStep('pick-bottle')
  }, [openModal, initialBottleId, persistedRole])

  if (openModal !== 'survey') return null

  const bottle = bottleId ? BOTTLE_BY_ID[bottleId] : null
  const role = probeRole ?? persistedRole ?? 'junior'
  const questions = bottle ? questionsForBottle(bottle, role) : []
  const currentQ = questions[qIdx]
  const answeredInBottle = bottle
    ? Object.entries(surveyAnswers).filter(([, v]) => v.bottleId === bottleId).length
    : 0
  const progress = bottle ? Math.min(answeredInBottle / 5, 1) : 0

  // ─── handlers ───
  function handleProbe(optIdx) {
    const opt = ROLE_PROBE.options[optIdx]
    setProbeRole(opt.role)
    // 답은 진행상태로만 들고 있음 (별도 저장 안 함 — 다른 답변과 함께 finishBottle에서 일괄 저장)
    if (bottleId) setStep('questions')
    else setStep('pick-bottle')
  }

  function handleAnswer(optIdx) {
    if (!currentQ) return
    answerSurvey({
      bottleId,
      questionId: currentQ.id,
      answerIdx: optIdx,
      answerText: currentQ.options[optIdx],
      role,
    })
    if (qIdx + 1 < questions.length) {
      setQIdx(qIdx + 1)
    } else {
      // 5문항 다 답했으면 보상 선택 단계
      const rewardCandidates = bottle.rewardDrinks
      setPendingReward(rewardCandidates[0])
      setStep('reward')
    }
  }

  async function handleClaim() {
    if (!pendingReward || !bottle) return
    await finishBottle(bottle.id, pendingReward)
    setStep('done')
  }

  return (
    <ModalShell onClose={close} wide>
      <div className="p-6 sm:p-8">
        {step === 'pick-bottle' && (
          <BottlePicker
            onPick={(id) => {
              setBottleId(id)
              if (!persistedRole && !probeRole) setStep('probe')
              else setStep('questions')
            }}
            answers={surveyAnswers}
          />
        )}

        {step === 'probe' && <RoleProbe onPick={handleProbe} />}

        {step === 'questions' && bottle && currentQ && (
          <QuestionView
            bottle={bottle}
            qIdx={qIdx}
            total={questions.length}
            question={currentQ}
            progress={progress}
            onAnswer={handleAnswer}
            currentAnswerIdx={surveyAnswers[currentQ.id]?.answerIdx}
          />
        )}

        {step === 'reward' && bottle && (
          <RewardPicker
            bottle={bottle}
            selected={pendingReward}
            onSelect={setPendingReward}
            onClaim={handleClaim}
          />
        )}

        {step === 'done' && bottle && pendingReward && (
          <DoneView reward={pendingReward} onClose={close} onContinue={() => {
            setStep('pick-bottle')
            setBottleId(null)
            setQIdx(0)
            setPendingReward(null)
          }} />
        )}
      </div>
    </ModalShell>
  )
}

// ───── components ─────

function BottlePicker({ onPick, answers }) {
  return (
    <div>
      <h2 className="font-handwriting text-3xl text-amber-100">한 병 골라서 풀어보세요</h2>
      <p className="mt-2 text-sm text-white/55">
        5문항을 풀면 술 1병(=5잔)이 인벤토리에 채워집니다. 그 술로 다른 사람에게 한 잔 따라줄 수도 있어요.
      </p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {BOTTLES.map((b) => {
          const answered = Object.values(answers).filter((v) => v.bottleId === b.id).length
          const ratio = Math.min(answered / 5, 1)
          return (
            <button
              key={b.id}
              onClick={() => onPick(b.id)}
              className="text-left p-4 rounded-xl bg-white/[0.04] border border-white/10 hover:border-amber-300/50 hover:bg-white/[0.08] transition-all group"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{b.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{b.title}</p>
                  <p className="text-xs text-white/55 mt-0.5">{b.sub}</p>
                </div>
                <span className="text-[10px] text-white/40 font-mono">{answered}/5</span>
              </div>
              <div className="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-300 to-orange-500"
                  style={{ width: `${ratio * 100}%` }}
                />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function RoleProbe({ onPick }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.25em] text-amber-200/60">
        시작하기 전에 한 가지만
      </p>
      <h2 className="mt-1 font-handwriting text-3xl text-amber-100">{ROLE_PROBE.prompt}</h2>
      <p className="mt-2 text-sm text-white/55">
        답에 따라 보여드리는 문항이 살짝 달라집니다. 익명으로 저장됩니다.
      </p>
      <div className="mt-5 flex flex-col gap-2">
        {ROLE_PROBE.options.map((opt) => (
          <button
            key={opt.idx}
            onClick={() => onPick(opt.idx)}
            className="text-left px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-amber-300/50 hover:bg-white/[0.08] transition-all"
          >
            <span className="text-white">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function QuestionView({ bottle, qIdx, total, question, progress, onAnswer, currentAnswerIdx }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.25em] text-amber-200/60">
          {bottle.icon} {bottle.title}
        </p>
        <p className="text-[11px] text-white/45 font-mono">
          {qIdx + 1} / {total}
        </p>
      </div>

      <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-300 to-orange-500 transition-all duration-300"
          style={{ width: `${((qIdx + 1) / total) * 100}%` }}
        />
      </div>

      <h2 className="mt-6 font-handwriting text-3xl text-amber-100 leading-snug">
        {question.prompt}
      </h2>

      <div className="mt-5 flex flex-col gap-2">
        {question.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => onAnswer(i)}
            className={[
              'text-left px-4 py-3 rounded-xl border transition-all',
              currentAnswerIdx === i
                ? 'bg-amber-300/15 border-amber-300/60 text-amber-100'
                : 'bg-white/[0.04] border-white/10 hover:border-amber-300/50 hover:bg-white/[0.08] text-white',
            ].join(' ')}
          >
            <span className="text-sm">{opt}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function RewardPicker({ bottle, selected, onSelect, onClaim }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.25em] text-amber-200/60">
        {bottle.icon} {bottle.title} 완료
      </p>
      <h2 className="mt-1 font-handwriting text-3xl text-amber-100">
        한 병 받아가세요
      </h2>
      <p className="mt-2 text-sm text-white/55">
        고른 술 5잔이 인벤토리에 채워집니다. 다른 사람에게 따라줄 때 쓸 수 있어요.
      </p>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {bottle.rewardDrinks.map((drinkId) => {
          const drink = findDrink(drinkId)
          if (!drink) return null
          const active = selected === drinkId
          return (
            <button
              key={drinkId}
              onClick={() => onSelect(drinkId)}
              className={[
                'p-4 rounded-xl border transition-all flex flex-col items-center gap-2',
                active
                  ? 'bg-white/10 border-amber-300/70 shadow-[0_4px_24px_rgba(255,180,80,0.25)]'
                  : 'bg-white/[0.04] border-white/10 hover:border-amber-300/40',
              ].join(' ')}
            >
              <div
                className="w-10 h-12 rounded-md border border-white/30"
                style={{
                  background: `linear-gradient(180deg, ${drink.color} 0%, ${drink.edge} 100%)`,
                  boxShadow: `0 0 12px ${drink.color}55`,
                }}
              />
              <span className="text-xs text-white">{drink.label}</span>
              <span className="text-[10px] text-white/40">5잔</span>
            </button>
          )
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onClaim}
          disabled={!selected}
          className="px-5 py-2.5 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-black font-semibold text-sm shadow-[0_4px_24px_rgba(255,140,40,0.4)] disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.03] active:scale-[0.97] transition-all"
        >
          ✨ 받기
        </button>
      </div>
    </div>
  )
}

function DoneView({ reward, onClose, onContinue }) {
  const drink = findDrink(reward)
  return (
    <div className="text-center py-6">
      <div
        className="mx-auto w-16 h-20 rounded-md border border-white/30 mb-4"
        style={{
          background: `linear-gradient(180deg, ${drink?.color} 0%, ${drink?.edge} 100%)`,
          boxShadow: `0 0 24px ${drink?.color}88`,
          animation: 'bottlePop 0.5s ease-out',
        }}
      />
      <h2 className="font-handwriting text-3xl text-amber-100">{drink?.label} 5잔 들어왔어요</h2>
      <p className="mt-2 text-sm text-white/55">
        피드에서 다른 사람에게 따라줄 수 있어요.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <button
          onClick={onContinue}
          className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm transition-all"
        >
          한 병 더 풀기
        </button>
        <button
          onClick={onClose}
          className="px-5 py-2 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-black text-sm font-semibold transition-all"
        >
          돌아가기
        </button>
      </div>
      <style>{`
        @keyframes bottlePop {
          0% { transform: scale(0.4) translateY(20px); opacity: 0; }
          60% { transform: scale(1.08) translateY(0); opacity: 1; }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

function findDrink(drinkId) {
  for (const g of Object.values(GLASSES)) {
    const d = g.drinks.find((x) => x.id === drinkId)
    if (d) return d
  }
  return null
}
