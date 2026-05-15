"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { StepCapture } from "@/components/intake/StepCapture";
import { StepClarify } from "@/components/intake/StepClarify";
import { StepScope } from "@/components/intake/StepScope";
import { StepReview } from "@/components/intake/StepReview";
import { StepCommit } from "@/components/intake/StepCommit";
import { useProjectStore } from "@/lib/store/projectStore";
import { useProjectLimit } from "@/lib/ai/useProjectLimit";
import { DataProvider } from "@/components/providers/DataProvider";
import { SavePromptModal } from "@/components/ui/SavePromptModal";
import { TopBar } from "@/components/layout/Topbar";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { Sidebar } from "@/components/layout/Sidebar";
import { toast } from "@/lib/toast";
import { generateBlueprint } from "@/lib/ai/clientGenerate";
import { parseBlueprint } from "@/lib/ai/parser";
import { loadUserProfile, buildProfileContext } from "@/lib/userProfile";
import { useI18n } from "@/lib/i18n";
import { BiSolidPencil } from "react-icons/bi";

const STEP_LABELS = ["Capture", "Clarify", "Scope", "Review", "Commit"];

// ─── Wait sequence ────────────────────────────────────────────────────
// Fires one toast at a time. Each toast is dismissed before the next shows.
// The returned cancel function clears all pending timers AND dismisses any
// currently-visible wait toast.

const WAIT_MESSAGES = [
  { after: 6000, message: "Thinking — this usually takes 15–40 seconds…" },
  { after: 15000, message: "Switching to a faster model if needed…" },
  {
    after: 28000,
    message: "Still working — complex plans take a little longer.",
  },
  { after: 42000, message: "Almost done — hang tight." },
];

function startWaitSequence() {
  let activeToastId = null;
  const timers = [];

  WAIT_MESSAGES.forEach(({ after, message }) => {
    timers.push(
      setTimeout(() => {
        // Dismiss previous wait toast before showing next
        if (activeToastId !== null) {
          toast.dismiss(activeToastId);
        }
        activeToastId = toast.info(message, { duration: 0 });
      }, after)
    );
  });

  return () => {
    timers.forEach(clearTimeout);
    if (activeToastId !== null) {
      toast.dismiss(activeToastId);
      activeToastId = null;
    }
  };
}

// ─── Regen permission banner ──────────────────────────────────────────

