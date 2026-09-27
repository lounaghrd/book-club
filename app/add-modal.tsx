"use client";

import { useEffect, useRef, useState } from "react";
import type { Book } from "@/lib/types";

type Props = {
  open: boolean;
  mode?: "add" | "edit";
  initialTitle?: string;
  initialAuthor?: string;
  initialNote?: string;
  // Add mode only: the member's own earlier suggestions they can re-nominate in
  // one tap, and the title of the pick a new nomination would replace.
  pastPicks?: Book[];
  replacing?: string | null;
  onPickPast?: (bookId: string) => void;
  onClose: () => void;
  onSubmit: (data: { title: string; author: string; note: string }) => void;
};

export default function AddModal({
  open,
  mode = "add",
  initialTitle = "",
  initialAuthor = "",
  initialNote = "",
  pastPicks = [],
  replacing = null,
  onPickPast,
  onClose,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [author, setAuthor] = useState(initialAuthor);
  const [note, setNote] = useState(initialNote);
  const titleRef = useRef<HTMLInputElement>(null);

  // With past picks on offer, don't autofocus: on phones the keyboard would cover them.
  const hasPastPicks = mode === "add" && pastPicks.length > 0;

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setAuthor(initialAuthor);
      setNote(initialNote);
      if (hasPastPicks) return;
      const t = setTimeout(() => titleRef.current?.focus(), 280);
      return () => clearTimeout(t);
    }
  }, [open, initialTitle, initialAuthor, initialNote, hasPastPicks]);

  function submit() {
    const t = title.trim();
    if (!t) {
      titleRef.current?.focus();
      return;
    }
    onSubmit({ title: t, author: author.trim(), note: note.trim() });
  }

  // Single-line fields submit on Enter; the note textarea keeps Enter for newlines.
  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") submit();
  }

  return (
    <div
      className={`modal-backdrop${open ? " open" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-title">{mode === "edit" ? "Edit Book" : "Nominate a Book"}</div>
        {mode === "add" ? (
          <div className="modal-subtext">
            {replacing
              ? `This replaces your current pick, “${replacing}”, and any votes it had.`
              : "One book per person. Pick something new, or bring back a past suggestion."}
          </div>
        ) : null}
        {hasPastPicks ? (
          <div className="field">
            <label>Your past suggestions</label>
            <div className="past-picks">
              {pastPicks.map((b) => (
                <button key={b.id} className="past-pick" onClick={() => onPickPast?.(b.id)}>
                  <span className="past-pick-title">{b.title}</span>
                  {b.author ? <span className="past-pick-author">{b.author}</span> : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="field">
          <label>Title</label>
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={onKey}
            placeholder="The Master and Margarita"
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label>Author</label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            onKeyDown={onKey}
            placeholder="Mikhail Bulgakov"
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label>Why this book?</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="A short note on why you're suggesting it (optional)"
            rows={3}
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" onClick={submit}>
            {mode === "edit" ? "Save" : "Nominate"}
          </button>
        </div>
      </div>
    </div>
  );
}
