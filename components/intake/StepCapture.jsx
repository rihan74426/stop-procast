"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";

// ─── Ghost suggestion engine ──────────────────────────────────────────
//
// Each entry has:
//   triggers: lowercase words/phrases that activate this completion
//   completions: array of possible continuations (one chosen based on context)
//   weight: how specific/useful this is (higher = preferred when multiple match)

const SUGGESTION_RULES = [
  // Learning goals
  {
    triggers: ["learn", "learning", "study", "studying", "master", "mastering"],
    completions: [
      " conversational Spanish through daily 20-minute practice sessions",
      " Python programming from scratch and build 3 real projects",
      " music theory and apply it to composing original pieces",
      " data analysis with hands-on projects and a final portfolio",
      " web development and ship my first app in 60 days",
    ],
    weight: 2,
  },
  // Writing goals
  {
    triggers: ["write", "writing", "draft", "drafting"],
    completions: [
      " a 30,000-word first draft of my novel in 90 days",
      " a technical book on system design with weekly chapters",
      " a blog series on productivity and grow to 1,000 subscribers",
      " a screenplay for a short film and submit to 3 festivals",
    ],
    weight: 2,
  },
  // Building/launching
  {
    triggers: [
      "build",
      "building",
      "create",
      "creating",
      "develop",
      "developing",
      "make",
      "making",
    ],
    completions: [
      " a SaaS product that solves a real problem and get 10 paying customers",
      " an e-commerce store and reach $1,000 in monthly revenue",
      " a mobile app and launch it on the App Store within 3 months",
      " a portfolio website that showcases my best work and lands me freelance clients",
    ],
    weight: 2,
  },
  // Launching / shipping
  {
    triggers: [
      "launch",
      "launching",
      "ship",
      "shipping",
      "release",
      "releasing",
    ],
    completions: [
      " my side project publicly and acquire the first 100 users",
      " a paid online course and sell 50 seats in the first month",
      " a podcast and publish 10 episodes before promoting it",
    ],
    weight: 2,
  },
  // Fitness / health
  {
    triggers: [
      "run",
      "running",
      "train",
      "training",
      "workout",
      "fitness",
      "exercise",
    ],
    completions: [
      " a 5K race in under 30 minutes by following a 12-week plan",
      " for a half marathon with 4 sessions per week",
      " consistently 4 days a week and build a sustainable routine",
      " and lose 10kg over 4 months through progressive overload",
    ],
    weight: 2,
  },
  // Planning / organising
  {
    triggers: [
      "plan",
      "planning",
      "organise",
      "organize",
      "prepare",
      "preparing",
    ],
    completions: [
      " a destination wedding for 80 guests within budget",
      " a complete home renovation with contractors, timeline and budget",
      " a product roadmap for Q3 with clear milestones and owners",
      " my career transition into product management over the next 6 months",
    ],
    weight: 2,
  },
  // Habits
  {
    triggers: [
      "habit",
      "habits",
      "routine",
      "routines",
      "daily",
      "consistently",
    ],
    completions: [
      " of writing 500 words every morning before work",
      " of meditating for 10 minutes and journaling daily",
      " of reading 20 pages a day and finish 24 books this year",
      " of cold outreach — 5 contacts per day — to grow my network",
    ],
    weight: 2,
  },
  // Research
  {
    triggers: [
      "research",
      "researching",
      "investigate",
      "investigate",
      "analyse",
      "analyze",
    ],
    completions: [
      " the competitive landscape for my SaaS idea and validate demand",
      " machine learning techniques for time-series forecasting",
      " customer pain points through 20 user interviews",
    ],
    weight: 2,
  },
  // Starting
  {
    triggers: [
      "start",
      "starting",
      "begin",
      "beginning",
      "kick off",
      "kickoff",
    ],
    completions: [
      " a freelance design practice and land my first 3 clients",
      " a YouTube channel focused on personal finance for beginners",
      " a small newsletter business and grow to 500 subscribers",
    ],
    weight: 2,
  },
  // Improve / grow
  {
    triggers: ["improve", "improving", "grow", "growing", "increase", "boost"],
    completions: [
      " my public speaking skills and deliver a talk at a local meetup",
      " my team's deployment frequency from weekly to daily",
      " my drawing skills from beginner to portfolio-ready",
      " organic traffic to my site by 3x in 6 months",
    ],
    weight: 2,
  },
  // Complete / finish
  {
    triggers: ["complete", "completing", "finish", "finishing"],
    completions: [
      " my thesis and submit it 2 weeks before the deadline",
      " the online course I started 3 months ago and get certified",
      " my open-source project and publish it with documentation",
    ],
    weight: 2,
  },
  // Generic sentence starters — lower weight, fill-in when nothing specific matches
  {
    triggers: ["i want", "i need", "i'd like", "i would like"],
    completions: [
      " to build something people actually pay for",
      " to finally finish a project I've been putting off",
      " to develop a skill that opens new career opportunities",
    ],
    weight: 1,
  },
];

