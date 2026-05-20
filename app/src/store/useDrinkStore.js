import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { GLASSES, defaultDrinkOf, resolveDrink } from '../data/glasses.js'
import { VENUES } from '../data/venues.js'
import {
  recordVenting,
  recordPour,
  recordSurveyAnswers,
  fetchInventory,
  adjustInventory,
  onAuthChange,
  getCurrentUser,
} from '../lib/supabase.js'

const DAILY_LIMIT_ANON = 3
const todayKey = () => new Date().toISOString().slice(0, 10)

export const useDrinkStore = create(
  persist(
    (set, get) => ({
      // ───── session state ─────
      text: '',
      shooting: false,

      // auth
      user: null,
      authReady: false,

      // 모달 상태 (한 번에 하나만 열림)
      openModal: null, // 'survey' | 'login' | 'feed' | 'stats' | 'gate' | null
      surveyBottleId: null, // 어느 병 풀고 있는지

      // ───── persisted ─────
      venueId: 'pojangmacha',
      glassType: 'soju',
      drinkId: 'soju-chamisul',
      shots: 0,
      history: [],

      // 일일 잔 카운트 (비로그인 제한용)
      dailyDay: todayKey(),
      dailyShots: 0,

      // 설문 진행상황 — { questionId: { bottleId, idx, text } }
      role: null, // 'junior' | 'senior'
      surveyAnswers: {},

      // 인벤토리 — { drinkId: count }
      inventory: {},

      // ───── actions: text / glass / venue / drink ─────
      setText: (text) => set({ text }),

      setVenue: (venueId) => {
        if (!VENUES[venueId]) return
        set({ venueId })
      },

      setGlass: (id) => {
        const { shots } = get()
        const glass = GLASSES[id]
        if (!glass) return
        if (shots < glass.unlockShots) return
        set({ glassType: id, drinkId: defaultDrinkOf(id), text: '' })
      },

      setDrink: (drinkId) => {
        const { glassType } = get()
        const glass = GLASSES[glassType]
        if (!glass) return
        if (!glass.drinks.some((d) => d.id === drinkId)) return
        set({ drinkId })
      },

      // ───── modal control ─────
      openSurvey: (bottleId = null) =>
        set({ openModal: 'survey', surveyBottleId: bottleId }),
      openLogin: () => set({ openModal: 'login' }),
      openFeed: () => set({ openModal: 'feed' }),
      openStats: () => set({ openModal: 'stats' }),
      openGate: () => set({ openModal: 'gate' }),
      closeModal: () => set({ openModal: null, surveyBottleId: null }),

      // ───── shoot / drink-limit ─────
      // 비로그인은 하루 3잔까지. 4잔째 시도 시 gate 모달 오픈.
      shoot: () => {
        const state = get()
        const { text, glassType, drinkId, venueId, history, shots, shooting, user } = state
        if (shooting) return
        if (!text.trim()) return

        // 일일 카운트 갱신
        const day = todayKey()
        let dailyShots = state.dailyDay === day ? state.dailyShots : 0

        if (!user && dailyShots >= DAILY_LIMIT_ANON) {
          set({ openModal: 'gate' })
          return
        }

        const entry = {
          id: Date.now(),
          text,
          glass: glassType,
          drink: drinkId,
          venue: venueId,
          at: new Date().toISOString(),
        }
        set({
          shooting: true,
          shots: shots + 1,
          dailyDay: day,
          dailyShots: dailyShots + 1,
          history: [entry, ...history].slice(0, 200),
        })
        recordVenting({ text, glassId: glassType, drinkId, venueId, user })
        setTimeout(() => set({ text: '', shooting: false }), 1400)
      },

      // ───── pour to someone (답글) ─────
      pourToReply: async ({ parentId, text, glassId, drinkId }) => {
        const { inventory, user } = get()
        if ((inventory[drinkId] ?? 0) <= 0) return false
        // 1잔 차감
        const next = { ...inventory, [drinkId]: (inventory[drinkId] ?? 0) - 1 }
        set({ inventory: next })
        await Promise.all([
          recordPour({ parentId, text, glassId, drinkId, user }),
          adjustInventory(user, { [drinkId]: -1 }),
        ])
        return true
      },

      // ───── survey answer / reward ─────
      // partial=true: 한 문항 답할 때마다 호출 (저장만)
      // finishBottle: 한 병(5문항) 다 답했으면 술 보상
      answerSurvey: ({ bottleId, questionId, answerIdx, answerText, role: probedRole }) => {
        const { surveyAnswers, role } = get()
        const useRole = role ?? probedRole ?? 'junior'
        const next = {
          ...surveyAnswers,
          [questionId]: { bottleId, answerIdx, answerText },
        }
        set({
          surveyAnswers: next,
          role: probedRole ?? role ?? 'junior',
        })
      },

      // 한 병(5문항) 완료 → 보상 술 1병(5잔) 인벤토리 +
      finishBottle: async (bottleId, rewardDrinkId) => {
        const { user, inventory, role, surveyAnswers } = get()
        const next = {
          ...inventory,
          [rewardDrinkId]: (inventory[rewardDrinkId] ?? 0) + 5,
        }
        set({ inventory: next })

        // 이 병에 답한 5문항만 추출해서 Supabase에
        const rows = Object.entries(surveyAnswers)
          .filter(([, v]) => v.bottleId === bottleId)
          .map(([questionId, v]) => ({
            bottleId: v.bottleId,
            questionId,
            answerIdx: v.answerIdx,
            answerText: v.answerText,
          }))
        await Promise.all([
          recordSurveyAnswers(user, role ?? 'junior', rows),
          adjustInventory(user, { [rewardDrinkId]: 5 }),
        ])
      },

      // ───── auth hydration ─────
      _setUser: (user) => set({ user, authReady: true }),

      // 로그인/로그아웃 시 인벤토리 다시 가져옴
      reloadInventory: async () => {
        const { user } = get()
        const remote = await fetchInventory(user)
        // 로컬과 병합 — 더 큰 쪽 (로컬에 있던 게 손실 안 되도록)
        const merged = { ...remote }
        const { inventory } = get()
        for (const [k, v] of Object.entries(inventory)) {
          merged[k] = Math.max(merged[k] ?? 0, v)
        }
        set({ inventory: merged })
      },
    }),
    {
      name: 'iwantdrink-state',
      version: 3,
      partialize: (s) => ({
        shots: s.shots,
        history: s.history,
        venueId: s.venueId,
        glassType: s.glassType,
        drinkId: s.drinkId,
        dailyDay: s.dailyDay,
        dailyShots: s.dailyShots,
        role: s.role,
        surveyAnswers: s.surveyAnswers,
        inventory: s.inventory,
      }),
      migrate: (state) => {
        if (!state) return state
        if (!state.venueId || !VENUES[state.venueId]) state.venueId = 'pojangmacha'
        if (!state.glassType || !GLASSES[state.glassType]) state.glassType = 'soju'
        if (!state.drinkId) state.drinkId = defaultDrinkOf(state.glassType)
        if (!state.dailyDay) state.dailyDay = todayKey()
        if (typeof state.dailyShots !== 'number') state.dailyShots = 0
        if (!state.surveyAnswers) state.surveyAnswers = {}
        if (!state.inventory) state.inventory = {}
        return state
      },
    },
  ),
)

