"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function StepCommit({ blueprint, onBack, onConfirm }) {
  const [deadline, setDeadline] = useState("");
  const [committed, setCommitted] = useState(false);

  // Suggest a deadline based on blueprint timeline
  const suggestDeadline = () => {
    const weeks = parseInt(blueprint.timeline) || 6;
    const d = new Date();
    d.setDate(d.getDate() + weeks * 7);
    setDeadline(d.toISOString().split("T")[0]);
  };

  const handleConfirm = () => {
    onConfirm({ deadline: deadline || null });
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
          <span>{blueprint.phases.length} phases</span>
          <span>·</span>
          <span>{blueprint.tasks.length} tasks</span>
          <span>·</span>
          <span>{blueprint.estimatedEffort}</span>
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
          />
          <Button variant="ghost" onClick={suggestDeadline} size="md">
            Suggest
          </Button>
        </div>
        {deadline && (
          <p className="text-xs text-[var(--text-secondary)]">
            That gives you{" "}
            {Math.ceil((new Date(deadline) - new Date()) / 86400000)} days.
          </p>
        )}
      </div>

      {/* Commitment checkbox */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <div
          onClick={() => setCommitted((c) => !c)}
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

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          ← Review plan
        </Button>
        <Button
          variant="emerald"
          size="lg"
          disabled={!committed}
          onClick={handleConfirm}
        >
          Start project 🚀
        </Button>
      </div>
    </div>
  );
}
