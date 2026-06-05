"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useProjectStore } from "@/lib/store/projectStore";
import { nextAction } from "@/lib/utils/progress";
import { useI18n } from "@/lib/i18n";
import { FiCheckCircle } from "react-icons/fi";

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

  // ── Empty state ────────────────────────────────────────────────────
  if (!next) {
    return (
      <div
        className="rounded-[var(--r-xl)] border-2 border-dashed px-5 py-6 flex flex-col items-center justify-center gap-2 text-center"
        style={{
          borderColor: "color-mix(in srgb, var(--emerald) 45%, transparent)",
          background: "var(--emerald-bg)",
        }}
      >
        <span
          className="flex items-center justify-center w-10 h-10 rounded-full mb-1"
          style={{
            background: "color-mix(in srgb, var(--emerald) 15%, transparent)",
          }}
        >
          <FiCheckCircle size={22} style={{ color: "var(--emerald)" }} />
        </span>
        <p
          className="font-semibold text-sm"
          style={{ color: "var(--emerald-dim)" }}
        >
          {t("next_action_empty_title")}
        </p>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {t("next_action_empty_desc")}
        </p>
      </div>
    );
  }

  // ── Active next action ─────────────────────────────────────────────
  return (
    <div className="rounded-[var(--r-xl)] border-2 border-[var(--violet)] bg-[var(--bg-elevated)] overflow-hidden">
      {/* Header strip */}
      <div
        className="px-4 sm:px-5 py-2 border-b border-[color-mix(in_srgb,var(--violet)_30%,transparent)]"
        style={{ background: "var(--violet-bg)" }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--violet-dim)" }}
        >
          {t("next_action_label")}
        </p>
      </div>

      {/* Body */}
      <div className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p
          className="font-display font-semibold text-lg sm:text-xl leading-snug flex-1 min-w-0"
          style={{ color: "var(--text-primary)" }}
        >
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

      {/* Notes */}
      {nextTask?.notes && (
        <div
          className="px-4 sm:px-5 pb-4 text-sm border-t pt-3"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          {nextTask.notes}
        </div>
      )}
    </div>
  );
}
