"use client";

import { useState } from "react";
import { getPressure, PRESSURE_LABELS } from "@/lib/pressure";
import { generateReengage } from "@/lib/ai/clientGenerate";
import { useI18n } from "@/lib/i18n";

export function ProjectPressure({ project }) {
  const { locale, t } = useI18n();
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);

  const pressure = getPressure(project);
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

  const handleGetSuggestion = async () => {
    if (loading || suggestion) return;
    setLoading(true);
    try {
      const text = await generateReengage(project, locale);
      if (text) setSuggestion(text);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

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
                {reasonLabel(r, t)}
              </p>
            ))}
          </div>
          {suggestion ? (
            <p className="mt-2 text-sm text-[var(--text-primary)] italic border-t border-[var(--border)] pt-2">
              💡 {suggestion}
            </p>
          ) : (
            <button
              onClick={handleGetSuggestion}
              disabled={loading}
              className="mt-2 text-xs font-medium hover:underline disabled:opacity-50 transition-opacity"
              style={{ color: colors.text }}
            >
              {loading
                ? t("pressure_suggestion_loading")
                : t("pressure_get_suggestion")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function reasonLabel(r, t) {
  if (r.type === "idle") return t("pressure_reason_idle", { days: r.days });
  if (r.type === "missed_milestones")
    return r.count === 1
      ? t("pressure_reason_milestones", { count: r.count })
      : t("pressure_reason_milestones_plural", { count: r.count });
  if (r.type === "blockers")
    return r.count === 1
      ? t("pressure_reason_blockers", { count: r.count })
      : t("pressure_reason_blockers_plural", { count: r.count });
  if (r.type === "low_progress")
    return t("pressure_reason_low_progress", {
      progress: r.progress,
      age: r.age,
    });
  if (r.type === "streak_broken") return t("pressure_reason_streak");
  return r.type;
}
