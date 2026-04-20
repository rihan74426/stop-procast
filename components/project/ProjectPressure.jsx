"use client";

import { useEffect, useState } from "react";
import { getPressure, PRESSURE_LABELS } from "@/lib/pressure";

export function ProjectPressure({ project }) {
  const [suggestion, setSuggestion] = useState(null);
  const pressure = getPressure(project);

  const idleReason = pressure.reasons.find(
    (r) =>
      (r.type === "idle" && r.severity === "high") || r.severity === "critical"
  );

  // Fetch AI re-engagement suggestion for high-pressure idle projects
  useEffect(() => {
    if (!idleReason || pressure.level !== "critical") return;
    let cancelled = false;
    fetch("/api/reengage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setSuggestion(d.suggestion);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  if (pressure.level === "none" || pressure.level === "low") return null;

  const colors = {
    medium: {
      border: "var(--amber)",
      bg: "var(--amber-bg)",
      text: "var(--amber)",
    },
    high: {
      border: "var(--coral)",
      bg: "var(--coral-bg)",
      text: "var(--coral)",
    },
    critical: {
      border: "var(--coral)",
      bg: "var(--coral-bg)",
      text: "var(--coral)",
    },
  }[pressure.level];

  return (
    <div
      className="rounded-[var(--r-lg)] border px-4 py-3"
      style={{ borderColor: colors.border, background: colors.bg }}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg">
          {pressure.level === "critical"
            ? "🚨"
            : pressure.level === "high"
            ? "⚠️"
            : "⏰"}
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: colors.text }}>
            {PRESSURE_LABELS[pressure.level]}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {pressure.reasons.map((r, i) => (
              <p key={i} className="text-xs text-[var(--text-secondary)]">
                {reasonLabel(r)}
              </p>
            ))}
          </div>
          {suggestion && (
            <p className="mt-2 text-sm text-[var(--text-primary)] italic border-t border-[var(--border)] pt-2">
              💡 {suggestion}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function reasonLabel(r) {
  if (r.type === "idle") return `${r.days} days without progress`;
  if (r.type === "missed_milestones")
    return `${r.count} missed milestone${r.count > 1 ? "s" : ""}`;
  if (r.type === "blockers")
    return `${r.count} active blocker${r.count > 1 ? "s" : ""}`;
  if (r.type === "low_progress")
    return `Only ${r.progress}% done after ${r.age} days`;
  if (r.type === "streak_broken") return "Streak broken";
  return r.type;
}
