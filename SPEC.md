# Book Club — Build Spec

A mobile-first web app for a small book club. Anyone with the link can suggest books, pin one as the current reading, and schedule the next meeting. No real accounts — instead, a lightweight "pick your name" identity layer attributes each suggestion to a person (see Access model below).

**Visual & interaction reference: `book-club.html`** — open it in a browser. The prototype defines the full UI, states, copy, and design tokens. Treat it as the spec for anything not covered here.

---

## Core features

1. **Currently reading** — pinned at top of the page. Shows title, author, days-until-meeting countdown, and meeting date. Tapping it opens the book card (below), which holds the actions.
2. **Reading list** — anyone can suggest a book (title + optional author + optional note on why). Suggestions auto-attribute to the current user (see Identity). Each row shows title/author/suggester, an upvote pill, and expands into the book card. "Up next" is ranked by upvote count.
3. **Book card** — a bottom-sheet detail view, opened from a list row or the currently-reading hero. Shows title, author, who suggested it, and their note. A kebab (⋮) in the card holds the actions, which depend on context: pinned book → change date, edit, mark finished, unpin; list book → pin as current, edit (title/author/note), mark read/unread, remove.
4. **Two filters** — "Up next" (unread, default) and "Read".
5. **Identity ("who's reading")** — on first visit a blocking picker asks the visitor to choose their name from a shared list or add a new one; the choice is persisted locally and shown as a header chip that re-opens the picker so anyone can switch. Users can be renamed or removed (rename updates the name everywhere; removal keeps a person's past suggestions, frozen under their last name). Attribution only — not a security boundary.
6. **Upvotes** — anyone can upvote a book on the reading list to signal "I'd read this" (upvote-only, no downvotes). One vote per picked user per book; tapping again removes it. The "Up next" filter ranks by upvote count. Like identity, this is soft dedup, not a security boundary.

Out of scope for v1: ~~voting~~ (added after v1 as upvotes — see feature 6), meeting links/locations, threaded discussion/comments, notifications, real authentication. (A single suggester's "why" note per book is in scope — see the book card — but threaded discussion is not.)

---

## Data model

```ts
Book {
  id: string                 // uuid
  title: string
  author?: string
  suggestedByUserId?: string // FK to User; null if the suggester was deleted
  suggestedByName?: string   // denormalized name snapshot; survives user deletion
  note?: string              // optional free-text note on why it was suggested
  read: boolean
  addedAt: timestamp
}

CurrentReading {
  bookId: string       // foreign key to Book
  meetingDate: date    // YYYY-MM-DD
}

User {
  id: string           // uuid
  name: string
  createdAt: timestamp
}

Vote {
  id: string           // uuid
  bookId: string       // FK to Book (cascade delete)
  userId: string       // FK to User (cascade delete)
  createdAt: timestamp
  // unique (bookId, userId) — one upvote per user per book
}
```

Singleton `CurrentReading` (one current book at a time). Setting a new one replaces the previous.

A book keeps both a foreign key to its suggester (`suggestedByUserId`) and a `suggestedByName` snapshot. The FK is the canonical link and lets renames propagate; the snapshot is what the list renders, so a suggester's name stays put even after that user is removed. Both are set on insert and kept in sync when a user is renamed.

---

## Recommended stack

- **Frontend**: Next.js 15 (App Router) or Vite + React — your choice. The prototype is plain HTML/JS so port is straightforward either way.
- **Backend**: Supabase. Four tables (`books`, `current_reading`, `users`, `votes`) + Realtime subscriptions so everyone sees updates without refreshing. You already know the setup from Españolo.
- **Styling**: port the CSS from the prototype directly. All tokens are CSS variables at the top of `book-club.html` (`:root`). Tailwind is fine too if you prefer — the design uses a small token set.
- **Font**: Bricolage Grotesque via Google Fonts (already linked in the prototype).
- **Hosting**: Vercel.

---

## Decisions to lock before starting

1. **Access model** — the prototype assumes "anyone with the link can edit". Options:
   - **Open link**: no auth, just share the URL. Simplest. Vulnerable to abuse if URL leaks.
   - **Shared passcode**: light gate, no accounts.
   - **Magic link / email auth**: real auth, friction added.
   My recommendation for v1: open link. Re-evaluate if it spreads beyond your group.
   **Resolved:** shipped as open link, plus a lightweight artificial-identity layer (pick-your-name picker) added afterward so suggestions are attributed to a person. It is not a security boundary — anyone with the URL can still edit, and can pick or switch to any name.

2. **Single club or multi-club?** If you might run more than one (e.g., a separate one with colleagues later), add a `club_id` column on day one. Otherwise hardcode one club.

3. **History of finished books** — keep forever, or archive after N? Prototype keeps them all visible in the "Read" tab.

---

## Realtime behavior

When user A pins a book or changes the meeting date, user B should see it within ~1s without refreshing. Supabase Realtime channels on both tables handle this cleanly.

---

## Design notes (already in the prototype CSS, summarized here)

- Background `#0a0a0a`, surface `#141414`, text `#fafafa`, accent `#ff4a1c`.
- Bricolage Grotesque throughout. Condensed widths (`wdth` 80–90) and heavy weights for display.
- Sharp corners, 1px borders for definition, no shadows except the FAB.
- Caps + wide tracking on labels and small buttons.

---

## How to use this with Claude Code

Open the project folder and start a Claude Code session with both files in context:

```
claude
> Read SPEC.md and book-club.html. Set up a Next.js + Supabase project that
> implements the spec. Start by scaffolding the project, then the Supabase
> schema, then port the UI from the prototype, then wire up Realtime.
```

Then iterate. Don't try to ship the whole thing in one prompt — build it in passes (scaffold → schema → UI port → realtime → polish).
