"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";
import { FiChevronRight } from "react-icons/fi";

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
    triggers: ["start", "starting", "begin", "beginning"],
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
    ],
    weight: 2,
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
  { keywords: ["podcast"], append: " — record 5 pilots, then launch publicly" },
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
        return trigger.slice(lastWord.length) + " " + rule.completions[0];
      }
    }
  }

  let bestRule = null,
    bestWeight = -1;
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
        if (!lower.includes(hint.append.toLowerCase().slice(3)))
          return hint.append;
      }
    }
  }
  return "";
}

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

  useEffect(() => {
    const timer = setInterval(
      () => setExampleIdx((i) => (i + 1) % EXAMPLE_KEYS.length),
      4000
    );
    return () => clearInterval(timer);
  }, []);

  const computeGhost = useCallback((text) => {
    if (ghostDebounceRef.current) clearTimeout(ghostDebounceRef.current);
    ghostDebounceRef.current = setTimeout(
      () => setGhost(getGhostCompletion(text)),
      120
    );
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
      {/* Header */}
      <div>
        <h1
          className="text-2xl sm:text-3xl font-display font-semibold mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          {t("intake_what")}
        </h1>
        <p
          className="text-sm sm:text-base"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("intake_what_desc")}
        </p>
      </div>

      {/* Textarea with ghost overlay */}
      <div className="relative">
        <div
          className="rounded-[var(--r-lg)] border-2 transition-colors duration-200 overflow-hidden"
          style={{ borderColor: focused ? "var(--violet)" : "var(--border)" }}
        >
          {/* Ghost text layer */}
          {showGhost && (
            <div
              aria-hidden="true"
              className="absolute top-0 left-0 w-full px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base leading-relaxed pointer-events-none select-none whitespace-pre-wrap break-words z-0 overflow-hidden"
              style={{ paddingBottom: "52px" }}
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
            className="w-full bg-transparent px-4 sm:px-5 py-3 sm:py-4 resize-none focus:outline-none text-sm sm:text-base leading-relaxed relative z-10"
            style={{
              color: "var(--text-primary)",
            }}
            autoFocus
            spellCheck
          />

          {/* Footer bar */}
          <div
            className="px-4 sm:px-5 py-2.5 sm:py-3 border-t flex items-center justify-between relative z-10"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--border)",
            }}
          >
            <span
              className="text-xs transition-colors"
              style={{
                color:
                  value.length < 20 ? "var(--text-tertiary)" : "var(--emerald)",
              }}
            >
              {value.length < 20
                ? `${20 - value.length} chars to go`
                : "Ready — more detail means a better plan"}
            </span>

            <div className="flex items-center gap-2">
              {showGhost && (
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    acceptGhost();
                  }}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-[var(--r-full)] border font-medium transition-all"
                  style={{
                    background: "var(--violet-bg)",
                    color: "var(--violet-dim)",
                    borderColor: "var(--violet)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--violet)";
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--violet-bg)";
                    e.currentTarget.style.color = "var(--violet-dim)";
                  }}
                >
                  Tab ↹ accept
                </button>
              )}
              <span
                className="text-xs tabular-nums min-w-[2rem] text-right"
                style={{ color: "var(--text-tertiary)" }}
              >
                {value.length}
              </span>
            </div>
          </div>
        </div>

        {showGhost && (
          <p
            className="absolute -bottom-7 right-0 text-[10px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            Press{" "}
            <kbd
              className="px-1 py-0.5 rounded font-mono text-[10px]"
              style={{ background: "var(--bg-muted)" }}
            >
              Tab
            </kbd>{" "}
            or{" "}
            <kbd
              className="px-1 py-0.5 rounded font-mono text-[10px]"
              style={{ background: "var(--bg-muted)" }}
            >
              →
            </kbd>{" "}
            to accept
          </p>
        )}
      </div>

      {/* Examples section */}
      <div>
        <button
          onClick={() => setShowExamples((s) => !s)}
          className="flex items-center gap-2 text-xs mb-3 group transition-colors"
          style={{ color: "var(--text-tertiary)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--text-secondary)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--text-tertiary)")
          }
        >
          {/* FiChevronRight rotates instead of Unicode ▶ */}
          <FiChevronRight
            size={12}
            className="transition-transform duration-200 shrink-0"
            style={{
              transform: showExamples ? "rotate(90deg)" : "rotate(0deg)",
            }}
          />
          <span className="uppercase tracking-wider font-medium">
            {showExamples ? "Hide examples" : "Show examples for inspiration"}
          </span>
        </button>

        {showExamples && (
          <div
            className="flex flex-col gap-2"
            style={{ animation: "fadeIn 150ms ease both" }}
          >
            {EXAMPLE_KEYS.map((key, i) => {
              const ex = t(key);
              return (
                <button
                  key={i}
                  onClick={() => handleExampleClick(ex)}
                  className="text-left text-sm px-3 sm:px-4 py-2.5 rounded-[var(--r-md)] border transition-all duration-150"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text-secondary)",
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--violet)";
                    e.currentTarget.style.color = "var(--text-primary)";
                    e.currentTarget.style.background = "var(--violet-bg)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span
                    className="text-xs mr-2"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {i + 1}.
                  </span>
                  {ex}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="flex justify-end">
        <Button
          onClick={onNext}
          variant="primary"
          disabled={!canProceed}
          size="lg"
          className="gap-2 sm:gap-3 w-full sm:w-auto justify-center"
        >
          {t("intake_continue")}
          <FiChevronRight size={16} strokeWidth={2} />
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
