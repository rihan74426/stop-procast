"use client";

import { phaseProgress } from "@/lib/utils/progress";
import { useProjectStore } from "@/lib/store/projectStore";

export function PhaseTimeline({ project }) {
  const updatePhase = useProjectStore((s) => s.updatePhase);

  if (!project.phases?.length) return null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider">
        Phases
      </p>

      {/* Mobile: vertical stack */}
      <div className="flex flex-col gap-2 sm:hidden">
        {project.phases.map((phase, i) => {
          const progress = phaseProgress(project, phase.id);
          const isActive = phase.status === "active";
          const isDone = phase.status === "done";

          return (
            <div key={phase.id} className="flex items-center gap-3">
              {/* Phase number dot */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  background: isDone
                    ? "var(--emerald)"
                    : isActive
                    ? "var(--violet)"
                    : "var(--bg-muted)",
                  color: isDone || isActive ? "white" : "var(--text-tertiary)",
                }}
              >
                {isDone ? "✓" : i + 1}
              </div>

              {/* Bar + label */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <p
                    className={`text-xs truncate font-medium ${
                      isActive
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-tertiary)]"
                    }`}
                  >
                    {phase.name}
                  </p>
                  {(isActive || isDone) && (
                    <span
                      className="text-xs shrink-0 font-medium"
                      style={{
                        color: isDone ? "var(--emerald)" : "var(--violet)",
                      }}
                    >
                      {isDone ? "Done" : `${progress}%`}
                    </span>
                  )}
                </div>
                <div className="h-1.5 rounded-full bg-[var(--bg-muted)] overflow-hidden">
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

      {/* Desktop: horizontal bars */}
      <div className="hidden sm:block">
        {/* Progress bars row */}
        <div className="flex items-stretch gap-1 mb-2">
          {project.phases.map((phase) => {
            const progress = phaseProgress(project, phase.id);
            const isActive = phase.status === "active";
            const isDone = phase.status === "done";

            return (
              <div key={phase.id} className="flex-1 min-w-0">
                <div className="relative h-2 rounded-full bg-[var(--bg-muted)] overflow-hidden">
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
                    className={`text-xs truncate leading-tight ${
                      isActive
                        ? "text-[var(--text-primary)] font-medium"
                        : "text-[var(--text-tertiary)]"
                    }`}
                    title={phase.name}
                  >
                    {phase.name}
                  </p>
                  {isDone && (
                    <span className="text-[10px] text-[var(--emerald)] shrink-0 font-medium">
                      ✓
                    </span>
                  )}
                  {isActive && (
                    <span className="text-[10px] text-[var(--violet)] shrink-0 font-medium tabular-nums">
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
