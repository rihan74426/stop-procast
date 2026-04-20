"use client";

import { phaseProgress } from "@/lib/utils/progress";
import { useProjectStore } from "@/lib/store/projectStore";

export function PhaseTimeline({ project }) {
  const updatePhase = useProjectStore((s) => s.updatePhase);

  if (!project.phases.length) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider">
        Phases
      </p>
      <div className="flex items-stretch gap-1">
        {project.phases.map((phase, i) => {
          const progress = phaseProgress(project, phase.id);
          const isActive = phase.status === "active";
          const isDone = phase.status === "done";

          return (
            <div key={phase.id} className="flex-1 flex flex-col gap-1.5">
              {/* Bar */}
              <div className="relative h-2 rounded-full bg-[var(--bg-muted)] overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{
                    width: `${progress}%`,
                    background: isDone
                      ? "var(--emerald)"
                      : isActive
                      ? "var(--violet)"
                      : "var(--slate-4)",
                  }}
                />
              </div>

              {/* Label */}
              <div className="flex items-center justify-between">
                <p
                  className={`text-xs truncate ${
                    isActive
                      ? "text-[var(--text-primary)] font-medium"
                      : "text-[var(--text-tertiary)]"
                  }`}
                >
                  {phase.name}
                </p>
                {isDone && (
                  <span className="text-xs text-[var(--emerald)]">✓</span>
                )}
                {isActive && (
                  <span className="text-xs text-[var(--violet)]">
                    {progress}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