// Contextual completions based on domain keywords anywhere in text
const DOMAIN_HINTS = [
  {
    keywords: [
      "spanish",
      "french",
      "german",
      "japanese",
      "arabic",
      "mandarin",
      "language",
    ],
    append: " — focusing on speaking, listening, and practical conversation",
  },
  {
    keywords: ["startup", "saas", "product", "mvp"],
    append: " — validating the idea before building, then iterating fast",
  },
  {
    keywords: ["book", "novel", "nonfiction"],
    append: " — with a weekly chapter target and an accountability partner",
  },
  {
    keywords: ["podcast"],
    append: " — researching format, recording 5 pilot episodes, then launching",
  },
  {
    keywords: ["youtube", "channel", "video"],
    append: " — producing 10 videos before optimising for growth",
  },
];

/**
 * Returns a ghost completion string for the current input value.
 * Returns "" if no good match found.
 */
function getGhostCompletion(value) {
  if (!value || value.trim().length < 6) return "";

  const lower = value.toLowerCase().trim();
  const words = lower.split(/\s+/);
  const lastWord = words[words.length - 1];
  const lastTwoWords = words.slice(-2).join(" ");

  // 1. Check for mid-word trigger (user is mid-typing a trigger word)
  //    e.g. "le" → matches "learn" trigger, suggests rest of trigger + completion
  for (const rule of SUGGESTION_RULES) {
    for (const trigger of rule.triggers) {
      if (
        trigger.startsWith(lastWord) &&
        lastWord.length >= 3 &&
        lastWord.length < trigger.length
      ) {
        // Suggest completing the trigger word + first completion
        const completion = rule.completions[0];
        return trigger.slice(lastWord.length) + completion;
      }
    }
  }

  // 2. Check for complete trigger word (user finished typing the trigger)
  //    e.g. "I want to learn" → suggest completion
  let bestRule = null;
  let bestWeight = -1;

  for (const rule of SUGGESTION_RULES) {
    for (const trigger of rule.triggers) {
      if (
        lower.endsWith(" " + trigger) ||
        lower === trigger ||
        lastTwoWords === trigger
      ) {
        if (rule.weight > bestWeight) {
          bestRule = rule;
          bestWeight = rule.weight;
        }
      }
    }
  }

  if (bestRule) {
    // Pick completion deterministically based on text length (varies suggestion without randomness)
    const idx = value.length % bestRule.completions.length;
    return bestRule.completions[idx];
  }

  // 3. Domain hint — if text is long enough and contains a domain keyword, suggest a suffix
  if (value.trim().length > 20 && !value.trim().endsWith(".")) {
    for (const hint of DOMAIN_HINTS) {
      if (hint.keywords.some((kw) => lower.includes(kw))) {
        // Only suggest if the append text isn't already in the value
        if (!lower.includes(hint.append.toLowerCase().slice(3))) {
          return hint.append;
        }
      }
    }
  }

  return "";
}

// ─── Curated examples ─────────────────────────────────────────────────
const EXAMPLES = [
  "Learn conversational Spanish in 3 months through daily 20-minute practice",
  "Build a SaaS product, validate it with 10 users, and launch in 8 weeks",
  "Train for a half marathon following a progressive 16-week plan",
  "Write and self-publish a 30,000-word non-fiction book this year",
  "Organise a 3-day community event with 200 attendees and 5 sponsors",
  "Study for the AWS Solutions Architect exam and pass within 6 weeks",
];

