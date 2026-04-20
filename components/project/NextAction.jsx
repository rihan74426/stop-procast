"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useProjectStore } from "@/lib/store/projectStore";
import { nextAction } from "@/lib/utils/progress";

export function NextAction({ project }) {
  const updateTask = useProjectStore((s) => s.updateTask);
  const updateProject = useProjectStore((s) => s.updateProject);
  const [marking, setMarking] = useState(false);

  const next = nextAction(project);

  // Find the actual task object for the next action
  const nextTask = project.tasks.find(
    (t) => (t.status === "todo" || t.status === "doing") && t.title === next
  );

  const handleDone = async () => {
    if (!nextTask) return;
    setMarking(true);
    updateTask(project.id, nextTask.id, { status: "done" });
    // Clear dailyNextAction so it recomputes from tasks
    updateProject(project.id, { dailyNextAction: "" });
    setTimeout(() => setMarking(false), 600);
  };

  if (!next) {
    return (
      <div className="rounded-[var(--r-xl)] border-2 border-dashed border-[var(--emerald)] bg-[var(--emerald-bg)] px-6 py-8 text-center">
        <p className="text-2xl mb-2">🎯</p>
        <p className="font-medium text-[var(--emerald-dim)]">
          All tasks done in this phase!
        </p>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Move to the next phase or mark the project complete.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--r-xl)] border-2 border-[var(--violet)] bg-[var(--bg-elevated)] overflow-hidden">
      {/* Label */}
      <div className="px-5 py-3 bg-[var(--violet-bg)] border-b border-[var(--violet)]">
        <p className="text-xs font-semibold text-[var(--violet-dim)] uppercase tracking-wider">
          Next action
        </p>
      </div>

      {/* Content */}
      <div className="px-5 py-5 flex items-start justify-between gap-4">
        <p className="font-display font-semibold text-xl text-[var(--text-primary)] leading-snug flex-1">
          {next}
        </p>
        <Button
          variant="emerald"
          size="md"
          onClick={handleDone}
          loading={marking}
          disabled={!nextTask}
          className="shrink-0"
        >
          Mark done
        </Button>
      </div>

      {/* Task meta */}
      {nextTask?.notes && (
        <div className="px-5 pb-4 text-sm text-[var(--text-secondary)]">
          {nextTask.notes}
        </div>
      )}
    </div>
  );
}
