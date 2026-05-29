"use client";

import { useEffect, useRef, useState } from "react";
import type { Book } from "@/lib/types";
import { KebabIcon, UpvoteIcon } from "./icons";

type Props = {
  book: Book | null;
  isPinned: boolean;
  voteCount: number;
  hasVoted: boolean;
  onVote: () => void;
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
  voteCount,
  hasVoted,
  onVote,
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
  // Remember the last shown book so its content stays rendered while the sheet
  // animates closed (book goes null the instant we close — without this the
  // card would slide out blank).
  const [snapshot, setSnapshot] = useState<{
    book: Book;
    isPinned: boolean;
    voteCount: number;
    hasVoted: boolean;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const open = !!book;

  useEffect(() => {
    if (book) setSnapshot({ book, isPinned, voteCount, hasVoted });
  }, [book, isPinned, voteCount, hasVoted]);

  // Use the live book while open, the snapshot while closing.
  const display = book ?? snapshot?.book ?? null;
  const displayPinned = book ? isPinned : snapshot?.isPinned ?? false;
  const displayVoteCount = book ? voteCount : snapshot?.voteCount ?? 0;
  const displayVoted = book ? hasVoted : snapshot?.hasVoted ?? false;

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
        {display ? (
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

            <div className="book-card-title">{display.title}</div>
            <div className="book-card-author">{display.author || "Unknown author"}</div>

            {display.suggestedByName ? (
              <div className="book-card-suggester">Suggested by {display.suggestedByName}</div>
            ) : null}

            <div className="book-card-vote">
              <button
                className={`vote-btn${displayVoted ? " voted" : ""}`}
                aria-label={displayVoted ? "Remove your upvote" : "Upvote this book"}
                aria-pressed={displayVoted}
                onClick={(e) => {
                  e.stopPropagation();
                  onVote();
                }}
              >
                <UpvoteIcon />
                <span className="vote-count">{displayVoteCount}</span>
              </button>
              <span className="book-card-vote-label">
                {displayVoteCount === 1 ? "1 upvote" : `${displayVoteCount} upvotes`}
              </span>
            </div>

            <div className="book-card-note-label">Why this book</div>
            <div className={`book-card-note${display.note ? "" : " empty"}`}>
              {display.note || "No note yet."}
            </div>

            <div ref={menuRef} className={`book-card-menu${menuOpen ? " open" : ""}`}>
              <div className="book-card-menu-inner">
                {displayPinned ? (
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
                    {!display.read ? (
                      <button onClick={() => runAction(onPin)}>Pin book</button>
                    ) : null}
                    <button onClick={() => runAction(onEdit)}>Edit</button>
                    <button onClick={() => runAction(onToggleRead)}>
                      {display.read ? "Mark unread" : "Mark finished"}
                    </button>
                    <button className="danger" onClick={() => runAction(onRemove)}>
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
