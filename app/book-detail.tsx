"use client";

import type { Book } from "@/lib/types";
import { formatDate } from "@/lib/format";

export type DetailAction = {
  label: string;
  onClick: () => void;
  danger?: boolean;
};

type Props = {
  book: Book | null;
  meetingDate?: string | null;
  actions: DetailAction[];
  onClose: () => void;
};

export default function BookDetail({ book, meetingDate, actions, onClose }: Props) {
  const open = !!book;

  return (
    <div
      className={`modal-backdrop${open ? " open" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-handle" />
        <div className="detail-title">{book?.title}</div>
        <div className="detail-author">{book ? book.author || "Unknown author" : ""}</div>

        <div className="detail-fields">
          {book?.suggestedByName ? (
            <div className="detail-field">
              <span className="detail-field-label">Suggested by</span>
              <span className="detail-field-value">{book.suggestedByName}</span>
            </div>
          ) : null}
          {meetingDate ? (
            <div className="detail-field">
              <span className="detail-field-label">Meeting</span>
              <span className="detail-field-value">{formatDate(meetingDate)}</span>
            </div>
          ) : null}
        </div>

        <div className="detail-note-label">Why this pick</div>
        {book?.note ? (
          <div className="detail-note">{book.note}</div>
        ) : (
          <div className="detail-note empty">No note added.</div>
        )}

        <div className="detail-actions">
          {actions.map((a) => (
            <button key={a.label} className={a.danger ? "danger" : undefined} onClick={a.onClick}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
