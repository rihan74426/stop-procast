"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  memo,
} from "react";
import { useUser } from "@clerk/nextjs";
import { parseBlueprint } from "@/lib/ai/parser";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { useI18n } from "@/lib/i18n";
import { loadUserProfile, buildProfileContext } from "@/lib/userProfile";
import { generateBlueprint } from "@/lib/ai/clientGenerate";
import { toast } from "@/lib/toast";

import {
  FiCpu,
  FiMap,
  FiTarget,
  FiClipboard,
  FiAlertTriangle,
  FiTool,
  FiStar,
  FiCheck,
  FiRefreshCw,
  FiCircle,
  FiZap,
} from "react-icons/fi";

// Animated stage messages shown while the AI streams
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

const StreamingProgress = memo(function StreamingProgress({
  charCount,
  scopeLevel,
}) {
  const scopeInfo = SCOPE_META[scopeLevel] ?? SCOPE_META.standard;
  const isDeep = scopeLevel === "ambitious";
  const stage =
    [...STREAM_STAGES].reverse().find((s) => charCount >= s.at) ??
    STREAM_STAGES[0];
  const Icon = stage.icon; // render as component
  const pct = Math.min(98, Math.round((charCount / 3200) * 100));

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
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

      {/* Active stage banner */}
      <div className="flex items-center gap-3 rounded-[var(--r-lg)] border border-[var(--violet)] bg-[var(--violet-bg)] px-4 py-3">
        <span className="text-xl">
          <Icon />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--violet-dim)]">
            {stage.text}…
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

      {/* Stage checklist */}
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

