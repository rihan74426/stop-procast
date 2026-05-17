"use client";

import { useState } from "react";
import { useProjectStore } from "@/lib/store/projectStore";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";

export function Postmortem({ project, onDone }) {
  const { t } = useI18n();
  const updateProject = useProjectStore((s) => s.updateProject);

  const questions = project.reviewQuestions?.length
    ? project.reviewQuestions
    : [
        "What was the single hardest thing about this project?",
        "What would you do differently if you started over?",
        "What worked surprisingly well?",
        "What should carry over to your next project?",
      ];

  const [answers, setAnswers] = useState(
    project.postmortem?.answers?.length
      ? Object.fromEntries(
          project.postmortem.answers.map((a, i) => [i, a.answer])
        )
      : {}
  );
  const [saving, setSaving] = useState(false);

  const allAnswered = questions.every((_, i) => answers[i]?.trim());

  const handleSave = () => {
    setSaving(true);
    const hydratedAnswers = questions.map((q, i) => ({
      question: q,
      answer: answers[i] ?? "",
    }));
    updateProject(project.id, {
      postmortem: {
        ...project.postmortem,
        completedAt: new Date().toISOString(),
        answers: hydratedAnswers,
      },
    });
    setTimeout(() => {
      setSaving(false);
      onDone?.();
    }, 400);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display font-semibold text-xl text-[var(--text-primary)] mb-1">
          {t("postmortem_title")}
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          {t("postmortem_subtitle")}
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {questions.map((q, i) => (
          <div key={i} className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              {i + 1}. {q}
            </label>
            <textarea
              rows={3}
              value={answers[i] ?? ""}
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, [i]: e.target.value }))
              }
              placeholder={t("postmortem_placeholder")}
              className="w-full px-4 py-3 rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--violet)] focus:border-[var(--violet)] transition-all"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-tertiary)]">
          {t("postmortem_progress", {
            answered: Object.values(answers).filter((v) => v?.trim()).length,
            total: questions.length,
          })}
        </p>
        <Button
          variant="emerald"
          onClick={handleSave}
          loading={saving}
          disabled={!allAnswered}
        >
          {t("postmortem_save")}
        </Button>
      </div>
    </div>
  );
}
