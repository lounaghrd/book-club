"use client";

import { useEffect, useRef, useState } from "react";
import type { Book, CurrentReading } from "@/lib/types";
import { daysUntil, formatDate } from "@/lib/format";
import { KebabIcon } from "./icons";

type Props = {
  current: CurrentReading | null;
  book: Book | null;
  onReschedule: () => void;
  onFinish: () => void;
  onUnpin: () => void;
};

export default function Hero({ current, book, onReschedule, onFinish, onUnpin }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

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

  const handleMenuAction = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  return (
    <div className="hero">
      <button
        ref={btnRef}
        className="hero-menu-btn"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((o) => !o);
        }}
        aria-label="Actions"
      >
        <KebabIcon />
      </button>
      <div className="hero-label">Currently Reading</div>
      <div className="hero-title">{book.title}</div>
      <div className="hero-author">{book.author || "Unknown"}</div>
      {days !== null && current?.meetingDate ? (
        <div className="countdown-block">
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
      <div ref={menuRef} className={`hero-menu${menuOpen ? " open" : ""}`}>
        <button onClick={() => handleMenuAction(onReschedule)}>Change date</button>
        <button onClick={() => handleMenuAction(onFinish)}>Mark finished</button>
        <button className="danger" onClick={() => handleMenuAction(onUnpin)}>
          Unpin
        </button>
      </div>
    </div>
  );
}
