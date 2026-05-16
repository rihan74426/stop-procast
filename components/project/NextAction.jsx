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
      <div className="rounded-[var(--r-xl)] border-2 border-dashed border-[var(--emerald)] bg-[var(--emerald-bg)] px-6 py-8 text-center">
        <p className="text-2xl mb-2">🎯</p>
        <p className="font-medium text-[var(--emerald-dim)]">
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
      <div className="px-5 py-3 bg-[var(--violet-bg)] border-b border-[var(--violet)]">
        <p className="text-xs font-semibold text-[var(--violet-dim)] uppercase tracking-wider">
          {t("next_action_label")}
        </p>
      </div>

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
          {t("next_action_mark_done")}
        </Button>
      </div>

      {nextTask?.notes && (
        <div className="px-5 pb-4 text-sm text-[var(--text-secondary)]">
          {nextTask.notes}
        </div>
      )}
    </div>
  );
}
