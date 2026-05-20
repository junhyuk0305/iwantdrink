import { useEffect, useState } from 'react'
import { useDrinkStore } from '../../store/useDrinkStore.js'
import { GLASSES } from '../../data/glasses.js'
import { VENUES } from '../../data/venues.js'
import { fetchFeed, fetchReplies, isSupabaseConfigured } from '../../lib/supabase.js'
import ModalShell from './ModalShell.jsx'

export default function FeedModal() {
  const openModal = useDrinkStore((s) => s.openModal)
  const close = useDrinkStore((s) => s.closeModal)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState({ venueId: null, glassId: null })

  useEffect(() => {
    if (openModal !== 'feed') return
    setLoading(true)
    fetchFeed({ limit: 50, venueId: filter.venueId, glassId: filter.glassId })
      .then(setItems)
      .finally(() => setLoading(false))
  }, [openModal, filter.venueId, filter.glassId])

  if (openModal !== 'feed') return null

  return (
    <ModalShell onClose={close} side>
      <div className="border-b border-white/10 px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-amber-200/60">피드</p>
            <h2 className="font-handwriting text-2xl text-amber-100 mt-0.5">
              지금 누가 마시고 있나
            </h2>
          </div>
          <button
            onClick={close}
            className="text-white/40 hover:text-white text-xl"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
          <FilterChip
            label="전체"
            active={!filter.venueId}
            onClick={() => setFilter({ venueId: null, glassId: filter.glassId })}
          />
          {Object.values(VENUES).map((v) => (
            <FilterChip
              key={v.id}
              label={v.short}
              icon={v.icon}
              active={filter.venueId === v.id}
              onClick={() =>
                setFilter({
                  venueId: filter.venueId === v.id ? null : v.id,
                  glassId: filter.glassId,
                })
              }
            />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-3">
        {!isSupabaseConfigured && <NotConfigured />}
        {isSupabaseConfigured && loading && (
          <p className="text-center text-white/40 text-xs py-8">불러오는 중…</p>
        )}
        {isSupabaseConfigured && !loading && items.length === 0 && (
          <p className="text-center text-white/40 text-xs py-8">아직 마신 사람이 없네요.</p>
        )}
        {items.map((it) => (
          <FeedCard key={it.id} item={it} />
        ))}
      </div>
    </ModalShell>
  )
}

function FilterChip({ label, icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border transition-all flex-shrink-0',
        active
          ? 'bg-white text-black border-white'
          : 'bg-white/5 text-white/65 border-white/10 hover:border-white/30',
      ].join(' ')}
    >
      {icon && <span className="text-sm">{icon}</span>}
      <span>{label}</span>
    </button>
  )
}

function FeedCard({ item }) {
  const glass = GLASSES[item.glass_id] ?? GLASSES.soju
  const drink = glass.drinks.find((d) => d.id === item.drink_id) ?? glass.drinks[0]
  const venue = VENUES[item.venue_id]
  const [expanded, setExpanded] = useState(false)
  const [replies, setReplies] = useState([])
  const [showPour, setShowPour] = useState(false)

  function toggle() {
    if (!expanded && replies.length === 0) {
      fetchReplies(item.id).then(setReplies)
    }
    setExpanded(!expanded)
  }

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 mb-2">
      <div className="flex items-center gap-2 text-[10px] text-white/45">
        <span>{glass.emoji}</span>
        <span>{glass.label}</span>
        <span>·</span>
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: drink.color, boxShadow: `0 0 4px ${drink.color}` }}
        />
        <span>{drink.label}</span>
        {venue && (
          <>
            <span>·</span>
            <span>{venue.icon} {venue.short}</span>
          </>
        )}
        <span className="ml-auto">{formatTime(item.created_at)}</span>
      </div>

      <p className="mt-2 text-sm text-white whitespace-pre-wrap break-words">{item.text}</p>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={toggle}
          className="text-[11px] text-white/55 hover:text-white"
        >
          {item.pours_received > 0 ? `🥃 ${item.pours_received}잔` : '댓글 보기'}
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setShowPour(true)}
          className="text-[11px] px-2.5 py-1 rounded-full bg-amber-300/15 text-amber-200 border border-amber-300/30 hover:bg-amber-300/25 transition-colors"
        >
          🥃 한 잔 따라주기
        </button>
      </div>

      {expanded && replies.length > 0 && (
        <div className="mt-3 pl-3 border-l-2 border-amber-300/20 flex flex-col gap-2">
          {replies.map((r) => {
            const rGlass = GLASSES[r.glass_id]
            const rDrink = rGlass?.drinks.find((d) => d.id === r.drink_id)
            return (
              <div key={r.id} className="text-xs">
                <div className="flex items-center gap-1 text-[10px] text-white/40">
                  <span>{rGlass?.emoji}</span>
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: rDrink?.color }}
                  />
                  <span>{rDrink?.label} 한 잔</span>
                  <span className="ml-auto">{formatTime(r.created_at)}</span>
                </div>
                <p className="text-white/85 mt-1 whitespace-pre-wrap">{r.text}</p>
              </div>
            )
          })}
        </div>
      )}

      {showPour && (
        <PourComposer
          item={item}
          onClose={() => setShowPour(false)}
          onPoured={() => {
            // 답글 새로고침
            fetchReplies(item.id).then((rs) => {
              setReplies(rs)
              setExpanded(true)
            })
            setShowPour(false)
          }}
        />
      )}
    </div>
  )
}

