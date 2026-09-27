"use client";

import { useEffect, useRef, useState } from "react";
import type { Book } from "@/lib/types";
import { CheckIcon, KebabIcon, UpvoteIcon } from "./icons";

// Where the card was opened from decides its actions:
// current → the pinned book; nomination → a book in the vote (no actions, just
// the vote); read → the club's history; other → anything else.
export type CardContext = "current" | "nomination" | "read" | "other";

// Vote shown in the card for a book in the vote. count is null while voting
// (tallies stay hidden until it closes); canVote is false once it's closed.
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
  // Books in a vote are view-and-vote only.
  const hasActions = displayContext !== "nomination";
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
            {hasActions ? (
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
            ) : null}

            <div className="book-card-title">{display.title}</div>
            <div className="book-card-author">{display.author || "Unknown author"}</div>

            {display.suggestedByName ? (
              <div className="book-card-suggester">Suggested by {display.suggestedByName}</div>
            ) : null}

            {displayVote ? (
              <>
                {displayVote.canVote ? (
                  <div className="card-toggles">
                    <button
                      className={`card-toggle${displayVote.voted ? " on accent" : ""}`}
                      aria-pressed={displayVote.voted}
                      onClick={(e) => {
                        e.stopPropagation();
                        onVote();
                      }}
                    >
                      <UpvoteIcon />
                      {displayVote.voted ? "Voted" : "Vote"}
                    </button>
                    <button
                      className={`card-toggle${displayReadBefore ? " on" : ""}`}
                      aria-pressed={displayReadBefore}
                      onClick={(e) => {
                        e.stopPropagation();
                        onReadBefore();
                      }}
                    >
                      <CheckIcon />
                      I&apos;ve read it
                    </button>
                  </div>
                ) : null}
                {cardCaption(displayVote.count, displayReadBeforeCount) ? (
                  <div className="card-caption">
                    {cardCaption(displayVote.count, displayReadBeforeCount)}
                  </div>
                ) : null}
              </>
            ) : null}

            <div className="book-card-note-label">Why this book</div>
            <div className={`book-card-note${display.note ? "" : " empty"}`}>
              {display.note || "No note yet."}
            </div>

            {hasActions ? (
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
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

// One quiet line under the card's buttons: the vote total (only once voting has
// closed) and how many members have already read the book.
function cardCaption(votes: number | null, readBefore: number): string {
  const parts: string[] = [];
  if (votes !== null) parts.push(votes === 1 ? "1 vote" : `${votes} votes`);
  if (readBefore > 0)
    parts.push(
      readBefore === 1 ? "1 member has already read it" : `${readBefore} members have already read it`,
    );
  return parts.join(" · ");
}
