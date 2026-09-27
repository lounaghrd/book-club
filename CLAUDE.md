# Book Club — Claude handoff

A mobile-first web app for a small private book club. Open-link access (no auth), single club hardcoded via env var. See `SPEC.md` for the product spec and `book-club.html` for the original visual prototype.

## Stack

- Next.js 15 (App Router, Turbopack) · React 19 · TypeScript
- Supabase (Postgres + Realtime)
- Plain CSS in `app/globals.css` (ported from the prototype) · Bricolage Grotesque via Google Fonts
- Hosted on Vercel

## Status

Shipped and live on Vercel. Current behavior below; build history is in git.

## Features

- **Currently reading (hero):** pinned book with a days-until-meeting countdown and meeting date. Tapping it (or the expand button) opens the **book card** — actions live there, not on the hero.
- **Voting sessions ("Next book", `voting.tsx`):** the *only* way the next book gets picked — replaced the old always-on reading list + upvotes, because low-voted suggestions were forgotten and the queue felt decided in advance. Each session starts from a blank slate:
  - **Idle** — an "Open voting" panel. It turns into an accent **nudge** ("Meeting in N days — time to vote") when the meeting is ≤ 7 days away/past or nothing is pinned (computed after mount to avoid hydration mismatch). Anyone can open a session; no auto-open.
  - **Open** — every member **nominates exactly one book** via the FAB ("Nominate a book" / "Change my pick"): a new book, or one tap on one of *their own* past unfinished suggestions ("past picks" in `add-modal.tsx`). Changing your pick deletes the old nomination (and its votes). Everyone **upvotes as many nominations as they like** (own included). **Tallies are hidden while open** — you only see your own votes plus "N nominated · M people have voted". "Close voting" (confirm dialog) locks it; with zero nominations it cancels (deletes) the session instead.
  - **Closed (results)** — ranked by votes desc → "already read it" count asc → earliest nomination. Winner panel with "Start reading"; if still tied after the read-before tie-break, every tied book gets its own start button ("pick one together") rather than letting nomination order decide. "Reopen voting" undoes a premature close.
  - **Start reading** → pin modal (meeting date) → the winner becomes current, the **previous current book is marked finished** (moves to Read), and the session goes `done`.
- **Read history (`book-list.tsx`):** finished books, newest first. Unfinished books that aren't current or nominated aren't shown anywhere — they live on only as re-nominatable "past picks" for their suggester.
- **"Already read it":** a per-user marker (distinct from the club-wide `books.read` *finished* state) so the group can gauge how many members have already read a candidate. A `read_before` table keyed by `(book_id, user_id)`, toggled from a pill in the **book card** (check icon + count, fills neutral — not accent — to stay distinct from the vote pill). Counts derived client-side; soft per-user dedup, *not* a security boundary; marking while no user is picked opens the picker first. Card-only. It's the **first tie-break in the vote results** (fewer readers wins).
- **Book card:** a bottom-sheet detail view (`book-card.tsx`) opened from the hero, a nomination, a result, or a Read row. Shows title, author, who suggested it, the suggester's note, and — for nominations — a vote pill (no count while open; count once closed). A kebab in the card header (reuses `.hero-menu-btn`) toggles the actions, which reveal **inline at the bottom of the sheet** (`.book-card-menu`) rather than as a floating dropdown — the card is bottom-anchored, so an inline reveal grows upward and never clips off-screen. Actions depend on `CardContext`: current → change date / edit / mark finished / unpin; nomination → edit / withdraw nomination; read → edit / delete; result/other → edit. Every action closes the card (`runCardAction` clears `cardBookId` first); edit/change-date then open their own modal.
- **Identity ("pick your name"):** first-visit blocking sheet (`user-picker.tsx`) to choose or add a name, persisted to `localStorage` (`bookclub:current_user_id`); a header chip re-opens it to switch. New books attribute to the current user. Per-row Rename / Remove (Remove confirms via `confirm-dialog.tsx`). Not a security boundary — see Decisions.
- **Durable attribution:** books store both `suggested_by_user_id` (FK; renames propagate) and a `suggested_by_name` snapshot (survives user deletion). The list renders the snapshot.
- **Suggestion note:** an optional free-text note on *why* a book was suggested (`books.note`). Set when nominating a new book, editable via the edit modal, displayed only inside the book card.
- **Edit a book:** `add-modal.tsx` is dual-mode (add = nominate / edit); title, author, and the note are editable. Optimistic update via `updateBook` in `lib/api.ts`.
- **Install prompt:** "Add to Home Screen" sheet, deferred until a user is picked. Cadence and dismissal rules live in `app/install-prompt.tsx`.
- **App icon:** generated via `next/og` — `app/icon.tsx` (favicon) and `app/apple-icon.tsx` (home-screen).
- **Realtime:** Supabase subscriptions keep all clients in sync within ~1s.

