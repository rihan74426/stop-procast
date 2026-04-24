"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";

const EXAMPLES = [
  "Learn conversational Spanish in 3 months through daily 20-minute practice sessions",
  "Plan and launch a home bakery business selling to local cafes and weekend markets",
  "Write and self-publish a short non-fiction book about my area of expertise",
  "Renovate my kitchen on a budget — new cabinets, counters, and lighting",
  "Get fit enough to run a 10K race, starting from zero current fitness",
  "Launch a freelance design service and land my first 3 paying clients",
  "Build a habit of reading 20 books this year with a daily reading routine",
];

const SUGGESTIONS = [
  {
    trigger: "learn",
    ghost: " a new skill and track my progress week by week",
  },
  { trigger: "build", ghost: " something real and put it in front of people" },
  {
    trigger: "start",
    ghost: " from scratch and reach a clear, measurable goal",
  },
  { trigger: "plan", ghost: " every step with clear milestones and deadlines" },
  { trigger: "launch", ghost: " it publicly and get real feedback" },
  { trigger: "write", ghost: " and publish it for the audience that needs it" },
  {
    trigger: "create",
    ghost: " something valuable and share it with the world",
  },
  { trigger: "improve", ghost: " consistently by building a daily routine" },
  { trigger: "grow", ghost: " it into something sustainable and repeatable" },
  {
    trigger: "finish",
    ghost: " what I started and finally ship the final version",
  },
  { trigger: "open", ghost: " a business and serve my first real customers" },
  { trigger: "get", ghost: " measurable results through focused daily action" },
];

function getGhostText(value) {
  if (!value || value.length < 4) return "";
  const lower = value.toLowerCase().trim();
  const words = lower.split(/\s+/);
  const lastWord = words[words.length - 1];
  const partial = SUGGESTIONS.find(
    (s) =>
      s.trigger.startsWith(lastWord) &&
      lastWord.length >= 3 &&
      lastWord !== s.trigger
  );
  if (partial) return partial.trigger.slice(lastWord.length) + partial.ghost;
  const full = SUGGESTIONS.find(
    (s) => lower.endsWith(" " + s.trigger) || lower === s.trigger
  );
  if (full) return full.ghost;
  return "";
}

export function StepCapture({ value, onChange, onNext }) {
  const { t } = useI18n();
  const [focused, setFocused] = useState(false);
  const [exampleIdx, setExampleIdx] = useState(0);
  const textareaRef = useRef(null);
  const ghost = getGhostText(value);
  const canProceed = value.trim().length >= 20;

  useEffect(() => {
    const timer = setInterval(
      () => setExampleIdx((i) => (i + 1) % EXAMPLES.length),
      3500
    );
    return () => clearInterval(timer);
  }, []);

  const acceptGhost = () => {
    if (!ghost) return;
    onChange(value + ghost);
    setTimeout(() => {
      const el = textareaRef.current;
      if (el) el.selectionStart = el.selectionEnd = el.value.length;
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (ghost && (e.key === "Tab" || e.key === "ArrowRight")) {
      e.preventDefault();
      acceptGhost();
    }
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[var(--text-primary)] mb-2">
          {t("intake_what")}
        </h1>
        <p className="text-sm sm:text-base text-[var(--text-secondary)]">
          {t("intake_what_desc")}
        </p>
      </div>

      <div className="relative">
        <div
          className={[
            "rounded-[var(--r-lg)] border-2 transition-colors duration-200",
            focused ? "border-[var(--violet)]" : "border-[var(--border)]",
          ].join(" ")}
        >
          {ghost && focused && (
            <div
              aria-hidden="true"
              className="absolute top-0 left-0 w-full px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base leading-relaxed pointer-events-none select-none whitespace-pre-wrap break-words z-0"
              style={{ fontFamily: "inherit" }}
            >
              <span className="invisible">{value}</span>
              <span className="text-[var(--text-tertiary)] opacity-55">
                {ghost}
              </span>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={`e.g. ${EXAMPLES[exampleIdx]}`}
            rows={5}
            className="w-full bg-transparent px-4 sm:px-5 py-3 sm:py-4 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none text-sm sm:text-base leading-relaxed relative z-10"
            autoFocus
          />

          <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-t border-[var(--border)] flex items-center justify-between relative z-10">
            <span
              className={`text-xs ${
                value.length < 20
                  ? "text-[var(--text-tertiary)]"
                  : "text-[var(--emerald)]"
              }`}
            >
              {value.length < 20
                ? `${20 - value.length} more to go`
                : "✓ Great — more detail = better plan"}
            </span>
            <div className="flex items-center gap-2">
              {ghost && focused && (
                <>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      acceptGhost();
                    }}
                    className="text-xs px-2 py-0.5 rounded border border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--violet)] transition-all hidden sm:block"
                  >
                    Tab ↹
                  </button>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      acceptGhost();
                    }}
                    className="text-xs px-2.5 py-1 rounded-full bg-[var(--violet-bg)] text-[var(--violet-dim)] font-medium sm:hidden active:scale-95 transition-transform"
                  >
                    Accept →
                  </button>
                </>
              )}
              <span className="text-xs text-[var(--text-tertiary)]">
                {value.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs text-[var(--text-tertiary)] mb-2 sm:mb-3 uppercase tracking-wider font-medium">
          Need inspiration?
        </p>
        <div className="flex flex-col gap-2">
          {EXAMPLES.slice(0, 4).map((ex, i) => (
            <button
              key={i}
              onClick={() => onChange(ex)}
              className="text-left text-sm text-[var(--text-secondary)] px-3 sm:px-4 py-2.5 sm:py-3 rounded-[var(--r-md)] border border-[var(--border)] hover:border-[var(--violet)] hover:text-[var(--text-primary)] hover:bg-[var(--violet-bg)] transition-all duration-150"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!canProceed}
          size="lg"
          className="gap-2 sm:gap-3 w-full sm:w-auto justify-center"
        >
          {t("intake_continue")}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8h10M9 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
      </div>
    </div>
  );
}