// ─── Component ────────────────────────────────────────────────────────
export function StepCapture({ value, onChange, onNext }) {
  const { t } = useI18n();
  const [focused, setFocused] = useState(false);
  const [ghost, setGhost] = useState("");
  const [exampleIdx, setExampleIdx] = useState(0);
  const [showExamples, setShowExamples] = useState(false);
  const textareaRef = useRef(null);
  const ghostDebounceRef = useRef(null);
  const canProceed = value.trim().length >= 20;

  // Rotate placeholder examples
  useEffect(() => {
    const timer = setInterval(
      () => setExampleIdx((i) => (i + 1) % EXAMPLES.length),
      4000
    );
    return () => clearInterval(timer);
  }, []);

  // Debounced ghost computation — don't fire on every keystroke
  const computeGhost = useCallback((text) => {
    if (ghostDebounceRef.current) clearTimeout(ghostDebounceRef.current);
    ghostDebounceRef.current = setTimeout(() => {
      setGhost(getGhostCompletion(text));
    }, 120);
  }, []);

  const handleChange = useCallback(
    (text) => {
      onChange(text);
      computeGhost(text);
    },
    [onChange, computeGhost]
  );

  const acceptGhost = useCallback(() => {
    if (!ghost) return;
    const newVal = value + ghost;
    onChange(newVal);
    setGhost("");
    // Recompute after accepting — might unlock another suggestion
    setTimeout(() => computeGhost(newVal), 150);
    // Keep focus and move cursor to end
    setTimeout(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.selectionStart = el.selectionEnd = el.value.length;
      }
    }, 0);
  }, [ghost, value, onChange, computeGhost]);

  const handleKeyDown = useCallback(
    (e) => {
      if (ghost && e.key === "Tab") {
        e.preventDefault();
        acceptGhost();
        return;
      }
      // ArrowRight only accepts when cursor is at end
      if (ghost && e.key === "ArrowRight") {
        const el = textareaRef.current;
        if (el && el.selectionStart === el.value.length) {
          e.preventDefault();
          acceptGhost();
        }
      }
    },
    [ghost, acceptGhost]
  );

  const handleExampleClick = useCallback(
    (ex) => {
      onChange(ex);
      setGhost("");
      setShowExamples(false);
      textareaRef.current?.focus();
    },
    [onChange]
  );

  // Clear ghost when value is cleared
  useEffect(() => {
    if (!value) setGhost("");
  }, [value]);

  const showGhost = focused && ghost.length > 0;

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

      {/* ── Textarea with ghost overlay ── */}
      <div className="relative">
        <div
          className={[
            "rounded-[var(--r-lg)] border-2 transition-colors duration-200 overflow-hidden",
            focused ? "border-[var(--violet)]" : "border-[var(--border)]",
          ].join(" ")}
        >
          {/* Ghost text layer — rendered behind the real textarea */}
          {showGhost && (
            <div
              aria-hidden="true"
              className="absolute top-0 left-0 w-full px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base leading-relaxed pointer-events-none select-none whitespace-pre-wrap break-words z-0 overflow-hidden"
              style={{
                fontFamily: "inherit",
                fontSize: "inherit",
                lineHeight: "inherit",
                // Match textarea padding exactly
                paddingBottom: "52px", // leaves room for footer bar
              }}
            >
              {/* Invisible spacer matching existing text */}
              <span className="invisible whitespace-pre-wrap">{value}</span>
              {/* Ghost suggestion in muted colour */}
              <span
                className="whitespace-pre-wrap"
                style={{ color: "var(--text-tertiary)", opacity: 0.6 }}
              >
                {ghost}
              </span>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => {
              setFocused(true);
              computeGhost(value);
            }}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={`e.g. ${EXAMPLES[exampleIdx]}`}
            rows={5}
            className="w-full bg-transparent px-4 sm:px-5 py-3 sm:py-4 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none text-sm sm:text-base leading-relaxed relative z-10"
            autoFocus
            spellCheck
          />

          {/* Footer bar */}
          <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-t border-[var(--border)] flex items-center justify-between relative z-10 bg-[var(--bg-elevated)]">
            <span
              className={`text-xs transition-colors ${
                value.length < 20
                  ? "text-[var(--text-tertiary)]"
                  : "text-[var(--emerald)]"
              }`}
            >
              {value.length < 20
                ? `${20 - value.length} chars to go`
                : "✓ Ready — more detail means a better plan"}
            </span>

            <div className="flex items-center gap-2">
              {/* Ghost accept hint */}
              {showGhost && (
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    acceptGhost();
                  }}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-[var(--r-full)] bg-[var(--violet-bg)] text-[var(--violet-dim)] border border-[var(--violet)] hover:bg-[var(--violet)] hover:text-white transition-all font-medium"
                >
                  <span className="hidden sm:inline">Tab</span>
                  <span>↹ accept</span>
                </button>
              )}

              <span className="text-xs text-[var(--text-tertiary)] tabular-nums min-w-[2rem] text-right">
                {value.length}
              </span>
            </div>
          </div>
        </div>

        {/* Ghost hint tooltip — only shown briefly when ghost first appears */}
        {showGhost && (
          <div className="absolute -bottom-7 right-0 text-[10px] text-[var(--text-tertiary)] pointer-events-none">
            Press{" "}
            <kbd className="px-1 py-0.5 rounded bg-[var(--bg-muted)] font-mono text-[10px]">
              Tab
            </kbd>{" "}
            or{" "}
            <kbd className="px-1 py-0.5 rounded bg-[var(--bg-muted)] font-mono text-[10px]">
              →
            </kbd>{" "}
            to accept
          </div>
        )}
      </div>

      {/* ── Examples section ── */}
      <div>
        <button
          onClick={() => setShowExamples((s) => !s)}
          className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors mb-3 group"
        >
          <span
            className={`transition-transform duration-200 ${
              showExamples ? "rotate-90" : ""
            }`}
          >
            ▶
          </span>
          <span className="uppercase tracking-wider font-medium">
            {showExamples ? "Hide examples" : "Show examples for inspiration"}
          </span>
        </button>

        {showExamples && (
          <div className="flex flex-col gap-2 animate-[fadeIn_150ms_ease_both]">
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                onClick={() => handleExampleClick(ex)}
                className="text-left text-sm text-[var(--text-secondary)] px-3 sm:px-4 py-2.5 rounded-[var(--r-md)] border border-[var(--border)] hover:border-[var(--violet)] hover:text-[var(--text-primary)] hover:bg-[var(--violet-bg)] transition-all duration-150 group"
              >
                <span className="text-[var(--text-tertiary)] group-hover:text-[var(--violet-dim)] mr-2 text-xs">
                  {i + 1}.
                </span>
                {ex}
              </button>
            ))}
          </div>
        )}
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

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
