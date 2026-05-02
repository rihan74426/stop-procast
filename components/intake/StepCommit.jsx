"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/Button";

export function StepCommit({ blueprint, onBack, onConfirm }) {
  const [deadline, setDeadline] = useState("");
  const [committed, setCommitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState(null);

  const progressRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (progressRef.current) {
        clearInterval(progressRef.current);
        progressRef.current = null;
      }
    };
  }, []);

  // Suggest a deadline based on blueprint timeline
  const suggestDeadline = useCallback(() => {
    const weeks = parseInt(blueprint.timeline) || 6;
    const d = new Date();
    d.setDate(d.getDate() + weeks * 7);
    setDeadline(d.toISOString().split("T")[0]);
  }, [blueprint.timeline]);

  const startProgress = useCallback(() => {
    setProgress((p) => Math.max(p, 8));
    if (progressRef.current) clearInterval(progressRef.current);
    progressRef.current = setInterval(() => {
      if (!mountedRef.current) {
        clearInterval(progressRef.current);
        return;
      }
      setProgress((p) => {
        const delta = p < 40 ? 6 : p < 80 ? 3 : 1;
        return Math.min(96, p + delta);
      });
    }, 700);
  }, []);

  const stopProgress = useCallback(() => {
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
  }, []);

  const handleConfirm = async () => {
    if (!committed || submitting) return;
    setError(null);
    setSubmitting(true);
    setStatusMessage("Creating your project…");
    startProgress();

    try {
      await onConfirm({ deadline: deadline || null });
      // If navigation happens, this component unmounts — that's fine
      // If it doesn't navigate (error in parent), we reset
      if (mountedRef.current) {
        stopProgress();
        setProgress(100);
        setStatusMessage("Project created — redirecting…");
        setTimeout(() => {
          if (mountedRef.current) setSubmitting(false);
        }, 500);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      stopProgress();
      setSubmitting(false);
      setStatusMessage("");
      setProgress(0);
      setError(e?.message ?? "Failed to create project. Please try again.");
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-display font-semibold text-[var(--text-primary)] mb-2">
          Make it real
        </h1>
        <p className="text-[var(--text-secondary)]">
          A plan without a deadline is just a wish. Set one now.
        </p>
      </div>

      {/* Project summary card */}
      <div className="rounded-[var(--r-lg)] border border-[var(--violet)] bg-[var(--violet-bg)] p-5">
        <p className="font-display font-semibold text-xl text-[var(--text-primary)] mb-1">
          {blueprint.projectTitle}
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          {blueprint.oneLineGoal}
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--text-tertiary)]">
          <span>{blueprint.phases?.length ?? 0} phases</span>
          <span>·</span>
          <span>{blueprint.tasks?.length ?? 0} tasks</span>
          {blueprint.estimatedEffort && (
            <>
              <span>·</span>
              <span>{blueprint.estimatedEffort}</span>
            </>
          )}
        </div>
      </div>

      {/* Deadline picker */}
      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-[var(--text-primary)]">
          Target completion date
        </label>
        <div className="flex gap-3">
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="flex-1 h-10 px-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--violet)] focus:border-[var(--violet)]"
            disabled={submitting}
          />
          <Button
            variant="ghost"
            onClick={suggestDeadline}
            size="md"
            disabled={submitting}
          >
            Suggest
          </Button>
        </div>
        {deadline && (
          <p className="text-xs text-[var(--text-secondary)]">
            That gives you{" "}
            {Math.max(
              1,
              Math.ceil((new Date(deadline) - Date.now()) / 86400000)
            )}{" "}
            days.
          </p>
        )}
      </div>

      {/* Commitment checkbox */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <div
          onClick={() => !submitting && setCommitted((c) => !c)}
          className={[
            "mt-0.5 w-5 h-5 rounded-[var(--r-sm)] border-2 flex items-center justify-center shrink-0 transition-all",
            committed
              ? "bg-[var(--violet)] border-[var(--violet)]"
              : "border-[var(--border)] group-hover:border-[var(--violet)]",
          ].join(" ")}
        >
          {committed && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M2 5l2 2 4-4"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          I commit to working on this project until it ships. I understand that
          the app will hold me accountable with daily reminders and progress
          tracking.
        </p>
      </label>

      {/* Inline status / progress */}
      {submitting && (
        <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-3 flex items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-[var(--violet)] border-t-transparent animate-spin shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[var(--text-primary)]">
              {statusMessage}
            </div>
            <div className="mt-2 h-2 rounded-full bg-[var(--bg-muted)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progress}%`, background: "var(--violet)" }}
              />
            </div>
          </div>
          <div className="text-xs text-[var(--text-tertiary)] tabular-nums">
            {Math.min(99, Math.round(progress))}%
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-[var(--r-md)] border border-[var(--coral)] bg-[var(--coral-bg)] px-4 py-3 text-sm text-[var(--coral)]">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} disabled={submitting}>
          ← Review plan
        </Button>
        <Button
          variant="emerald"
          size="lg"
          disabled={!committed || submitting}
          onClick={handleConfirm}
        >
          {submitting ? "Starting… 🚀" : "Start project 🚀"}
        </Button>
      </div>
    </div>
  );
}
