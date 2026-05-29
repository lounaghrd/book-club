-- Upvotes on book suggestions. Upvote-only (no downvotes), one vote per user per
-- book enforced by a unique constraint. Like the identity layer, this is soft
-- dedup, not a security boundary — anyone with the link can vote, and the
-- per-user key only holds for the picked name on a given device.

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null,
  book_id uuid not null references public.books(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (book_id, user_id)
);

create index votes_club_id_idx on public.votes (club_id);
create index votes_book_id_idx on public.votes (book_id);

alter table public.votes enable row level security;

create policy "votes anon all" on public.votes
  for all to anon using (true) with check (true);

-- Realtime + full row payload on delete, so the club_id filter still matches
-- DELETE events (same reasoning as migration 0002). Cascades from deleting a
-- book or user also fire delete events, keeping clients in sync.
alter publication supabase_realtime add table public.votes;
alter table public.votes replica identity full;
