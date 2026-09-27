-- Voting sessions replace the always-on reading list. Near the end of a reading
-- cycle someone opens a session; every member nominates exactly one book (new or
-- re-proposed), everyone upvotes as many nominations as they like, then someone
-- closes it and the winner becomes the current reading. Each session starts from
-- a blank slate, so a book only competes if somebody re-nominates it.
--
-- Lifecycle: open (nominating + voting) → closed (results shown, winner waiting
-- to be started) → done (winner pinned). At most one non-done session per club.
-- Same soft, not-a-security-boundary model as the rest of the app.

create table public.voting_sessions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null,
  status text not null default 'open' check (status in ('open', 'closed', 'done')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  winner_book_id uuid references public.books(id) on delete set null
);

create index voting_sessions_club_id_idx on public.voting_sessions (club_id);
-- Only one active (open or closed-awaiting-start) session per club, so two
-- members tapping "Open voting" at once can't create parallel sessions.
create unique index voting_sessions_one_active_idx
  on public.voting_sessions (club_id) where status <> 'done';

-- One nomination per member per session; a book can only be nominated once per
-- session. Cascades: deleting the session, the user, or the book drops it.
create table public.nominations (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null,
  session_id uuid not null references public.voting_sessions(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (session_id, user_id),
  unique (session_id, book_id)
);

create index nominations_club_id_idx on public.nominations (club_id);
create index nominations_session_id_idx on public.nominations (session_id);

-- Upvotes on nominations. Keyed by nomination (not book) so the same book can be
-- re-nominated in a later session with fresh votes, and so withdrawing or
-- swapping a nomination drops its votes. session_id is denormalized for cheap
-- per-session fetches.
create table public.nomination_votes (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null,
  session_id uuid not null references public.voting_sessions(id) on delete cascade,
  nomination_id uuid not null references public.nominations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (nomination_id, user_id)
);

create index nomination_votes_club_id_idx on public.nomination_votes (club_id);
create index nomination_votes_session_id_idx on public.nomination_votes (session_id);

alter table public.voting_sessions enable row level security;
alter table public.nominations enable row level security;
alter table public.nomination_votes enable row level security;

create policy "voting_sessions anon all" on public.voting_sessions
  for all to anon using (true) with check (true);
create policy "nominations anon all" on public.nominations
  for all to anon using (true) with check (true);
create policy "nomination_votes anon all" on public.nomination_votes
  for all to anon using (true) with check (true);

-- Realtime + full row payload on delete so the club_id filter still matches
-- DELETE events (same reasoning as migration 0002).
alter publication supabase_realtime add table public.voting_sessions;
alter publication supabase_realtime add table public.nominations;
alter publication supabase_realtime add table public.nomination_votes;
alter table public.voting_sessions replica identity full;
alter table public.nominations replica identity full;
alter table public.nomination_votes replica identity full;

-- The legacy `votes` table (always-on reading-list upvotes, 0006) is no longer
-- read by the app. It's left in place rather than dropped so no data is lost.
