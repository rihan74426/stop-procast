"use client";

import { phaseProgress } from "@/lib/utils/progress";
import { useProjectStore } from "@/lib/store/projectStore";
import { useI18n } from "@/lib/i18n";
import { FiCheck } from "react-icons/fi";

export function PhaseTimeline({ project }) {
  const updatePhase = useProjectStore((s) => s.updatePhase);
  const { t } = useI18n();

  if (!project.phases?.length) return null;

  return (
    <div className="flex flex-col gap-3">
      <p
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: "var(--text-tertiary)" }}
      >
        Phases
      </p>

      {/* ── Mobile: vertical stack ─────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:hidden">
        {project.phases.map((phase, i) => {
          const progress = phaseProgress(project, phase.id);
          const isActive = phase.status === "active";
          const isDone = phase.status === "done";

          return (
            <div key={phase.id} className="flex items-center gap-3">
              {/* Phase number / done indicator */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: isDone
                    ? "var(--emerald)"
                    : isActive
                    ? "var(--violet)"
                    : "var(--bg-muted)",
                  color: isDone || isActive ? "white" : "var(--text-tertiary)",
                }}
              >
                {isDone ? (
                  <FiCheck size={11} strokeWidth={2.5} />
                ) : (
                  <span className="text-[10px] font-bold">{i + 1}</span>
                )}
              </div>

              {/* Label + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <p
                    className="text-xs truncate font-medium"
                    style={{
                      color: isActive
                        ? "var(--text-primary)"
                        : "var(--text-tertiary)",
                    }}
                  >
                    {phase.name}
                  </p>
                  <span
                    className="text-xs shrink-0 font-medium tabular-nums"
                    style={{
                      color: isDone
                        ? "var(--emerald)"
                        : isActive
                        ? "var(--violet)"
                        : "var(--text-tertiary)",
                    }}
                  >
                    {isDone
                      ? t("phase_status_done")
                      : isActive
                      ? `${progress}%`
                      : t("phase_status_upcoming")}
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: "var(--bg-muted)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${progress}%`,
                      background: isDone
                        ? "var(--emerald)"
                        : isActive
                        ? "var(--violet)"
                        : "var(--slate-4, #c8c8d4)",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Desktop: horizontal bars ───────────────────────────── */}
      <div className="hidden sm:block">
        {/* Progress bars row */}
        <div className="flex items-stretch gap-1 mb-2">
          {project.phases.map((phase) => {
            const progress = phaseProgress(project, phase.id);
            const isActive = phase.status === "active";
            const isDone = phase.status === "done";

            return (
              <div key={phase.id} className="flex-1 min-w-0">
                <div
                  className="relative h-2 rounded-full overflow-hidden"
                  style={{ background: "var(--bg-muted)" }}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                    style={{
                      width: `${progress}%`,
                      background: isDone
                        ? "var(--emerald)"
                        : isActive
                        ? "var(--violet)"
                        : "var(--slate-4, #c8c8d4)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Labels row */}
        <div className="flex items-start gap-1">
          {project.phases.map((phase) => {
            const progress = phaseProgress(project, phase.id);
            const isActive = phase.status === "active";
            const isDone = phase.status === "done";

            return (
              <div key={phase.id} className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p
                    className="text-xs truncate leading-tight"
                    style={{
                      color: isActive
                        ? "var(--text-primary)"
                        : "var(--text-tertiary)",
                      fontWeight: isActive ? 500 : 400,
                    }}
                    title={phase.name}
                  >
                    {phase.name}
                  </p>
                  {isDone && (
                    <FiCheck
                      size={10}
                      strokeWidth={2.5}
                      className="shrink-0"
                      style={{ color: "var(--emerald)" }}
                      title={t("phase_status_done")}
                    />
                  )}
                  {isActive && (
                    <span
                      className="text-[10px] shrink-0 font-medium tabular-nums"
                      style={{ color: "var(--violet)" }}
                      title={t("phase_status_active")}
                    >
                      {progress}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