export function StepReview({
  idea,
  clarifications,
  scopeLevel,
  cachedBlueprint,
  onBack,
  onCommit,
  // Passed from parent — result of useProjectLimit()
  limitAllowed,
  limitLoading,
}) {
  const { isSignedIn } = useUser();
  const { t } = useI18n();

  const [blueprint, setBlueprint] = useState(cachedBlueprint ?? null);
  const [charCount, setCharCount] = useState(0);
  const [status, setStatus] = useState(cachedBlueprint ? "done" : "idle");
  const [error, setError] = useState(null);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const rawRef = useRef("");
  const readerRef = useRef(null);
  const rafRef = useRef(null);
  const hasStarted = useRef(false);
  const mountedRef = useRef(true);
  const loadingToastId = useRef(null);

  // Show auth gate immediately if limit exceeded on mount
  useEffect(() => {
    if (!limitLoading && !limitAllowed && !cachedBlueprint) {
      setStatus("limited");
    }
  }, [limitLoading, limitAllowed, cachedBlueprint]);

  useEffect(() => {
    if (cachedBlueprint) return;
    if (hasStarted.current) return;
    if (status === "limited") return;
    if (limitLoading) return; // wait for limit check
    if (!limitAllowed) {
      setStatus("limited");
      return;
    }
    hasStarted.current = true;
    runGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cachedBlueprint, limitLoading, limitAllowed]);

  // cleanup on unmount: cancel reader and prevent state updates
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (readerRef.current?.cancel) {
        try {
          readerRef.current.cancel();
        } catch {}
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  async function runGeneration() {
    setStatus("streaming");
    setCharCount(0);
    setError(null);
    rawRef.current = "";
    loadingToastId.current = toast.loading(
      scopeLevel === "ambitious"
        ? "Starting deep analysis…"
        : "Building your plan…"
    );

    try {
      const profile = loadUserProfile();
      const profileContext = buildProfileContext(profile);

      const stream = await generateBlueprint({
        idea,
        clarifications,
        scopeLevel,
        profileContext,
      });

      // keep reader ref for cancellation on unmount/retry
      const reader = stream.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = typeof value === "string" ? value : decoder.decode(value);
        rawRef.current += chunk;
        // batch UI updates with requestAnimationFrame to reduce re-renders
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          if (mountedRef.current) setCharCount(rawRef.current.length);
        });
      }
      rafRef.current = null;

      const parsed = parseBlueprint(rawRef.current);
      if (!mountedRef.current) return;
      setBlueprint(parsed);
      setStatus("done");
      toast.dismiss(loadingToastId.current);
      toast.success("Your plan is ready!");
    } catch (e) {
      toast.dismiss(loadingToastId.current);

      // Rate limit / quota from OpenRouter path
      if (e.code === "RATE_LIMITED") {
        toast.warn("Rate limited — retrying in 3s…");
        await new Promise((r) => setTimeout(r, 3000));
        hasStarted.current = false;
        // ensure reader is cleaned up before retrying
        if (readerRef.current?.cancel) {
          try {
            await readerRef.current.cancel();
          } catch {}
        }
        return runGeneration();
      }

      if (mountedRef.current) {
        setError(e?.message ?? "Generation failed");
        setStatus("error");
      }
    }
  }

  const handleCommitClick = useCallback(() => {
    if (!isSignedIn) {
      setShowAuthGate(true);
    } else {
      onCommit(blueprint);
    }
  }, [isSignedIn, onCommit, blueprint]);

  // Ensure the continue-anyway callback is a stable hook (not created conditionally)
  const handleContinueAnyway = useCallback(() => {
    setShowAuthGate(false);
    onCommit(blueprint);
  }, [onCommit, blueprint]);

  // ── Limit gate ───────────────────────────────────────────────────
  if (status === "limited") {
    return (
      <>
        <div className="flex flex-col gap-6">
          <div className="rounded-[var(--r-xl)] border-2 border-[var(--violet)] bg-[var(--violet-bg)] p-6 text-center">
            <div className="text-5xl mb-4">🎯</div>
            <h2 className="font-display font-semibold text-2xl text-[var(--text-primary)] mb-2">
              You've used your free project
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto mb-5">
              Sign up free to create unlimited projects, save your work across
              devices, and access deeper AI planning.
            </p>
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              <Button
                variant="primary"
                size="lg"
                className="w-full justify-center"
                onClick={() => setShowAuthGate(true)}
              >
                Create free account
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
          <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
            <p className="text-xs text-[var(--text-secondary)] text-center">
              Free account · No credit card · Unlimited projects
            </p>
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

  // ── Loading limit check ──────────────────────────────────────────
  if (limitLoading && status === "idle") {
    return (
      <div className="flex flex-col gap-4 items-center py-12">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--violet)] border-t-transparent animate-spin" />
        <p className="text-sm text-[var(--text-secondary)]">Checking access…</p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-[var(--r-lg)] border border-[var(--coral)] bg-[var(--coral-bg)] p-5 text-[var(--coral)]">
          <p className="font-medium mb-1">Couldn't generate your plan</p>
          <p className="text-sm opacity-80">{error}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onBack}>
            {t("common_back")}
          </Button>
          <Button
            onClick={() => {
              hasStarted.current = false;
              runGeneration();
            }}
          >
            {t("common_retry")}
          </Button>
        </div>
      </div>
    );
  }

  // ── Streaming ────────────────────────────────────────────────────
  if (status === "streaming" || status === "idle") {
    return <StreamingProgress charCount={charCount} scopeLevel={scopeLevel} />;
  }

  // ── Done ─────────────────────────────────────────────────────────
  const scopeInfo = SCOPE_META[scopeLevel] ?? SCOPE_META.standard;

  return (
    <>
      <div className="flex flex-col gap-6 sm:gap-8">
        {/* Header */}
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

        {/* Scope summary bar */}
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

        {/* Anticipated blockers */}
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

        {/* Sign-in nudge for anonymous users */}
        {!isSignedIn && (
          <div className="rounded-[var(--r-md)] bg-[var(--violet-bg)] border border-[var(--violet)] px-4 py-3 flex items-start gap-3">
            <span className="text-lg shrink-0">💡</span>
            <div>
              <p className="text-xs font-medium text-[var(--violet-dim)]">
                Sign in to save this project
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                This is your free project. Create a free account to build
                unlimited projects and never lose your work.{" "}
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
