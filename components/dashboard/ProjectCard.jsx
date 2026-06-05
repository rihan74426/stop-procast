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

  const stars = project.stars ?? 0;
  const views = project.views ?? 0;
  const helpedCount = project.helpedCount ?? 0;
  const hasEngagement = stars + views + helpedCount > 0;

  return (
    <Link href={`/project/${project.id}`} className="block group">
      <div
        className={[
          "rounded-[var(--r-lg)] border bg-[var(--bg-elevated)] p-4",
          "transition-all duration-200 ease-out",
          "hover:-translate-y-0.5",
          "hover:shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]",
          "hover:border-[color-mix(in_srgb,var(--violet)_45%,transparent)]",
          "active:translate-y-0 active:shadow-none",
          isCompleted
            ? "border-[color-mix(in_srgb,var(--emerald)_45%,transparent)] opacity-80"
            : "border-[var(--border)]",
        ].join(" ")}
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p
              className="font-display font-semibold text-base sm:text-lg leading-tight mb-1 truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {project.projectTitle || "Untitled project"}
            </p>
            {project.oneLineGoal && (
              <p
                className="text-xs sm:text-sm line-clamp-2 leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
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

        {/* Badges */}
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
          <div
            className="rounded-[var(--r-md)] border px-3 py-2 mb-3"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border)",
            }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-wide mb-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              {t("card_next_action")}
            </p>
            <p
              className="text-xs sm:text-sm line-clamp-1"
              style={{ color: "var(--text-primary)" }}
            >
              {next}
            </p>
          </div>
        )}

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-2 text-xs"
          style={{ color: "var(--text-tertiary)" }}
        >
          <span className="shrink-0">
            {project.tasks.filter((t) => t.status === "done").length}/
            {project.tasks.length} {t("intake_tasks")}
          </span>
          <div className="flex items-center gap-2 min-w-0">
            {project.streakDays > 0 && (
              <span
                className="flex items-center gap-0.5 shrink-0"
                style={{ color: "var(--amber)" }}
              >
                <FaFire size={10} />
                {project.streakDays}d
              </span>
            )}
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
