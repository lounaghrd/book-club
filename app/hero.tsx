"use client";

import type { Book, CurrentReading } from "@/lib/types";
import { daysUntil, formatDate } from "@/lib/format";
import { ExpandIcon } from "./icons";

type Props = {
  current: CurrentReading | null;
  book: Book | null;
  onOpen: () => void;
};

export default function Hero({ current, book, onOpen }: Props) {
  if (!book) {
    return (
      <div className="hero">
        <div className="hero-empty">
          <div className="hero-label">Currently Reading</div>
          <div className="hero-empty-title">
            Nothing
            <br />
            pinned yet
          </div>
          <div className="hero-empty-sub">Pick a book from the list below.</div>
        </div>
      </div>
    );
  }

  const days = current?.meetingDate ? daysUntil(current.meetingDate) : null;
  let numClass = "";
  let labelTop = "";
  let labelBottom = "";
  if (days !== null) {
    if (days > 1) {
      labelTop = "Days";
      labelBottom = "until we meet";
    } else if (days === 1) {
      labelTop = "Day";
      labelBottom = "see you tomorrow";
    } else if (days === 0) {
      numClass = "today";
      labelTop = "Today";
      labelBottom = "meeting happening now";
    } else {
      numClass = "past";
      labelTop = days === -1 ? "Day" : "Days";
      labelBottom = "since the meeting";
    }
  }

  return (
    <div
      className="hero hero-clickable"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`Open details for ${book.title}`}
    >
      <button
        className="hero-menu-btn"
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        aria-label="Open details"
      >
        <ExpandIcon />
      </button>
      <div className="hero-label">Currently Reading</div>
      <div className="hero-title">{book.title}</div>
      <div className="hero-author">{book.author || "Unknown"}</div>
      {days !== null && current?.meetingDate ? (
        <div className="countdown-block" suppressHydrationWarning>
          <div className={`countdown-num ${numClass}`}>{days === 0 ? "0" : Math.abs(days)}</div>
          <div className="countdown-side">
            <div className="countdown-label">
              {labelTop}
              <br />
              {labelBottom}
            </div>
            <div className="countdown-date">{formatDate(current.meetingDate).toUpperCase()}</div>
          </div>
        </div>
      ) : (
        <div className="countdown-block">
          <div className="hero-meta-warning">No meeting scheduled</div>
        </div>
      )}
    </div>
  );
}
