"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { generateClarifyQuestions } from "@/lib/ai/clientGenerate";
import { parseClarifyQuestions } from "@/lib/ai/parser";
import { toast } from "@/lib/toast";

// ─── Ghost suggestion engine ──────────────────────────────────────────
const ANSWER_COMPLETIONS = [
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
  {
    triggers: ["alone", "solo", "by myself", "on my own", "just me"],
    suffix: " — I'll need to build my own accountability structure",
  },
  {
    triggers: ["team", "with others", "colleague", "partner", "collaborat"],
    suffix: " — we'll need clear ownership and weekly check-ins",
  },
  {
    triggers: ["use ", "using ", "tool", "app", "software", "platform"],
    suffix: " — open to recommendations if there's a better option",
  },
];

function getAnswerGhost(value, placeholder) {
  if (!value || value.trim().length < 3) return "";
  const lower = value.toLowerCase();

  // 1. Placeholder prefix match
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
        const suffixCore = rule.suffix.replace(/^[ —-]+/, "").toLowerCase();
        if (!lower.includes(suffixCore.slice(0, 20))) {
          return rule.suffix;
        }
      }
    }
  }

  return "";
}

function getFirstWord(ghost) {
  const match = ghost.match(/^(\s*\S+)/);
  return match ? match[1] : ghost;
}

// ─── GhostInput ───────────────────────────────────────────────────────
// Uses a canvas-measure approach: the ghost is rendered as an absolutely
// positioned <span> overlaid on the input, offset by the text width.
// This avoids all z-index / background-transparency issues.

function GhostInput({
  value,
  suggestion,
  placeholder,
  onChange,
  questionIndex,
}) {
  const inputRef = useRef(null);
  const mirrorRef = useRef(null);
  const [ghost, setGhost] = useState("");
  const [ghostLeft, setGhostLeft] = useState(0);
  const debounceRef = useRef(null);

  // Compute ghost text
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!value || value.trim().length < 3) {
        setGhost("");
        return;
      }
      setGhost(getAnswerGhost(value, suggestion || placeholder));
    }, 80);
    return () => clearTimeout(debounceRef.current);
  }, [value, suggestion, placeholder]);

  // Measure text width to position the ghost correctly
  useEffect(() => {
    if (!ghost || !mirrorRef.current) return;
    // mirrorRef contains the current value text; its scrollWidth = pixel offset
    setGhostLeft(mirrorRef.current.scrollWidth);
  }, [ghost, value]);

  const acceptFull = useCallback(() => {
    if (!ghost) return;
    const newVal = value + ghost;
    onChange(newVal);
    setGhost("");
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) el.setSelectionRange(el.value.length, el.value.length);
    });
  }, [ghost, value, onChange]);

  const acceptOneWord = useCallback(() => {
    if (!ghost) return;
    const word = getFirstWord(ghost);
    onChange(value + word);
    setGhost(ghost.slice(word.length));
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) el.setSelectionRange(el.value.length, el.value.length);
    });
  }, [ghost, value, onChange]);

  const handleKeyDown = useCallback(
    (e) => {
      if (!ghost) return;
      if (e.key === "Tab") {
        e.preventDefault();
        acceptFull();
        return;
      }
      if (e.key === "ArrowRight") {
        const el = inputRef.current;
        if (el && el.selectionStart === el.value.length) {
          e.preventDefault();
          acceptFull();
        }
        return;
      }
      if (e.key === "Escape") {
        setGhost("");
      }
    },
    [ghost, acceptFull],
  );

  // Clear ghost on delete
  useEffect(() => {
    if (!value || value.trim().length < 3) setGhost("");
  }, [value]);

  // The shared font style — must match the input exactly
  const fontStyle = {
    fontFamily: "var(--font-body, DM Sans, sans-serif)",
    fontSize: "0.875rem", // text-sm = 14px
    fontWeight: "400",
    letterSpacing: "normal",
    whiteSpace: "pre",
  };

  return (
    <div className="flex flex-col gap-1.5">
      {/* Input wrapper — relative so ghost can overlay */}
      <div className="relative">
        {/* Hidden mirror span — measures pixel width of current value */}
        <span
          ref={mirrorRef}
          aria-hidden="true"
          style={{
            ...fontStyle,
            position: "absolute",
            visibility: "hidden",
            pointerEvents: "none",
            // Match input padding-left exactly (px-3 = 12px)
            left: 12,
            top: 0,
          }}
        >
          {value || ""}
        </span>

        {/* Ghost overlay span */}
        {ghost && (
          <span
            aria-hidden="true"
            style={{
              ...fontStyle,
              position: "absolute",
              // px-3 = 12px left padding, same as input
              left: 12 + ghostLeft,
              // vertically center inside h-10 (40px) input: (40 - lineHeight) / 2
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-tertiary)",
              opacity: 0.6,
              pointerEvents: "none",
              userSelect: "none",
              zIndex: 2,
              maxWidth: "calc(100% - 24px)",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            {ghost}
          </span>
        )}

        {/* Real input — transparent background so ghost shows through */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck
          style={{ position: "relative", zIndex: 1, background: "transparent" }}
          className="w-full h-10 px-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--violet)] focus:border-[var(--violet)] transition-all"
        />
      </div>

      {/* Accept controls */}
      {ghost && (
        <div className="flex items-center gap-2 flex-wrap">
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

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setGhost("");
              inputRef.current?.focus();
            }}
            className="h-6 px-2 text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            ✕ dismiss
          </button>

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
              className="rounded-[var(--r-lg)] border border-[var(--border)] p-5 transition-colors"
              style={{
                borderColor: answers[i]?.trim() ? "var(--emerald)" : undefined,
              }}
            >
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
