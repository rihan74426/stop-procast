"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  memo,
} from "react";
import { Button } from "@/components/ui/Button";
import { generateClarifyQuestions } from "@/lib/ai/clientGenerate";
import { parseClarifyQuestions } from "@/lib/ai/parser";
import { toast } from "@/lib/toast";

/**
 * Ghost suggestion for clarify answers.
 * Primary source: the question's placeholder (example answer).
 * The ghost shows the remainder of the placeholder after the user's typed prefix.
 */
function getAnswerGhost(value, placeholder) {
  if (!value || value.trim().length < 2) return "";
  if (!placeholder) return "";
  const lower = value.toLowerCase();
  const phLower = placeholder.toLowerCase();
  if (phLower.startsWith(lower) && placeholder.length > value.length) {
    return placeholder.slice(value.length);
  }
  return "";
}

// Move static font style out so it's not recreated on every render
const FONT_STYLE = {
  fontFamily: "var(--font-body, DM Sans, sans-serif)",
  fontSize: "0.875rem",
  fontWeight: "400",
  letterSpacing: "normal",
  whiteSpace: "pre",
};

// ─── GhostInput (forwardRef + memo) ──────────────────────────────────────
const GhostInput = memo(
  forwardRef(function GhostInput(
    { value, placeholder, onChange, inputId },
    ref
  ) {
    const inputRef = useRef(null);
    const mirrorRef = useRef(null);
    const [ghost, setGhost] = useState("");
    const [ghostLeft, setGhostLeft] = useState(0);
    const debounceRef = useRef(null);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => inputRef.current?.focus?.(),
        // other imperative actions could be exposed here
      }),
      []
    );

    useEffect(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (!value || value.trim().length < 2) {
          setGhost("");
          return;
        }
        if (!placeholder) {
          setGhost("");
          return;
        }
        const lower = value.toLowerCase();
        const phLower = placeholder.toLowerCase();
        if (phLower.startsWith(lower) && placeholder.length > value.length) {
          setGhost(placeholder.slice(value.length));
        } else {
          setGhost("");
        }
      }, 60);
      return () => clearTimeout(debounceRef.current);
    }, [value, placeholder]);

    // Measure pixel width of typed text to position ghost
    useEffect(() => {
      if (!ghost || !mirrorRef.current) return;
      setGhostLeft(mirrorRef.current.scrollWidth);
    }, [ghost, value]);

    const acceptFull = useCallback(() => {
      if (!ghost) return;
      onChange(value + ghost);
      setGhost("");
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
        }
        if (e.key === "Escape") setGhost("");
      },
      [ghost, acceptFull]
    );

    return (
      <div className="flex flex-col gap-1.5">
        <div className="relative">
          {/* Hidden mirror for pixel measurement */}
          <span
            ref={mirrorRef}
            aria-hidden="true"
            style={{
              ...FONT_STYLE,
              position: "absolute",
              visibility: "hidden",
              pointerEvents: "none",
              left: 12,
              top: 0,
            }}
          >
            {value || ""}
          </span>

          {/* Ghost overlay */}
          {ghost && (
            <span
              aria-hidden="true"
              style={{
                ...FONT_STYLE,
                position: "absolute",
                left: 12 + ghostLeft,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-tertiary)",
                opacity: 0.55,
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

          <input
            id={inputId}
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck
            style={{
              position: "relative",
              zIndex: 1,
              background: "transparent",
            }}
            className="w-full h-10 px-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--violet)] focus:border-[var(--violet)] transition-all"
          />
        </div>

        {ghost && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                acceptFull();
                inputRef.current?.focus();
              }}
              className="flex items-center gap-1 h-6 px-2 text-[10px] font-medium rounded-[var(--r-full)] bg-[var(--violet-bg)] text-[var(--violet-dim)] border border-[var(--violet)] hover:bg-[var(--violet)] hover:text-white transition-all"
            >
              <span>↹ Accept</span>
            </button>
            <button
              type="button"
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
              or{" "}
              <kbd className="px-1 py-0.5 rounded bg-[var(--bg-muted)] font-mono text-[9px]">
                →
              </kbd>{" "}
              to accept
            </span>
          </div>
        )}
      </div>
    );
  })
);