## Key files

- `app/page.tsx` — server component, fetches initial books + current reading
- `app/book-club.tsx` — main client component; holds state, Realtime subscription, handlers
- `app/voting.tsx` — the "Next book" voting section (idle / open / results states)
- `app/hero.tsx`, `app/book-list.tsx` (Read history), `app/add-modal.tsx`, `app/pin-modal.tsx`, `app/book-card.tsx` — UI pieces (`add-modal.tsx` is dual-mode: nominate and edit; `pin-modal.tsx` picks the meeting date when starting a winner or rescheduling; `book-card.tsx` is the shared detail sheet with context-aware kebab actions)
- `app/install-prompt.tsx` — first-visit Add-to-Home-Screen sheet
- `app/user-picker.tsx` — first-visit (and switch-user) sheet for the artificial-auth flow; per-row Rename/Remove kebab
- `app/confirm-dialog.tsx` — styled confirmation dialog (removing a user, closing a vote)
- `app/icon.tsx`, `app/apple-icon.tsx` — generated app icons
- `app/globals.css` — all styles, ported from the prototype
- `lib/api.ts` — Supabase queries and row ⇄ app-type mappers
- `lib/supabase/client.ts` / `server.ts` — browser + server clients
- `lib/types.ts` — `Book`, `CurrentReading`, `User`, `ReadBefore`, `VotingSession`, `Nomination`, `NominationVote`
- `lib/database.types.ts` — hand-written DB types (mirrors `supabase gen types typescript`)
- `lib/config.ts` — env var re-exports
- `supabase/migrations/0001_init.sql` — schema (books, current_reading), RLS, realtime publication
- `supabase/migrations/0002_replica_identity_full.sql` — sets `REPLICA IDENTITY FULL` so DELETE events include the full old row (otherwise the realtime `club_id` filter drops deletes — only the PK is in `old` by default)
- `supabase/migrations/0003_users.sql` — adds the `users` table, swaps `books.suggested_by` (text) for `suggested_by_user_id` (FK), and backfills existing freeform attributions into user rows
- `supabase/migrations/0004_book_suggested_by_name.sql` — adds the denormalized `books.suggested_by_name` snapshot (backfilled from the FK) so a suggester's name survives user deletion; kept in sync on rename
- `supabase/migrations/0005_book_note.sql` — adds the optional `books.note` free-text column (why a book was suggested)
- `supabase/migrations/0006_votes.sql` — adds the `votes` table for the old always-on upvotes. **Legacy: no longer read by the app** since 0008; left in place (not dropped) so no data is lost.
- `supabase/migrations/0007_read_before.sql` — adds the `read_before` table (per-user "I've already read this" markers; same `(book_id, user_id)` unique + cascade + RLS + realtime + `REPLICA IDENTITY FULL` shape as `votes`). Distinct from `books.read`, which is the club-wide finished flag.
- `supabase/migrations/0008_voting_sessions.sql` — adds `voting_sessions` (`status` open → closed → done, `winner_book_id`; a partial unique index allows **one non-done session per club**), `nominations` (unique per `(session_id, user_id)` and `(session_id, book_id)`), and `nomination_votes` (unique per `(nomination_id, user_id)`, `session_id` denormalized). All cascade-delete, with RLS, realtime and `REPLICA IDENTITY FULL`.

## Decisions made

