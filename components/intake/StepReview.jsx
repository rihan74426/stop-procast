"use client";

import React, { useEffect, useRef, useState, useCallback, memo } from "react";
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

const StreamingProgress = memo(function StreamingProgress({
  charCount,
  scopeLevel,
  isPending,
}) {
  const scopeInfo = SCOPE_META[scopeLevel] ?? SCOPE_META.standard;
  const isDeep = scopeLevel === "ambitious";
  const stage =
    [...STREAM_STAGES].reverse().find((s) => charCount >= s.at) ??
    STREAM_STAGES[0];
  const Icon = stage.icon;
  // Show 100% only when charCount signals completion (set to Infinity by caller)
  const pct =
    charCount === Infinity
      ? 100
      : Math.min(98, Math.round((charCount / 3200) * 100));

  return (
    <div className="flex flex-col gap-5">
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

      {isPending && charCount === 0 && (
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
            {pct === 100 ? "Done!" : `${stage.text}…`}
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

      <div
        className={`grid grid-cols-2 gap-2 ${
          isPending && charCount === 0 ? "animate-pulse opacity-80" : ""
        }`}
      >
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
  limitAllowed,
  limitLoading,
}) {
  const { isSignedIn, user } = useUser();
  const { t } = useI18n();

  const [blueprint, setBlueprint] = useState(cachedBlueprint ?? null);
  const [charCount, setCharCount] = useState(0);
  const [status, setStatus] = useState(cachedBlueprint ? "done" : "idle");
  const [error, setError] = useState(null);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [streamPending, setStreamPending] = useState(false);

  const rawRef = useRef("");
  const readerRef = useRef(null);
  const rafRef = useRef(null);
  const hasStarted = useRef(false);
  const mountedRef = useRef(true);
  const loadingToastId = useRef(null);
  const prevToastStageRef = useRef(null); // tracks what we've last shown in the loading toast
  const retryCount = useRef(0);
  const MAX_RETRIES = 2;

  // --- New: fallback toast sequence while waiting for any AI response ---
  const FALLBACK_MESSAGES = [
    "Still waiting for AI — sometimes it takes a moment.",
    "Trying a different AI model for a better response…",
    "Preparing a fallback response — we'll have something soon.",
    "Thanks for your patience — almost there!",
  ];
  const fallbackTimerRef = useRef(null); // single timeout id controlling sequencing
  const fallbackIndexRef = useRef(0); // which fallback message to show next
  const fallbackToastIdsRef = useRef([]); // ids of shown fallback toasts so we can dismiss them

  function stopFallbackSequence() {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    // dismiss any fallback toasts shown
    if (fallbackToastIdsRef.current.length > 0) {
      for (const id of fallbackToastIdsRef.current) {
        try {
          toast.dismiss(id);
        } catch {
          /* ignore */
        }
      }
      fallbackToastIdsRef.current = [];
    }
    fallbackIndexRef.current = 0;
  }

  function startFallbackSequence() {
    // guard: don't start if already running
    if (fallbackTimerRef.current) return;

    // show messages one by one; each toast auto-closes after 3000ms
    const showNext = () => {
      if (!mountedRef.current) {
        stopFallbackSequence();
        return;
      }
      // Only run fallback while stream is still pending
      if (!streamPending) {
        stopFallbackSequence();
        return;
      }

      const i = fallbackIndexRef.current % FALLBACK_MESSAGES.length;
      const id = toast.info(FALLBACK_MESSAGES[i], {
        autoClose: 3000,
        pauseOnHover: false,
      });
      fallbackToastIdsRef.current.push(id);
      fallbackIndexRef.current = i + 1;

      // schedule next message slightly after the toast auto-closes
      fallbackTimerRef.current = setTimeout(showNext, 3500);
    };

    // kick off
    showNext();
  }
  // --- end fallback sequence additions ---

  const dismissLoadingToast = useCallback(() => {
    if (loadingToastId.current) {
      toast.dismiss(loadingToastId.current);
      loadingToastId.current = null;
      prevToastStageRef.current = null;
    }
    // ensure fallback sequence toasts are also cleaned up
    stopFallbackSequence();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      dismissLoadingToast();
      stopFallbackSequence();
      try {
        readerRef.current?.cancel();
      } catch {
        /* ignore */
      }
      readerRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [dismissLoadingToast]);

  // Keep local blueprint/status in sync with cachedBlueprint prop changes.
  // If a cached blueprint appears, cancel any in-progress generation and show it immediately.
  // If cachedBlueprint becomes null, reset generation state so runGeneration can start.
  useEffect(() => {
    // If a cached blueprint is provided, stop any streaming and show it
    if (cachedBlueprint) {
      // cancel any active reader/stream
      try {
        readerRef.current?.cancel();
      } catch {
        /* ignore */
      }
      readerRef.current = null;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      dismissLoadingToast();
      rawRef.current = "";
      setCharCount(Infinity);
      setStreamPending(false);
      setBlueprint(cachedBlueprint);
      setStatus("done");
      setError(null);
      return;
    }

    // cachedBlueprint cleared → prepare to run a fresh generation
    // Leave hasStarted gating / runGeneration to existing effects, but reset local state
    setBlueprint(null);
    setStatus("idle");
    setCharCount(0);
    rawRef.current = "";
    setError(null);
  }, [cachedBlueprint, dismissLoadingToast]);

  // Update loading toast content as generation progresses.
  // Sequence: initial "Thinking about your plan…" -> "Building your plan…" -> per-stage texts.
  useEffect(() => {
    if (!loadingToastId.current) return;
    if (status !== "streaming") return;

    // compute stage index (highest index where charCount >= at)
    let stageIndex = 0;
    for (let i = STREAM_STAGES.length - 1; i >= 0; i--) {
      if (charCount >= STREAM_STAGES[i].at) {
        stageIndex = i;
        break;
      }
    }

    // Decide which toast message to show
    const showThinking = charCount === 0;
    const showBuilding = charCount > 0 && charCount < 200;

    if (showThinking && prevToastStageRef.current !== "thinking") {
      toast.loading("Thinking about your plan…", {
        id: loadingToastId.current,
      });
      prevToastStageRef.current = "thinking";
      return;
    }

    if (showBuilding && prevToastStageRef.current !== "building") {
      toast.loading("Building your plan…", { id: loadingToastId.current });
      prevToastStageRef.current = "building";
      return;
    }

    // Otherwise show per-stage message (avoid updating if same stage)
    if (prevToastStageRef.current !== stageIndex) {
      const text = STREAM_STAGES[stageIndex]?.text ?? "Building your plan…";
      toast.loading(text, { id: loadingToastId.current });
      prevToastStageRef.current = stageIndex;
    }
  }, [charCount, status]);

  // Limit gate
  useEffect(() => {
    if (cachedBlueprint) return;
    if (limitLoading) return;
    if (!limitAllowed) {
      setStatus("limited");
      hasStarted.current = true;
    }
  }, [limitLoading, limitAllowed, cachedBlueprint]);

  // Start generation when limit confirmed as OK
  useEffect(() => {
    if (cachedBlueprint) return;
    if (hasStarted.current) return;
    if (limitLoading) return;
    if (!limitAllowed) return;
    hasStarted.current = true;
    runGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cachedBlueprint, limitLoading, limitAllowed]);

  async function runGeneration() {
    if (!mountedRef.current) return;
    if (!limitAllowed) {
      setStatus("limited");
      return;
    }

    setStatus("streaming");
    setCharCount(0);
    setError(null);
    setStreamPending(true);
    rawRef.current = "";

    dismissLoadingToast();
    // Start with "Thinking…" to hook users, then progress via the charCount effect
    loadingToastId.current = toast.loading("Thinking about your plan…");
    prevToastStageRef.current = "thinking";

    // Start the fallback message sequence while waiting for the first AI chunk
    startFallbackSequence();

    try {
      const profile = loadUserProfile();
      const profileContext = buildProfileContext(profile);

      const stream = await generateBlueprint({
        idea,
        clarifications,
        scopeLevel,
        profileContext,
      });
      const reader = stream.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!mountedRef.current) {
          try {
            reader.cancel();
          } catch {
            /* ignore */
          }
          return;
        }

        const chunk =
          value instanceof Uint8Array
            ? decoder.decode(value, { stream: true })
            : typeof value === "string"
            ? value
            : "";

        // As soon as we get a non-empty chunk, stop fallback sequence
        if (streamPending && chunk?.length > 0) {
          setStreamPending(false);
          stopFallbackSequence(); // <-- ensure fallback toasts stop immediately
        }
        rawRef.current += chunk;

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          if (mountedRef.current) setCharCount(rawRef.current.length);
        });
      }

      rafRef.current = null;
      readerRef.current = null;

      if (rawRef.current.trim().length < 50) {
        throw new Error("AI returned incomplete response. Please try again.");
      }

      const parsed = parseBlueprint(rawRef.current);
      if (!mountedRef.current) return;

      retryCount.current = 0;
      // Dismiss loading toast before showing success
      dismissLoadingToast();

      // Signal 100% before transitioning to "done" state
      setCharCount(Infinity);
      await new Promise((r) => setTimeout(r, 300));

      if (!mountedRef.current) return;
      toast.success("Your plan is ready!");
      setBlueprint(parsed);
      setStatus("done");
      setStreamPending(false);
    } catch (e) {
      if (!mountedRef.current) return;
      dismissLoadingToast();
      stopFallbackSequence();
      readerRef.current = null;
      setStreamPending(false);

      if (
        (e.code === "RATE_LIMITED" || e.status === 429) &&
        retryCount.current < MAX_RETRIES
      ) {
        retryCount.current += 1;
        const delay = 3000 * retryCount.current;
        toast.warn(
          `Rate limited — retrying in ${delay / 1000}s… (${
            retryCount.current
          }/${MAX_RETRIES})`
        );
        await new Promise((r) => setTimeout(r, delay));
        if (mountedRef.current) runGeneration();
        return;
      }

      const message =
        e.code === "RATE_LIMITED" || e.status === 429
          ? "Rate limit reached. Please wait a moment and try again."
          : e.code === "QUOTA_EXCEEDED" || e.status === 402
          ? "AI quota exceeded for today. Try again tomorrow."
          : e.code === "TIMEOUT" || e.status === 504
          ? "Request timed out. Please try again."
          : e?.message ?? "Generation failed. Please try again.";

      setError(message);
      setStatus("error");
    }
  }

  const handleRetry = useCallback(() => {
    // Reset ALL generation state so the useEffect gate and runGeneration
    // both start from scratch — critical after back-nav + error + retry.
    retryCount.current = 0;
    hasStarted.current = false; // ← was missing: gate was permanently closed
    setError(null);
    setStatus("idle");
    setCharCount(0);
    rawRef.current = "";
    // The useEffect watching [cachedBlueprint, limitLoading, limitAllowed]
    // will NOT re-fire because those haven't changed. Trigger directly:
    hasStarted.current = true;
    runGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function GreetingBanner() {
    const name = user?.firstName || user?.fullName || user?.username || null;
    const text = isSignedIn
      ? name
        ? `Hi ${name}! Let's get to work.`
        : "Let's do this — onward!"
      : "Hello there — ready to explore?";
    return (
      <div className="rounded-[var(--r-md)] px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border)] mb-4">
        <p className="text-sm text-[var(--text-primary)] font-medium">{text}</p>
      </div>
    );
  }

  if (status === "limited") {
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
                ? "You've created 4 projects. Sign up for more."
                : "Sign up free to create unlimited projects, save your work, and access deeper AI planning."}
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

  if (limitLoading && status === "idle") {
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

  if (status === "error") {
    return (
      <>
        <GreetingBanner />
        <div className="flex flex-col gap-6">
          <div className="rounded-[var(--r-lg)] border border-[var(--coral)] bg-[var(--coral-bg)] p-5 text-[var(--coral)]">
            <p className="font-medium mb-1">Couldn't generate your plan</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onBack}>
              {t("common_back")}
            </Button>
            <Button onClick={handleRetry}>{t("common_retry")}</Button>
          </div>
        </div>
      </>
    );
  }

  if (status === "streaming" || status === "idle") {
    return (
      <>
        <GreetingBanner />
        <StreamingProgress
          charCount={charCount}
          scopeLevel={scopeLevel}
          isPending={streamPending}
        />
      </>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────
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
