"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@/lib/types";
import { KebabIcon, XIcon } from "./icons";
import ConfirmDialog from "./confirm-dialog";

type Props = {
  open: boolean;
  users: User[];
  currentUserId: string | null;
  dismissible: boolean;
  onClose: () => void;
  onSelect: (userId: string) => void;
  onAdd: (name: string) => Promise<User | null>;
  onRename: (userId: string, name: string) => void;
  onDelete: (userId: string) => void;
};

type Mode = "select" | "add" | "edit";

export default function UserPicker({
  open,
  users,
  currentUserId,
  dismissible,
  onClose,
  onSelect,
  onAdd,
  onRename,
  onDelete,
}: Props) {
  const [mode, setMode] = useState<Mode>("select");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  // The per-row menu opens downward by default, but flips up when the row sits
  // low in the viewport so it can't clip off the bottom of the sheet.
  const [menuDir, setMenuDir] = useState<"down" | "up">("down");
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // First-visit, empty club: jump straight to the add form.
    setMode(users.length === 0 ? "add" : "select");
    setName("");
    setEditingId(null);
    setOpenMenuId(null);
    setPendingDelete(null);
  }, [open, users.length]);

  useEffect(() => {
    if (open && (mode === "add" || mode === "edit")) {
      const t = setTimeout(() => inputRef.current?.focus(), 280);
      return () => clearTimeout(t);
    }
  }, [open, mode]);

  useEffect(() => {
    if (!openMenuId) return;
    function onDocClick(e: MouseEvent) {
      if (menuContainerRef.current?.contains(e.target as Node)) return;
      setOpenMenuId(null);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [openMenuId]);

  async function submitForm() {
    const trimmed = name.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    if (mode === "edit" && editingId) {
      onRename(editingId, trimmed);
      setMode("select");
      return;
    }
    const created = await onAdd(trimmed);
    if (created) onSelect(created.id);
  }

  function startRename(user: User) {
    setOpenMenuId(null);
    setEditingId(user.id);
    setName(user.name);
    setMode("edit");
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    onDelete(pendingDelete.id);
    setPendingDelete(null);
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

        {dismissible ? (
          <button className="hero-menu-btn" aria-label="Close" onClick={onClose}>
            <XIcon />
          </button>
        ) : null}

        <div className="install-label">Who&apos;s reading</div>
        <div className="install-title">
          {mode === "edit" ? (
            "Rename"
          ) : (
            <>
              Pick
              <br />
              your name
            </>
          )}
        </div>
        <div className="install-intro">
          {mode === "edit"
            ? "Updates the name everywhere it appears, including past suggestions."
            : "We'll tag your suggestions with it. You can switch later from the header."}
        </div>

        {mode === "select" ? (
          <>
            <div className="user-list" ref={listRef}>
              {users.map((u) => {
                const active = u.id === currentUserId;
                const menuOpen = openMenuId === u.id;
                return (
                  <div key={u.id} className="user-row">
                    <button
                      className={`user-btn${active ? " active" : ""}`}
                      onClick={() => onSelect(u.id)}
                    >
                      {u.name}
                      {active ? <span className="user-btn-tag">You</span> : null}
                    </button>
                    <div
                      className="user-actions"
                      ref={menuOpen ? menuContainerRef : undefined}
                    >
                      <button
                        className="icon-btn"
                        aria-label={`Actions for ${u.name}`}
                        aria-expanded={menuOpen}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (menuOpen) {
                            setOpenMenuId(null);
                            return;
                          }
                          // Flip the menu upward if it wouldn't fit below the
                          // kebab. The list scrolls, so the real clipping edge
                          // is the bottom of the list container (not the
                          // window) — measure against that.
                          const rect = e.currentTarget.getBoundingClientRect();
                          const estMenuHeight = 110; // Rename + Remove
                          const limit = listRef.current
                            ? listRef.current.getBoundingClientRect().bottom
                            : window.innerHeight;
                          setMenuDir(rect.bottom + estMenuHeight > limit ? "up" : "down");
                          setOpenMenuId(u.id);
                        }}
                      >
                        <KebabIcon />
                      </button>
                      <div
                        className={`user-menu${menuOpen ? " open" : ""}${
                          menuDir === "up" ? " up" : ""
                        }`}
                      >
                        <button onClick={() => startRename(u)}>Rename</button>
                        <button
                          className="danger"
                          onClick={() => {
                            setOpenMenuId(null);
                            setPendingDelete(u);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
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
                  if (e.key === "Enter") submitForm();
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
              <button className="btn" onClick={submitForm}>
                {mode === "edit" ? "Save" : "Add"}
              </button>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Remove ${pendingDelete?.name ?? ""}?`}
        message="They'll be taken off the picker list. Their past book suggestions keep their name."
        confirmLabel="Remove"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
