"use client";

import type { Book, Filter } from "@/lib/types";
import { CheckIcon, PinIcon, UndoIcon, XIcon } from "./icons";

type Props = {
  books: Book[];
  filter: Filter;
  onFilter: (f: Filter) => void;
  onPin: (bookId: string) => void;
  onToggleRead: (bookId: string) => void;
  onRemove: (bookId: string) => void;
};

export default function BookList({ books, filter, onFilter, onPin, onToggleRead, onRemove }: Props) {
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
          filtered.map((book) => (
            <div key={book.id} className={`book${book.read ? " read" : ""}`}>
              <div className="book-info">
                <div className="book-title">{book.title}</div>
                {book.author ? <div className="book-author">{book.author}</div> : null}
                {book.suggestedBy ? <div className="book-meta">By {book.suggestedBy}</div> : null}
              </div>
              <div className="book-actions">
                {!book.read ? (
                  <button
                    className="icon-btn primary"
                    title="Pin as current"
                    onClick={() => onPin(book.id)}
                  >
                    <PinIcon />
                  </button>
                ) : null}
                <button
                  className="icon-btn"
                  title={book.read ? "Mark as unread" : "Mark as read"}
                  onClick={() => onToggleRead(book.id)}
                >
                  {book.read ? <UndoIcon /> : <CheckIcon />}
                </button>
                <button className="icon-btn" title="Remove" onClick={() => onRemove(book.id)}>
                  <XIcon />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
