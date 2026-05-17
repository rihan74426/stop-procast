"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";

// ─── Ghost suggestion engine ──────────────────────────────────────────

const SUGGESTION_RULES = [
  {
    triggers: ["learn", "learning", "study", "studying", "master", "mastering"],
    completions: [
      "conversational Spanish through daily 20-minute practice sessions",
      "Python programming and build 3 real projects",
      "music theory and compose original pieces",
      "data analysis with hands-on projects",
      "web development and ship my first app",
      "JavaScript deeply and become job-ready",
      "graphic design fundamentals through daily practice",
    ],
    weight: 2,
  },
  {
    triggers: ["write", "writing", "draft", "drafting"],
    completions: [
      "a 30,000-word first draft of my novel",
      "a technical guide on system design",
      "a blog series and grow my audience",
      "a screenplay and submit to 3 festivals",
      "100 essays about my ideas and learnings",
      "a weekly newsletter and reach 1,000 subscribers",
    ],
    weight: 2,
  },
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
      "a SaaS product that solves a real problem",
      "an e-commerce store and hit $1,000 revenue",
      "a mobile app and launch on the App Store",
      "a portfolio website and land freelance clients",
      "a tool that saves people time",
      "an API that other developers can use",
      "a browser extension that gains 1,000 users",
    ],
    weight: 2,
  },
  {
    triggers: [
      "launch",
      "launching",
      "ship",
      "shipping",
      "release",
      "releasing",
      "publish",
      "publishing",
    ],
    completions: [
      "my side project and get the first 100 users",
      "a paid course and sell 50 seats in month one",
      "a podcast with 10 episodes before promoting",
      "my app to production this month",
      "a beta version and gather feedback",
    ],
    weight: 2,
  },
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
      "a 5K race in under 30 minutes",
      "for a half marathon with 4 sessions weekly",
      "consistently 4 days a week and build momentum",
      "and lose 10kg in 4 months",
      "and get stronger with progressive overload",
      "and improve my endurance by 50%",
    ],
    weight: 2,
  },
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
      "a destination wedding within budget",
      "a home renovation with clear milestones",
      "a Q3 roadmap with owners and deadlines",
      "my career transition into product management",
      "a family trip and book everything by month-end",
    ],
    weight: 2,
  },
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
      "a habit of writing 500 words every morning",
      "a routine of meditating and journaling daily",
      "a reading habit — 20 pages daily",
      "a habit of reaching out to 5 new people weekly",
      "a morning routine that sets me up for success",
      "an exercise routine I actually stick to",
    ],
    weight: 2,
  },
  {
    triggers: [
      "research",
      "researching",
      "investigate",
      "investigating",
      "analyse",
      "analyze",
      "validate",
    ],
    completions: [
      "the market for my SaaS idea",
      "machine learning techniques for my use case",
      "customer pain points through 20 interviews",
      "my competitor landscape thoroughly",
      "what my target audience actually wants",
    ],
    weight: 2,
  },
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
      "a freelance design practice",
      "a YouTube channel focused on my expertise",
      "a newsletter about ideas I care about",
      "a side project that could become a business",
      "a community around my passion",
    ],
    weight: 2,
  },
  {
    triggers: ["improve", "improving", "grow", "growing", "increase", "boost"],
    completions: [
      "my public speaking and deliver talks",
      "my team's deployment frequency",
      "my design skills to portfolio-ready",
      "organic traffic to my site by 3x",
      "my network through meaningful conversations",
      "my leadership skills and guide my team better",
    ],
    weight: 2,
  },
  {
    triggers: ["complete", "completing", "finish", "finishing"],
    completions: [
      "my thesis before the deadline",
      "the online course I started months ago",
      "my open-source project with full docs",
      "that side project I've been procrastinating on",
      "the backlog and have a clean slate",
    ],
    weight: 2,
  },
  {
    triggers: ["i want", "i need", "i'd like", "i would like"],
    completions: [
      "to build something people actually use",
      "to finish something I've started",
      "to develop a skill that matters",
      "to make an impact in my field",
    ],
    weight: 1,
  },
];

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
    append: " — with daily conversation practice and immersion",
  },
  {
    keywords: ["startup", "saas", "product", "mvp", "business"],
    append: " — validate demand first, then build the MVP",
  },
  {
    keywords: ["book", "novel", "nonfiction", "writing"],
    append: " — with weekly milestones and accountability",
  },
  {
    keywords: ["podcast"],
    append: " — record 5 pilots, then launch publicly",
  },
  {
    keywords: ["youtube", "channel", "video", "content"],
    append: " — produce 10 videos before worrying about growth",
  },
  {
    keywords: ["course", "training", "certification"],
    append: " — dedicate 1 hour daily and track progress",
  },
  {
    keywords: ["freelance", "client", "contract"],
    append: " — land 3 clients and build a portfolio",
  },
  {
    keywords: ["app", "software", "code"],
    append: " — ship an MVP in 4 weeks",
  },
];

