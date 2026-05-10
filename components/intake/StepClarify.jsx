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

// ─── GhostInput ───────────────────────────────────────────────────────
//
// Ghost shows the remainder of q.placeholder after the user's typed prefix.
// Tab or → (at end of input) accepts. Esc dismisses.

const GhostInput = memo(
  forwardRef(function GhostInput(
    { value, placeholder, onChange, onEnter, inputId, autoFocus },
    ref
  ) {
    const inputRef = useRef(null);
    const [ghost, setGhost] = useState("");

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    // Recompute ghost whenever value or placeholder changes
    useEffect(() => {
      if (!placeholder || !value || value.trim().length < 2) {
        setGhost("");
        return;
      }
      const vLow = value.toLowerCase();
      const pLow = placeholder.toLowerCase();
      if (pLow.startsWith(vLow) && placeholder.length > value.length) {
        setGhost(placeholder.slice(value.length));
      } else {
        setGhost("");
      }
    }, [value, placeholder]);

    const acceptGhost = useCallback(() => {
      if (!ghost) return;
      onChange(value + ghost);
      setGhost("");
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      });
    }, [ghost, value, onChange]);

    const handleKeyDown = useCallback(
      (e) => {
        if (e.key === "Tab" && ghost) {
          e.preventDefault();
          acceptGhost();
          return;
        }
        if (e.key === "ArrowRight" && ghost) {
          const el = inputRef.current;
          if (el && el.selectionStart === el.value.length) {
            e.preventDefault();
            acceptGhost();
            return;
          }
        }
        if (e.key === "Escape") {
          setGhost("");
          return;
        }
        if (e.key === "Enter" && onEnter) {
          e.preventDefault();
          onEnter();
        }
      },
      [ghost, acceptGhost, onEnter]
    );

    return (
      <div className="relative">
        {/* Ghost overlay — positioned behind the real input */}
        {ghost && (
          <div
            aria-hidden
            className="absolute inset-0 flex items-center pointer-events-none select-none overflow-hidden px-4 pb-6"
          >
            <span className="text-sm whitespace-pre invisible shrink-0 max-w-full overflow-hidden">
              {value}
            </span>
            <span
              className="text-sm whitespace-pre truncate"
              style={{ color: "var(--text-tertiary)", opacity: 0.55 }}
            >
              {ghost}
            </span>
          </div>
        )}

        <input
          id={inputId}
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          // Hide native placeholder while ghost is showing to avoid overlap
          placeholder={ghost ? "" : placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck
          className="w-full h-10 px-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--violet)] focus:border-[var(--violet)] transition-all relative z-10"
          style={{ background: "transparent" }}
        />

        {ghost && (
          <div className="flex items-center gap-2 mt-1.5">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                acceptGhost();
                inputRef.current?.focus();
              }}
              className="flex items-center gap-1 h-5 px-2 text-[10px] font-medium rounded-[var(--r-full)] bg-[var(--violet-bg)] text-[var(--violet-dim)] border border-[var(--violet)] hover:bg-[var(--violet)] hover:text-white transition-all leading-none"
            >
              ↹ Accept suggestion
            </button>
            <span className="text-[10px] text-[var(--text-tertiary)]">
              or press{" "}
              <kbd className="px-1 py-0.5 rounded bg-[var(--bg-muted)] font-mono text-[9px]">
                →
              </kbd>
            </span>
          </div>
        )}
      </div>
    );
  })
);

// ─── Question card ────────────────────────────────────────────────────

