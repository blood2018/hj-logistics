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