function RegenPermissionBanner({ onKeep, onRegenerate }) {
  return (
    <div className="mb-6 rounded-[var(--r-lg)] border-2 border-[var(--amber)] bg-[var(--amber-bg)] px-4 py-4">
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0 mt-0.5">✏️</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">
            Your inputs changed
          </p>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">
            You edited your idea, answers, or scope after generating your plan.
            Regenerate with the new inputs, or keep your current plan.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={onRegenerate}
              className="h-8 px-4 text-xs font-semibold rounded-[var(--r-md)] bg-[var(--amber)] text-white hover:opacity-90 active:scale-[0.97] transition-all"
            >
              Regenerate plan ↺
            </button>
            <button
              onClick={onKeep}
              className="h-8 px-4 text-xs font-medium rounded-[var(--r-md)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-all"
            >
              Keep current plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────

export default function NewProjectPage() {
  return (
    <DataProvider>
      <NewProjectContent />
    </DataProvider>
  );
}

function NewProjectContent() {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const { locale } = useI18n();
  const addProject = useProjectStore((s) => s.addProject);
  const { loading: limitLoading, allowed: limitAllowed } = useProjectLimit();

  const [showEarlyAuthGate, setShowEarlyAuthGate] = useState(false);
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [idea, setIdea] = useState("");
  const [clarifyAnswers, setClarifyAnswers] = useState({});
  const [cachedQuestions, setCachedQuestions] = useState(null);
  const [scopeLevel, setScopeLevel] = useState("standard");
  const [blueprint, setBlueprint] = useState(null);
  const [blueprintKey, setBlueprintKey] = useState(null);

  // Generation state
  const [genStatus, setGenStatus] = useState("idle");
  const [genCharCount, setGenCharCount] = useState(0);
  const [genError, setGenError] = useState(null);

  // Refs that don't need to trigger re-renders
  const rawRef = useRef("");
  const readerRef = useRef(null);
  const rafRef = useRef(null);
  const stopWaitRef = useRef(null);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);
  const MAX_RETRIES = 2;

  // Track latest generation inputs via ref so runGeneration always reads
  // the current values without needing them in its useCallback dep array.
  const genInputsRef = useRef({
    idea,
    clarifyAnswers,
    scopeLevel,
    limitAllowed,
    locale,
  });
  useEffect(() => {
    genInputsRef.current = {
      idea,
      clarifyAnswers,
      scopeLevel,
      limitAllowed,
      locale,
    };
  }, [idea, clarifyAnswers, scopeLevel, limitAllowed, locale]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Puter credential bootstrap
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_PUTER_APP_ID;
    const authToken = process.env.NEXT_PUBLIC_PUTER_AUTH_TOKEN;
    if (!localStorage.getItem("puter.app.id") && appId)
      localStorage.setItem("puter.app.id", appId);
    if (!localStorage.getItem("puter.auth.token") && authToken)
      localStorage.setItem("puter.auth.token", authToken);
  }, []);

  // Show early auth gate if anon and over limit
  useEffect(() => {
    if (!limitLoading && !limitAllowed && !isSignedIn)
      setShowEarlyAuthGate(true);
  }, [limitLoading, limitAllowed, isSignedIn]);

  // ── Navigation helpers ────────────────────────────────────────────

  const goTo = useCallback(
    (target) => {
      if (target < 0 || target > maxReached) return;
      setStep(target);
    },
    [maxReached]
  );

  const advance = useCallback((target) => {
    setStep(target);
    setMaxReached((prev) => Math.max(prev, target));
  }, []);

  // ── Input handlers ────────────────────────────────────────────────

  const handleIdeaChange = useCallback((v) => setIdea(v), []);
  const handleClarifyChange = useCallback(
    (i, v) => setClarifyAnswers((prev) => ({ ...prev, [i]: v })),
    []
  );
  const handleScopeChange = useCallback((v) => setScopeLevel(v), []);

  // ── Blueprint staleness ───────────────────────────────────────────

  const inputKey = `${idea.trim()}||${scopeLevel}||${JSON.stringify(
    clarifyAnswers
  )}`;
  const blueprintIsStale =
    blueprint !== null && blueprintKey !== null && inputKey !== blueprintKey;
  const showRegenBanner = blueprintIsStale && (step === 2 || step === 3);

  // ── Generation cleanup ────────────────────────────────────────────

  const stopGeneration = useCallback(() => {
    // Cancel wait toasts
    if (stopWaitRef.current) {
      stopWaitRef.current();
      stopWaitRef.current = null;
    }
    // Cancel stream reader
    try {
      readerRef.current?.cancel();
    } catch {
      /* ignore */
    }
    readerRef.current = null;
    // Cancel pending rAF
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => () => stopGeneration(), [stopGeneration]);

  // ── Core generation function ──────────────────────────────────────
  // Uses genInputsRef so it always reads latest values without stale closure.
  // Stable reference — safe to call from any handler without useCallback deps.

  const runGeneration = useCallback(async () => {
    const {
      idea: currentIdea,
      clarifyAnswers: currentAnswers,
      scopeLevel: currentScope,
      limitAllowed: currentAllowed,
      locale: currentLocale,
    } = genInputsRef.current;

    if (!currentAllowed) {
      setGenStatus("limited");
      return;
    }

    stopGeneration();
    setBlueprint(null);
    setGenStatus("streaming");
    setGenCharCount(0);
    setGenError(null);
    rawRef.current = "";

    // Start wait sequence — shows timed info toasts while waiting
    stopWaitRef.current = startWaitSequence();

    try {
      const profile = loadUserProfile();
      const profileContext = buildProfileContext(profile);
      const clarifications = Object.entries(currentAnswers)
        .map(([i, answer]) => ({ question: `Q${parseInt(i) + 1}`, answer }))
        .filter((c) => c.answer?.trim());

      const stream = await generateBlueprint({
        idea: currentIdea,
        clarifications,
        scopeLevel: currentScope,
        profileContext,
        locale: currentLocale,
      });

      const reader = stream.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let firstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk =
          value instanceof Uint8Array
            ? decoder.decode(value, { stream: true })
            : typeof value === "string"
            ? value
            : "";

        if (firstChunk && chunk.length > 0) {
          firstChunk = false;
          // Cancel wait sequence — AI has responded
          if (stopWaitRef.current) {
            stopWaitRef.current();
            stopWaitRef.current = null;
          }
          toast.success("Building your plan…", { duration: 2000 });
        }

        rawRef.current += chunk;

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          if (isMountedRef.current) {
            setGenCharCount(rawRef.current.length);
          }
        });
      }

      // Clean up reader/rAF
      rafRef.current = null;
      readerRef.current = null;

      if (!isMountedRef.current) return;

      if (rawRef.current.trim().length < 50) {
        throw new Error("AI returned incomplete response. Please try again.");
      }

      const parsed = parseBlueprint(rawRef.current);
      retryCountRef.current = 0;

      // Cancel any remaining wait toasts
      if (stopWaitRef.current) {
        stopWaitRef.current();
        stopWaitRef.current = null;
      }

      // Signal 100% on the progress bar, then transition
      setGenCharCount(Infinity);
      await new Promise((r) => setTimeout(r, 300));

      if (!isMountedRef.current) return;

      toast.success("Your blueprint is ready! 🎯", { duration: 3000 });

      // Set blueprint + status + advance atomically (batched in React 18)
      setBlueprint(parsed);
      setBlueprintKey(inputKey);
      setGenStatus("done");
      // Advance to commit step — use functional updater to avoid stale closure
      setStep(4);
      setMaxReached((prev) => Math.max(prev, 4));
    } catch (e) {
      if (!isMountedRef.current) return;

      // Cancel wait toasts on any error
      if (stopWaitRef.current) {
        stopWaitRef.current();
        stopWaitRef.current = null;
      }
      readerRef.current = null;

      // Auto-retry on rate limit
      if (
        (e.code === "RATE_LIMITED" || e.status === 429) &&
        retryCountRef.current < MAX_RETRIES
      ) {
        retryCountRef.current += 1;
        const delay = 3000 * retryCountRef.current;
        toast.warn(
          `Rate limited — retrying in ${delay / 1000}s… (${
            retryCountRef.current
          }/${MAX_RETRIES})`
        );
        await new Promise((r) => setTimeout(r, delay));
        if (isMountedRef.current) runGeneration();
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

      setGenError(message);
      setGenStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopGeneration]);
  // Note: genInputsRef.current is always fresh — intentionally not in deps.
  // inputKey is read directly at the point of setBlueprintKey inside runGeneration,
  // so we capture it via closure from the outer scope where it's computed.
  // Since inputKey is derived from state, it will always be current at call time.

  // ── Generation triggers ───────────────────────────────────────────

  const handleStartGeneration = useCallback(() => {
    retryCountRef.current = 0;
    advance(3);
    runGeneration();
  }, [advance, runGeneration]);

  const handleRetryGeneration = useCallback(() => {
    retryCountRef.current = 0;
    runGeneration();
  }, [runGeneration]);

  const handleRegeneratePlan = useCallback(() => {
    retryCountRef.current = 0;
    setBlueprint(null);
    setBlueprintKey(null);
    runGeneration();
  }, [runGeneration]);

  const handleKeepPlan = useCallback(() => {
    setBlueprintKey(inputKey);
    toast.success("Keeping current plan.", { duration: 2000 });
  }, [inputKey]);

  // ── Commit ────────────────────────────────────────────────────────

  const handleCommit = useCallback(
    async ({ deadline }) => {
      if (!blueprint) {
        toast.error("Blueprint is missing. Please go back and regenerate.");
        return;
      }
      const toastId = toast.loading("Creating your project…");
      try {
        const id = await addProject({
          projectTitle: blueprint.projectTitle,
          oneLineGoal: blueprint.oneLineGoal,
          problemStatement: blueprint.problemStatement ?? "",
          targetUser: blueprint.targetUser ?? "",
          successCriteria: blueprint.successCriteria ?? [],
          scope: blueprint.scope ?? {
            mustHave: [],
            niceToHave: [],
            outOfScope: [],
          },
          scopeLevel,
          phases: blueprint.phases ?? [],
          tasks: blueprint.tasks ?? [],
          dailyNextAction: blueprint.dailyNextAction ?? "",
          blockers: blueprint.blockers ?? [],
          toolsSuggested: blueprint.toolsSuggested ?? [],
          estimatedEffort: blueprint.estimatedEffort ?? "",
          timeline: deadline || blueprint.timeline || "",
          reviewQuestions: blueprint.reviewQuestions ?? [],
        });
        toast.dismiss(toastId);
        router.push(`/project/${id}`);
      } catch (err) {
        toast.dismiss(toastId);
        toast.error(
          err?.message ?? "Failed to create project. Please try again."
        );
      }
    },
    [blueprint, scopeLevel, addProject, router]
  );

  // ── Limit gate full-page UI ───────────────────────────────────────

  if (!limitLoading && !limitAllowed && !isSignedIn) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <TopBar />
          <main className="flex-1 overflow-y-auto">
            <div className="flex items-center justify-center px-4 py-12">
              <div className="w-full max-w-md text-center flex flex-col gap-6">
                <div className="text-5xl">🎯</div>
                <div>
                  <h1 className="font-display font-bold text-2xl text-[var(--text-primary)] mb-2">
                    You've used your free project
                  </h1>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    Sign up free to create unlimited projects and access deeper
                    AI planning.
                  </p>
                </div>
                <div className="flex flex-col gap-2 mx-auto w-full max-w-xs">
                  <button
                    onClick={() => setShowEarlyAuthGate(true)}
                    className="w-full h-12 rounded-[var(--r-md)] bg-[var(--violet)] text-white font-semibold hover:bg-[var(--violet-dim)] transition-colors"
                  >
                    Create free account
                  </button>
                  <button
                    onClick={() => router.push("/")}
                    className="w-full h-10 rounded-[var(--r-md)] border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                  >
                    Back to dashboard
                  </button>
                </div>
              </div>
            </div>
          </main>
          <AuthGateModal
            open={showEarlyAuthGate}
            onClose={() => setShowEarlyAuthGate(false)}
            onContinueAnyway={() => setShowEarlyAuthGate(false)}
          />
        </div>
      </div>
    );
  }

  // ── Wizard UI ─────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />

        {/* Step breadcrumb */}
        <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {STEP_LABELS.map((label, i) => {
                const isActive = i === step;
                const isVisited = i <= maxReached;
                const isDonePast = isVisited && i < step;
                const isClickable = isVisited && !isActive;
                return (
                  <div key={i} className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      onClick={() => isClickable && goTo(i)}
                      disabled={!isClickable}
                      className={[
                        "flex items-center gap-1.5 sm:gap-2 transition-all",
                        isClickable
                          ? "cursor-pointer hover:opacity-80"
                          : "cursor-default",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300",
                          isDonePast
                            ? "bg-[var(--emerald)] text-white"
                            : isActive
                            ? "bg-[var(--violet)] text-white"
                            : isVisited
                            ? "bg-[var(--bg-muted)] text-[var(--violet-dim)] ring-1 ring-[var(--violet)]"
                            : "bg-[var(--bg-muted)] text-[var(--text-tertiary)]",
                        ].join(" ")}
                      >
                        {isDonePast ? "✓" : i + 1}
                      </div>
                      <span
                        className={`text-xs font-medium hidden sm:block transition-colors ${
                          isActive
                            ? "text-[var(--text-primary)]"
                            : isVisited
                            ? "text-[var(--text-secondary)]"
                            : "text-[var(--text-tertiary)]"
                        }`}
                      >
                        {label}
                      </span>
                    </button>
                    {i < STEP_LABELS.length - 1 && (
                      <div
                        className={`h-px w-4 sm:w-8 transition-colors duration-300 ${
                          i < step
                            ? "bg-[var(--emerald)]"
                            : "bg-[var(--border)]"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
              {blueprintIsStale && step !== 2 && step !== 3 && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[var(--amber-bg)] text-[var(--amber)] border border-[var(--amber)] whitespace-nowrap shrink-0 flex items-center gap-1">
                  <BiSolidPencil size={9} /> Edited
                </span>
              )}
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="flex items-start justify-center px-4 sm:px-6 py-8 sm:py-12">
            <div className="w-full max-w-2xl">
              {step === 0 && (
                <StepCapture
                  value={idea}
                  onChange={handleIdeaChange}
                  onNext={() => advance(1)}
                />
              )}

              {step === 1 && (
                <StepClarify
                  idea={idea}
                  answers={clarifyAnswers}
                  onChange={handleClarifyChange}
                  onNext={() => advance(2)}
                  onBack={() => goTo(0)}
                  cachedQuestions={cachedQuestions}
                  onQuestionsLoaded={setCachedQuestions}
                />
              )}

              {step === 2 && (
                <>
                  {showRegenBanner && (
                    <RegenPermissionBanner
                      onKeep={handleKeepPlan}
                      onRegenerate={handleRegeneratePlan}
                    />
                  )}
                  <StepScope
                    value={scopeLevel}
                    onChange={handleScopeChange}
                    onNext={handleStartGeneration}
                    onBack={() => goTo(1)}
                  />
                </>
              )}

              {step === 3 && (
                <>
                  {showRegenBanner && (
                    <RegenPermissionBanner
                      onKeep={handleKeepPlan}
                      onRegenerate={handleRegeneratePlan}
                    />
                  )}
                  <StepReview
                    blueprint={blueprint}
                    genStatus={genStatus}
                    genCharCount={genCharCount}
                    genError={genError}
                    scopeLevel={scopeLevel}
                    onBack={() => goTo(2)}
                    onRetry={handleRetryGeneration}
                    onCommit={(bp) => {
                      setBlueprint(bp);
                      advance(4);
                    }}
                    limitAllowed={limitAllowed}
                    limitLoading={limitLoading}
                  />
                </>
              )}

              {step === 4 && blueprint && (
                <StepCommit
                  blueprint={blueprint}
                  onBack={() => goTo(3)}
                  onConfirm={handleCommit}
                />
              )}

              {step === 4 && !blueprint && (
                <div className="flex flex-col gap-4 items-center py-12">
                  <p className="text-[var(--text-secondary)]">
                    Something went wrong. Please go back.
                  </p>
                  <button
                    onClick={() => goTo(3)}
                    className="text-[var(--violet)] hover:underline text-sm"
                  >
                    ← Back to review
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
        <SavePromptModal />
      </div>
    </div>
  );
}
