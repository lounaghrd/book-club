-- "I've already read this" markers on book suggestions. One marker per user per
-- book enforced by a unique constraint. Distinct from books.read (which means the
-- whole club has finished the book) — this records that an individual member has
-- read the book before, so the group can avoid picking something most people know.
-- Like votes and the identity layer, this is soft dedup, not a security boundary —
-- anyone with the link can mark a book, and the per-user key only holds for the
-- picked name on a given device.

create table public.read_before (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null,
  book_id uuid not null references public.books(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (book_id, user_id)
);

create index read_before_club_id_idx on public.read_before (club_id);
create index read_before_book_id_idx on public.read_before (book_id);

alter table public.read_before enable row level security;

create policy "read_before anon all" on public.read_before
  for all to anon using (true) with check (true);

-- Realtime + full row payload on delete, so the club_id filter still matches
-- DELETE events (same reasoning as migration 0002). Cascades from deleting a
-- book or user also fire delete events, keeping clients in sync.
alter publication supabase_realtime add table public.read_before;
alter table public.read_before replica identity full;
