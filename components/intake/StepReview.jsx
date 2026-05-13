"use client";

/**
 * components/intake/StepReview.jsx
 *
 * PURE DISPLAY COMPONENT — does NOT self-start AI generation.
 * All generation state (genStatus, genCharCount, genError, blueprint)
 * is owned by new/page.jsx and passed in as props.
 *
 * Props:
 *   blueprint       - parsed blueprint object or null
 *   genStatus       - "idle" | "streaming" | "done" | "error" | "limited"
 *   genCharCount    - chars received so far (Infinity = complete)
 *   genError        - error string or null
 *   scopeLevel      - "lean" | "standard" | "ambitious"
 *   onBack          - go back to scope step
 *   onRetry         - retry generation
 *   onCommit(bp)    - called with blueprint when user clicks "Commit"
 *   limitAllowed    - boolean
 *   limitLoading    - boolean
 */

import React, { useState, useCallback, memo, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { useI18n } from "@/lib/i18n";
import { createToastSequence } from "@/lib/toastSequence";
import {
  FiCpu,
  FiMap,
  FiTarget,
  FiClipboard,
  FiAlertTriangle,
  FiTool,
  FiStar,
} from "react-icons/fi";
import { FaLightbulb } from "react-icons/fa";

const STREAM_STAGES = [
  { at: 0, icon: FiCpu, text: "Analysing your idea…" },
  { at: 300, icon: FiMap, text: "Mapping out phases…" },
  { at: 800, icon: FiTarget, text: "Defining success criteria…" },
  { at: 1400, icon: FiClipboard, text: "Writing tasks & milestones…" },
  { at: 2000, icon: FiAlertTriangle, text: "Identifying blockers & risks…" },
  { at: 2600, icon: FiTool, text: "Suggesting tools & resources…" },
  { at: 3200, icon: FiStar, text: "Finalising your blueprint…" },
];

const SCOPE_META = {
  lean: {
    label: "Lean",
    badge: "emerald",
    hint: "2 phases · fast start",
    color: "var(--emerald)",
  },
  standard: {
    label: "Standard",
    badge: "violet",
    hint: "3 phases · balanced",
    color: "var(--violet)",
  },
  ambitious: {
    label: "Ambitious",
    badge: "amber",
    hint: "4–5 phases · deep mode",
    color: "var(--amber)",
  },
};

// ─── Streaming progress UI ────────────────────────────────────────────

const StreamingProgress = memo(function StreamingProgress({
  charCount,
  scopeLevel,
}) {
  const scopeInfo = SCOPE_META[scopeLevel] ?? SCOPE_META.standard;
  const isDeep = scopeLevel === "ambitious";
  const stage =
    [...STREAM_STAGES].reverse().find((s) => charCount >= s.at) ??
    STREAM_STAGES[0];
  const Icon = stage.icon;
  const pct =
    charCount === Infinity
      ? 100
      : Math.min(98, Math.round((charCount / 3200) * 100));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[var(--text-primary)]">
            Building your blueprint…
          </h1>
          <Badge variant={scopeInfo.badge}>{scopeInfo.label}</Badge>
          {isDeep && <Badge variant="amber">🔬 Deep mode</Badge>}
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          {isDeep
            ? "Using advanced AI for your ambitious plan — this takes a little longer"
            : scopeInfo.hint}
        </p>
      </div>

      {charCount === 0 && (
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <div className="w-3 h-3 rounded-full border-2 border-[var(--violet)] border-t-transparent animate-spin" />
          <span>Contacting AI…</span>
        </div>
      )}

      <div className="flex items-center gap-3 rounded-[var(--r-lg)] border border-[var(--violet)] bg-[var(--violet-bg)] px-4 py-3">
        <span className="text-xl">
          <Icon />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--violet-dim)]">
            {pct === 100 ? "Done!" : stage.text}
          </p>
          <div className="mt-1.5 h-1.5 rounded-full bg-[var(--bg-muted)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: "var(--violet)" }}
            />
          </div>
        </div>
        <span className="text-xs text-[var(--text-tertiary)] tabular-nums shrink-0">
          {pct}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {STREAM_STAGES.map((s) => {
          const done = charCount >= s.at;
          const active = stage.at === s.at;
          return (
            <div
              key={s.at}
              className={[
                "flex items-center gap-2 px-3 py-2 rounded-[var(--r-md)] text-xs transition-all duration-300",
                done
                  ? active
                    ? "bg-[var(--violet-bg)] text-[var(--violet-dim)] border border-[var(--violet)]"
                    : "text-[var(--emerald)] opacity-75"
                  : "text-[var(--text-tertiary)] opacity-40",
              ].join(" ")}
            >
              <span className="shrink-0 text-sm">
                {done ? (active ? "⟳" : "✓") : "○"}
              </span>
              <span className="truncate">{s.text}</span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-center text-[var(--text-tertiary)]">
        {isDeep
          ? "Deep plans usually take 30–90 seconds"
          : "Usually takes 15–40 seconds"}
      </p>
    </div>
  );
});

// ─── Main component ───────────────────────────────────────────────────

export function StepReview({
  blueprint,
  genStatus,
  genCharCount,
  genError,
  scopeLevel,
  onBack,
  onRetry,
  onCommit,
  limitAllowed,
  limitLoading,
}) {
  const { isSignedIn, user } = useUser();
  const { t } = useI18n();
  const [showAuthGate, setShowAuthGate] = useState(false);
  const toastSequenceRef = useRef(null);

  // Manage toast sequence during generation
  useEffect(() => {
    if (genStatus === "streaming" && !toastSequenceRef.current) {
      toastSequenceRef.current = createToastSequence("blueprint");
      toastSequenceRef.current.start();
    } else if (genStatus === "done") {
      toastSequenceRef.current?.success("Blueprint ready!");
      toastSequenceRef.current = null;
    } else if (genStatus === "error") {
      toastSequenceRef.current?.error(
        genError || "Failed to generate blueprint"
      );
      toastSequenceRef.current = null;
    }

    return () => {
      if (toastSequenceRef.current) {
        toastSequenceRef.current.unmount();
      }
    };
  }, [genStatus, genError]);

  const handleCommitClick = useCallback(() => {
    if (!isSignedIn) {
      setShowAuthGate(true);
    } else {
      onCommit(blueprint);
    }
  }, [isSignedIn, onCommit, blueprint]);

  const handleContinueAnyway = useCallback(() => {
    setShowAuthGate(false);
    onCommit(blueprint);
  }, [onCommit, blueprint]);

  // Greeting bar
  const name = user?.firstName || user?.username || null;
  const greeting = isSignedIn
    ? name
      ? `Hi ${name}! Let's build something great.`
      : "Let's do this — onward!"
    : "Hello there — ready to explore?";

  function GreetingBanner() {
    return (
      <div className="rounded-[var(--r-md)] px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border)] mb-4">
        <p className="text-sm text-[var(--text-primary)] font-medium">
          {greeting}
        </p>
      </div>
    );
  }

  // ── Loading while checking limit ──────────────────────────────────
  if (limitLoading && genStatus === "idle") {
    return (
      <>
        <GreetingBanner />
        <div className="flex flex-col gap-4 items-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--violet)] border-t-transparent animate-spin" />
          <p className="text-sm text-[var(--text-secondary)]">
            Checking access…
          </p>
        </div>
      </>
    );
  }

  // ── Limit gate ────────────────────────────────────────────────────
  if (genStatus === "limited" || (!limitLoading && !limitAllowed)) {
    return (
      <>
        <GreetingBanner />
        <div className="flex flex-col gap-6">
          <div className="rounded-[var(--r-xl)] border-2 border-[var(--violet)] bg-[var(--violet-bg)] p-6 text-center">
            <div className="text-5xl mb-4">🎯</div>
            <h2 className="font-display font-semibold text-2xl text-[var(--text-primary)] mb-2">
              {isSignedIn
                ? "You've reached your project limit"
                : "You've used your free project"}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto mb-5">
              {isSignedIn
                ? "Sign up for a higher tier to create more projects."
                : "Sign up free to create unlimited projects and never lose your work."}
            </p>
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              <Button
                variant="primary"
                size="lg"
                className="w-full justify-center"
                onClick={() => setShowAuthGate(true)}
              >
                {isSignedIn ? "Upgrade plan" : "Create free account"}
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-center"
                onClick={onBack}
              >
                ← Edit my idea
              </Button>
            </div>
          </div>
        </div>
        <AuthGateModal
          open={showAuthGate}
          onClose={() => setShowAuthGate(false)}
          onContinueAnyway={() => setShowAuthGate(false)}
        />
      </>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────
  if (genStatus === "error") {
    return (
      <>
        <GreetingBanner />
        <div className="flex flex-col gap-6">
          <div className="rounded-[var(--r-lg)] border border-[var(--coral)] bg-[var(--coral-bg)] p-5 text-[var(--coral)]">
            <p className="font-medium mb-1">Couldn't generate your plan</p>
            <p className="text-sm opacity-80">{genError}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onBack}>
              {t("common_back")}
            </Button>
            <Button onClick={onRetry}>{t("common_retry")}</Button>
          </div>
        </div>
      </>
    );
  }

  // ── Streaming / idle (waiting) ────────────────────────────────────
  if (genStatus === "streaming" || genStatus === "idle") {
    return (
      <>
        <GreetingBanner />
        <StreamingProgress charCount={genCharCount} scopeLevel={scopeLevel} />
      </>
    );
  }

  // ── Done — show blueprint ─────────────────────────────────────────
  if (!blueprint) {
    return (
      <>
        <GreetingBanner />
        <div className="flex flex-col gap-4 items-center py-12">
          <p className="text-[var(--text-secondary)]">
            Blueprint missing. Please go back and try again.
          </p>
          <Button variant="ghost" onClick={onBack}>
            ← Back
          </Button>
        </div>
      </>
    );
  }

  const scopeInfo = SCOPE_META[scopeLevel] ?? SCOPE_META.standard;

  return (
    <>
      <GreetingBanner />
      <div className="flex flex-col gap-6 sm:gap-8">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-[var(--emerald)] shrink-0" />
            <span className="text-sm text-[var(--emerald)] font-medium">
              Blueprint ready
            </span>
            <Badge variant={scopeInfo.badge}>{scopeInfo.label}</Badge>
            {scopeLevel === "ambitious" && (
              <Badge variant="amber">🔬 Deep</Badge>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[var(--text-primary)] mb-1">
            {blueprint.projectTitle}
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            {blueprint.oneLineGoal}
          </p>
        </div>

        {/* Meta strip */}
        <div
          className="rounded-[var(--r-lg)] border px-4 py-3 flex flex-wrap gap-x-5 gap-y-2 text-sm"
          style={{
            borderColor: scopeInfo.color,
            background: `color-mix(in srgb, ${scopeInfo.color} 8%, transparent)`,
          }}
        >
          <span style={{ color: scopeInfo.color }} className="font-semibold">
            {scopeInfo.label} scope
          </span>
          <span className="text-[var(--text-secondary)]">
            {blueprint.phases.length} phases
          </span>
          <span className="text-[var(--text-secondary)]">
            {blueprint.tasks.length} tasks
          </span>
          {blueprint.timeline && (
            <span className="text-[var(--text-secondary)]">
              {blueprint.timeline}
            </span>
          )}
          {blueprint.estimatedEffort && (
            <span className="text-[var(--text-secondary)]">
              {blueprint.estimatedEffort}
            </span>
          )}
        </div>

        {/* Phases */}
        <div>
          <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-3">
            Phases & milestones
          </p>
          <div className="flex flex-col gap-2 sm:gap-3">
            {blueprint.phases.map((phase, i) => (
              <div
                key={phase.id}
                className="rounded-[var(--r-lg)] border border-[var(--border)] p-3 sm:p-4"
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-1.5">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[var(--violet-bg)] flex items-center justify-center text-xs font-medium text-[var(--violet-dim)] shrink-0">
                    {i + 1}
                  </div>
                  <p className="font-medium text-sm sm:text-base text-[var(--text-primary)]">
                    {phase.name}
                  </p>
                </div>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] ml-7 sm:ml-9">
                  {phase.objective}
                </p>
                {phase.milestones.length > 0 && (
                  <div className="ml-7 sm:ml-9 mt-2 flex flex-wrap gap-1.5">
                    {phase.milestones.map((m) => (
                      <Badge key={m.id} variant="slate">
                        {m.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Success criteria */}
        {blueprint.successCriteria?.length > 0 && (
          <div>
            <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-3">
              Success criteria
            </p>
            <ul className="flex flex-col gap-1.5">
              {blueprint.successCriteria.map((c, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs sm:text-sm text-[var(--text-secondary)]"
                >
                  <span className="text-[var(--emerald)] mt-0.5 shrink-0">
                    ✓
                  </span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Blockers */}
        {blueprint.blockers?.length > 0 && (
          <div>
            <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-3">
              Anticipated challenges
            </p>
            <ul className="flex flex-col gap-1.5">
              {blueprint.blockers.map((b, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs sm:text-sm text-[var(--text-secondary)]"
                >
                  <span className="text-[var(--amber)] mt-0.5 shrink-0">⚠</span>
                  {typeof b === "string" ? b : b.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sign-in nudge */}
        {!isSignedIn && (
          <div className="rounded-[var(--r-md)] bg-[var(--violet-bg)] border border-[var(--violet)] px-4 py-3 flex items-start gap-3">
            <span className="text-lg shrink-0">
              <FaLightbulb />
            </span>
            <div>
              <p className="text-xs font-medium text-[var(--violet-dim)]">
                Sign in to save this project
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Create a free account to build unlimited projects and never lose
                your work.{" "}
                <button
                  onClick={() => setShowAuthGate(true)}
                  className="text-[var(--violet)] hover:underline font-medium"
                >
                  Sign up free →
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Change scope
          </Button>
          <Button variant="emerald" size="lg" onClick={handleCommitClick}>
            Commit to this plan →
          </Button>
        </div>
      </div>

      <AuthGateModal
        open={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        onContinueAnyway={handleContinueAnyway}
      />
    </>
  );
}
