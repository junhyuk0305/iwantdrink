import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && key ? createClient(url, key) : null
export const isSupabaseConfigured = !!supabase

// ============================================================
//  익명 client_id — localStorage 영속
// ============================================================
const CLIENT_ID_KEY = 'iwantdrink-client-id'
export function getClientId() {
  let id = localStorage.getItem(CLIENT_ID_KEY)
  if (!id) {
    id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'c-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem(CLIENT_ID_KEY, id)
  }
  return id
}

// 데이터 소유 키: 로그인 시 auth.uid, 아니면 client_id
export function ownerKey(authUser) {
  return authUser?.id ?? getClientId()
}

// ============================================================
//  Auth (매직링크)
// ============================================================
export async function sendMagicLink(email) {
  if (!supabase) throw new Error('Supabase 미설정')
  const redirectTo = window.location.origin
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  })
  if (error) throw error
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function getCurrentUser() {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data?.user ?? null
}

export function onAuthChange(cb) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ?? null)
  })
  return () => data?.subscription?.unsubscribe?.()
}

// ============================================================
//  venting INSERT (원글)
// ============================================================
export async function recordVenting({ text, glassId, drinkId, venueId, user }) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('venting')
      .insert({
        text,
        glass_id: glassId,
        drink_id: drinkId,
        venue_id: venueId,
        client_id: getClientId(),
        auth_id: user?.id ?? null,
        user_agent: (navigator.userAgent || '').slice(0, 200),
      })
      .select('id')
      .single()
    if (error) console.warn('[venting] insert error', error)
    return data?.id ?? null
  } catch (e) {
    console.warn('[venting] network error', e)
    return null
  }
}

// ============================================================
//  답글 (= 따라주기)
// ============================================================
export async function recordPour({ parentId, text, glassId, drinkId, user }) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('venting')
      .insert({
        text,
        glass_id: glassId,
        drink_id: drinkId,
        venue_id: null,
        parent_id: parentId,
        client_id: getClientId(),
        auth_id: user?.id ?? null,
      })
      .select('id')
      .single()
    if (error) console.warn('[pour] insert error', error)
    return data?.id ?? null
  } catch (e) {
    console.warn('[pour] network error', e)
    return null
  }
}

// ============================================================
//  피드 (원글 N개 + 각 글의 답글 미리보기)
// ============================================================
export async function fetchFeed({ limit = 50, venueId, glassId, drinkId } = {}) {
  if (!supabase) return []
  try {
    let q = supabase
      .from('venting')
      .select('id, text, glass_id, drink_id, venue_id, pours_received, created_at')
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (venueId) q = q.eq('venue_id', venueId)
    if (glassId) q = q.eq('glass_id', glassId)
    if (drinkId) q = q.eq('drink_id', drinkId)
    const { data, error } = await q
    if (error) {
      console.warn('[feed] error', error)
      return []
    }
    return data ?? []
  } catch (e) {
    console.warn('[feed] network error', e)
    return []
  }
}

export async function fetchReplies(parentId) {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from('venting')
      .select('id, text, glass_id, drink_id, created_at')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: true })
      .limit(40)
    if (error) {
      console.warn('[replies] error', error)
      return []
    }
    return data ?? []
  } catch (e) {
    return []
  }
}

// 떠다니는 글씨용 — 최근 글 N개의 본문만
export async function fetchAmbientLines(limit = 30) {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from('venting')
      .select('text')
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) return []
    return (data ?? []).map((r) => r.text).filter(Boolean)
  } catch {
    return []
  }
}

// ============================================================
//  Inventory
// ============================================================
export async function fetchInventory(user) {
  if (!supabase) return {}
  const key = ownerKey(user)
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('drink_id, count')
      .eq('owner_key', key)
    if (error) {
      console.warn('[inventory] fetch error', error)
      return {}
    }
    const map = {}
    for (const row of data ?? []) map[row.drink_id] = row.count
    return map
  } catch {
    return {}
  }
}

// 인벤토리 변동 — drink 별 delta (양수=증가, 음수=감소)
export async function adjustInventory(user, deltas) {
  if (!supabase) return
  const key = ownerKey(user)
  // upsert 개별 행
  const entries = Object.entries(deltas)
  for (const [drinkId, delta] of entries) {
    try {
      // 현재 값 조회
      const { data: cur } = await supabase
        .from('inventory')
        .select('count')
        .eq('owner_key', key)
        .eq('drink_id', drinkId)
        .maybeSingle()
      const newCount = Math.max(0, (cur?.count ?? 0) + delta)
      await supabase
        .from('inventory')
        .upsert(
          {
            owner_key: key,
            drink_id: drinkId,
            count: newCount,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'owner_key,drink_id' },
        )
    } catch (e) {
      console.warn('[inventory] adjust error', drinkId, e)
    }
  }
}

// ============================================================
//  Survey
// ============================================================
export async function recordSurveyAnswers(user, role, answers) {
  // answers: [{ bottleId, questionId, answerIdx, answerText }]
  if (!supabase || !answers?.length) return
  const key = ownerKey(user)
  const rows = answers.map((a) => ({
    owner_key: key,
    client_id: getClientId(),
    auth_id: user?.id ?? null,
    role,
    bottle_id: a.bottleId,
    question_id: a.questionId,
    answer_idx: a.answerIdx,
    answer_text: a.answerText,
  }))
  try {
    const { error } = await supabase
      .from('survey_answer')
      .upsert(rows, { onConflict: 'owner_key,question_id' })
    if (error) console.warn('[survey] insert error', error)
  } catch (e) {
    console.warn('[survey] network error', e)
  }
}

// ============================================================
//  Stats (RPC)
// ============================================================
export async function statsByGlassDrink(glassId, drinkId) {
  if (!supabase) return []
  try {
    const { data, error } = await supabase.rpc('stats_by_glass_drink', {
      p_glass: glassId,
      p_drink: drinkId,
    })
    if (error) {
      console.warn('[stats glass/drink] error', error)
      return []
    }
    return data ?? []
  } catch {
    return []
  }
}

export async function statsByRole() {
  if (!supabase) return []
  try {
    const { data, error } = await supabase.rpc('stats_by_role')
    if (error) {
      console.warn('[stats role] error', error)
      return []
    }
    return data ?? []
  } catch {
    return []
  }
}

export async function statsByVenue() {
  if (!supabase) return []
  try {
    const { data, error } = await supabase.rpc('stats_by_venue')
    if (error) {
      console.warn('[stats venue] error', error)
      return []
    }
    return data ?? []
  } catch {
    return []
  }
}
