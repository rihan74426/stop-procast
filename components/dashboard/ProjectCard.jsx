"use client";

import Link from "next/link";
import { ProgressRing } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { overallProgress, activePhase, nextAction } from "@/lib/utils/progress";
import { projectAgeLabel, timeAgo } from "@/lib/utils/date";
import { FaFire } from "react-icons/fa";
import { FiStar, FiEye, FiHeart } from "react-icons/fi";
import { getPressure, PRESSURE_COLORS, PRESSURE_LABELS } from "@/lib/pressure";
import { useI18n } from "@/lib/i18n";

export function ProjectCard({ project }) {
  const { t } = useI18n();
  const progress = overallProgress(project);
  const phase = activePhase(project);
  const next = nextAction(project);
  const pressure = getPressure(project);
  const isCompleted = !!project.completionDate;

  // Engagement totals — show if non-zero
  const stars = project.stars ?? 0;
  const views = project.views ?? 0;
  const helpedCount = project.helpedCount ?? 0;
  const hasEngagement = stars + views + helpedCount > 0;

  return (
    <Link href={`/project/${project.id}`} className="block group">
      <div
        className={[
          "rounded-[var(--r-lg)] border bg-[var(--bg-elevated)] p-4",
          "transition-all duration-200 ease-[var(--ease-smooth)]",
          "hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 hover:border-[var(--violet)]",
          "active:translate-y-0 active:shadow-none",
          isCompleted
            ? "border-[var(--emerald)] opacity-80"
            : "border-[var(--border)]",
        ].join(" ")}
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-base sm:text-lg text-[var(--text-primary)] leading-tight mb-1 truncate">
              {project.projectTitle || "Untitled project"}
            </p>
            {project.oneLineGoal && (
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                {project.oneLineGoal}
              </p>
            )}
          </div>
          <div className="shrink-0 ml-1">
            <ProgressRing
              value={progress}
              size={42}
              strokeWidth={4}
              color={
                isCompleted ? "var(--emerald)" : PRESSURE_COLORS[pressure.level]
              }
              label={`${progress}%`}
            />
          </div>
        </div>

        {/* Phase + pressure badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {isCompleted ? (
            <Badge status="completed">{t("project_done")}</Badge>
          ) : (
            <>
              {phase && <Badge variant="violet">{phase.name}</Badge>}
              {pressure.level !== "none" && pressure.level !== "low" && (
                <Badge
                  variant={pressure.level === "medium" ? "amber" : "coral"}
                >
                  {PRESSURE_LABELS[pressure.level]}
                </Badge>
              )}
            </>
          )}
          <Badge variant="slate">{projectAgeLabel(project.createdAt)}</Badge>
        </div>

        {/* Next action */}
        {next && !isCompleted && (
          <div className="rounded-[var(--r-md)] bg-[var(--bg-surface)] border border-[var(--border)] px-3 py-2 mb-3">
            <p className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide mb-0.5">
              {t("card_next_action")}
            </p>
            <p className="text-xs sm:text-sm text-[var(--text-primary)] line-clamp-1">
              {next}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-tertiary)]">
          <span className="shrink-0">
            {project.tasks.filter((t) => t.status === "done").length}/
            {project.tasks.length} {t("intake_tasks")}
          </span>
          <div className="flex items-center gap-2 min-w-0">
            {project.streakDays > 0 && (
              <span
                className="flex items-center gap-0.5 shrink-0"
                style={{ color: "var(--coral)" }}
              >
                <FaFire size={10} /> {project.streakDays}d
              </span>
            )}
            {/* Engagement micro-stats — only for public projects with data */}
            {hasEngagement && project.isPublic !== false && (
              <span className="flex items-center gap-2 shrink-0">
                {stars > 0 && (
                  <span
                    className="flex items-center gap-0.5"
                    style={{ color: "var(--amber)" }}
                  >
                    <FiStar size={9} /> {stars}
                  </span>
                )}
                {views > 0 && (
                  <span className="flex items-center gap-0.5">
                    <FiEye size={9} /> {views}
                  </span>
                )}
                {helpedCount > 0 && (
                  <span
                    className="flex items-center gap-0.5"
                    style={{ color: "var(--coral)" }}
                  >
                    <FiHeart size={9} /> {helpedCount}
                  </span>
                )}
              </span>
            )}
            <span className="truncate">{timeAgo(project.lastActivityAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
