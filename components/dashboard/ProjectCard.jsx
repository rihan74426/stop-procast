"use client";

import Link from "next/link";
import { ProgressRing } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { overallProgress, activePhase, nextAction } from "@/lib/utils/progress";
import { projectAgeLabel, timeAgo } from "@/lib/utils/date";
import { getPressure, PRESSURE_COLORS, PRESSURE_LABELS } from "@/lib/pressure";

export function ProjectCard({ project }) {
  const progress = overallProgress(project);
  const phase = activePhase(project);
  const next = nextAction(project);
  const pressure = getPressure(project);
  const isCompleted = !!project.completionDate;

  return (
    <Link href={`/project/${project.id}`} className="block group">
      <div
        className={[
          "rounded-[var(--r-lg)] border bg-[var(--bg-elevated)] p-4 sm:p-5",
          "transition-all duration-200 ease-[var(--ease-smooth)]",
          "hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 hover:border-[var(--violet)]",
          "active:translate-y-0 active:shadow-none",
          isCompleted
            ? "border-[var(--emerald)] opacity-75"
            : "border-[var(--border)]",
        ].join(" ")}
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-base sm:text-lg text-[var(--text-primary)] truncate leading-tight mb-1">
              {project.projectTitle || "Untitled project"}
            </p>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
              {project.oneLineGoal}
            </p>
          </div>
          <ProgressRing
            value={progress}
            size={44}
            strokeWidth={4}
            color={
              isCompleted ? "var(--emerald)" : PRESSURE_COLORS[pressure.level]
            }
            label={`${progress}%`}
            className="shrink-0"
          />
        </div>

        {/* Phase + pressure badges */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
          {isCompleted ? (
            <Badge status="completed">✓ Shipped</Badge>
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
          <div className="rounded-[var(--r-md)] bg-[var(--bg-surface)] border border-[var(--border)] px-3 py-2 mb-3 sm:mb-4">
            <p className="text-xs text-[var(--text-tertiary)] mb-0.5">
              Next action
            </p>
            <p className="text-xs sm:text-sm text-[var(--text-primary)] line-clamp-1">
              {next}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
          <span>
            {project.tasks.filter((t) => t.status === "done").length}/
            {project.tasks.length} tasks
          </span>
          <div className="flex items-center gap-2 sm:gap-3">
            {project.streakDays > 0 && (
              <span className="text-[var(--amber)]">
                🔥 {project.streakDays}d
              </span>
            )}
            <span>{timeAgo(project.lastActivityAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
