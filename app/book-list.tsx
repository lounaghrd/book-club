"use client";

import { useState } from "react";
import type { Book } from "@/lib/types";

type Props = {
  books: Book[];
  onOpen: (bookId: string) => void;
};

// History of books the club has finished, newest first. Collapsed by default to
// keep the main screen focused on the current book and the vote.
export default function BookList({ books, onOpen }: Props) {
  const [open, setOpen] = useState(false);
  const read = books.filter((b) => b.read).sort((a, b) => b.addedAt - a.addedAt);
  if (read.length === 0) return null;

  return (
    <section className="read-section">
      <button className="read-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>Books we&apos;ve read</span>
        <span className="read-toggle-count">
          {read.length} {open ? "▴" : "▾"}
        </span>
      </button>

      {open ? (
        <div className="book-list">
          {read.map((book) => (
            <div key={book.id} className="book book-clickable read" onClick={() => onOpen(book.id)}>
              <div className="book-info">
                <div className="book-title">{book.title}</div>
                {book.author ? <div className="book-author">{book.author}</div> : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
