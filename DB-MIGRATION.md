# Supabase DB 마이그레이션 (P0+P1 라운드)

> 이번 라운드의 클라이언트 변경에 필요한 서버 측 SQL.
> Supabase Dashboard → SQL Editor 에서 순서대로 실행.
> 이 SQL은 **추가/확장만** 합니다. 기존 데이터는 손대지 않습니다.

---

## 1. `profiles` 테이블 (P1-12)

`auth.users` 와 1:1. 사용자의 역할(주니어/시니어)·표시명을 저장.
이번 라운드는 `role`만 사용. `display_name`은 후속 라운드 대비.

```sql
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role         text check (role in ('junior','senior')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- updated_at 자동 갱신
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- RLS
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
```

> 클라이언트는 [supabase.js](app/src/lib/supabase.js)의 `fetchProfile()` / `upsertProfile()`로 접근.
> 설문 1병 완료 시 `role`이 자동 upsert 됩니다 ([finishBottle](app/src/store/useDrinkStore.js)).

---

## 2. Anonymous → Authenticated 데이터 이전 RPC (P0-1)

비로그인 시 `client_id`(localStorage UUID)로 쌓인 `venting`/`inventory`/`survey_answer` 데이터를,
로그인 직후 현재 `auth.uid`로 이전합니다.

`SECURITY DEFINER` 함수로, 호출자(`auth.uid()`)가 본인일 때만 동작.

```sql
create or replace function public.migrate_anon_to_auth(p_client_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_venting int := 0;
  v_inventory int := 0;
  v_survey int := 0;
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다';
  end if;
  if p_client_id is null or length(p_client_id) = 0 then
    return jsonb_build_object('migrated', false, 'reason', 'no client_id');
  end if;

  -- ① venting: client_id로 쌓였고 auth_id가 비어 있는 행만 이전
  update public.venting
    set auth_id = v_uid
  where client_id = p_client_id and auth_id is null;
  get diagnostics v_venting = row_count;

  -- ② inventory: client_id 행을 auth_id 행으로 머지
  --    같은 drink_id 행이 이미 auth로 있으면 count 합산 후 anon 행 삭제
  insert into public.inventory (owner_key, drink_id, count, updated_at)
  select v_uid::text, drink_id, count, now()
    from public.inventory
   where owner_key = p_client_id
  on conflict (owner_key, drink_id) do update
    set count = public.inventory.count + excluded.count,
        updated_at = now();
  get diagnostics v_inventory = row_count;

  delete from public.inventory where owner_key = p_client_id;

  -- ③ survey_answer: 동일 owner_key 변환. 충돌 시(이미 auth로 답한 문항이 있으면)
  --    auth 답을 우선시하고 anon 답은 폐기.
  insert into public.survey_answer
        (owner_key, client_id, auth_id, role, bottle_id, question_id, answer_idx, answer_text, answered_at)
  select v_uid::text,
         client_id,
         v_uid,
         role,
         bottle_id,
         question_id,
         answer_idx,
         answer_text,
         answered_at
    from public.survey_answer
   where owner_key = p_client_id
  on conflict (owner_key, question_id) do nothing;
  get diagnostics v_survey = row_count;

  delete from public.survey_answer where owner_key = p_client_id;

  return jsonb_build_object(
    'migrated', true,
    'venting', v_venting,
    'inventory', v_inventory,
    'survey', v_survey
  );
end $$;

revoke all on function public.migrate_anon_to_auth(text) from public;
grant execute on function public.migrate_anon_to_auth(text) to authenticated;
```

### 주의
- 위 함수는 **`venting.auth_id`/`venting.client_id`**, **`inventory.owner_key`**, **`survey_answer.owner_key`** 컬럼이 있다고 가정합니다 (text.md §5 모델 기준).
- 만약 실제 스키마가 `auth_id`/`client_id` 분리 컬럼 형태라면, `inventory`/`survey_answer`의 `owner_key`도 `coalesce(auth_id::text, client_id)` 형태로 분기해 주세요.
- 만약 컬럼명이 다르면 위 함수의 컬럼을 실제 스키마에 맞게 수정해 주세요.

> 클라이언트는 [supabase.js](app/src/lib/supabase.js)의 `migrateAnonOwnership()`를 호출.
> [useDrinkStore.initAuth](app/src/store/useDrinkStore.js)에서 비로그인→로그인 전환 시 자동 호출됩니다.

---

## 3. (선택) `venting`에 `parent_id` 인덱스 / `pours_received` 트리거

`pours_received`가 클라이언트에서 select만 되고 있는데, 자동 갱신 트리거가 없으면 항상 0입니다. 아직 안 만들어 두셨다면 같이 추가하세요.

```sql
-- 답글 INSERT/DELETE 시 부모 글의 pours_received 자동 갱신
create or replace function public.bump_pours_received()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') and new.parent_id is not null then
    update public.venting
       set pours_received = coalesce(pours_received, 0) + 1
     where id = new.parent_id;
  elsif (tg_op = 'DELETE') and old.parent_id is not null then
    update public.venting
       set pours_received = greatest(coalesce(pours_received, 0) - 1, 0)
     where id = old.parent_id;
  end if;
  return null;
end $$;

drop trigger if exists venting_bump_pours on public.venting;
create trigger venting_bump_pours
  after insert or delete on public.venting
  for each row execute function public.bump_pours_received();

-- 무한 스크롤 + 필터 조합 인덱스
create index if not exists venting_parent_null_created_idx
  on public.venting (created_at desc)
  where parent_id is null;

create index if not exists venting_parent_idx
  on public.venting (parent_id)
  where parent_id is not null;
```

---

## 4. Realtime 활성화

이번 라운드에서 추가한 `subscribeAmbient` 가 동작하려면 `venting` 테이블이 Realtime publication 에 포함되어 있어야 합니다.

```sql
-- 이미 활성화 되어 있으면 에러 무시
alter publication supabase_realtime add table public.venting;
```

또는 Dashboard → Database → Replication → `supabase_realtime` 에서 `venting` 토글 ON.

---
fff
## 5. 적용 후 동작 검증

1. **`profiles`**: 로그인 후 설문 1병 완료 → Supabase Studio 의 `profiles` 테이블에 `id`, `role` 행이 들어 있어야 함.
2. **`migrate_anon_to_auth`**: 비로그인으로 글 1개 작성 + 설문 1문항 응답 → 로그인 → 로그인 후 피드에서 본인 글 확인 + 인벤토리 보존 + `survey_answer` 의 `auth_id` 컬럼이 채워졌는지 확인.
3. **Realtime**: 두 탭에서 동시에 접속 → 한쪽에서 글 작성 → 다른 쪽 AmbientChatter 에서 곧바로 떠다니면 OK.
4. **`pours_received` 트리거**: 피드에서 따라주기 → 카드 좌하단 "🥃 N잔" 카운트가 +1 되는지.