// ─── StepClarify ──────────────────────────────────────────────────────
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

  // refs to child GhostInput instances so we can focus them
  const inputRefs = useRef([]);

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
      setError(null);
      const text = await generateClarifyQuestions(idea);
      toast.dismiss(loadId);
      const parsed = parseClarifyQuestions(text);
      setQuestions(parsed);
      onQuestionsLoaded?.(parsed);
    } catch {
      toast.dismiss(loadId);
      setError("Couldn't load questions. You can retry or skip this step.");
    } finally {
      setLoading(false);
    }
  }

  // Focus first empty input after questions load
  useEffect(() => {
    if (loading) return;
    if (!questions || questions.length === 0) return;
    const firstEmpty = questions.findIndex((_, i) => !answers[i]?.trim());
    if (firstEmpty >= 0) {
      const ref = inputRefs.current[firstEmpty];
      ref?.focus?.();
    }
  }, [loading, questions, answers]);

  // stable handler factory for onChange to avoid re-creating inline functions in the map
  const makeOnChange = useCallback(
    (index) => (val) => onChange(index, val),
    [onChange]
  );

  const canProceed =
    questions.length === 0 || questions.every((_, i) => answers[i]?.trim());

  return (
    <div className="flex flex-col gap-8" aria-busy={loading ? "true" : "false"}>
      <div>
        <h1 className="text-3xl font-display font-semibold text-[var(--text-primary)] mb-2">
          A few quick questions
        </h1>
        <p className="text-[var(--text-secondary)]">
          These help shape a plan that fits your actual situation.
        </p>
      </div>

      {loading && (
        <div className="flex flex-col gap-4" role="status" aria-live="polite">
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
          <div className="flex items-start gap-4">
            <div className="flex-1">{error}</div>
            <div className="flex-shrink-0 flex gap-2">
              <Button variant="ghost" onClick={fetchQuestions} size="sm">
                Retry
              </Button>
              <Button variant="ghost" onClick={onNext} size="sm">
                Skip
              </Button>
            </div>
          </div>
        </div>
      )}

      {!loading && questions.length > 0 && (
        <div
          className="flex flex-col gap-5"
          aria-live="polite"
          aria-atomic="true"
        >
          {questions.map((q, i) => {
            const answered = Boolean(answers[i]?.trim());
            return (
              <div
                key={i}
                className="rounded-[var(--r-lg)] border border-[var(--border)] p-5 transition-colors"
                style={{
                  borderColor: answered ? "var(--emerald)" : undefined,
                }}
              >
                <div className="flex items-start gap-2 mb-3">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5"
                    style={{
                      background: answered
                        ? "var(--emerald)"
                        : "var(--bg-muted)",
                      color: answered ? "white" : "var(--text-tertiary)",
                    }}
                    aria-hidden
                  >
                    {answered ? "✓" : i + 1}
                  </span>
                  <label
                    htmlFor={`clarify-${i}`}
                    className="text-sm font-medium text-[var(--text-primary)] leading-snug"
                  >
                    {q.question}
                  </label>
                </div>

                <GhostInput
                  ref={(el) => (inputRefs.current[i] = el)}
                  inputId={`clarify-${i}`}
                  value={answers[i] ?? ""}
                  placeholder={q.placeholder ?? "Your answer…"}
                  onChange={makeOnChange(i)}
                />
              </div>
            );
          })}
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
        <Button variant="ghost" onClick={onBack} type="button">
          ← Back
        </Button>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onNext} type="button">
            Skip
          </Button>
          <Button
            onClick={onNext}
            disabled={!canProceed && !error}
            size="lg"
            type="button"
          >
            Build my plan →
          </Button>
        </div>
      </div>
    </div>
  );
}
