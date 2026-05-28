"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useProjectStore } from "@/lib/store/projectStore";
import { nextAction } from "@/lib/utils/progress";
import { useI18n } from "@/lib/i18n";

export function NextAction({ project }) {
  const { t } = useI18n();
  const updateTask = useProjectStore((s) => s.updateTask);
  const updateProject = useProjectStore((s) => s.updateProject);
  const [marking, setMarking] = useState(false);

  const next = nextAction(project);

  const nextTask = project.tasks.find(
    (t) => (t.status === "todo" || t.status === "doing") && t.title === next
  );

  const handleDone = async () => {
    if (!nextTask) return;
    setMarking(true);
    updateTask(project.id, nextTask.id, { status: "done" });
    updateProject(project.id, { dailyNextAction: "" });
    setTimeout(() => setMarking(false), 600);
  };

  if (!next) {
    return (
      <div className="rounded-[var(--r-xl)] border-2 border-dashed border-[var(--emerald)] bg-[var(--emerald-bg)] px-5 py-6 text-center">
        <p className="text-2xl mb-2">🎯</p>
        <p className="font-semibold text-[var(--emerald-dim)]">
          {t("next_action_empty_title")}
        </p>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {t("next_action_empty_desc")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--r-xl)] border-2 border-[var(--violet)] bg-[var(--bg-elevated)] overflow-hidden">
      <div className="px-4 sm:px-5 py-2.5 bg-[var(--violet-bg)] border-b border-[var(--violet)]">
        <p className="text-xs font-semibold text-[var(--violet-dim)] uppercase tracking-wider">
          {t("next_action_label")}
        </p>
      </div>

      <div className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="font-display font-semibold text-lg sm:text-xl text-[var(--text-primary)] leading-snug flex-1 min-w-0">
          {next}
        </p>
        <Button
          variant="emerald"
          size="md"
          onClick={handleDone}
          loading={marking}
          disabled={!nextTask}
          className="shrink-0 w-full sm:w-auto justify-center"
        >
          {t("next_action_mark_done")}
        </Button>
      </div>

      {nextTask?.notes && (
        <div className="px-4 sm:px-5 pb-4 text-sm text-[var(--text-secondary)] border-t border-[var(--border)] pt-3 mt-0">
          {nextTask.notes}
        </div>
      )}
    </div>
  );
}
