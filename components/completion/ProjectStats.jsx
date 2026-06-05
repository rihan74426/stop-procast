"use client";

import { useI18n } from "@/lib/i18n";
import { FaFire } from "react-icons/fa";

export function ProjectStats({ project }) {
  const { t } = useI18n();
  const stats = project.postmortem?.stats ?? {};

  const items = [
    {
      label: t("stats_days"),
      value: stats.daysToComplete ?? 0,
      suffix: "d",
      color: "var(--violet)",
    },
    {
      label: t("stats_tasks"),
      value: stats.tasksCompleted ?? 0,
      color: "var(--emerald)",
    },
    {
      label: t("stats_blockers"),
      value: stats.blockersHit ?? 0,
      color: "var(--coral)",
    },
    {
      label: t("stats_on_time"),
      value: stats.milestonesOnTime ?? 0,
      color: "var(--emerald)",
    },
    {
      label: t("stats_missed"),
      value: stats.milestonesMissed ?? 0,
      color: "var(--amber)",
    },
    {
      label: t("stats_streak"),
      value: project.streakDays ?? 0,
      suffix: "d",
      streakIcon: true,
      color: "var(--amber)",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      {items.map(({ label, value, suffix = "", streakIcon, color }) => (
        <div
          key={label}
          className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] px-3 sm:px-5 py-3 sm:py-4"
        >
          <p
            className="text-xs mb-1 sm:mb-2 leading-tight"
            style={{ color: "var(--text-tertiary)" }}
          >
            {label}
          </p>
          <p
            className="font-display font-semibold text-xl sm:text-2xl flex items-center gap-1"
            style={{ color }}
          >
            {value}
            {suffix}
            {streakIcon && (
              <FaFire size={14} style={{ color, opacity: 0.85 }} />
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
