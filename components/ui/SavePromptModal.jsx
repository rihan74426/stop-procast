"use client";

import { useEffect, useState } from "react";
import { useUser, SignInButton, SignUpButton } from "@clerk/nextjs";
import { useProjectStore } from "@/lib/store/projectStore";

/**
 * Shown once after the user creates their first project or completes their
 * first task — whichever comes first. Gently nudges them to sign in so their
 * data is saved to MongoDB. Dismissed forever once they close it.
 */
export function SavePromptModal() {
  const { isSignedIn, isLoaded } = useUser();
  const projects = useProjectStore((s) => s.projects);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) return; // already signed in — don't show
    if (dismissed) return;

    const seen = localStorage.getItem("sp_save_nudge_seen");
    if (seen) return;

    // Show after they have at least 1 project with at least 1 task done
    const hasActivity =
      projects.some((p) => p.tasks.some((t) => t.status === "done")) ||
      projects.length >= 1;

    if (hasActivity) {
      // Small delay so it doesn't flash immediately on page load
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, isSignedIn, projects, dismissed]);

  const handleDismiss = () => {
    localStorage.setItem("sp_save_nudge_seen", "1");
    setDismissed(true);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 animate-[slideUp_300ms_var(--ease-spring)_both]">
      <div className="rounded-[var(--r-xl)] border border-[var(--violet)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)] p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[var(--r-md)] bg-[var(--violet-bg)] flex items-center justify-center shrink-0">
              <span className="text-base">💾</span>
            </div>
            <p className="font-display font-semibold text-sm text-[var(--text-primary)]">
              Save your progress
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors text-lg leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
          Your projects are stored locally right now. Sign in to sync them
          across all your devices and never lose your work.
        </p>

        <div className="flex gap-2">
          <SignUpButton mode="modal">
            <button
              onClick={handleDismiss}
              className="flex-1 h-9 rounded-[var(--r-md)] bg-[var(--violet)] text-white text-sm font-medium hover:bg-[var(--violet-dim)] transition-colors"
            >
              Create account
            </button>
          </SignUpButton>
          <SignInButton mode="modal">
            <button
              onClick={handleDismiss}
              className="flex-1 h-9 rounded-[var(--r-md)] border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors"
            >
              Sign in
            </button>
          </SignInButton>
        </div>

        <button
          onClick={handleDismiss}
          className="w-full mt-2 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors py-1"
        >
          Continue without saving
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
