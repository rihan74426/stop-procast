"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { generateClarifyQuestions } from "@/lib/ai/clientGenerate";
import { parseClarifyQuestions } from "@/lib/ai/parser";
import { toast } from "@/lib/toast";

// ─── Ghost suggestion engine ──────────────────────────────────────────
//
// Instead of matching only when value is an exact prefix of placeholder,
// we do semantic keyword-based completion: if the user's answer contains
// certain keywords we offer a relevant continuation.
//
// Format: { triggers: string[], template: (value) => string }
// template receives the current raw value and returns the full ghost suffix.

const ANSWER_COMPLETIONS = [
  // Success / outcome language
  {
    triggers: [
      "done when",
      "success means",
      "successful when",
      "complete when",
      "finished when",
    ],
    suffix: " I can demonstrate it to someone else and they find it useful",
  },
  {
    triggers: ["i want to", "i'd like to", "i need to"],
    suffix: " be able to do this independently without looking anything up",
  },

  // Time / deadline
  {
    triggers: ["by ", "within ", "in the next ", "over the next "],
    suffix: " — I have no hard deadline but sooner is better",
    condition: (v) => v.trim().split(" ").length <= 4,
  },
  {
    triggers: [
      "2 weeks",
      "two weeks",
      "a month",
      "3 months",
      "6 months",
      "one year",
      "a year",
    ],
    suffix: " — working on it a little every day",
  },

  // Resources / constraints
  {
    triggers: [
      "i have ",
      "i've got ",
      "my budget",
      "my constraint",
      "my limit",
    ],
    suffix: " and about 1–2 hours per day to dedicate to this",
  },
  {
    triggers: [
      "no budget",
      "zero budget",
      "free only",
      "can't spend",
      "cannot spend",
    ],
    suffix: " so I'll rely on free tools and open-source resources",
  },

  // Experience level
  {
    triggers: [
      "beginner",
      "complete beginner",
      "never done",
      "brand new",
      "no experience",
    ],
    suffix: " so I need step-by-step guidance without assumed knowledge",
  },
  {
    triggers: [
      "some experience",
      "basic knowledge",
      "done it before",
      "familiar with",
    ],
    suffix: " so I want to skip the basics and focus on practical application",
  },
  {
    triggers: [
      "experienced",
      "professional",
      "expert",
      "years of experience",
      "know it well",
    ],
    suffix: " so I want an advanced, nuanced plan that challenges me",
  },

  // Uncertain first step
  {
    triggers: [
      "not sure",
      "unsure",
      "don't know where",
      "confused about",
      "overwhelmed",
    ],
    suffix:
      " — I think starting with research and a small prototype would help",
  },
  {
    triggers: ["start with", "begin with", "first step", "first thing"],
    suffix: " to build momentum and get early feedback",
  },

  // Accountability / solo vs team
  {
    triggers: ["alone", "solo", "by myself", "on my own", "just me"],
    suffix: " — I'll need to build my own accountability structure",
  },
  {
    triggers: ["team", "with others", "colleague", "partner", "collaborat"],
    suffix: " — we'll need clear ownership and weekly check-ins",
  },

  // Tools / tech
  {
    triggers: ["use ", "using ", "tool", "app", "software", "platform"],
    suffix: " — open to recommendations if there's a better option",
  },
];

/**
 * Given a partially-typed answer and the question's placeholder,
 * return the best ghost suffix string, or "".
 *
 * Priority:
 *   1. Placeholder prefix match (original behaviour, most precise)
 *   2. Semantic completion from ANSWER_COMPLETIONS
 *   3. Nothing
 */
