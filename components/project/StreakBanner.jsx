"use client";

import { daysSince } from "@/lib/utils/date";
import { useI18n } from "@/lib/i18n";
import { FaFire } from "react-icons/fa";
import { FiAlertTriangle, FiClock } from "react-icons/fi";

export function StreakBanner({ project }) {
  const { t } = useI18n();
  const idle = daysSince(project.lastActivityAt);
  const streak = project.streakDays;

  // ── 7+ day streak ─────────────────────────────────────────────────
  if (streak >= 7) {
    return (
      <div className="flex items-center gap-3 rounded-[var(--r-lg)] bg-[var(--amber-bg)] border border-[color-mix(in_srgb,var(--amber)_40%,transparent)] px-4 py-3">
        <span
          className="flex items-center justify-center w-8 h-8 rounded-[var(--r-sm)] shrink-0"
          style={{
            background: "color-mix(in srgb, var(--amber) 18%, transparent)",
          }}
        >
          <FaFire size={16} style={{ color: "var(--amber)" }} />
        </span>
        <div>
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--amber)" }}
          >
            {t("streak_days", { n: streak })}
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {t("streak_fire_subtitle")}
          </p>
        </div>
      </div>
    );
  }

  // ── Active streak < 7 ─────────────────────────────────────────────
  if (streak > 0) {
    return (
      <div
        className="flex items-center gap-2 text-sm"
        style={{ color: "var(--text-secondary)" }}
      >
        <FaFire size={13} style={{ color: "var(--amber)" }} />
        <span>
          {streak !== 1
            ? t("streak_days_short_plural", { n: streak })
            : t("streak_days_short", { n: streak })}
        </span>
        <span style={{ color: "var(--text-tertiary)" }}>
          {t("streak_keep_going")}
        </span>
      </div>
    );
  }

  // ── 7+ days idle — danger ─────────────────────────────────────────
  if (idle >= 7) {
    return (
      <div className="flex items-center gap-3 rounded-[var(--r-lg)] bg-[var(--coral-bg)] border border-[color-mix(in_srgb,var(--coral)_35%,transparent)] px-4 py-3">
        <span
          className="flex items-center justify-center w-8 h-8 rounded-[var(--r-sm)] shrink-0"
          style={{
            background: "color-mix(in srgb, var(--coral) 15%, transparent)",
          }}
        >
          <FiAlertTriangle size={16} style={{ color: "var(--coral)" }} />
        </span>
        <div>
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--coral)" }}
          >
            {t("streak_idle_danger_title", { n: idle })}
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {t("streak_idle_danger_desc")}
          </p>
        </div>
      </div>
    );
  }

  // ── 3+ days idle — warning ────────────────────────────────────────
  if (idle >= 3) {
    return (
      <div className="flex items-center gap-3 rounded-[var(--r-lg)] bg-[var(--amber-bg)] border border-[color-mix(in_srgb,var(--amber)_35%,transparent)] px-4 py-3">
        <span
          className="flex items-center justify-center w-8 h-8 rounded-[var(--r-sm)] shrink-0"
          style={{
            background: "color-mix(in srgb, var(--amber) 15%, transparent)",
          }}
        >
          <FiClock size={15} style={{ color: "var(--amber)" }} />
        </span>
        <p className="text-sm font-medium" style={{ color: "var(--amber)" }}>
          {t("streak_idle_warning", { n: idle })}
        </p>
      </div>
    );
  }

  return null;
}
