# Book Club — Claude handoff

A mobile-first web app for a small private book club. Open-link access (no auth), single club hardcoded via env var. See `SPEC.md` for the product spec and `book-club.html` for the original visual prototype.

## Stack

- Next.js 15 (App Router, Turbopack) · React 19 · TypeScript
- Supabase (Postgres + Realtime)
- Plain CSS in `app/globals.css` (ported from the prototype) · Bricolage Grotesque via Google Fonts
- Hosted on Vercel

## Status

Shipped and live on Vercel. Passes 1–5 done plus two follow-ups:

- **Pass 1** — Next.js + Supabase scaffold
- **Pass 2** — UI ported from `book-club.html` with hardcoded seed
- **Pass 3** — Wired UI to Supabase reads + writes
- **Pass 4** — Supabase Realtime subscriptions (live multi-user updates)
- **Pass 5** — Polish (dark theme color for mobile chrome) + Vercel deploy
- **Install prompt** — First-visit bottom sheet explaining "Add to Home Screen", dismissal persisted in `localStorage` (`bookclub:install_dismissed`)
- **App icon** — Dark tile with a centered orange square, generated via `next/og` (`app/icon.tsx` for favicon, `app/apple-icon.tsx` for home-screen)
- **Book-row kebab menu** — Per-row Pin/Check/X buttons replaced with a single ⋮ that opens a popover styled to match the pinned-book (hero) menu. Available books offer Pin / Mark finished / Delete; read books offer Mark unread / Delete. Read rows un-dim while their menu is open so the menu stays legible.

## Key files

- `app/page.tsx` — server component, fetches initial books + current reading
- `app/book-club.tsx` — main client component; holds state, Realtime subscription, handlers
- `app/hero.tsx`, `app/book-list.tsx`, `app/add-modal.tsx`, `app/pin-modal.tsx` — UI pieces
- `app/install-prompt.tsx` — first-visit Add-to-Home-Screen sheet
- `app/icon.tsx`, `app/apple-icon.tsx` — generated app icons
- `app/globals.css` — all styles, ported from the prototype
- `lib/api.ts` — Supabase queries and row ⇄ app-type mappers
- `lib/supabase/client.ts` / `server.ts` — browser + server clients
- `lib/types.ts` — `Book`, `CurrentReading`, `Filter`
- `lib/database.types.ts` — hand-written DB types (mirrors `supabase gen types typescript`)
- `lib/config.ts` — env var re-exports
- `supabase/migrations/0001_init.sql` — schema (books, current_reading), RLS, realtime publication
- `supabase/migrations/0002_replica_identity_full.sql` — sets `REPLICA IDENTITY FULL` so DELETE events include the full old row (otherwise the realtime `club_id` filter drops deletes — only the PK is in `old` by default)

## Decisions made

- **Access model:** open link — no auth, no passcode. Anyone with the URL can suggest/pin/finish books. Revisit if it spreads beyond the group.
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
- **Icon refresh on iOS:** iOS caches home-screen icons aggressively. Remove the existing shortcut and re-add it after deploying an icon change.

## How to continue in a new Claude session

Start with: *"Read CLAUDE.md and SPEC.md to catch up on the project."* That alone gives Claude enough to be productive. Add the specific task on top.
