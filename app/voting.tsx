"use client";

import type { Book, Nomination, VotingSession } from "@/lib/types";
import { ExpandIcon, UpvoteIcon } from "./icons";

export type Entry = {
  nomination: Nomination;
  book: Book;
  nominatorName: string | null;
  votes: number;
  voted: boolean;
  readBefore: number;
};

type Props = {
  session: VotingSession | null;
  entries: Entry[];
  voterCount: number;
  myEntry: Entry | null;
  hasUser: boolean;
  nudge: string | null;
  onOpenVoting: () => void;
  onOpenCard: (bookId: string) => void;
  onVote: (nominationId: string) => void;
  onClose: () => void;
  onReopen: () => void;
  onStart: (bookId: string) => void;
};

// Results order: most upvotes first; ties go to the book fewer members have
// already read (fresh-to-the-group picks), then the earliest nomination.
function rank(entries: Entry[]): Entry[] {
  return [...entries].sort(
    (a, b) =>
      b.votes - a.votes ||
      a.readBefore - b.readBefore ||
      a.nomination.createdAt - b.nomination.createdAt,
  );
}

export default function Voting(props: Props) {
  const { session } = props;
  if (!session) return <Idle {...props} />;
  if (session.status === "open") return <Open {...props} />;
  return <Results {...props} />;
}

function Idle({ nudge, onOpenVoting }: Props) {
  return (
    <div className={`vote-panel${nudge ? " nudge" : ""}`}>
      <div className="hero-label">Next book</div>
      <div className="vote-panel-title">{nudge ?? "Voting is closed"}</div>
      <div className="vote-panel-sub">
        Open a vote when the current book is nearly done. Everyone nominates one book — new or
        one they&apos;ve suggested before — then everyone upvotes.
      </div>
      <button className={`btn${nudge ? " btn-danger" : ""}`} onClick={onOpenVoting}>
        Open voting
      </button>
    </div>
  );
}

function Open({ entries, voterCount, myEntry, hasUser, onOpenCard, onVote, onClose }: Props) {
  let status: string;
  if (!hasUser) status = "Pick your name to nominate and vote.";
  else if (myEntry) status = `Your pick: ${myEntry.book.title}`;
  else status = "You haven't nominated a book yet.";

  return (
    <section className="vote-section">
      <div className="section-header">
        <div className="section-title">Next book</div>
        <div className="section-count vote-live">Voting open</div>
      </div>
      <div className="vote-stats">
        {entries.length} nominated · {voterCount} {voterCount === 1 ? "person has" : "people have"}{" "}
        voted · votes stay hidden until voting closes
      </div>
      <div className={`vote-status${myEntry ? "" : " pending"}`}>{status}</div>

      <div className="book-list">
        {entries.length === 0 ? (
          <div className="empty">No nominations yet — be the first.</div>
        ) : (
          entries.map((e) => (
            <div
              key={e.nomination.id}
              className="book book-clickable"
              onClick={() => onOpenCard(e.book.id)}
            >
              <div className="book-info">
                <div className="book-title">{e.book.title}</div>
                {e.book.author ? <div className="book-author">{e.book.author}</div> : null}
                {e.nominatorName ? (
                  <div className="book-meta">Nominated by {e.nominatorName}</div>
                ) : null}
              </div>
              <div className="book-actions">
                <button
                  className={`vote-btn${e.voted ? " voted" : ""}`}
                  aria-label={
                    e.voted ? `Remove your vote for ${e.book.title}` : `Vote for ${e.book.title}`
                  }
                  aria-pressed={e.voted}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onVote(e.nomination.id);
                  }}
                >
                  <UpvoteIcon />
                </button>
                <button
                  className="icon-btn"
                  aria-label={`Open details for ${e.book.title}`}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onOpenCard(e.book.id);
                  }}
                >
                  <ExpandIcon />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="vote-footer">
        <button className="btn btn-ghost btn-small" onClick={onClose}>
          {entries.length === 0 ? "Cancel voting" : "Close voting & see results"}
        </button>
      </div>
    </section>
  );
}

function Results({ entries, onOpenCard, onReopen, onStart }: Props) {
  const ranked = rank(entries);
  const top = ranked[0];
  // Books still tied with the winner after every tie-break except nomination
  // order — that last one is arbitrary, so let the group pick among them.
  const tied = ranked.filter((e) => e.votes === top?.votes && e.readBefore === top?.readBefore);
  const runnerUp = ranked[1];
  let tieNote: string | null = null;
  if (tied.length > 1) tieNote = "It's a tie — pick one together.";
  else if (runnerUp && runnerUp.votes === top.votes)
    tieNote = "Tied on votes — this one wins because fewer of you have already read it.";

  return (
    <section className="vote-section">
      <div className="section-header">
        <div className="section-title">Results</div>
        <div className="section-count">Voting closed</div>
      </div>

      {top ? (
        <div className="vote-panel winner">
          <div className="hero-label">{tied.length > 1 ? "Tied for first" : "Next book"}</div>
          <div
            className="vote-panel-title book-clickable"
            onClick={() => onOpenCard(top.book.id)}
          >
            {tied.map((e) => e.book.title).join(" / ")}
          </div>
          {tied.length === 1 && top.book.author ? (
            <div className="vote-panel-author">{top.book.author}</div>
          ) : null}
          <div className="vote-panel-sub">
            {top.votes === 1 ? "1 vote" : `${top.votes} votes`}
            {tieNote ? ` · ${tieNote}` : ""}
          </div>
          <div className="winner-actions">
            {tied.map((e) => (
              <button key={e.nomination.id} className="btn btn-danger" onClick={() => onStart(e.book.id)}>
                {tied.length > 1 ? `Start “${e.book.title}”` : "Start reading"}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="book-list">
        {ranked.map((e, i) => (
          <div
            key={e.nomination.id}
            className="book book-clickable"
            onClick={() => onOpenCard(e.book.id)}
          >
            <div className="rank">{i + 1}</div>
            <div className="book-info">
              <div className="book-title">{e.book.title}</div>
              {e.book.author ? <div className="book-author">{e.book.author}</div> : null}
              {e.nominatorName ? (
                <div className="book-meta">Nominated by {e.nominatorName}</div>
              ) : null}
            </div>
            <div className="book-actions">
              <span
                className={`vote-btn static${e.voted ? " voted" : ""}`}
                aria-label={`${e.votes} ${e.votes === 1 ? "vote" : "votes"}`}
              >
                <UpvoteIcon />
                <span className="vote-count">{e.votes}</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="vote-footer">
        <button className="btn btn-ghost btn-small" onClick={onReopen}>
          Reopen voting
        </button>
      </div>
    </section>
  );
}
