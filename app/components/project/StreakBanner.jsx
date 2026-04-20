"use client";

import { daysSince } from "@/lib/utils/date";

export function StreakBanner({ project }) {
  const idle = daysSince(project.lastActivityAt);
  const streak = project.streakDays;

  if (streak >= 7) {
    return (
      <div className="flex items-center gap-3 rounded-[var(--r-lg)] bg-[var(--amber-bg)] border border-[var(--amber)] px-4 py-3">
        <span className="text-xl">🔥</span>
        <div>
          <p className="text-sm font-medium text-[var(--amber)]">
            {streak}-day streak!
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            You`re on fire. Keep going.
          </p>
        </div>
      </div>
    );
  }

  if (streak > 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <span>🔥</span>
        <span>
          {streak} day{streak !== 1 ? "s" : ""} streak
        </span>
        <span className="text-[var(--text-tertiary)]">— keep it going</span>
      </div>
    );
  }

  if (idle >= 7) {
    return (
      <div className="flex items-center gap-3 rounded-[var(--r-lg)] bg-[var(--coral-bg)] border border-[var(--coral)] px-4 py-3">
        <span className="text-xl">⚠️</span>
        <div>
          <p className="text-sm font-medium text-[var(--coral)]">
            {idle} days without progress
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            This project is at risk of being abandoned. Do one small thing right
            now.
          </p>
        </div>
      </div>
    );
  }

  if (idle >= 3) {
    return (
      <div className="flex items-center gap-3 rounded-[var(--r-lg)] bg-[var(--amber-bg)] border border-[var(--amber)] px-4 py-3">
        <span className="text-lg">⏰</span>
        <p className="text-sm text-[var(--amber)]">
          {idle} days since last activity — time to get back on track.
        </p>
      </div>
    );
  }

  return null;
}