// auth listener — 모듈 로드 시점에 한 번 등록
let authInitialized = false
export function initAuth() {
  if (authInitialized) return
  authInitialized = true
  getCurrentUser().then((u) => {
    useDrinkStore.getState()._setUser(u)
    if (u) useDrinkStore.getState().reloadInventory()
  })
  onAuthChange((u) => {
    useDrinkStore.getState()._setUser(u)
    if (u) useDrinkStore.getState().reloadInventory()
  })
}

// ───── 셀렉터 ─────
export const useGlass = () => {
  const id = useDrinkStore((s) => s.glassType)
  return GLASSES[id] ?? GLASSES.soju
}

export const useVenue = () => {
  const id = useDrinkStore((s) => s.venueId)
  return VENUES[id] ?? VENUES.pojangmacha
}

export const useDrink = () => {
  const glassId = useDrinkStore((s) => s.glassType)
  const drinkId = useDrinkStore((s) => s.drinkId)
  return resolveDrink(glassId, drinkId)
}

export const useFillRatio = () => {
  const text = useDrinkStore((s) => s.text)
  const glass = useGlass()
  return text.length / glass.maxChars
}

export const useUnlockedGlasses = () => {
  const shots = useDrinkStore((s) => s.shots)
  return Object.values(GLASSES).filter((g) => shots >= g.unlockShots)
}

// 비로그인 일일 잔 잔여
export const useRemainingShots = () => {
  const user = useDrinkStore((s) => s.user)
  const dailyDay = useDrinkStore((s) => s.dailyDay)
  const dailyShots = useDrinkStore((s) => s.dailyShots)
  if (user) return Infinity
  const day = todayKey()
  const todays = dailyDay === day ? dailyShots : 0
  return Math.max(0, DAILY_LIMIT_ANON - todays)
}

export { DAILY_LIMIT_ANON }
