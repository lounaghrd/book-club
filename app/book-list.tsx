"use client";

import type { Book, Filter } from "@/lib/types";
import { ExpandIcon } from "./icons";

type Props = {
  books: Book[];
  filter: Filter;
  onFilter: (f: Filter) => void;
  onOpen: (bookId: string) => void;
};

export default function BookList({ books, filter, onFilter, onOpen }: Props) {
  const filtered = books
    .filter((b) => (filter === "available" ? !b.read : b.read))
    .sort((a, b) => b.addedAt - a.addedAt);

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
            return (
              <div
                key={book.id}
                className={`book book-clickable${book.read ? " read" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(book.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen(book.id);
                  }
                }}
                aria-label={`Open details for ${book.title}`}
              >
                <div className="book-info">
                  <div className="book-title">{book.title}</div>
                  {book.author ? <div className="book-author">{book.author}</div> : null}
                  {suggesterName ? <div className="book-meta">By {suggesterName}</div> : null}
                </div>
                <div className="book-actions">
                  <button
                    className="icon-btn"
                    aria-label="Open details"
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
