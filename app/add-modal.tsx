"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  mode?: "add" | "edit";
  initialTitle?: string;
  initialAuthor?: string;
  initialNote?: string;
  onClose: () => void;
  onSubmit: (data: { title: string; author: string; note: string }) => void;
};

export default function AddModal({
  open,
  mode = "add",
  initialTitle = "",
  initialAuthor = "",
  initialNote = "",
  onClose,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [author, setAuthor] = useState(initialAuthor);
  const [note, setNote] = useState(initialNote);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setAuthor(initialAuthor);
      setNote(initialNote);
      const t = setTimeout(() => titleRef.current?.focus(), 280);
      return () => clearTimeout(t);
    }
  }, [open, initialTitle, initialAuthor, initialNote]);

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
        <div className="modal-title">{mode === "edit" ? "Edit Book" : "Suggest a Book"}</div>
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
            {mode === "edit" ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
