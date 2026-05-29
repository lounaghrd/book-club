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
- **Reading list:** suggest a book (title + optional author + optional note); filter by "Up next" (unread) and "Read". Each row shows title/author/suggester plus an expand button; tapping the row or button opens the **book card**. No per-row kebab — actions live in the card.
- **Book card:** a bottom-sheet detail view (`book-card.tsx`) opened from a list row or the hero. Shows title, author, who suggested it, and the suggester's note ("No note yet" when empty). A kebab in the card header (reuses `.hero-menu-btn`) toggles the actions, which reveal **inline at the bottom of the sheet** (`.book-card-menu`) rather than as a floating dropdown — the card is bottom-anchored, so an inline reveal grows upward and never clips off-screen. Actions are context-aware: pinned book → change date / edit / mark finished / unpin; list book → pin (if unread) / edit / mark read-or-unread / delete. Edit/pin/change-date close the card and open their own modal; the rest act in place.
- **Identity ("pick your name"):** first-visit blocking sheet (`user-picker.tsx`) to choose or add a name, persisted to `localStorage` (`bookclub:current_user_id`); a header chip re-opens it to switch. New books attribute to the current user. Per-row Rename / Remove (Remove confirms via `confirm-dialog.tsx`). Not a security boundary — see Decisions.
- **Durable attribution:** books store both `suggested_by_user_id` (FK; renames propagate) and a `suggested_by_name` snapshot (survives user deletion). The list renders the snapshot.
- **Suggestion note:** an optional free-text note on *why* a book was suggested (`books.note`). Set when suggesting, editable via the edit modal, displayed only inside the book card.
- **Edit a book:** `add-modal.tsx` is dual-mode (add / edit); title, author, and the note are editable. Optimistic update via `updateBook` in `lib/api.ts`.
- **Install prompt:** "Add to Home Screen" sheet, deferred until a user is picked. Cadence and dismissal rules live in `app/install-prompt.tsx`.
- **App icon:** generated via `next/og` — `app/icon.tsx` (favicon) and `app/apple-icon.tsx` (home-screen).
- **Realtime:** Supabase subscriptions keep all clients in sync within ~1s.

## Key files

- `app/page.tsx` — server component, fetches initial books + current reading
- `app/book-club.tsx` — main client component; holds state, Realtime subscription, handlers
- `app/hero.tsx`, `app/book-list.tsx`, `app/add-modal.tsx`, `app/pin-modal.tsx`, `app/book-card.tsx` — UI pieces (`add-modal.tsx` is dual-mode: add and edit; `book-card.tsx` is the shared detail sheet for hero + list, with context-aware kebab actions)
- `app/install-prompt.tsx` — first-visit Add-to-Home-Screen sheet
- `app/user-picker.tsx` — first-visit (and switch-user) sheet for the artificial-auth flow; per-row Rename/Remove kebab
- `app/confirm-dialog.tsx` — styled confirmation dialog (used for removing a user)
- `app/icon.tsx`, `app/apple-icon.tsx` — generated app icons
- `app/globals.css` — all styles, ported from the prototype
- `lib/api.ts` — Supabase queries and row ⇄ app-type mappers
- `lib/supabase/client.ts` / `server.ts` — browser + server clients
- `lib/types.ts` — `Book`, `CurrentReading`, `User`, `Filter`
- `lib/database.types.ts` — hand-written DB types (mirrors `supabase gen types typescript`)
- `lib/config.ts` — env var re-exports
- `supabase/migrations/0001_init.sql` — schema (books, current_reading), RLS, realtime publication
- `supabase/migrations/0002_replica_identity_full.sql` — sets `REPLICA IDENTITY FULL` so DELETE events include the full old row (otherwise the realtime `club_id` filter drops deletes — only the PK is in `old` by default)
- `supabase/migrations/0003_users.sql` — adds the `users` table, swaps `books.suggested_by` (text) for `suggested_by_user_id` (FK), and backfills existing freeform attributions into user rows
- `supabase/migrations/0004_book_suggested_by_name.sql` — adds the denormalized `books.suggested_by_name` snapshot (backfilled from the FK) so a suggester's name survives user deletion; kept in sync on rename
- `supabase/migrations/0005_book_note.sql` — adds the optional `books.note` free-text column (why a book was suggested)

## Decisions made

- **Access model:** open link — no real auth, no passcode. Anyone with the URL can suggest/pin/finish books. There's an artificial-auth layer (pick-your-name picker, see below) for attribution only — it's not a security boundary. Revisit if it spreads beyond the group.
- **Multi-club ready:** `club_id` column on both tables from day one, but v1 hardcodes one club via `NEXT_PUBLIC_CLUB_ID`.
- **Singleton current reading:** `current_reading` is keyed by `club_id` (one row per club); pinning a new book upserts and replaces.
- **History:** finished books stay forever in the "Read" tab — no archival.
- **Optimistic UI everywhere:** local state updates first, then Supabase write; on failure we roll back. Realtime echoes are deduped by id.
- **Database types:** hand-written in `lib/database.types.ts` to avoid Supabase CLI dependency. Regenerate via `supabase gen types typescript --project-id <id>` if the schema changes.
- **Destructive actions behind a menu:** book-row actions live behind a kebab rather than as always-visible icons, to make Delete and Pin harder to mis-tap. Style is shared with the hero menu — if you touch one, keep them visually consistent.

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
- **Book-card actions are inline, not a dropdown:** the card is a bottom-anchored sheet, so the kebab reveals actions inline at the bottom (`.book-card-menu`) — a floating `.hero-menu`-style dropdown clips off the bottom of the screen when the kebab sits low. Don't "consolidate" it back into the hero/list dropdown pattern.
- **PR timing:** if you push commits after a PR is merged, they don't land in production — open a new PR. Confirm "no new commits since merge" before clicking Merge.
- **Install prompt re-test:** to see it again on a device, clear the `bookclub:install_done` and `bookclub:install_last_prompted` keys from `localStorage`, or open in a private window. (Once shown it waits 20s; clearing only `install_last_prompted` forces the weekly re-prompt to fire on the next visit.)
- **Reset the picked user:** clear `bookclub:current_user_id` from `localStorage` (or use a private window) to re-trigger the first-visit picker. Picker reopens automatically if the chosen user is deleted from another device.
- **Icon refresh on iOS:** iOS caches home-screen icons aggressively. Remove the existing shortcut and re-add it after deploying an icon change.

## How to continue in a new Claude session

Start with: *"Read CLAUDE.md and SPEC.md to catch up on the project."* That alone gives Claude enough to be productive. Add the specific task on top.
