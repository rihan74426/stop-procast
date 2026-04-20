"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { parseClarifyQuestions } from "@/lib/ai/parser";

export function StepClarify({ idea, answers, onChange, onNext, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchQuestions() {
      try {
        setLoading(true);
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "clarify", idea }),
        });
        const data = await res.json();
        if (!cancelled) {
          setQuestions(parseClarifyQuestions(data.questions));
        }
      } catch (e) {
        if (!cancelled)
          setError("Failed to load questions. You can skip this step.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchQuestions();
    return () => {
      cancelled = true;
    };
  }, [idea]);

  const canProceed =
    questions.length === 0 || questions.every((_, i) => answers[i]?.trim());

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-display font-semibold text-[var(--text-primary)] mb-2">
          A few quick questions
        </h1>
        <p className="text-[var(--text-secondary)]">
          These help the AI build a plan that actually fits your situation.
        </p>
      </div>

      {loading && (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-[var(--r-lg)] border border-[var(--border)] p-5 animate-pulse"
            >
              <div className="h-4 bg-[var(--bg-muted)] rounded w-3/4 mb-3" />
              <div className="h-10 bg-[var(--bg-muted)] rounded" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-[var(--r-lg)] border border-[var(--coral)] bg-[var(--coral-bg)] px-5 py-4 text-sm text-[var(--coral)]">
          {error}
        </div>
      )}

      {!loading && questions.length > 0 && (
        <div className="flex flex-col gap-5">
          {questions.map((q, i) => (
            <div
              key={i}
              className="rounded-[var(--r-lg)] border border-[var(--border)] p-5"
            >
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
                {i + 1}. {q.question}
              </label>
              <input
                type="text"
                placeholder={q.placeholder ?? ""}
                value={answers[i] ?? ""}
                onChange={(e) => onChange(i, e.target.value)}
                className="w-full h-10 px-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--violet)] focus:border-[var(--violet)] transition-all"
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          ← Back
        </Button>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onNext}>
            Skip
          </Button>
          <Button onClick={onNext} disabled={!canProceed} size="lg">
            Build my plan →
          </Button>
        </div>
      </div>
    </div>
  );
}
