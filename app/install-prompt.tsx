"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "bookclub:install_dismissed";

export default function InstallPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
      } catch {
        // localStorage unavailable (private mode, etc.) — don't prompt.
      }
    }, 20_000);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }

  if (!open) return null;

  return (
    <div
      className="modal-backdrop open install-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div className="modal install-sheet">
        <div className="modal-handle" />

        <div className="install-label">Install</div>
        <div className="install-title">
          Add to
          <br />
          Home Screen
        </div>
        <div className="install-intro">
          Pin Book Club to your phone for one-tap access — no app store needed.
        </div>

        <div className="install-steps">
          <div className="install-step">
            <div className="install-step-num">1</div>
            <div className="install-step-text">
              Tap{" "}
              <span className="install-icon-chip">
                <ShareIcon />
              </span>{" "}
              or{" "}
              <span className="install-icon-chip">
                <MenuIcon />
              </span>{" "}
              in your browser&apos;s toolbar
            </div>
          </div>
          <div className="install-step">
            <div className="install-step-num">2</div>
            <div className="install-step-text">
              Tap <b>Add to Home Screen</b> or <b>Install app</b>
            </div>
          </div>
          <div className="install-step">
            <div className="install-step-num">3</div>
            <div className="install-step-text">
              Confirm by tapping <b>Add</b> or <b>Install</b>
            </div>
          </div>
        </div>

        <button className="btn install-cta" onClick={dismiss}>
          Got it
        </button>
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 12v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7" />
      <path d="M12 16V3" />
      <path d="m8 7 4-4 4 4" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}
