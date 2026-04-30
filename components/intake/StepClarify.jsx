"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { canMakeRequest, recordRequest } from "@/lib/ai/rateLimit";
import { parseClarifyQuestions } from "@/lib/ai/parser";
import { toast } from "@/lib/toast";

/**
 * GhostInput — inline suggestion that completes on Tab / Accept button.
 * Shows ghost suffix when typed value is a prefix of the suggestion.
 */
function GhostInput({ value, suggestion, placeholder, onChange }) {
  const inputRef = useRef(null);

  // Only show ghost when user has typed ≥2 chars and suggestion starts with what they typed
  const showGhost =
    suggestion &&
    value.length >= 2 &&
    suggestion.toLowerCase().startsWith(value.toLowerCase()) &&
    suggestion.toLowerCase() !== value.toLowerCase();

  const ghostSuffix = showGhost ? suggestion.slice(value.length) : "";

  const acceptSuggestion = () => {
    onChange(suggestion);
    setTimeout(() => {
      const el = inputRef.current;
      if (el) el.setSelectionRange(el.value.length, el.value.length);
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (ghostSuffix && (e.key === "Tab" || e.key === "ArrowRight")) {
      e.preventDefault();
      acceptSuggestion();
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative flex gap-2 items-center">
        {/* Ghost overlay sits behind the real input */}
        {ghostSuffix && (
          <div
            aria-hidden="true"
            className="absolute left-0 top-0 h-10 flex items-center px-3 text-sm pointer-events-none select-none w-full overflow-hidden"
            style={{ fontFamily: "inherit" }}
          >
            <span className="invisible whitespace-pre">{value}</span>
            <span className="text-[var(--text-tertiary)] opacity-55 whitespace-pre">
              {ghostSuffix}
            </span>
          </div>
        )}

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 h-10 px-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--violet)] focus:border-[var(--violet)] transition-all relative z-10"
          style={{ background: "transparent" }}
        />

        {ghostSuffix && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              acceptSuggestion();
              inputRef.current?.focus();
            }}
            className="shrink-0 h-8 px-2.5 text-xs font-medium rounded-[var(--r-md)] bg-[var(--violet-bg)] text-[var(--violet-dim)] border border-[var(--violet)] hover:bg-[var(--violet)] hover:text-white transition-all"
          >
            Accept ↹
          </button>
        )}
      </div>

      {ghostSuffix && (
        <p className="text-[10px] text-[var(--text-tertiary)] pl-1">
          Press{" "}
          <kbd className="px-1 py-0.5 rounded bg-[var(--bg-muted)] font-mono text-[10px]">
            Tab
          </kbd>{" "}
          or tap Accept to complete
        </p>
      )}
    </div>
  );
}

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
      setError("Daily question limit reached. You can skip this step.");
      setLoading(false);
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
      if (!res.ok) throw new Error("Failed to load questions");
      recordRequest("clarify");

      const data = await res.json();

      // Accept various shapes: { questions: [...] } | { questions: "..." } | { result/output: "..." } | [...]
      let raw = data?.questions ?? data?.result ?? data?.output ?? data;

      let parsed = [];

      if (typeof raw === "string") {
        // parse a textual payload
        parsed = parseClarifyQuestions(raw);
      } else if (Array.isArray(raw)) {
        // normalize array items into { question, placeholder }
        parsed = raw
          .map((item) => {
            if (typeof item === "string") {
              return { question: item, placeholder: item };
            }
            if (item && typeof item === "object") {
              return {
                question: item.question ?? item.q ?? item.text ?? "",
                placeholder:
                  item.placeholder ?? item.hint ?? item.suggestion ?? "",
              };
            }
            return null;
          })
          .filter(Boolean);
      } else {
        // fallback: try parsing stringified data
        try {
          parsed = parseClarifyQuestions(JSON.stringify(data));
        } catch {
          parsed = [];
        }
      }

      if (!parsed || parsed.length === 0) {
        setError("Couldn't load questions. You can skip this step.");
      } else {
        setQuestions(parsed);
        onQuestionsLoaded?.(parsed);
      }
    } catch {
      toast.dismiss(loadId);
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
              <GhostInput
                value={answers[i] ?? ""}
                suggestion={q.placeholder ?? ""}
                placeholder={q.placeholder ?? "Your answer…"}
                onChange={(val) => onChange(i, val)}
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