function getAnswerGhost(value, placeholder) {
  if (!value || value.trim().length < 3) return "";

  const lower = value.toLowerCase();

  // 1. Placeholder prefix match — user is typing what placeholder says
  if (
    placeholder &&
    value.length >= 3 &&
    placeholder.toLowerCase().startsWith(lower) &&
    placeholder.toLowerCase() !== lower
  ) {
    return placeholder.slice(value.length);
  }

  // 2. Semantic completion
  for (const rule of ANSWER_COMPLETIONS) {
    const conditionOk = !rule.condition || rule.condition(value);
    if (!conditionOk) continue;
    for (const trigger of rule.triggers) {
      if (lower.includes(trigger)) {
        // Don't suggest if the suffix content is already in the value
        const suffixCore = rule.suffix.replace(/^[ —-]+/, "").toLowerCase();
        if (!lower.includes(suffixCore.slice(0, 20))) {
          return rule.suffix;
        }
      }
    }
  }

  return "";
}

// ─── Word-by-word accept ──────────────────────────────────────────────
// Pressing Tab accepts the full ghost.
// Pressing Ctrl+→ (or Option+→ on Mac) accepts one word at a time.

function getFirstWord(ghost) {
  const match = ghost.match(/^(\s*\S+)/);
  return match ? match[1] : ghost;
}

// ─── GhostInput ───────────────────────────────────────────────────────

function GhostInput({
  value,
  suggestion,
  placeholder,
  onChange,
  questionIndex,
}) {
  const inputRef = useRef(null);
  const [localGhost, setLocalGhost] = useState("");
  const debounceRef = useRef(null);

  // Recompute ghost whenever value changes (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLocalGhost(getAnswerGhost(value, suggestion || placeholder));
    }, 100);
    return () => clearTimeout(debounceRef.current);
  }, [value, suggestion, placeholder]);

  // Clear ghost if user deletes enough
  useEffect(() => {
    if (!value || value.trim().length < 3) setLocalGhost("");
  }, [value]);

  const acceptFull = useCallback(() => {
    if (!localGhost) return;
    const newVal = value + localGhost;
    onChange(newVal);
    setLocalGhost("");
    setTimeout(() => {
      const el = inputRef.current;
      if (el) el.setSelectionRange(el.value.length, el.value.length);
    }, 0);
  }, [localGhost, value, onChange]);

  const acceptOneWord = useCallback(() => {
    if (!localGhost) return;
    const word = getFirstWord(localGhost);
    const newVal = value + word;
    const remaining = localGhost.slice(word.length);
    onChange(newVal);
    setLocalGhost(remaining);
    setTimeout(() => {
      const el = inputRef.current;
      if (el) el.setSelectionRange(el.value.length, el.value.length);
    }, 0);
  }, [localGhost, value, onChange]);

  const handleKeyDown = useCallback(
    (e) => {
      if (!localGhost) return;

      if (e.key === "Tab") {
        e.preventDefault();
        acceptFull();
        return;
      }
      // ArrowRight at end of input = accept full ghost
      if (e.key === "ArrowRight") {
        const el = inputRef.current;
        if (el && el.selectionStart === el.value.length) {
          e.preventDefault();
          acceptFull();
        }
        return;
      }
      // Ctrl/Cmd + ArrowRight = accept one word
      if (e.key === "ArrowRight" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        acceptOneWord();
        return;
      }
      // Escape = dismiss ghost
      if (e.key === "Escape") {
        setLocalGhost("");
      }
    },
    [localGhost, acceptFull, acceptOneWord]
  );

  const showGhost = localGhost.length > 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        {/* Ghost overlay */}
        {showGhost && (
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center px-3 pointer-events-none select-none overflow-hidden rounded-[var(--r-md)]"
            style={{ fontFamily: "inherit", fontSize: "0.875rem" }}
          >
            <span className="invisible whitespace-pre">{value}</span>
            <span
              className="whitespace-pre truncate"
              style={{ color: "var(--text-tertiary)", opacity: 0.55 }}
            >
              {localGhost}
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
          autoComplete="off"
          spellCheck
          className="w-full h-10 px-3 rounded-[var(--r-md)] border border-[var(--border)] !bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--violet)] focus:border-[var(--violet)] transition-all relative z-10"
          style={{ background: "transparent" }}
        />
      </div>

      {/* Accept controls — shown only when ghost is active */}
      {showGhost && (
        <div className="flex items-center gap-2 flex-wrap">
          {/* Full accept */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              acceptFull();
              inputRef.current?.focus();
            }}
            className="flex items-center gap-1 h-6 px-2 text-[10px] font-medium rounded-[var(--r-full)] bg-[var(--violet-bg)] text-[var(--violet-dim)] border border-[var(--violet)] hover:bg-[var(--violet)] hover:text-white transition-all"
          >
            <span>↹</span>
            <span>Accept all</span>
          </button>

          {/* Word-by-word accept */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              acceptOneWord();
              inputRef.current?.focus();
            }}
            className="flex items-center gap-1 h-6 px-2 text-[10px] font-medium rounded-[var(--r-full)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--violet)] hover:text-[var(--violet-dim)] transition-all"
          >
            <span>→</span>
            <span>One word</span>
          </button>

          {/* Dismiss */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setLocalGhost("");
              inputRef.current?.focus();
            }}
            className="h-6 px-2 text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            ✕ dismiss
          </button>

          {/* Keyboard hint — desktop only */}
          <span className="hidden sm:inline text-[10px] text-[var(--text-tertiary)] ml-auto">
            <kbd className="px-1 py-0.5 rounded bg-[var(--bg-muted)] font-mono text-[9px]">
              Tab
            </kbd>{" "}
            full &nbsp;
            <kbd className="px-1 py-0.5 rounded bg-[var(--bg-muted)] font-mono text-[9px]">
              →
            </kbd>{" "}
            word &nbsp;
            <kbd className="px-1 py-0.5 rounded bg-[var(--bg-muted)] font-mono text-[9px]">
              Esc
            </kbd>{" "}
            dismiss
          </span>
        </div>
      )}
    </div>
  );
}