function getGhostCompletion(value) {
  if (!value || value.trim().length < 6) return "";

  const lower = value.toLowerCase().trim();
  const words = lower.split(/\s+/);
  const lastWord = words[words.length - 1];
  const lastTwoWords = words.slice(-2).join(" ");
  const lastThreeWords = words.slice(-3).join(" ");

  for (const rule of SUGGESTION_RULES) {
    for (const trigger of rule.triggers) {
      if (
        trigger.startsWith(lastWord) &&
        lastWord.length >= 3 &&
        lastWord.length < trigger.length
      ) {
        const completion = rule.completions[0];
        return trigger.slice(lastWord.length) + " " + completion;
      }
    }
  }

  let bestRule = null;
  let bestWeight = -1;

  for (const rule of SUGGESTION_RULES) {
    for (const trigger of rule.triggers) {
      if (
        lower.endsWith(" " + trigger) ||
        lower === trigger ||
        lastWord === trigger ||
        lastTwoWords === trigger ||
        lastThreeWords === trigger
      ) {
        if (rule.weight > bestWeight) {
          bestRule = rule;
          bestWeight = rule.weight;
        }
      }
    }
  }

  if (bestRule) {
    const idx = value.length % bestRule.completions.length;
    return " " + bestRule.completions[idx];
  }

  if (value.trim().length > 20 && !value.trim().endsWith(".")) {
    for (const hint of DOMAIN_HINTS) {
      if (hint.keywords.some((kw) => lower.includes(kw))) {
        if (!lower.includes(hint.append.toLowerCase().slice(3))) {
          return hint.append;
        }
      }
    }
  }

  return "";
}

// ─── Example keys (7 examples, translated via i18n) ───────────────────
const EXAMPLE_KEYS = [
  "capture_example_0",
  "capture_example_1",
  "capture_example_2",
  "capture_example_3",
  "capture_example_4",
  "capture_example_5",
  "capture_example_6",
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
      () => setExampleIdx((i) => (i + 1) % EXAMPLE_KEYS.length),
      4000
    );
    return () => clearInterval(timer);
  }, []);

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
    setTimeout(() => computeGhost(newVal), 150);
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

  useEffect(() => {
    if (!value) setGhost("");
  }, [value]);

  const showGhost = focused && ghost.length > 0;
  const currentPlaceholder = `e.g. ${t(EXAMPLE_KEYS[exampleIdx])}`;

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
          {showGhost && (
            <div
              aria-hidden="true"
              className="absolute top-0 left-0 w-full px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base leading-relaxed pointer-events-none select-none whitespace-pre-wrap break-words z-0 overflow-hidden"
              style={{
                fontFamily: "inherit",
                fontSize: "inherit",
                lineHeight: "inherit",
                paddingBottom: "52px",
              }}
            >
              <span className="invisible whitespace-pre-wrap">{value}</span>
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
            placeholder={currentPlaceholder}
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
            {EXAMPLE_KEYS.map((key, i) => {
              const ex = t(key);
              return (
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
              );
            })}
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
