"use client";

import { useEffect, useRef, useState } from "react";
import type { Book } from "@/lib/types";
import { CheckIcon, KebabIcon, UpvoteIcon } from "./icons";

// Where the card was opened from decides its actions:
// current → the pinned book; nomination → a pick in the open vote; result → a
// pick in a closed vote; read → the club's history; other → anything else.
export type CardContext = "current" | "nomination" | "result" | "read" | "other";

// Nomination vote shown in the card. count is null while voting is open (tallies
// stay hidden until it closes); canVote is false once it's closed.
export type CardVote = { count: number | null; voted: boolean; canVote: boolean };

type Props = {
  book: Book | null;
  context: CardContext;
  vote: CardVote | null;
  onVote: () => void;
  readBeforeCount: number;
  hasReadBefore: boolean;
  onReadBefore: () => void;
  onClose: () => void;
  onReschedule: () => void;
  onEdit: () => void;
  onFinish: () => void;
  onUnpin: () => void;
  onWithdraw: () => void;
  onRemove: () => void;
};

export default function BookCard({
  book,
  context,
  vote,
  onVote,
  readBeforeCount,
  hasReadBefore,
  onReadBefore,
  onClose,
  onReschedule,
  onEdit,
  onFinish,
  onUnpin,
  onWithdraw,
  onRemove,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  // Remember the last shown book so its content stays rendered while the sheet
  // animates closed (book goes null the instant we close — without this the
  // card would slide out blank).
  const [snapshot, setSnapshot] = useState<{
    book: Book;
    context: CardContext;
    vote: CardVote | null;
    readBeforeCount: number;
    hasReadBefore: boolean;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const open = !!book;

  useEffect(() => {
    if (book) {
      setSnapshot({ book, context, vote, readBeforeCount, hasReadBefore });
    }
  }, [book, context, vote, readBeforeCount, hasReadBefore]);

  // Use the live book while open, the snapshot while closing.
  const display = book ?? snapshot?.book ?? null;
  const displayContext = book ? context : snapshot?.context ?? "other";
  const displayVote = book ? vote : snapshot?.vote ?? null;
  const displayReadBeforeCount = book ? readBeforeCount : snapshot?.readBeforeCount ?? 0;
  const displayReadBefore = book ? hasReadBefore : snapshot?.hasReadBefore ?? false;

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

            {displayVote ? (
              <div className="book-card-vote">
                {displayVote.canVote ? (
                  <button
                    className={`vote-btn${displayVote.voted ? " voted" : ""}`}
                    aria-label={displayVote.voted ? "Remove your vote" : "Vote for this book"}
                    aria-pressed={displayVote.voted}
                    onClick={(e) => {
                      e.stopPropagation();
                      onVote();
                    }}
                  >
                    <UpvoteIcon />
                  </button>
                ) : (
                  <span className={`vote-btn static${displayVote.voted ? " voted" : ""}`}>
                    <UpvoteIcon />
                    {displayVote.count !== null ? (
                      <span className="vote-count">{displayVote.count}</span>
                    ) : null}
                  </span>
                )}
                <span className="book-card-vote-label">
                  {displayVote.count !== null
                    ? displayVote.count === 1
                      ? "1 vote"
                      : `${displayVote.count} votes`
                    : displayVote.voted
                      ? "You voted for it"
                      : "Tap to vote"}
                </span>
              </div>
            ) : null}

            <div className="book-card-read">
              <button
                className={`read-btn${displayReadBefore ? " marked" : ""}`}
                aria-label={
                  displayReadBefore ? "I haven't read this before" : "I've read this before"
                }
                aria-pressed={displayReadBefore}
                onClick={(e) => {
                  e.stopPropagation();
                  onReadBefore();
                }}
              >
                <CheckIcon />
                <span className="vote-count">{displayReadBeforeCount}</span>
              </button>
              <span className="book-card-vote-label">
                {displayReadBeforeCount === 0
                  ? "Nobody's read it yet"
                  : displayReadBeforeCount === 1
                    ? "1 has read it"
                    : `${displayReadBeforeCount} have read it`}
              </span>
            </div>

            <div className="book-card-note-label">Why this book</div>
            <div className={`book-card-note${display.note ? "" : " empty"}`}>
              {display.note || "No note yet."}
            </div>

            <div ref={menuRef} className={`book-card-menu${menuOpen ? " open" : ""}`}>
              <div className="book-card-menu-inner">
                {displayContext === "current" ? (
                  <>
                    <button onClick={() => runAction(onReschedule)}>Change date</button>
                    <button onClick={() => runAction(onEdit)}>Edit</button>
                    <button onClick={() => runAction(onFinish)}>Mark finished</button>
                    <button className="danger" onClick={() => runAction(onUnpin)}>
                      Unpin
                    </button>
                  </>
                ) : displayContext === "nomination" ? (
                  <>
                    <button onClick={() => runAction(onEdit)}>Edit</button>
                    <button className="danger" onClick={() => runAction(onWithdraw)}>
                      Withdraw nomination
                    </button>
                  </>
                ) : displayContext === "read" ? (
                  <>
                    <button onClick={() => runAction(onEdit)}>Edit</button>
                    <button className="danger" onClick={() => runAction(onRemove)}>
                      Delete
                    </button>
                  </>
                ) : (
                  <button onClick={() => runAction(onEdit)}>Edit</button>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
