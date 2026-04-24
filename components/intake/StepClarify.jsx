"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { canMakeRequest, recordRequest } from "@/lib/ai/rateLimit";
import { toast } from "@/lib/toast";
import { parseClarifyQuestions } from "@/lib/ai/parser";

/**
 * Accepts `cachedQuestions` prop — if set, skips AI fetch entirely.
 * This prevents re-fetching when the user navigates back.
 */
export function StepClarify({
  idea,
  answers,
  onChange,
  onNext,
  onBack,
  cachedQuestions,
  onQuestionsLoaded,
}) {
  const [questions, setQuestions] = useState(cachedQuestions ?? []);
  const [loading, setLoading] = useState(!cachedQuestions);
  const [error, setError] = useState(null);
  const hasFetched = useRef(!!cachedQuestions);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchQuestions() {
    if (!canMakeRequest("clarify")) {
      setError(
        "Daily question limit reached. You can skip this step and continue."
      );
      setLoading(false);
      toast.warn("Skipping clarify questions — daily limit reached.");
      return;
    }

    const loadId = toast.loading("Thinking up some questions…");
    try {
      setLoading(true);
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "clarify", idea }),
      });

      toast.dismiss(loadId);

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to load questions");
      }

      recordRequest("clarify");
      const data = await res.json();
      const parsed = parseClarifyQuestions(data.questions);
      setQuestions(parsed);
      onQuestionsLoaded?.(parsed); // bubble up so parent can cache
    } catch (e) {
      toast.dismiss(loadId);
      toast.error("Couldn't load questions — you can skip this step.", {
        duration: 5000,
      });
      setError("Couldn't load questions. You can skip this step.");
    } finally {
      setLoading(false);
    }
  }

  const canProceed =
    questions.length === 0 || questions.every((_, i) => answers[i]?.trim());

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-display font-semibold text-[var(--text-primary)] mb-2">
          A few quick questions
        </h1>
        <p className="text-[var(--text-secondary)]">
          These help shape a plan that fits your actual situation.
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

      {error && !loading && (
        <div className="rounded-[var(--r-lg)] border border-[var(--amber)] bg-[var(--amber-bg)] px-5 py-4 text-sm text-[var(--amber)]">
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
          <Button onClick={onNext} disabled={!canProceed && !error} size="lg">
            Build my plan →
          </Button>
        </div>
      </div>
    </div>
  );
}
