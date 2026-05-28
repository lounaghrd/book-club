-- Artificial-auth pass: introduce a per-club users table and replace the
-- freeform `books.suggested_by` text with a real foreign key. On user delete
-- the FK goes null so the book row survives.

create table public.users (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null,
  name text not null,
  created_at timestamptz not null default now()
);

create index users_club_id_created_at_idx on public.users (club_id, created_at);
create unique index users_club_id_name_idx on public.users (club_id, name);

alter table public.users enable row level security;

create policy "users anon all" on public.users
  for all to anon using (true) with check (true);

-- Realtime + full row payload on delete (same reasoning as migration 0002).
alter publication supabase_realtime add table public.users;
alter table public.users replica identity full;

alter table public.books
  add column suggested_by_user_id uuid references public.users(id) on delete set null;

create index books_suggested_by_user_id_idx on public.books (suggested_by_user_id);

-- Backfill: turn each unique non-empty `suggested_by` into a user row,
-- then point the new FK at it.
insert into public.users (club_id, name)
select distinct club_id, trim(suggested_by)
from public.books
where suggested_by is not null and trim(suggested_by) <> ''
on conflict (club_id, name) do nothing;

update public.books b
set suggested_by_user_id = u.id
from public.users u
where b.suggested_by is not null
  and trim(b.suggested_by) <> ''
  and u.club_id = b.club_id
  and u.name = trim(b.suggested_by);

alter table public.books drop column suggested_by;
