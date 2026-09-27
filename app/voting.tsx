"use client";

import type { Book, Nomination, VotingSession } from "@/lib/types";
import { CheckIcon, UpvoteIcon } from "./icons";

export type Entry = {
  nomination: Nomination;
  book: Book;
  votes: number;
  voted: boolean;
  readBefore: number;
};

type Props = {
  session: VotingSession | null;
  entries: Entry[];
  voterCount: number;
  myEntry: Entry | null;
  nudge: boolean;
  onOpen: () => void;
  onSuggest: () => void;
  onEditMine: () => void;
  onOpenCard: (bookId: string) => void;
  onVote: (nominationId: string) => void;
  onAdvance: () => void;
  onStart: (bookId: string) => void;
};

// Results order: most votes first; ties go to the book fewer members have
// already read, then the earliest suggestion.
function rank(entries: Entry[]): Entry[] {
  return [...entries].sort(
    (a, b) =>
      b.votes - a.votes ||
      a.readBefore - b.readBefore ||
      a.nomination.createdAt - b.nomination.createdAt,
  );
}

export default function Voting(props: Props) {
  switch (props.session?.status) {
    case "proposing":
      return <Proposing {...props} />;
    case "voting":
      return <Vote {...props} />;
    case "closed":
      return <Results {...props} />;
    default:
      return <Idle {...props} />;
  }
}

// No session: a single button to start picking the next book.
function Idle({ nudge, onOpen }: Props) {
  return (
    <div className="vote-panel">
      <div className="hero-label">Next book</div>
      <button className={`btn btn-block${nudge ? " btn-danger" : ""}`} onClick={onOpen}>
        Open suggestions
      </button>
    </div>
  );
}

// Stage 1: everyone adds one book. Other people's suggestions stay hidden —
// only the count shows. Before you've suggested, the panel is a call to action;
// after, it's a "done" state so it's clear there's nothing left to do until
// voting opens.
function Proposing({ entries, myEntry, onSuggest, onEditMine, onAdvance }: Props) {
  const n = entries.length;
  const count = `${n} ${n === 1 ? "suggestion" : "suggestions"}`;
  const advance = (
    <button className="vote-advance" onClick={onAdvance}>
      {n === 0 ? "Cancel" : "Close suggestions & start voting"}
    </button>
  );

  if (!myEntry) {
    return (
      <div className="vote-panel">
        <div className="hero-label">Next book · Suggestions</div>
        <div className="vote-panel-title">{count}</div>
        <button className="btn btn-block btn-danger" onClick={onSuggest}>
          Suggest a book
        </button>
        {advance}
      </div>
    );
  }

  return (
    <div className="vote-panel done">
      <div className="hero-label">Next book · Suggestions</div>
      <div className="vote-done">
        <span className="vote-done-icon">
          <CheckIcon />
        </span>
        <div>
          <div className="vote-done-title">You&apos;re all set</div>
          <div className="vote-done-sub">Come back when voting opens.</div>
        </div>
      </div>
      <div className="vote-mine">
        <div className="vote-mine-info">
          <div className="vote-mine-label">Your suggestion</div>
          <div className="vote-mine-title">{myEntry.book.title}</div>
        </div>
        <button className="vote-mine-edit" onClick={onEditMine}>
          Edit
        </button>
      </div>
      <div className="vote-count-line">{count} so far</div>
      {advance}
    </div>
  );
}

// Stage 2: the full list, vote for as many as you like. Tallies stay hidden.
function Vote({ entries, voterCount, onOpenCard, onVote, onAdvance }: Props) {
  const sorted = [...entries].sort((a, b) => a.book.title.localeCompare(b.book.title));
  return (
    <section className="vote-section">
      <div className="section-header">
        <div className="section-title">Vote</div>
        <div className="section-count">{voterCount} voted</div>
      </div>
      <div className="vote-hint">Vote for as many as you like.</div>
      <div className="book-list">
        {sorted.map((e) => (
          <div key={e.nomination.id} className="book book-clickable" onClick={() => onOpenCard(e.book.id)}>
            <div className="book-info">
              <div className="book-title">{e.book.title}</div>
              {e.book.author ? <div className="book-author">{e.book.author}</div> : null}
            </div>
            <button
              className={`vote-btn${e.voted ? " voted" : ""}`}
              aria-label={e.voted ? `Remove your vote for ${e.book.title}` : `Vote for ${e.book.title}`}
              aria-pressed={e.voted}
              onClick={(ev) => {
                ev.stopPropagation();
                onVote(e.nomination.id);
              }}
            >
              <UpvoteIcon />
            </button>
          </div>
        ))}
      </div>
      <button className="vote-advance" onClick={onAdvance}>
        Close voting
      </button>
    </section>
  );
}

// Stage 3: the winner and the tallies.
function Results({ entries, onOpenCard, onStart }: Props) {
  const ranked = rank(entries);
  const top = ranked[0];
  if (!top) return null;
  // Still level with the winner after the "already read" tie-break: let the
  // group choose rather than going by who suggested first.
  const tied = ranked.filter((e) => e.votes === top.votes && e.readBefore === top.readBefore);

  return (
    <section className="vote-section">
      <div className="vote-panel winner">
        <div className="hero-label">{tied.length > 1 ? "It's a tie" : "Next book"}</div>
        {tied.length > 1 ? (
          tied.map((e) => (
            <button key={e.nomination.id} className="btn btn-block btn-danger" onClick={() => onStart(e.book.id)}>
              Start “{e.book.title}”
            </button>
          ))
        ) : (
          <>
            <div className="vote-panel-title">{top.book.title}</div>
            {top.book.author ? <div className="vote-panel-author">{top.book.author}</div> : null}
            <button className="btn btn-block btn-danger" onClick={() => onStart(top.book.id)}>
              Start reading
            </button>
          </>
        )}
      </div>

      <div className="book-list">
        {ranked.map((e) => (
          <div key={e.nomination.id} className="book book-clickable" onClick={() => onOpenCard(e.book.id)}>
            <div className="book-info">
              <div className="book-title">{e.book.title}</div>
              {e.book.author ? <div className="book-author">{e.book.author}</div> : null}
            </div>
            <span className="vote-tally">{e.votes}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
