import { useDrinkStore, useGlass, useVenue, useDrink, useRemainingShots } from '../store/useDrinkStore.js'
import { VENUE_LIST } from '../data/venues.js'
import { GLASS_LIST, GLASSES } from '../data/glasses.js'
import { BOTTLES, bottleProgress } from '../data/surveys.js'

export default function Sidebar() {
  const shots = useDrinkStore((s) => s.shots)
  const setVenue = useDrinkStore((s) => s.setVenue)
  const setGlass = useDrinkStore((s) => s.setGlass)
  const setDrink = useDrinkStore((s) => s.setDrink)
  const openSurvey = useDrinkStore((s) => s.openSurvey)
  const openFeed = useDrinkStore((s) => s.openFeed)
  const openStats = useDrinkStore((s) => s.openStats)
  const openLogin = useDrinkStore((s) => s.openLogin)
  const venue = useVenue()
  const glass = useGlass()
  const drink = useDrink()
  const user = useDrinkStore((s) => s.user)
  const inventory = useDrinkStore((s) => s.inventory)
  const surveyAnswers = useDrinkStore((s) => s.surveyAnswers)
  const remaining = useRemainingShots()

  // 가장 진행이 많이 된 병
  const bottleProgresses = BOTTLES.map((b) => ({
    bottle: b,
    p: bottleProgress(b.id, Object.keys(surveyAnswers)),
  }))
  const totalProgress = bottleProgresses.reduce((s, x) => s + x.p, 0) / BOTTLES.length

  return (
    <aside className="absolute left-0 top-0 bottom-0 z-30 w-[154px] flex flex-col py-4 pl-3 pr-2 pointer-events-none overflow-y-auto no-scrollbar">
      <div className="pointer-events-auto flex flex-col gap-4">
        {/* 브랜드 */}
        <div className="px-1">
          <p className="text-[9px] uppercase tracking-[0.3em] text-white/35">iWantDrink</p>
        </div>

        {/* 장소 */}
        <Section title="장소">
          {VENUE_LIST.map((v) => (
            <Pill
              key={v.id}
              active={v.id === venue.id}
              onClick={() => setVenue(v.id)}
              accent={v.accent}
              title={v.sub}
            >
              <span className="text-base leading-none">{v.icon}</span>
              <span>{v.short}</span>
            </Pill>
          ))}
        </Section>

        {/* 잔 */}
        <Section title="잔">
          {GLASS_LIST.map((g) => {
            const locked = shots < g.unlockShots
            return (
              <Pill
                key={g.id}
                active={g.id === glass.id}
                disabled={locked}
                onClick={() => !locked && setGlass(g.id)}
                title={
                  locked
                    ? `${g.unlockShots}잔 비우면 해금 (현재 ${shots})`
                    : `${g.label} · 최대 ${g.maxChars}자`
                }
              >
                <span className="text-base leading-none">{g.emoji}</span>
                <span>{g.label.replace('잔', '')}</span>
                {locked && <span className="ml-auto text-[9px]">🔒</span>}
              </Pill>
            )
          })}
        </Section>

        {/* 술 */}
        <Section title="술">
          {glass.drinks.map((d) => (
            <Pill
              key={d.id}
              active={d.id === drink.id}
              onClick={() => setDrink(d.id)}
              title={d.label}
            >
              <span
                className="w-3 h-3 rounded-full inline-block flex-shrink-0 border border-white/30"
                style={{
                  background: `linear-gradient(135deg, ${d.color}, ${d.edge})`,
                  boxShadow: `0 0 6px ${d.color}66`,
                }}
              />
              <span>{d.label}</span>
            </Pill>
          ))}
        </Section>

        {/* 한 잔 더 — 액션 */}
        <Section title="한 잔 더">
          <Pill onClick={() => openSurvey()} title="5문항 풀고 술 1병">
            <span className="text-base leading-none">📝</span>
            <span>설문</span>
            <span className="ml-auto text-[9px] text-white/45 font-mono">
              {Math.round(totalProgress * 100)}%
            </span>
          </Pill>
          <Pill onClick={openFeed} title="다른 사람들 잔 보기">
            <span className="text-base leading-none">📰</span>
            <span>피드</span>
          </Pill>
          <Pill onClick={openStats} title="잔×설문 교차 통계">
            <span className="text-base leading-none">📊</span>
            <span>통계</span>
          </Pill>
        </Section>

        {/* 내 술 (인벤토리) */}
        <InventoryPanel inventory={inventory} />

        {/* 카운터 + 로그인 */}
        <div className="flex flex-col gap-2">
          <div className="rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 px-2.5 py-2">
            <p className="text-[9px] uppercase tracking-wider text-white/40">비워낸 잔</p>
            <p className="mt-0.5 font-handwriting text-2xl text-amber-200 leading-none">{shots}</p>
            {!user && (
              <p className="mt-1 text-[9px] text-white/40">
                오늘 남은: <span className="text-amber-200">{remaining}</span>
              </p>
            )}
          </div>

          <button
            onClick={openLogin}
            className="rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 hover:border-white/30 px-2.5 py-2 text-left transition-all"
            title={user?.email}
          >
            <p className="text-[9px] uppercase tracking-wider text-white/40">
              {user ? '로그인 됨' : '로그인'}
            </p>
            <p className="text-[11px] text-white/75 truncate mt-0.5">
              {user ? user.email : '이메일 매직링크'}
            </p>
          </button>
        </div>
      </div>
    </aside>
  )
}

function InventoryPanel({ inventory }) {
  // 양수 카운트만, 정렬: 잔 카테고리 순서
  const items = []
  for (const g of GLASS_LIST) {
    for (const d of g.drinks) {
      const n = inventory[d.id] ?? 0
      if (n > 0) items.push({ glass: g, drink: d, n })
    }
  }
  if (items.length === 0) {
    return (
      <div>
        <p className="px-1 pb-1.5 text-[9px] uppercase tracking-[0.25em] text-white/30">내 술</p>
        <p className="px-2 text-[10px] text-white/35 leading-snug">
          비어 있어요.<br />
          설문 풀면 한 병 받아요.
        </p>
      </div>
    )
  }
  return (
    <div>
      <p className="px-1 pb-1.5 text-[9px] uppercase tracking-[0.25em] text-white/30">내 술</p>
      <div className="flex flex-wrap gap-1 px-1">
        {items.map(({ glass, drink, n }) => (
          <div
            key={drink.id}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10"
            title={`${drink.label} × ${n}`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: drink.color, boxShadow: `0 0 4px ${drink.color}` }}
            />
            <span className="text-[10px] text-white/80">{n}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p className="px-1 pb-1.5 text-[9px] uppercase tracking-[0.25em] text-white/30">{title}</p>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  )
}

function Pill({ active, disabled, onClick, accent, title, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        'group flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] text-left border transition-all',
        active
          ? 'bg-white text-black border-white shadow-[0_2px_10px_rgba(255,255,255,0.2)]'
          : disabled
            ? 'bg-white/[0.03] text-white/25 border-white/5 cursor-not-allowed'
            : 'bg-black/30 text-white/70 border-white/10 hover:bg-black/55 hover:text-white hover:border-white/25 backdrop-blur-sm',
      ].join(' ')}
      style={active && accent ? { boxShadow: `0 2px 10px ${accent}55` } : undefined}
    >
      {children}
    </button>
  )
}
