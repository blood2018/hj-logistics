-- 배차(dispatch_trips) / 청구 항목(dispatch_records) 분리
-- Supabase SQL editor에서 실행하세요. 여러 번 실행해도 안전합니다(배포 직후 한 번 더 실행해 새 건을 연결).
--
-- dispatch_trips   : 차 한 번(배차) — 날짜, 기사, 전화번호, 차량번호, 지급금액
-- dispatch_records : 회사별 청구 항목 — 회사구분, 상차지, 하차지, 톤수, 청구금액, 비고 + trip_id
--
-- 전환 기간에는 dispatch_records의 날짜·기사·전화번호·차량번호 칸을 지우지 않고
-- 앱이 배차 값과 같게 계속 맞춰 둡니다(문제가 생기면 이전 코드로 바로 되돌릴 수 있도록).

-- 1) 배차 표
create table if not exists public.dispatch_trips (
  id uuid primary key default gen_random_uuid(),
  dispatch_date date not null,
  driver text not null default '',
  driver_phone text not null default '',
  vehicle_number text not null default '',
  driver_pay bigint check (driver_pay is null or driver_pay >= 0),
  created_at timestamptz not null default now()
);

create index if not exists dispatch_trips_date_idx
  on public.dispatch_trips (dispatch_date desc);

alter table public.dispatch_trips enable row level security;

-- 2) 청구 항목에 배차 연결 칸
alter table public.dispatch_records
  add column if not exists trip_id uuid references public.dispatch_trips (id) on delete cascade;

create index if not exists dispatch_records_trip_idx
  on public.dispatch_records (trip_id);

-- 3) 아직 배차가 없는 기존 건마다 "혼자 간 배차"를 만들어 연결 (배차 id = 기존 건 id)
insert into public.dispatch_trips (id, dispatch_date, driver, driver_phone, vehicle_number, created_at)
select r.id, r.dispatch_date, r.driver, r.driver_phone, r.vehicle_number, r.created_at
from public.dispatch_records r
where r.trip_id is null
on conflict (id) do nothing;

update public.dispatch_records
set trip_id = id
where trip_id is null;

-- 4) 조회용 뷰: 청구 항목 한 줄 + 배차 정보 + 합적 정보
--    security_invoker: 뷰를 통해서도 원래 표의 RLS가 적용되게 합니다.
create or replace view public.dispatch_items
with (security_invoker = on) as
select
  r.id,
  r.trip_id,
  t.dispatch_date,
  r.company,
  r.origin,
  r.destination,
  r.tonnage,
  t.driver,
  t.driver_phone,
  t.vehicle_number,
  r.amount,
  t.driver_pay,
  r.memo,
  r.created_at,
  t.created_at as trip_created_at,
  s.trip_size,
  s.trip_companies
from public.dispatch_records r
join public.dispatch_trips t on t.id = r.trip_id
cross join lateral (
  select
    count(*)::int as trip_size,
    string_agg(r2.company, ', ' order by r2.created_at, r2.id) as trip_companies
  from public.dispatch_records r2
  where r2.trip_id = r.trip_id
) s;

revoke all on public.dispatch_items from anon, authenticated;
revoke all on public.dispatch_trips from anon, authenticated;

-- 확인용: 아래 두 숫자가 같고, 세 번째가 0이면 정상입니다.
select
  (select count(*) from public.dispatch_records) as records,
  (select count(*) from public.dispatch_items) as items_in_view,
  (select count(*) from public.dispatch_records where trip_id is null) as unlinked;
