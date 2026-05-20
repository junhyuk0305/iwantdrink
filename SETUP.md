# iWantDrink — Supabase & Vercel 셋업 가이드

이 문서를 순서대로 따라 하면 ① Supabase에 데이터가 쌓이고 ② Vercel로 배포됩니다.

---

## 1. Supabase 프로젝트 만들기

### 1-1. 회원가입 & 새 프로젝트
1. <https://supabase.com> 에서 GitHub 계정으로 로그인
2. 우상단 **New project** 클릭
3. 입력:
   - **Name**: `iwantdrink` (원하는 이름)
   - **Database Password**: 강한 비밀번호 (저장 안 해도 됨, 나중에 reset 가능)
   - **Region**: `Northeast Asia (Seoul)` 선택 (지연 시간 최소화)
   - **Pricing Plan**: Free
4. **Create new project** → 1~2분 대기

### 1-2. 테이블 & 보안 정책 만들기 (v2 — 4개 테이블)
프로젝트 대시보드 좌측 메뉴에서 **SQL Editor** → **New query** → 아래 SQL을 통째로 붙여넣고 **RUN**:

```sql
-- ============================================================
--  iWantDrink — v2 schema (venting + 답글, inventory, surveys, profiles)
-- ============================================================

-- ---------- 1) venting (원글 + 답글 통합) ----------
create table public.venting (
  id          bigserial primary key,
  text        text not null check (length(text) between 1 and 2000),
  glass_id    text not null,
  drink_id    text not null,
  venue_id    text,                                   -- 답글은 null
  client_id   text not null,
  auth_id     uuid,                                   -- 로그인 시 auth.uid
  parent_id   bigint references public.venting(id) on delete cascade,  -- null=원글, not null=답글
  pours_received int not null default 0,             -- 이 원글에 따라준 잔 수 (denormalized)
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index venting_created_idx     on public.venting (created_at desc);
create index venting_parent_idx      on public.venting (parent_id);
create index venting_client_idx      on public.venting (client_id);
create index venting_auth_idx        on public.venting (auth_id);
create index venting_venue_idx       on public.venting (venue_id);

alter table public.venting enable row level security;

create policy "anon insert venting"
  on public.venting for insert to anon with check (true);

create policy "auth insert venting"
  on public.venting for insert to authenticated with check (true);

create policy "anyone select venting"
  on public.venting for select to anon, authenticated using (true);

-- 답글이 INSERT 되면 부모의 pours_received +1
create or replace function public.bump_pours()
returns trigger language plpgsql security definer as $$
begin
  if new.parent_id is not null then
    update public.venting set pours_received = pours_received + 1 where id = new.parent_id;
  end if;
  return new;
end $$;

drop trigger if exists venting_bump_pours on public.venting;
create trigger venting_bump_pours
  after insert on public.venting
  for each row execute function public.bump_pours();


-- ---------- 2) inventory (보유 술 잔 수) ----------
create table public.inventory (
  id          bigserial primary key,
  owner_key   text not null,                          -- coalesce(auth_id::text, client_id)
  drink_id    text not null,
  count       int not null default 0 check (count >= 0),
  updated_at  timestamptz not null default now(),
  unique (owner_key, drink_id)
);

create index inventory_owner_idx on public.inventory (owner_key);

alter table public.inventory enable row level security;

-- anon/auth 둘 다 자유롭게 자기 키 UPSERT/SELECT (key가 곧 신원)
create policy "owner can read inventory"
  on public.inventory for select to anon, authenticated using (true);
create policy "owner can write inventory"
  on public.inventory for insert to anon, authenticated with check (true);
create policy "owner can update inventory"
  on public.inventory for update to anon, authenticated using (true) with check (true);


-- ---------- 3) survey_answer ----------
create table public.survey_answer (
  id           bigserial primary key,
  owner_key    text not null,                         -- coalesce(auth_id::text, client_id)
  client_id    text,
  auth_id      uuid,
  role         text not null check (role in ('junior', 'senior')),
  bottle_id    text not null,
  question_id  text not null,
  answer_idx   smallint not null check (answer_idx between 0 and 4),
  answer_text  text not null,
  answered_at  timestamptz not null default now(),
  unique (owner_key, question_id)                    -- 1인 1답
);

create index survey_role_idx     on public.survey_answer (role);
create index survey_bottle_idx   on public.survey_answer (bottle_id);
create index survey_question_idx on public.survey_answer (question_id);

alter table public.survey_answer enable row level security;

create policy "anon insert survey"
  on public.survey_answer for insert to anon, authenticated with check (true);

-- 본인의 답변은 본인이 볼 수 있게 (owner_key 매칭은 RPC에서)
create policy "select survey"
  on public.survey_answer for select to anon, authenticated using (true);


-- ---------- 4) profiles (로그인 사용자 프로필) ----------
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  display_name text,
  role        text check (role in ('junior', 'senior', null)),
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "owner profile select"
  on public.profiles for select to authenticated using (auth.uid() = id);
create policy "owner profile upsert"
  on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "owner profile update"
  on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);


-- ---------- 5) 통계용 RPC (raw 안 보여주고 집계만) ----------

-- 잔×술 별 설문 답변 집계
create or replace function public.stats_by_glass_drink(p_glass text, p_drink text)
returns table (
  bottle_id text, question_id text, answer_text text, c bigint
) language sql security definer stable as $$
  with owners as (
    select distinct coalesce(auth_id::text, client_id) ok
    from public.venting
    where parent_id is null and glass_id = p_glass and drink_id = p_drink
  )
  select sa.bottle_id, sa.question_id, sa.answer_text, count(*)::bigint c
  from public.survey_answer sa
  join owners on owners.ok = sa.owner_key
  group by sa.bottle_id, sa.question_id, sa.answer_text
  order by sa.bottle_id, sa.question_id, c desc;
$$;

-- 세대(주니어/시니어) × 어려움
create or replace function public.stats_by_role()
returns table (
  role text, bottle_id text, question_id text, answer_text text, c bigint
) language sql security definer stable as $$
  select role, bottle_id, question_id, answer_text, count(*)::bigint c
  from public.survey_answer
  group by role, bottle_id, question_id, answer_text
  order by role, bottle_id, c desc;
$$;

-- 장소별 비워진 잔 수 + 인기 술
create or replace function public.stats_by_venue()
returns table (
  venue_id text, glass_id text, drink_id text, shots bigint
) language sql security definer stable as $$
  select venue_id, glass_id, drink_id, count(*)::bigint shots
  from public.venting
  where parent_id is null and venue_id is not null
  group by venue_id, glass_id, drink_id
  order by venue_id, shots desc;
$$;

grant execute on function public.stats_by_glass_drink(text,text) to anon, authenticated;
grant execute on function public.stats_by_role() to anon, authenticated;
grant execute on function public.stats_by_venue() to anon, authenticated;
```

