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

  const answeredCount = questions.filter((_, i) => answers[i]?.trim()).length;
  const allAnswered = answeredCount === questions.length;

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
      {/* Header */}
      <div>
        <h2
          className="font-display font-semibold text-xl mb-1"
          style={{ color: "var(--text-primary)" }}
        >
          {t("postmortem_title")}
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {t("postmortem_subtitle")}
        </p>
      </div>

      {/* Questions */}
      <div className="flex flex-col gap-5">
        {questions.map((q, i) => {
          const filled = Boolean(answers[i]?.trim());
          return (
            <div key={i} className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
                {/* Number badge */}
                <span
                  className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 mt-0.5 transition-all duration-300"
                  style={{
                    background: filled ? "var(--emerald)" : "var(--bg-muted)",
                    color: filled ? "white" : "var(--text-tertiary)",
                  }}
                >
                  {filled ? "✓" : i + 1}
                </span>
                <label
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                  htmlFor={`retro-q-${i}`}
                >
                  {q}
                </label>
              </div>
              <textarea
                id={`retro-q-${i}`}
                rows={3}
                value={answers[i] ?? ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [i]: e.target.value }))
                }
                placeholder={t("postmortem_placeholder")}
                className="w-full px-4 py-3 rounded-[var(--r-lg)] border text-sm resize-none transition-all focus:outline-none focus:ring-2"
                style={{
                  background: "var(--bg-base)",
                  borderColor: filled
                    ? "color-mix(in srgb, var(--emerald) 40%, transparent)"
                    : "color-mix(in srgb, var(--text-tertiary) 40%, transparent)",
                  color: "var(--text-primary)",
                  // ring handled via focus:ring-[var(--violet)] utility
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "var(--violet)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = filled
                    ? "color-mix(in srgb, var(--emerald) 40%, transparent)"
                    : "color-mix(in srgb, var(--text-tertiary) 40%, transparent)")
                }
              />
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-4">
        {/* Progress pills */}
        <div className="flex items-center gap-1.5">
          {questions.map((_, i) => (
            <div
              key={i}
              className="h-1.5 w-6 rounded-full transition-all duration-300"
              style={{
                background: answers[i]?.trim()
                  ? "var(--emerald)"
                  : "var(--bg-muted)",
              }}
            />
          ))}
          <span
            className="text-xs ml-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            {answeredCount}/{questions.length}
          </span>
        </div>

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
