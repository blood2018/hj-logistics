-- Supabase SQL editor에서 실행하세요.

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  origin text not null,
  destination text not null,
  tonnage text not null,
  vehicle_type text not null,
  contact text not null,
  created_at timestamptz not null default now()
);

alter table public.quote_requests enable row level security;

-- 익명 사용자는 견적 문의를 등록(insert)만 할 수 있고, 조회/수정/삭제는 불가능합니다.
create policy "Allow public insert" on public.quote_requests
  for insert
  to anon
  with check (true);

-- 배차(운송) 기록: 관리자 페이지(/admin/dispatch)에서만 service role로 접근합니다.
create table if not exists public.dispatch_records (
  id uuid primary key default gen_random_uuid(),
  dispatch_date date not null,
  company text not null,
  origin text not null,
  destination text not null,
  tonnage text not null,
  driver text not null,
  driver_phone text not null default '',
  amount bigint not null check (amount >= 0),
  created_at timestamptz not null default now()
);

create index if not exists dispatch_records_date_idx
  on public.dispatch_records (dispatch_date desc);
create index if not exists dispatch_records_company_idx
  on public.dispatch_records (company);

-- 이미 테이블을 만든 경우 기사 전화번호 컬럼을 추가합니다.
alter table public.dispatch_records
  add column if not exists driver_phone text not null default '';

-- 정책을 만들지 않으므로 anon/authenticated 키로는 어떤 접근도 불가능합니다.
alter table public.dispatch_records enable row level security;
