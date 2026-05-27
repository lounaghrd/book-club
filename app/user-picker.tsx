"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@/lib/types";
import { XIcon } from "./icons";

type Props = {
  open: boolean;
  users: User[];
  currentUserId: string | null;
  dismissible: boolean;
  onClose: () => void;
  onSelect: (userId: string) => void;
  onAdd: (name: string) => Promise<User | null>;
  onDelete: (userId: string) => void;
};

export default function UserPicker({
  open,
  users,
  currentUserId,
  dismissible,
  onClose,
  onSelect,
  onAdd,
  onDelete,
}: Props) {
  const [mode, setMode] = useState<"select" | "add">("select");
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    // First-visit, empty club: jump straight to the add form.
    setMode(users.length === 0 ? "add" : "select");
    setName("");
  }, [open, users.length]);

  useEffect(() => {
    if (open && mode === "add") {
      const t = setTimeout(() => inputRef.current?.focus(), 280);
      return () => clearTimeout(t);
    }
  }, [open, mode]);

  async function submitAdd() {
    const trimmed = name.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    const created = await onAdd(trimmed);
    if (created) onSelect(created.id);
  }

  function tryDelete(user: User) {
    if (!confirm(`Remove ${user.name} from the user list?\n\nTheir past suggestions stay but lose attribution.`)) return;
    onDelete(user.id);
  }

  return (
    <div
      className={`modal-backdrop install-backdrop${open ? " open" : ""}`}
      onClick={(e) => {
        if (!dismissible) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal install-sheet user-picker-sheet">
        <div className="modal-handle" />

        <div className="install-label">Who&apos;s reading</div>
        <div className="install-title">
          Pick
          <br />
          your name
        </div>
        <div className="install-intro">
          We&apos;ll tag your suggestions with it. You can switch later from the header.
        </div>

        {mode === "select" ? (
          <>
            <div className="user-list">
              {users.map((u) => {
                const active = u.id === currentUserId;
                return (
                  <div key={u.id} className="user-row">
                    <button
                      className={`user-btn${active ? " active" : ""}`}
                      onClick={() => onSelect(u.id)}
                    >
                      {u.name}
                      {active ? <span className="user-btn-tag">You</span> : null}
                    </button>
                    <button
                      className="icon-btn user-delete-btn"
                      aria-label={`Remove ${u.name}`}
                      onClick={() => tryDelete(u)}
                    >
                      <XIcon />
                    </button>
                  </div>
                );
              })}
            </div>
            <button className="btn btn-ghost user-add-toggle" onClick={() => setMode("add")}>
              + Add someone
            </button>
          </>
        ) : (
          <>
            <div className="field user-add-field">
              <label>Name</label>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitAdd();
                }}
                placeholder="Your first name"
                autoComplete="off"
              />
            </div>
            <div className="modal-actions">
              {users.length > 0 ? (
                <button className="btn btn-ghost" onClick={() => setMode("select")}>
                  Back
                </button>
              ) : null}
              <button className="btn" onClick={submitAdd}>
                Add
              </button>
            </div>
          </>
        )}

        {dismissible && mode === "select" ? (
          <button className="btn btn-ghost user-picker-dismiss" onClick={onClose}>
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}