- **Access model:** open link — no real auth, no passcode. Anyone with the URL can suggest/pin/finish books. There's an artificial-auth layer (pick-your-name picker, see below) for attribution only — it's not a security boundary. Revisit if it spreads beyond the group.
- **Multi-club ready:** `club_id` column on both tables from day one, but v1 hardcodes one club via `NEXT_PUBLIC_CLUB_ID`.
- **Singleton current reading:** `current_reading` is keyed by `club_id` (one row per club); pinning a new book upserts and replaces.
- **History:** finished books stay forever in the "Read" tab — no archival.
- **Optimistic UI everywhere:** local state updates first, then Supabase write; on failure we roll back. Realtime echoes are deduped by id.
- **Database types:** hand-written in `lib/database.types.ts` to avoid Supabase CLI dependency. Regenerate via `supabase gen types typescript --project-id <id>` if the schema changes.
- **Destructive actions behind a menu:** book actions live behind a kebab rather than as always-visible icons, to make Delete and Pin harder to mis-tap. Style is shared with the hero menu — if you touch one, keep them visually consistent.
- **Upvotes (added after v1, since replaced):** the spec originally listed voting as out of scope; we added always-on **upvote-only** voting on the reading list (downvotes feel pointed in a small friendly group) with "Up next" sorted by score. **Superseded by voting sessions** — see below.
- **Voting sessions (replaced the reading list):** with an always-on list, low-voted suggestions were forgotten and the next few picks felt decided in advance, so fewer new books got proposed. Decided with the user: **replace the reading list entirely** with per-cycle sessions where everyone must re-propose (same or new book) each time; **one nomination per member**, **unlimited upvotes** (approval voting — avoids everyone voting for their own pick and tying); **manual open with a date nudge** (≤ 7 days) and manual close; **tallies hidden until close** (no bandwagon — client-side only, it's in the realtime payloads, same soft model). Votes are keyed by *nomination*, not book, so a re-nominated book starts fresh each session. Starting the winner auto-finishes the previous current book so it lands in Read instead of vanishing. The "Pin book" action is gone — winning a vote is the only route to current. Vote integrity stays intentionally weak (not-a-security-boundary identity model).
- **"Already read it" (added after upvotes):** to help the group avoid picking a book most members already know, we added a per-user "I've read this before" marker. Built deliberately as a **parallel to upvotes** (same `read_before` table shape, same client-side tallying, same soft dedup) to reuse the hardened patterns. **Kept separate from `books.read`** — that flag means "the club finished it" (the Read tab); this means "I personally read it before" — so the wording and table name avoid the collision. Originally informational only; then became the tie-break in the old "Up next" ranking; now it's the **first tie-break in voting-session results** (votes desc → already-read asc → earliest nomination). The results panel explains when it decided the winner. Count stays card-only.

## Setup, env & deploy

See `README.md` — it's canonical for Supabase setup, env vars, local run, and deploy. Quick start: `npm install && npm run dev`. The three required vars are `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_CLUB_ID` (in `.env.local` locally, Vercel project settings in prod).

## Verifying changes

No test suite. Before committing, validate with:

```bash
npx tsc --noEmit   # typecheck
npm run build      # full build
```

Use `npm run dev` for manual checks.

## Gotchas

- **Realtime + DELETE + filter:** `club_id=eq.<uuid>` filters require `REPLICA IDENTITY FULL` on the table; otherwise DELETE events arrive without `club_id` and get filtered out. Migration `0002` handles this — don't drop it.
- **`createClient` is async on the server:** `lib/supabase/server.ts` returns a Promise because it awaits `cookies()`. Always `await createClient()` in server components.
- **Menus inside bottom sheets clip downward:** a floating dropdown that opens below its trigger runs off the bottom of the screen when the trigger sits low in a bottom sheet. Two fixes are in use, don't regress them: the **book card** reveals its kebab actions inline at the bottom (`.book-card-menu`, grows upward, never clips); the **user picker**'s per-row Rename/Remove menu flips upward (`.user-menu.up`) when the row is low in the viewport (direction measured on open via `getBoundingClientRect`).
- **PR timing:** if you push commits after a PR is merged, they don't land in production — open a new PR. Confirm "no new commits since merge" before clicking Merge.
- **Squash-merge + same branch = phantom conflicts:** if a PR is *squash*-merged and you keep committing on the same branch, the next PR conflicts on every file the squashed PR touched (the original commits no longer match the squashed history). Avoid it by branching fresh after each merge, or using regular merge commits. To recover, verify the base's tree matches your branch at the merge point (`git diff <base> <branch>@<merge-point>` is empty) and reconcile with `git merge -s ours <base>` — it keeps your tree unchanged.
- **Install prompt re-test:** to see it again on a device, clear the `bookclub:install_done` and `bookclub:install_last_prompted` keys from `localStorage`, or open in a private window. (Once shown it waits 20s; clearing only `install_last_prompted` forces the weekly re-prompt to fire on the next visit.)
- **Reset the picked user:** clear `bookclub:current_user_id` from `localStorage` (or use a private window) to re-trigger the first-visit picker. Picker reopens automatically if the chosen user is deleted from another device.
- **Icon refresh on iOS:** iOS caches home-screen icons aggressively. Remove the existing shortcut and re-add it after deploying an icon change.

## How to continue in a new Claude session

Start with: *"Read CLAUDE.md and SPEC.md to catch up on the project."* That alone gives Claude enough to be productive. Add the specific task on top.
