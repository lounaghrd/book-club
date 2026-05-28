# Book Club — Claude handoff

A mobile-first web app for a small private book club. Open-link access (no auth), single club hardcoded via env var. See `SPEC.md` for the product spec and `book-club.html` for the original visual prototype.

## Stack

- Next.js 15 (App Router, Turbopack) · React 19 · TypeScript
- Supabase (Postgres + Realtime)
- Plain CSS in `app/globals.css` (ported from the prototype) · Bricolage Grotesque via Google Fonts
- Hosted on Vercel

## Status

Shipped and live on Vercel. Passes 1–5 done plus several follow-ups:

- **Pass 1** — Next.js + Supabase scaffold
- **Pass 2** — UI ported from `book-club.html` with hardcoded seed
- **Pass 3** — Wired UI to Supabase reads + writes
- **Pass 4** — Supabase Realtime subscriptions (live multi-user updates)
- **Pass 5** — Polish (dark theme color for mobile chrome) + Vercel deploy
- **Install prompt** — First-visit bottom sheet explaining "Add to Home Screen", dismissal persisted in `localStorage` (`bookclub:install_dismissed`)
- **App icon** — Dark tile with a centered orange square, generated via `next/og` (`app/icon.tsx` for favicon, `app/apple-icon.tsx` for home-screen)
- **Book-row kebab menu** *(superseded by the Book detail modal below)* — Per-row Pin/Check/X buttons were replaced with a single ⋮ popover. This per-row kebab (and the hero kebab) have since been removed in favor of tapping a row/hero to open a detail modal that holds all actions.
- **Artificial user "auth"** — On first visit, a blocking bottom sheet (`app/user-picker.tsx`) asks the visitor to pick their name from a shared list (or add a new one). Selection is persisted to `localStorage` (`bookclub:current_user_id`). A small chip in the header shows the current user and re-opens the picker so anyone can switch. New books auto-attribute to the current user via `books.suggested_by_user_id` (FK to `users`, `ON DELETE SET NULL`). The "Suggested by" input is gone from the add modal. The install prompt is deferred until a user is selected so the two sheets never stack.
- **Edit a book** — Both reading-list rows and the pinned-book hero kebab carry an **Edit** action that reopens the suggest-a-book modal in "edit" mode, prefilled with the current title/author ("Edit Book" header, "Save" button). `add-modal.tsx` is generalized to handle both add and edit via a `mode` prop plus optional initial values. Edits use the same optimistic-update-then-write-then-rollback flow (`updateBook` in `lib/api.ts`) and propagate to other clients through the existing Realtime `UPDATE` subscription. Only title/author are editable; `read`, suggester, and `addedAt` stay managed by their own actions.
- **Suggestion note** — When suggesting (or editing) a book, the author can add an optional free-text note explaining *why* they picked it (`books.note`, nullable). The add/edit modal grows a "Why this book?" textarea. Editable later through the same Edit action. Propagates to other clients through the existing Realtime `UPDATE` subscription. The note is shown in the book detail modal (below).
- **Book detail modal** — Tapping a reading-list row (or the pinned hero) opens a bottom-sheet detail modal (`app/book-detail.tsx`) showing the title, author, who suggested it, meeting date (when pinned), and the full note. All actions live here as a vertical list — there is no longer a per-row ⋮ kebab or a hero kebab. The action set is built in `book-club.tsx` (`buildDetailActions`) and varies by context: pinned book → Change date / Edit / Mark finished / Unpin; unread → Pin / Edit / Mark finished / Delete; read → Edit / Mark unread / Delete. `book-list.tsx` and `hero.tsx` are now display-only and call a single `onOpenDetail(bookId)`.
- **User management** — Each picker row has a ⋮ kebab (same pattern as book rows) holding **Rename** and **Remove**. Rename opens an inline edit form and updates the name everywhere it appears. Remove goes through a styled `ConfirmDialog` (`app/confirm-dialog.tsx`) rather than the browser's native `confirm()`. To survive deletion, each book also stores a denormalized `suggested_by_name` snapshot (set on insert, kept in sync on rename via `renameUser` in `lib/api.ts`); the book list renders from this snapshot, so a deleted user's name stays frozen on their past suggestions.

## Key files

- `app/page.tsx` — server component, fetches initial books + current reading
- `app/book-club.tsx` — main client component; holds state, Realtime subscription, handlers
- `app/hero.tsx`, `app/book-list.tsx`, `app/add-modal.tsx`, `app/pin-modal.tsx` — UI pieces (`add-modal.tsx` is dual-mode: add and edit; `hero.tsx`/`book-list.tsx` are display-only and open the detail modal on tap)
- `app/book-detail.tsx` — bottom-sheet modal showing a book's full details (note, suggester, meeting date) plus its context-dependent action list
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
- `supabase/migrations/0005_book_note.sql` — adds the optional `books.note` text column for the suggester's "why this book?" blurb

## Decisions made

- **Access model:** open link — no real auth, no passcode. Anyone with the URL can suggest/pin/finish books. There's an artificial-auth layer (pick-your-name picker, see below) for attribution only — it's not a security boundary. Revisit if it spreads beyond the group.
- **Multi-club ready:** `club_id` column on both tables from day one, but v1 hardcodes one club via `NEXT_PUBLIC_CLUB_ID`.
- **Singleton current reading:** `current_reading` is keyed by `club_id` (one row per club); pinning a new book upserts and replaces.
- **History:** finished books stay forever in the "Read" tab — no archival.
- **Optimistic UI everywhere:** local state updates first, then Supabase write; on failure we roll back. Realtime echoes are deduped by id.
- **Database types:** hand-written in `lib/database.types.ts` to avoid Supabase CLI dependency. Regenerate via `supabase gen types typescript --project-id <id>` if the schema changes.
- **Destructive actions behind a menu:** book-row actions live behind a kebab rather than as always-visible icons, to make Delete and Pin harder to mis-tap. Style is shared with the hero menu — if you touch one, keep them visually consistent.

## Env vars

Three `NEXT_PUBLIC_*` vars, set both in `.env.local` (for local dev) and in Vercel project settings (for prod):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CLUB_ID`

## Run locally

```bash
npm install
npm run dev   # http://localhost:3000
```

## Deploy

Vercel auto-deploys on push to the merged branch. Env vars live in the Vercel project settings (Settings → Environment Variables).

## Gotchas

- **Realtime + DELETE + filter:** `club_id=eq.<uuid>` filters require `REPLICA IDENTITY FULL` on the table; otherwise DELETE events arrive without `club_id` and get filtered out. Migration `0002` handles this — don't drop it.
- **`createClient` is async on the server:** `lib/supabase/server.ts` returns a Promise because it awaits `cookies()`. Always `await createClient()` in server components.
- **PR timing:** if you push commits after a PR is merged, they don't land in production — open a new PR. Confirm "no new commits since merge" before clicking Merge.
- **Install prompt re-test:** to see it again on a device, clear the `bookclub:install_dismissed` key from `localStorage`, or open in a private window.
- **Reset the picked user:** clear `bookclub:current_user_id` from `localStorage` (or use a private window) to re-trigger the first-visit picker. Picker reopens automatically if the chosen user is deleted from another device.
- **Icon refresh on iOS:** iOS caches home-screen icons aggressively. Remove the existing shortcut and re-add it after deploying an icon change.

## How to continue in a new Claude session

Start with: *"Read CLAUDE.md and SPEC.md to catch up on the project."* That alone gives Claude enough to be productive. Add the specific task on top.