const QuestionCard = memo(function QuestionCard({
  question,
  index,
  value,
  onChange,
  onEnter,
  inputRef,
  autoFocus,
}) {
  const answered = Boolean(value?.trim());
  return (
    <div
      className={[
        "rounded-[var(--r-lg)] border p-4 sm:p-5 transition-all duration-200",
        answered
          ? "border-[var(--emerald)] bg-[var(--bg-elevated)]"
          : "border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--slate-4)]",
      ].join(" ")}
    >
      <div className="flex items-start gap-3 mb-3">
        <span
          className={[
            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 transition-all duration-300",
            answered
              ? "bg-[var(--emerald)] text-white"
              : "bg-[var(--bg-muted)] text-[var(--text-tertiary)]",
          ].join(" ")}
          aria-hidden
        >
          {answered ? "✓" : index + 1}
        </span>
        <label
          htmlFor={`clarify-${index}`}
          className="text-sm font-medium text-[var(--text-primary)] leading-snug cursor-pointer"
        >
          {question.question}
        </label>
      </div>
      <div className="pl-9">
        <GhostInput
          ref={inputRef}
          inputId={`clarify-${index}`}
          value={value ?? ""}
          placeholder={question.placeholder ?? "Your answer…"}
          onChange={onChange}
          onEnter={onEnter}
          autoFocus={autoFocus}
        />
      </div>
    </div>
  );
});

// ─── Skeleton ─────────────────────────────────────────────────────────

function SkeletonCard({ index }) {
  return (
    <div
      className="rounded-[var(--r-lg)] border border-[var(--border)] p-4 sm:p-5 animate-pulse"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-6 h-6 rounded-full bg-[var(--bg-muted)] shrink-0" />
        <div className="flex-1">
          <div className="h-4 bg-[var(--bg-muted)] rounded w-5/6 mb-1.5" />
          <div className="h-3 bg-[var(--bg-muted)] rounded w-2/5" />
        </div>
      </div>
      <div className="pl-9">
        <div className="h-10 bg-[var(--bg-muted)] rounded-[var(--r-md)]" />
      </div>
    </div>
  );
}

// ─── Progress dots ────────────────────────────────────────────────────

function ProgressDots({ total, answered }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1.5 flex-1 rounded-full transition-all duration-500"
          style={{
            background: i < answered ? "var(--emerald)" : "var(--bg-muted)",
          }}
        />
      ))}
      <span className="text-xs text-[var(--text-tertiary)] shrink-0 tabular-nums min-w-[2.5rem] text-right">
        {answered}/{total}
      </span>
    </div>
  );
}

// ─── StepClarify ──────────────────────────────────────────────────────
//
// FIX: The old implementation used a `hasFetched` ref that was local to
// the component instance. When React unmounts and remounts the component
// (back-nav, Strict Mode double-render in dev), the ref resets to false
// and questions refetch — even though cachedQuestions was passed in.
//
// Fix: derive "should fetch" purely from the cachedQuestions PROP.
//   - If cachedQuestions is non-null → always use it, never fetch.
//   - If cachedQuestions is null → fetch exactly once per mount.
//
// The parent (new/page.jsx) owns the cache via onQuestionsLoaded, so
// remounts with a populated cache correctly skip the fetch.

