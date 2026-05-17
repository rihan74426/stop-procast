"use client";

import { daysSince } from "@/lib/utils/date";
import { useI18n } from "@/lib/i18n";
import { FaClock } from "react-icons/fa";

export function StreakBanner({ project }) {
  const { t } = useI18n();
  const idle = daysSince(project.lastActivityAt);
  const streak = project.streakDays;

  if (streak >= 7) {
    return (
      <div className="flex items-center gap-3 rounded-[var(--r-lg)] bg-[var(--amber-bg)] border border-[var(--amber)] px-4 py-3">
        <span className="text-xl">🔥</span>
        <div>
          <p className="text-sm font-medium text-[var(--amber)]">
            {t("streak_days", { n: streak })}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            {t("streak_fire_subtitle")}
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
          {streak !== 1
            ? t("streak_days_short_plural", { n: streak })
            : t("streak_days_short", { n: streak })}
        </span>
        <span className="text-[var(--text-tertiary)]">
          {t("streak_keep_going")}
        </span>
      </div>
    );
  }

  if (idle >= 7) {
    return (
      <div className="flex items-center gap-3 rounded-[var(--r-lg)] bg-[var(--coral-bg)] border border-[var(--coral)] px-4 py-3">
        <span className="text-xl">⚠️</span>
        <div>
          <p className="text-sm font-medium text-[var(--coral)]">
            {t("streak_idle_danger_title", { n: idle })}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            {t("streak_idle_danger_desc")}
          </p>
        </div>
      </div>
    );
  }

  if (idle >= 3) {
    return (
      <div className="flex items-center gap-3 rounded-[var(--r-lg)] bg-[var(--amber-bg)] border border-[var(--amber)] px-4 py-3">
        <span className="text-lg">
          <FaClock className="inline" />
        </span>
        <p className="text-sm text-[var(--amber)]">
          {t("streak_idle_warning", { n: idle })}
        </p>
      </div>
    );
  }

  return null;
}
