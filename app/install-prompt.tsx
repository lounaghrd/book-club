"use client";

import { useEffect, useState } from "react";

// "Done" means the user has installed it — never prompt again.
const DONE_KEY = "bookclub:install_done";
// Timestamp (ms) of the last time we showed the prompt — drives the weekly cadence.
const LAST_PROMPTED_KEY = "bookclub:install_last_prompted";

const PROMPT_DELAY_MS = 20_000; // wait after the picker closes before surfacing
const REPROMPT_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // re-prompt weekly

export default function InstallPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let shouldPrompt = false;
    try {
      if (localStorage.getItem(DONE_KEY)) return; // installed — never prompt again.
      const last = Number(localStorage.getItem(LAST_PROMPTED_KEY));
      // Show if never prompted, or if a week has passed since the last prompt.
      shouldPrompt = !last || Date.now() - last >= REPROMPT_AFTER_MS;
    } catch {
      // localStorage unavailable (private mode, etc.) — don't prompt.
      return;
    }
    if (!shouldPrompt) return;

    const timer = setTimeout(() => {
      setOpen(true);
      try {
        // Record the show time now (not on dismiss) so the weekly clock keeps
        // ticking even if the tab is closed without choosing an option.
        localStorage.setItem(LAST_PROMPTED_KEY, String(Date.now()));
      } catch {
        // ignore
      }
    }, PROMPT_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // "Remind me later" — just close; the show timestamp is already recorded, so
  // the prompt returns in a week.
  function remindLater() {
    setOpen(false);
  }

  // "Done" — user installed it; stop reminding for good.
  function markDone() {
    setOpen(false);
    try {
      localStorage.setItem(DONE_KEY, "1");
    } catch {
      // ignore
    }
  }

  if (!open) return null;

  return (
    // No backdrop dismiss: the user must choose "Done" or "Remind me later".
    <div className="modal-backdrop open install-backdrop">
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

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={remindLater}>
            Remind me later
          </button>
          <button className="btn" onClick={markDone}>
            Done
          </button>
        </div>
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
