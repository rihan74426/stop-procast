"use client";

import { useMemo } from "react";
import { FiEye, FiStar, FiHeart, FiDownload } from "react-icons/fi";

/**
 * BuilderStats — shows a builder's community impact across all their projects.
 * Only renders if the user has any public projects with engagement.
 */
export function BuilderStats({ projects }) {
  const stats = useMemo(() => {
    const publicProjects = projects.filter((p) => p.isPublic !== false);
    if (!publicProjects.length) return null;

    const totalViews = publicProjects.reduce((s, p) => s + (p.views ?? 0), 0);
    const totalStars = publicProjects.reduce((s, p) => s + (p.stars ?? 0), 0);
    const totalHelped = publicProjects.reduce(
      (s, p) => s + (p.helpedCount ?? 0),
      0
    );
    const totalExports = publicProjects.reduce(
      (s, p) => s + (p.exportCount ?? 0),
      0
    );

    // Only show if at least one metric has data
    if (totalViews + totalStars + totalHelped + totalExports === 0) return null;

    return {
      totalViews,
      totalStars,
      totalHelped,
      totalExports,
      publicProjects: publicProjects.length,
    };
  }, [projects]);

  if (!stats) return null;

  const items = [
    {
      icon: FiEye,
      value: formatCount(stats.totalViews),
      label: stats.totalViews === 1 ? "view" : "views",
      color: "var(--violet)",
      bg: "var(--violet-bg)",
    },
    {
      icon: FiStar,
      value: formatCount(stats.totalStars),
      label: stats.totalStars === 1 ? "star" : "stars",
      color: "var(--amber)",
      bg: "var(--amber-bg)",
    },
    {
      icon: FiHeart,
      value: formatCount(stats.totalHelped),
      label: stats.totalHelped === 1 ? "helped" : "helped",
      color: "var(--coral)",
      bg: "var(--coral-bg)",
    },
    {
      icon: FiDownload,
      value: formatCount(stats.totalExports),
      label: stats.totalExports === 1 ? "export" : "exports",
      color: "var(--emerald)",
      bg: "var(--emerald-bg)",
    },
  ];

  return (
    <div className="mb-6 sm:mb-8 rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-surface)]">
        <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
          Your community impact
          <span className="ml-1.5 font-normal normal-case text-[var(--text-tertiary)]">
            across {stats.publicProjects} public{" "}
            {stats.publicProjects === 1 ? "project" : "projects"}
          </span>
        </p>
      </div>
      <div className="grid grid-cols-4 divide-x divide-[var(--border)]">
        {items.map(({ icon: Icon, value, label, color, bg }) => (
          <div
            key={label}
            className="flex flex-col items-center py-4 px-2 gap-1.5"
          >
            <div
              className="w-7 h-7 rounded-[var(--r-sm)] flex items-center justify-center shrink-0"
              style={{ background: bg }}
            >
              <Icon size={13} style={{ color }} />
            </div>
            <p
              className="font-display font-bold text-xl tabular-nums leading-none"
              style={{ color }}
            >
              {value}
            </p>
            <p className="text-[10px] text-[var(--text-tertiary)] text-center leading-tight">
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatCount(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
