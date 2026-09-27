-- Split the session's single "open" stage into two: "proposing" (everyone adds
-- one book, suggestions hidden from each other) then "voting" (the full list is
-- revealed and everyone upvotes). Full lifecycle:
-- proposing → voting → closed (results) → done (winner started).

alter table public.voting_sessions drop constraint voting_sessions_status_check;

-- Any session opened under the old single stage continues as a proposing one.
update public.voting_sessions set status = 'proposing' where status = 'open';

alter table public.voting_sessions
  add constraint voting_sessions_status_check
  check (status in ('proposing', 'voting', 'closed', 'done'));

alter table public.voting_sessions alter column status set default 'proposing';
