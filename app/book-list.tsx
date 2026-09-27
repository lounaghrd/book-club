"use client";

import type { Book } from "@/lib/types";
import { ExpandIcon } from "./icons";

type Props = {
  books: Book[];
  onOpen: (bookId: string) => void;
};

// History of books the club has finished, newest first. Candidates for the next
// book live in the voting section, not here.
export default function BookList({ books, onOpen }: Props) {
  const read = books.filter((b) => b.read).sort((a, b) => b.addedAt - a.addedAt);

  return (
    <section className="read-section">
      <div className="section-header">
        <div className="section-title">Read</div>
        <div className="section-count">
          {read.length} {read.length === 1 ? "book" : "books"}
        </div>
      </div>

      <div className="book-list">
        {read.length === 0 ? (
          <div className="empty">No books read yet.</div>
        ) : (
          read.map((book) => (
            <div key={book.id} className="book book-clickable read" onClick={() => onOpen(book.id)}>
              <div className="book-info">
                <div className="book-title">{book.title}</div>
                {book.author ? <div className="book-author">{book.author}</div> : null}
                {book.suggestedByName ? (
                  <div className="book-meta">By {book.suggestedByName}</div>
                ) : null}
              </div>
              <div className="book-actions">
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
          ))
        )}
      </div>
    </section>
  );
}