function PourComposer({ item, onClose, onPoured }) {
  const inventory = useDrinkStore((s) => s.inventory)
  const pourToReply = useDrinkStore((s) => s.pourToReply)
  const openSurvey = useDrinkStore((s) => s.openSurvey)
  const closeModal = useDrinkStore((s) => s.closeModal)

  // 사용자 인벤토리에서 잔 1 이상 있는 술만
  const available = []
  for (const g of Object.values(GLASSES)) {
    for (const d of g.drinks) {
      if ((inventory[d.id] ?? 0) > 0) available.push({ glass: g, drink: d, count: inventory[d.id] })
    }
  }

  const [selected, setSelected] = useState(available[0])
  const [text, setText] = useState('')
  const [pouring, setPouring] = useState(false)

  async function handlePour() {
    if (!selected || !text.trim()) return
    setPouring(true)
    const ok = await pourToReply({
      parentId: item.id,
      text: text.trim(),
      glassId: selected.glass.id,
      drinkId: selected.drink.id,
    })
    setPouring(false)
    if (ok) onPoured?.()
  }

  if (available.length === 0) {
    return (
      <div className="mt-3 p-3 rounded-lg bg-amber-300/10 border border-amber-300/30">
        <p className="text-xs text-amber-100">
          가진 술이 없어요. 설문 한 병 풀고 술 받아가실래요?
        </p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => {
              closeModal()
              openSurvey()
            }}
            className="text-[11px] px-3 py-1 rounded-full bg-amber-300/30 text-amber-100 border border-amber-300/50 hover:bg-amber-300/40"
          >
            📝 한 병 풀기
          </button>
          <button
            onClick={onClose}
            className="text-[11px] px-3 py-1 rounded-full text-white/40 hover:text-white"
          >
            취소
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 p-3 rounded-lg bg-black/30 border border-amber-300/30 animate-[fadeIn_0.2s_ease-out]">
      <p className="text-[11px] text-amber-200/80 mb-2">어떤 술로 따라줄까요?</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {available.map(({ glass, drink, count }) => {
          const active = selected && selected.drink.id === drink.id
          return (
            <button
              key={drink.id}
              onClick={() => setSelected({ glass, drink, count })}
              className={[
                'flex items-center gap-1 px-2 py-1 rounded-full text-[11px] border transition-all',
                active
                  ? 'bg-white text-black border-white'
                  : 'bg-white/5 text-white/70 border-white/10 hover:border-white/30',
              ].join(' ')}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: drink.color, boxShadow: `0 0 4px ${drink.color}` }}
              />
              <span>{drink.label}</span>
              <span className="text-[9px] opacity-60">×{count}</span>
            </button>
          )
        })}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="한 마디 같이…"
        rows={2}
        maxLength={500}
        className="w-full text-xs text-white px-2 py-1.5 rounded bg-black/40 border border-white/10 focus:border-amber-300/50 outline-none resize-none no-scrollbar"
      />

      <div className="mt-2 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="text-[11px] text-white/45 hover:text-white px-2 py-1"
        >
          취소
        </button>
        <button
          onClick={handlePour}
          disabled={pouring || !text.trim() || !selected}
          className="text-[11px] px-3 py-1 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-black font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.03] active:scale-[0.97] transition-all"
        >
          {pouring ? '따르는 중…' : '🥃 따라주기'}
        </button>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  )
}

function NotConfigured() {
  return (
    <div className="text-center py-10">
      <p className="text-xs text-white/45">
        Supabase가 설정되지 않아 피드를 불러올 수 없습니다.
        <br />
        <code className="text-amber-200/70">SETUP.md</code> 참고해 키를 넣어주세요.
      </p>
    </div>
  )
}

function formatTime(iso) {
  const t = new Date(iso)
  const now = new Date()
  const diff = (now - t) / 1000
  if (diff < 60) return '방금'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}
