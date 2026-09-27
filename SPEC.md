# Book Club — Build Spec

A mobile-first web app for a small book club. Anyone with the link can run a vote to pick the next book, and schedule the next meeting. No real accounts — instead, a lightweight "pick your name" identity layer attributes each suggestion to a person (see Access model below).

**Visual & interaction reference: `book-club.html`** — open it in a browser. The prototype defines the full UI, states, copy, and design tokens. Treat it as the spec for anything not covered here.

---

## Core features

1. **Currently reading** — pinned at top of the page. Shows title, author, days-until-meeting countdown, and meeting date. Tapping it opens the book card (below), which holds the actions.
2. **Voting sessions ("Next book")** — replaced the original always-on reading list. When the current book is nearly done, anyone opens suggestions (the button is highlighted when the meeting is ≤ 7 days away). **Stage 1 — suggestions:** every member adds exactly one book (title + optional author + optional note on why). Nobody sees the others' suggestions, only how many have been made; you can edit or delete your own. Someone closes suggestions once everyone has proposed. **Stage 2 — voting:** the full list is revealed and everyone upvotes as many as they like; totals stay hidden. Someone closes voting. **Results:** the winner (most votes, then fewer "already read it" marks; a remaining tie is left to the group) with every book's count, and a "Start reading" button that sets the meeting date and finishes the previous book. Each session starts from scratch. The screen stays minimal: one panel or list per stage.
3. **Book card** — a bottom-sheet detail view, opened from the hero, a book in the vote, or the Read history. Shows title, author, who suggested it, their note, and (for books in the vote, while voting) two labelled toggle buttons: "Vote" and "I've read it". A kebab (⋮) holds context-dependent actions: current book → change date, edit, mark finished, unpin; read book → edit, delete. Books in the vote have no actions — view and vote only.
4. **Read history** — finished books, newest first, collapsed behind a single row.
5. **Identity ("who's reading")** — on first visit a blocking picker asks the visitor to choose their name from a shared list or add a new one; the choice is persisted locally and shown as a header chip that re-opens the picker so anyone can switch. Users can be renamed or removed (rename updates the name everywhere; removal keeps a person's past suggestions, frozen under their last name). Attribution only — not a security boundary.
6. **Votes** — upvote-only, one per picked user per nomination, as many nominations as you like. Soft dedup, not a security boundary. (Originally always-on upvotes on the reading list; replaced by voting sessions.)
7. **"Already read it"** — inside the book card, a member can mark that they've *already read* a book before (separate from the club-wide finished flag). It shows a count of how many members have read it, so the group can avoid picking something most people already know. It's the first tie-break in vote results: among nominations with equal votes, the one fewer members have already read wins. One marker per picked user per book; same soft dedup as votes.

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

VotingSession {
  id: string           // uuid
  status: "proposing" | "voting" | "closed" | "done"
  openedAt: timestamp
  closedAt?: timestamp
  winnerBookId?: string // FK to Book, set when the winner is started
  // at most one non-done session per club
}

Nomination {
  id: string           // uuid
  sessionId: string    // FK to VotingSession (cascade delete)
  bookId: string       // FK to Book (cascade delete)
  userId: string       // FK to User (cascade delete)
  createdAt: timestamp
  // unique (sessionId, userId) — one nomination per member per session
  // unique (sessionId, bookId)
}

NominationVote {
  id: string           // uuid
  sessionId: string    // FK to VotingSession (cascade delete)
  nominationId: string // FK to Nomination (cascade delete)
  userId: string       // FK to User (cascade delete)
  // unique (nominationId, userId) — one upvote per member per nomination
}

// Legacy: Vote { bookId, userId } — the old always-on upvotes table, no longer used.

ReadBefore {
  id: string           // uuid
  bookId: string       // FK to Book (cascade delete)
  userId: string       // FK to User (cascade delete)
  createdAt: timestamp
  // unique (bookId, userId) — one "I've already read this" marker per user per book
  // Distinct from Book.read, which is the club-wide finished flag.
}
```

Singleton `CurrentReading` (one current book at a time). Setting a new one replaces the previous.

A book keeps both a foreign key to its suggester (`suggestedByUserId`) and a `suggestedByName` snapshot. The FK is the canonical link and lets renames propagate; the snapshot is what the list renders, so a suggester's name stays put even after that user is removed. Both are set on insert and kept in sync when a user is renamed.

---

## Recommended stack

- **Frontend**: Next.js 15 (App Router) or Vite + React — your choice. The prototype is plain HTML/JS so port is straightforward either way.
- **Backend**: Supabase. Tables `books`, `current_reading`, `users`, `read_before`, `voting_sessions`, `nominations`, `nomination_votes` (plus the legacy, unused `votes`) + Realtime subscriptions so everyone sees updates without refreshing. You already know the setup from Españolo.
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
