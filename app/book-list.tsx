"use client";

import { useEffect, useRef, useState } from "react";
import type { Book, Filter } from "@/lib/types";
import { KebabIcon } from "./icons";

type Props = {
  books: Book[];
  filter: Filter;
  onFilter: (f: Filter) => void;
  onPin: (bookId: string) => void;
  onToggleRead: (bookId: string) => void;
  onRemove: (bookId: string) => void;
};

export default function BookList({ books, filter, onFilter, onPin, onToggleRead, onRemove }: Props) {

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenuId) return;
    function onDocClick(e: MouseEvent) {
      if (menuContainerRef.current?.contains(e.target as Node)) return;
      setOpenMenuId(null);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [openMenuId]);

  const runAction = (action: () => void) => {
    setOpenMenuId(null);
    action();
  };

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
            const isOpen = openMenuId === book.id;
            const suggesterName = book.suggestedByName;
            return (
              <div key={book.id} className={`book${book.read ? " read" : ""}${isOpen ? " menu-open" : ""}`}>
                <div className="book-info">
                  <div className="book-title">{book.title}</div>
                  {book.author ? <div className="book-author">{book.author}</div> : null}
                  {suggesterName ? <div className="book-meta">By {suggesterName}</div> : null}
                </div>
                <div
                  className="book-actions"
                  ref={isOpen ? menuContainerRef : undefined}
                >
                  <button
                    className="icon-btn"
                    aria-label="Actions"
                    aria-expanded={isOpen}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(isOpen ? null : book.id);
                    }}
                  >
                    <KebabIcon />
                  </button>
                  <div className={`book-menu${isOpen ? " open" : ""}`}>
                    {!book.read ? (
                      <button onClick={() => runAction(() => onPin(book.id))}>Pin book</button>
                    ) : null}
                    <button onClick={() => runAction(() => onToggleRead(book.id))}>
                      {book.read ? "Mark unread" : "Mark finished"}
                    </button>
                    <button className="danger" onClick={() => runAction(() => onRemove(book.id))}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
