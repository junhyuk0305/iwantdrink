import { useEffect, useState } from 'react'
import { useDrinkStore, useGlass, useDrink } from '../../store/useDrinkStore.js'
import { GLASSES } from '../../data/glasses.js'
import { VENUES } from '../../data/venues.js'
import { BOTTLE_BY_ID } from '../../data/surveys.js'
import {
  statsByGlassDrink,
  statsByRole,
  statsByVenue,
  isSupabaseConfigured,
} from '../../lib/supabase.js'
import ModalShell from './ModalShell.jsx'

const TABS = [
  { id: 'glass', label: '잔·술별' },
  { id: 'role', label: '주니어 vs 시니어' },
  { id: 'venue', label: '장소별' },
]

export default function StatsModal() {
  const openModal = useDrinkStore((s) => s.openModal)
  const close = useDrinkStore((s) => s.closeModal)
  const [tab, setTab] = useState('glass')

  if (openModal !== 'stats') return null

  return (
    <ModalShell onClose={close} wide>
      <div className="flex flex-col max-h-[88vh]">
        <div className="border-b border-white/10 px-6 pt-5 pb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-amber-200/60">통계</p>
            <h2 className="font-handwriting text-2xl text-amber-100 mt-0.5">
              다른 사람들은 어떻게 마시고 있나
            </h2>
          </div>
          <button onClick={close} className="text-white/40 hover:text-white text-xl">✕</button>
        </div>

        <div className="px-6 pt-3 flex gap-1 border-b border-white/5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                'px-3 py-2 text-sm rounded-t-md transition-colors',
                tab === t.id
                  ? 'text-amber-200 border-b-2 border-amber-300'
                  : 'text-white/45 hover:text-white border-b-2 border-transparent',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6">
          {!isSupabaseConfigured && (
            <p className="text-center text-white/45 text-xs py-10">
              Supabase가 설정되지 않아 통계를 불러올 수 없습니다.
            </p>
          )}
          {isSupabaseConfigured && tab === 'glass' && <GlassTab />}
          {isSupabaseConfigured && tab === 'role' && <RoleTab />}
          {isSupabaseConfigured && tab === 'venue' && <VenueTab />}
        </div>
      </div>
    </ModalShell>
  )
}

