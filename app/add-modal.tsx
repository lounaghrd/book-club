"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  mode?: "add" | "edit";
  initialTitle?: string;
  initialAuthor?: string;
  onClose: () => void;
  onSubmit: (data: { title: string; author: string }) => void;
};

export default function AddModal({
  open,
  mode = "add",
  initialTitle = "",
  initialAuthor = "",
  onClose,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [author, setAuthor] = useState(initialAuthor);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setAuthor(initialAuthor);
      const t = setTimeout(() => titleRef.current?.focus(), 280);
      return () => clearTimeout(t);
    }
  }, [open, initialTitle, initialAuthor]);

  function submit() {
    const t = title.trim();
    if (!t) {
      titleRef.current?.focus();
      return;
    }
    onSubmit({ title: t, author: author.trim() });
  }

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
