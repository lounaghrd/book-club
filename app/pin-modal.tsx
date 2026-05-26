"use client";

import { useEffect, useState } from "react";

export type PinTarget =
  | { mode: "pin"; bookId: string; title: string; author: string | null }
  | { mode: "reschedule"; title: string; currentDate: string | null };

type Props = {
  target: PinTarget | null;
  onClose: () => void;
  onConfirm: (date: string) => void;
};

function defaultMeetingDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 28);
  return d.toISOString().slice(0, 10);
}

export default function PinModal({ target, onClose, onConfirm }: Props) {
  const [date, setDate] = useState("");

  useEffect(() => {
    if (!target) return;
    if (target.mode === "reschedule") setDate(target.currentDate ?? "");
    else setDate(defaultMeetingDate());
  }, [target]);

  function submit() {
    if (!date) return;
    onConfirm(date);
  }

  const open = !!target;
  const titleText = target?.mode === "reschedule" ? "Reschedule" : "Pin as Current";
  const preview =
    target?.mode === "pin"
      ? `“${target.title}”${target.author ? " · " + target.author : ""}`
      : target?.mode === "reschedule"
        ? `“${target.title}”`
        : "";

  return (
    <div
      className={`modal-backdrop${open ? " open" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-title">{titleText}</div>
        <div className="modal-subtext">{preview}</div>
        <div className="field">
          <label>Meeting date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" onClick={submit}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
