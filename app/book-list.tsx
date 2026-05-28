"use client";

import type { Book, Filter } from "@/lib/types";

type Props = {
  books: Book[];
  filter: Filter;
  onFilter: (f: Filter) => void;
  onOpenDetail: (bookId: string) => void;
};

export default function BookList({ books, filter, onFilter, onOpenDetail }: Props) {
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
            <button
              key={book.id}
              className={`book${book.read ? " read" : ""}`}
              onClick={() => onOpenDetail(book.id)}
            >
              <div className="book-info">
                <div className="book-title">{book.title}</div>
                {book.author ? <div className="book-author">{book.author}</div> : null}
                {book.suggestedByName || book.note ? (
                  <div className="book-meta">
                    {book.suggestedByName ? `By ${book.suggestedByName}` : null}
                    {book.note ? <span className="book-note-flag">Note</span> : null}
                  </div>
                ) : null}
              </div>
            </button>
          ))
        )}
      </div>
    </>
  );
}