// ───── 잔×술 탭 — 현재 선택된 잔/술의 응답 통계 ─────
function GlassTab() {
  const glass = useGlass()
  const drink = useDrink()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    statsByGlassDrink(glass.id, drink.id)
      .then(setRows)
      .finally(() => setLoading(false))
  }, [glass.id, drink.id])

  // bottle → question → [{answer_text, c}]
  const tree = {}
  for (const r of rows) {
    tree[r.bottle_id] ??= {}
    tree[r.bottle_id][r.question_id] ??= []
    tree[r.bottle_id][r.question_id].push({ answer: r.answer_text, c: Number(r.c) })
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-2xl">{glass.emoji}</span>
        <span className="text-amber-100 text-sm">
          <b>{glass.label}</b> 에 <b style={{ color: drink.color }}>{drink.label}</b> 마신 사람들의 응답
        </span>
      </div>
      <p className="text-[11px] text-white/40 mb-5">
        사이드바에서 잔/술을 바꾸면 이 슬라이스도 바뀝니다.
      </p>

      {loading && <p className="text-xs text-white/40">불러오는 중…</p>}
      {!loading && Object.keys(tree).length === 0 && (
        <p className="text-xs text-white/40">아직 응답 데이터가 없어요.</p>
      )}

      {Object.entries(tree).map(([bottleId, qs]) => (
        <div key={bottleId} className="mb-6">
          <p className="text-sm font-semibold text-amber-200 mb-2">
            {BOTTLE_BY_ID[bottleId]?.icon} {BOTTLE_BY_ID[bottleId]?.title ?? bottleId}
          </p>
          {Object.entries(qs).map(([questionId, answers]) => (
            <QuestionBlock key={questionId} questionId={questionId} answers={answers} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ───── 세대 비교 탭 ─────
function RoleTab() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    statsByRole()
      .then(setRows)
      .finally(() => setLoading(false))
  }, [])

  // role → bottle → question → [{answer, c}]
  const tree = { junior: {}, senior: {} }
  for (const r of rows) {
    if (!tree[r.role]) continue
    tree[r.role][r.bottle_id] ??= {}
    tree[r.role][r.bottle_id][r.question_id] ??= []
    tree[r.role][r.bottle_id][r.question_id].push({ answer: r.answer_text, c: Number(r.c) })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <RoleColumn label="🌱 주니어" tree={tree.junior} loading={loading} />
      <RoleColumn label="🌳 시니어" tree={tree.senior} loading={loading} />
    </div>
  )
}

function RoleColumn({ label, tree, loading }) {
  return (
    <div>
      <p className="text-sm font-semibold text-amber-100 mb-3">{label}</p>
      {loading && <p className="text-xs text-white/40">불러오는 중…</p>}
      {!loading && Object.keys(tree).length === 0 && (
        <p className="text-xs text-white/40">아직 응답 없음</p>
      )}
      {Object.entries(tree).map(([bottleId, qs]) => (
        <div key={bottleId} className="mb-5">
          <p className="text-[11px] text-amber-300/70 mb-1">
            {BOTTLE_BY_ID[bottleId]?.icon} {BOTTLE_BY_ID[bottleId]?.title ?? bottleId}
          </p>
          {Object.entries(qs).map(([qId, answers]) => (
            <QuestionBlock key={qId} questionId={qId} answers={answers} compact />
          ))}
        </div>
      ))}
    </div>
  )
}

// ───── 장소별 탭 ─────
function VenueTab() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    statsByVenue()
      .then(setRows)
      .finally(() => setLoading(false))
  }, [])

  // venue → 잔×술 정렬 + 총합
  const grouped = {}
  for (const r of rows) {
    grouped[r.venue_id] ??= { items: [], total: 0 }
    grouped[r.venue_id].items.push({
      glassId: r.glass_id,
      drinkId: r.drink_id,
      shots: Number(r.shots),
    })
    grouped[r.venue_id].total += Number(r.shots)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {Object.values(VENUES).map((venue) => {
        const g = grouped[venue.id] ?? { items: [], total: 0 }
        return (
          <div key={venue.id} className="rounded-xl bg-white/[0.03] border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{venue.icon}</span>
              <span className="text-amber-100 font-semibold">{venue.label}</span>
              <span className="ml-auto text-[11px] text-white/40">총 {g.total}잔</span>
            </div>
            <p className="text-[11px] text-white/40 mb-2">{venue.sub}</p>
            {loading && <p className="text-xs text-white/40">불러오는 중…</p>}
            {!loading && g.items.length === 0 && (
              <p className="text-xs text-white/40">아직 비워진 잔 없음</p>
            )}
            {g.items.slice(0, 6).map((it, i) => {
              const glass = GLASSES[it.glassId]
              const drink = glass?.drinks.find((d) => d.id === it.drinkId)
              const ratio = g.total > 0 ? it.shots / g.total : 0
              return (
                <div key={i} className="mt-1.5">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span>{glass?.emoji}</span>
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: drink?.color }}
                    />
                    <span className="text-white/85">{drink?.label}</span>
                    <span className="ml-auto text-white/40">
                      {it.shots} · {(ratio * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-white/5 overflow-hidden mt-0.5">
                    <div
                      className="h-full"
                      style={{
                        width: `${ratio * 100}%`,
                        background: `linear-gradient(90deg, ${drink?.color}, ${drink?.edge})`,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ───── 공통: 한 질문의 막대 그래프 ─────
function QuestionBlock({ questionId, answers, compact = false }) {
  const total = answers.reduce((s, a) => s + a.c, 0)
  const sorted = [...answers].sort((a, b) => b.c - a.c)
  return (
    <div className={compact ? 'mb-2' : 'mb-3'}>
      <p className={['text-white/65', compact ? 'text-[11px]' : 'text-[12px] mb-1'].join(' ')}>
        {questionId}
      </p>
      {sorted.map((a, i) => {
        const ratio = total > 0 ? a.c / total : 0
        return (
          <div key={i} className="mt-0.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/80 truncate flex-1">{a.answer}</span>
              <span className="text-white/40 ml-2 font-mono">{a.c}</span>
            </div>
            <div className="h-1 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-300 to-orange-500"
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