// ─── StepClarify ─────────────────────────────────────────────────────

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
    const loadId = toast.loading("Thinking up some questions…");
    try {
      setLoading(true);
      const text = await generateClarifyQuestions(idea);
      toast.dismiss(loadId);
      const parsed = parseClarifyQuestions(text);
      setQuestions(parsed);
      onQuestionsLoaded?.(parsed);
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

      {/* Loading skeletons */}
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

      {/* Error */}
      {error && !loading && (
        <div className="rounded-[var(--r-lg)] border border-[var(--amber)] bg-[var(--amber-bg)] px-5 py-4 text-sm text-[var(--amber)]">
          {error}
        </div>
      )}

      {/* Questions */}
      {!loading && questions.length > 0 && (
        <div className="flex flex-col gap-5">
          {questions.map((q, i) => (
            <div
              key={i}
              className="rounded-[var(--r-lg)] border border-[var(--border)] p-5 transition-colors"
              style={{
                borderColor: answers[i]?.trim() ? "var(--emerald)" : undefined,
              }}
            >
              {/* Question header */}
              <div className="flex items-start gap-2 mb-3">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5"
                  style={{
                    background: answers[i]?.trim()
                      ? "var(--emerald)"
                      : "var(--bg-muted)",
                    color: answers[i]?.trim()
                      ? "white"
                      : "var(--text-tertiary)",
                  }}
                >
                  {answers[i]?.trim() ? "✓" : i + 1}
                </span>
                <label className="text-sm font-medium text-[var(--text-primary)] leading-snug">
                  {q.question}
                </label>
              </div>

              <GhostInput
                value={answers[i] ?? ""}
                suggestion={q.placeholder ?? ""}
                placeholder={q.placeholder ?? "Your answer…"}
                onChange={(val) => onChange(i, val)}
                questionIndex={i}
              />
            </div>
          ))}
        </div>
      )}

      {/* Progress indicator */}
      {!loading && questions.length > 0 && (
        <div className="flex items-center gap-2">
          {questions.map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-colors duration-300"
              style={{
                background: answers[i]?.trim()
                  ? "var(--emerald)"
                  : "var(--bg-muted)",
              }}
            />
          ))}
          <span className="text-xs text-[var(--text-tertiary)] shrink-0 tabular-nums">
            {questions.filter((_, i) => answers[i]?.trim()).length}/
            {questions.length}
          </span>
        </div>
      )}

      {/* Actions */}
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
