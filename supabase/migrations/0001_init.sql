-- Book Club schema
-- Open-link access model: anon role can read/write all rows.
-- club_id present from day one for multi-club readiness; v1 uses a single hardcoded UUID.

create extension if not exists "pgcrypto";

create table public.books (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null,
  title text not null,
  author text,
  suggested_by text,
  read boolean not null default false,
  added_at timestamptz not null default now()
);

create index books_club_id_added_at_idx on public.books (club_id, added_at desc);

-- Singleton per club: at most one current_reading row per club_id.
create table public.current_reading (
  club_id uuid primary key,
  book_id uuid not null references public.books(id) on delete cascade,
  meeting_date date,
  updated_at timestamptz not null default now()
);

-- RLS: open-link model means anon can do everything.
alter table public.books enable row level security;
alter table public.current_reading enable row level security;

create policy "books anon all" on public.books
  for all to anon using (true) with check (true);

create policy "current_reading anon all" on public.current_reading
  for all to anon using (true) with check (true);

-- Realtime: broadcast row-level changes on both tables.
alter publication supabase_realtime add table public.books;
alter publication supabase_realtime add table public.current_reading;