export function StepClarify({
  idea,
  answers,
  onChange,
  onNext,
  onBack,
  cachedQuestions, // null = not yet fetched; Question[] = already have them
  onQuestionsLoaded, // parent callback to persist questions across remounts
}) {
  // If we have cached questions use them directly — no fetch needed.
  const [questions, setQuestions] = useState(cachedQuestions ?? []);
  // Only show loading state when we actually need to fetch (no cache).
  const [loading, setLoading] = useState(cachedQuestions === null);
  const [error, setError] = useState(null);

  // hasFetched prevents double-fetch within ONE mount (e.g. Strict Mode).
  // It does NOT prevent a fetch on remount when cachedQuestions is still
  // null — that's intentional and correct.
  const hasFetched = useRef(false);

  const inputRefs = useRef([]);

  // Sync if parent provides questions after initial render
  useEffect(() => {
    if (cachedQuestions !== null && cachedQuestions.length > 0) {
      setQuestions(cachedQuestions);
      setLoading(false);
    }
  }, [cachedQuestions]);

  useEffect(() => {
    // Already have questions from cache — nothing to do
    if (cachedQuestions !== null) return;
    // Already started a fetch in this mount
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally only on mount

  async function fetchQuestions() {
    setLoading(true);
    setError(null);
    try {
      const text = await generateClarifyQuestions(idea);
      const parsed = parseClarifyQuestions(text);
      setQuestions(parsed);
      onQuestionsLoaded?.(parsed); // persist in parent for remount stability
    } catch {
      setError("Couldn't load questions. You can retry or skip this step.");
    } finally {
      setLoading(false);
    }
  }

  function handleRetry() {
    hasFetched.current = false;
    hasFetched.current = true; // set synchronously before async call
    fetchQuestions();
  }

  // Focus first unanswered input after questions appear
  useEffect(() => {
    if (loading || questions.length === 0) return;
    const firstEmpty = questions.findIndex((_, i) => !answers[i]?.trim());
    const target = firstEmpty >= 0 ? firstEmpty : 0;
    setTimeout(() => inputRefs.current[target]?.focus(), 80);
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Enter advances to next question; on last question submits if all filled
  const handleEnter = useCallback(
    (index) => {
      const next = index + 1;
      if (next < questions.length) {
        inputRefs.current[next]?.focus();
      } else {
        const allFilled = questions.every((_, i) => answers[i]?.trim());
        if (allFilled) onNext();
      }
    },
    [questions, answers, onNext]
  );

  const makeOnChange = useCallback(
    (index) => (val) => onChange(index, val),
    [onChange]
  );

  const answeredCount = questions.filter((_, i) => answers[i]?.trim()).length;
  const canProceed =
    questions.length === 0 || answeredCount === questions.length;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[var(--text-primary)] mb-2">
          A few quick questions
        </h1>
        <p className="text-sm sm:text-base text-[var(--text-secondary)]">
          These help shape a plan that fits your actual situation. Answer in
          your own words — rough is fine.
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div
          className="flex flex-col gap-3"
          role="status"
          aria-label="Loading questions"
        >
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} index={i} />
          ))}
          <p className="text-xs text-center text-[var(--text-tertiary)] mt-1 animate-pulse">
            Generating questions tailored to your idea…
          </p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-[var(--r-lg)] border border-[var(--amber)] bg-[var(--amber-bg)] px-4 sm:px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--amber)] mb-1">
                Couldn't load questions
              </p>
              <p className="text-xs text-[var(--text-secondary)] mb-3">
                {error}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="h-7 px-3 text-xs font-medium rounded-[var(--r-md)] bg-[var(--amber)] text-white hover:opacity-90 transition-opacity"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  className="h-7 px-3 text-xs font-medium rounded-[var(--r-md)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
                >
                  Skip this step
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Questions */}
      {!loading && questions.length > 0 && (
        <div className="flex flex-col gap-3" aria-live="polite">
          {questions.map((q, i) => (
            <QuestionCard
              key={i}
              question={q}
              index={i}
              value={answers[i] ?? ""}
              onChange={makeOnChange(i)}
              onEnter={() => handleEnter(i)}
              inputRef={(el) => (inputRefs.current[i] = el)}
              autoFocus={i === 0}
            />
          ))}
        </div>
      )}

      {/* Progress */}
      {!loading && questions.length > 0 && (
        <ProgressDots total={questions.length} answered={answeredCount} />
      )}

      {/* All-answered prompt */}
      {canProceed && questions.length > 0 && (
        <p className="text-xs text-center text-[var(--emerald)] font-medium -mt-2">
          ✓ All answered — ready to generate your plan!
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack} type="button">
          ← Back
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNext}
            type="button"
            className="text-[var(--text-tertiary)]"
          >
            Skip
          </Button>
          <Button onClick={onNext} size="lg" type="button" disabled={loading}>
            {canProceed
              ? "Build my plan →"
              : `Answer all (${answeredCount}/${questions.length})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
