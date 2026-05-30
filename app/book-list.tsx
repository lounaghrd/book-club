"use client";

import type { Book, Filter } from "@/lib/types";
import { ExpandIcon, UpvoteIcon } from "./icons";

type Props = {
  books: Book[];
  filter: Filter;
  onFilter: (f: Filter) => void;
  onOpen: (bookId: string) => void;
  voteCounts: Map<string, number>;
  myVotes: Set<string>;
  onVote: (bookId: string) => void;
  readBeforeCounts: Map<string, number>;
};

export default function BookList({
  books,
  filter,
  onFilter,
  onOpen,
  voteCounts,
  myVotes,
  onVote,
  readBeforeCounts,
}: Props) {
  const filtered = books
    .filter((b) => (filter === "available" ? !b.read : b.read))
    // "Up next" ranks by upvotes (most-wanted first); ties go to the book fewer
    // members have already read (a quiet nudge toward fresh-to-the-group picks),
    // then newest. "Read" stays newest-first.
    .sort((a, b) => {
      if (filter === "available") {
        const voteDiff = (voteCounts.get(b.id) ?? 0) - (voteCounts.get(a.id) ?? 0);
        if (voteDiff !== 0) return voteDiff;
        const readDiff = (readBeforeCounts.get(a.id) ?? 0) - (readBeforeCounts.get(b.id) ?? 0);
        if (readDiff !== 0) return readDiff;
      }
      return b.addedAt - a.addedAt;
    });

  const totalBooks = books.length;

  let emptyMessage = "Nothing here yet.";
  if (filter === "read") emptyMessage = "No books read yet.";
  else if (filter === "available") {
    emptyMessage =
      totalBooks === 0
        ? "No books yet — suggest the first."
        : "All suggestions read. Add some new ones.";
  }

  return (
    <>
      <div className="section-header">
        <div className="section-title">Reading List</div>
        <div className="section-count">
          {filtered.length} {filtered.length === 1 ? "book" : "books"}
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab${filter === "available" ? " active" : ""}`}
          onClick={() => onFilter("available")}
        >
          Up next
        </button>
        <button
          className={`tab${filter === "read" ? " active" : ""}`}
          onClick={() => onFilter("read")}
        >
          Read
        </button>
      </div>

      <div className="book-list">
        {filtered.length === 0 ? (
          <div className="empty">{emptyMessage}</div>
        ) : (
          filtered.map((book) => {
            const suggesterName = book.suggestedByName;
            const count = voteCounts.get(book.id) ?? 0;
            const voted = myVotes.has(book.id);
            return (
              <div
                key={book.id}
                className={`book book-clickable${book.read ? " read" : ""}`}
                onClick={() => onOpen(book.id)}
              >
                <div className="book-info">
                  <div className="book-title">{book.title}</div>
                  {book.author ? <div className="book-author">{book.author}</div> : null}
                  {suggesterName ? <div className="book-meta">By {suggesterName}</div> : null}
                </div>
                <div className="book-actions">
                  <button
                    className={`vote-btn${voted ? " voted" : ""}`}
                    aria-label={voted ? `Remove your upvote for ${book.title}` : `Upvote ${book.title}`}
                    aria-pressed={voted}
                    onClick={(e) => {
                      e.stopPropagation();
                      onVote(book.id);
                    }}
                  >
                    <UpvoteIcon />
                    <span className="vote-count">{count}</span>
                  </button>
                  <button
                    className="icon-btn"
                    aria-label={`Open details for ${book.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(book.id);
                    }}
                  >
                    <ExpandIcon />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