확인: 좌측 **Table Editor** → `venting`, `inventory`, `survey_answer`, `profiles` 4개가 보이면 OK.

> 이전에 v1 SQL (venting만) 실행하셨다면 `drop table public.venting cascade;` 후 위 SQL을 통째로 다시 실행하세요. 또는 ALTER로 추가하셔도 됩니다.

### 1-2-1. Auth (매직링크) 활성화
좌측 **Authentication → Providers** → **Email** 토글 ON. 그 아래 **Confirm email** 옵션은 OFF로 두면 매직링크 1회 클릭으로 바로 로그인됩니다.

좌측 **Authentication → URL Configuration** → **Site URL** 에 `http://localhost:5173` (개발용) 또는 실제 Vercel 도메인을 넣어주세요. 매직링크 redirect용입니다.

### 1-3. API 키 복사
좌측 메뉴 **Project Settings** (톱니바퀴) → **API** 페이지:
- **Project URL** 복사 (예: `https://abcdefgh.supabase.co`)
- **anon · public** key 복사 (긴 `eyJhbGci...` 문자열)

> ⚠️ **service_role** 키는 절대 클라이언트에 넣지 마세요. 우리는 **anon** 키만 씁니다.

### 1-4. 로컬 환경변수 설정
`app/.env.local` 파일을 새로 만들고:

```
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

저장하고 dev 서버 재시작:
```powershell
# 기존 서버 Ctrl+C 후
cd app
npm run dev
```

### 1-5. 동작 확인
1. <http://localhost:5173/> 새로고침
2. 글자 쓰고 **원샷하기**
3. Supabase 대시보드 → **Table Editor** → `venting` 테이블 새로고침 → 새 행이 보이면 ✅

---

## 2. Vercel 배포

### 2-1. GitHub에 올리기
프로젝트 루트(`05_iwantdrink/`)에서:

```powershell
cd "c:\Users\장준혁\Desktop\05_iwantdrink"
git init
git add .
git commit -m "iWantDrink: initial commit"
```

GitHub에서 [새 repository](https://github.com/new) 만들고 (Private 추천), 표시되는 명령으로 push:

```powershell
git remote add origin https://github.com/<your-username>/iwantdrink.git
git branch -M main
git push -u origin main
```

### 2-2. Vercel 연결
1. <https://vercel.com> 에서 GitHub 계정으로 로그인
2. **Add New → Project** → 방금 만든 repo 선택 → **Import**
3. Framework Preset: **Other** (vercel.json이 알아서 처리)
4. **Environment Variables** 섹션에서:
   - `VITE_SUPABASE_URL` = (Supabase에서 복사한 URL)
   - `VITE_SUPABASE_ANON_KEY` = (Supabase anon key)
5. **Deploy** 클릭 → 1~2분 대기

### 2-3. 자동 배포
이제 GitHub `main` 브랜치에 push할 때마다 자동으로 재배포됩니다.

---

## 3. 데이터 보기 (운영자용)

Supabase 대시보드 → **Table Editor** → `venting` 에서 직접 행 조회 가능.

좀 더 분석적으로:
- **SQL Editor**에서 `select venue_id, count(*) from venting group by venue_id;` 같은 쿼리
- 또는 **Database → Functions**에서 뷰 만들기
- 외부 BI (Metabase, Superset) 연결도 가능

---

## 4. 문제 해결

| 증상 | 원인 / 해결 |
|---|---|
| 원샷해도 Supabase에 안 쌓임 | `.env.local` 키 확인. 브라우저 콘솔에 `[venting] supabase 미설정` 떴으면 키 누락 |
| `[venting] insert error: new row violates row-level security` | RLS 정책 SQL을 다시 실행 |
| Vercel 빌드 실패 | Vercel 환경변수에 `VITE_` 접두사 빠뜨렸는지 확인 |
| 배포본에서 사진 안 보임 | `app/public/venues/*.png` 가 git에 커밋됐는지 확인 (`git status`) |

---

## 5. 다음에 할 일 (선택)

- **나이대/직업 수집** (별도 `profile` 테이블 + N잔째 모달)
- **운영자 대시보드** (Supabase + 간단 React 페이지)
- **익명 로그인** (`supabase.auth.signInAnonymously()`)로 client_id를 auth.uid로 대체 — 강한 spam 방지
- **rate limit** (Supabase Edge Function으로 IP당 분당 N건 제한)
