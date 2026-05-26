# Book Club — Build Spec

A mobile-first web app for a small book club. Anyone with the link can suggest books, pin one as the current reading, and schedule the next meeting. No accounts.

**Visual & interaction reference: `book-club.html`** — open it in a browser. The prototype defines the full UI, states, copy, and design tokens. Treat it as the spec for anything not covered here.

---

## Core features

1. **Currently reading** — pinned at top of the page. Shows title, author, days-until-meeting countdown, and meeting date. Kebab menu (⋮) holds: change date, mark finished, unpin.
2. **Reading list** — anyone can suggest a book (title, author, optional "suggested by" name). Per book: pin as current, mark read/unread, remove.
3. **Two filters** — "Up next" (unread, default) and "Read".

Out of scope for v1: voting, meeting links/locations, discussion notes, comments, notifications.

---

## Data model

```ts
Book {
  id: string           // uuid
  title: string
  author?: string
  suggestedBy?: string
  read: boolean
  addedAt: timestamp
}

CurrentReading {
  bookId: string       // foreign key to Book
  meetingDate: date    // YYYY-MM-DD
}
```

Singleton `CurrentReading` (one current book at a time). Setting a new one replaces the previous.

---

## Recommended stack

- **Frontend**: Next.js 15 (App Router) or Vite + React — your choice. The prototype is plain HTML/JS so port is straightforward either way.
- **Backend**: Supabase. Two tables (`books`, `current_reading`) + Realtime subscriptions so everyone sees updates without refreshing. You already know the setup from Españolo.
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
