"use client";

import { useEffect, useRef, useState } from "react";
import type { Book } from "@/lib/types";
import { KebabIcon } from "./icons";

type Props = {
  book: Book | null;
  isPinned: boolean;
  onClose: () => void;
  onPin: () => void;
  onReschedule: () => void;
  onEdit: () => void;
  onFinish: () => void;
  onToggleRead: () => void;
  onUnpin: () => void;
  onRemove: () => void;
};

export default function BookCard({
  book,
  isPinned,
  onClose,
  onPin,
  onReschedule,
  onEdit,
  onFinish,
  onToggleRead,
  onUnpin,
  onRemove,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const open = !!book;

  // Reset the kebab whenever the card opens/closes or switches books.
  useEffect(() => {
    setMenuOpen(false);
  }, [book?.id, open]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || btnRef.current?.contains(target)) return;
      setMenuOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuOpen]);

  const runAction = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  return (
    <div
      className={`modal-backdrop${open ? " open" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal book-card">
        <div className="modal-handle" />
        {book ? (
          <>
            <button
              ref={btnRef}
              className="hero-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((o) => !o);
              }}
              aria-label="Actions"
              aria-expanded={menuOpen}
            >
              <KebabIcon />
            </button>

            <div className="book-card-title">{book.title}</div>
            <div className="book-card-author">{book.author || "Unknown author"}</div>

            {book.suggestedByName ? (
              <div className="book-card-suggester">Suggested by {book.suggestedByName}</div>
            ) : null}

            <div className="book-card-note-label">Why this book</div>
            <div className={`book-card-note${book.note ? "" : " empty"}`}>
              {book.note || "No note yet."}
            </div>

            <div ref={menuRef} className={`hero-menu${menuOpen ? " open" : ""}`}>
              {isPinned ? (
                <>
                  <button onClick={() => runAction(onReschedule)}>Change date</button>
                  <button onClick={() => runAction(onEdit)}>Edit</button>
                  <button onClick={() => runAction(onFinish)}>Mark finished</button>
                  <button className="danger" onClick={() => runAction(onUnpin)}>
                    Unpin
                  </button>
                </>
              ) : (
                <>
                  {!book.read ? (
                    <button onClick={() => runAction(onPin)}>Pin book</button>
                  ) : null}
                  <button onClick={() => runAction(onEdit)}>Edit</button>
                  <button onClick={() => runAction(onToggleRead)}>
                    {book.read ? "Mark unread" : "Mark finished"}
                  </button>
                  <button className="danger" onClick={() => runAction(onRemove)}>
                    Delete
                  </button>
                </>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
