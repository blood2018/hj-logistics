-- 날짜를 배차가 아닌 "짐(회사별 청구 줄)"의 값으로 바꿉니다.
-- Supabase SQL editor에서 실행하세요. 여러 번 실행해도 안전합니다.
--
-- dispatch_records.dispatch_date 는 전환 기간 동안 배차 날짜와 같게 맞춰 두던 칸이라 값이 이미 모두 들어 있습니다.
-- 이제 조회용 뷰가 이 칸을 읽고, 배차의 날짜는 더 이상 필수가 아닙니다(앞으로 쓰지 않음).

alter table public.dispatch_trips
  alter column dispatch_date drop not null;

create or replace view public.dispatch_items
with (security_invoker = on) as
select
  r.id,
  r.trip_id,
  r.dispatch_date,
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

-- 확인용: 짐 날짜와 배차 날짜가 다른 줄 수 (실행 직후에는 0이어야 정상)
select count(*) as date_mismatch
from public.dispatch_records r
join public.dispatch_trips t on t.id = r.trip_id
where r.dispatch_date is distinct from t.dispatch_date;
