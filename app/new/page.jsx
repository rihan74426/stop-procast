"use client";

/**
 * app/new/page.jsx — Intake wizard (fully connected, centrally controlled)
 *
 * Key architecture decisions:
 * 1. Generation is NEVER triggered automatically by navigation.
 *    It only fires when `shouldGenerate` changes to true (set explicitly).
 * 2. The regen permission banner appears on Step 2 (Scope) AND Step 3 (Review).
 * 3. StepReview is a pure display component — it receives a stream/blueprint,
 *    does NOT self-start generation. All AI calls live here.
 * 4. Going back never resets blueprint unless user explicitly chooses "Regen".
 */

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
import { FaRocket } from "react-icons/fa";
import { BiSolidPencil } from "react-icons/bi";

const STEP_LABELS = ["Capture", "Clarify", "Scope", "Review", "Commit"];

export default function NewProjectPage() {
  return (
    <DataProvider>
      <NewProjectContent />
    </DataProvider>
  );
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

// ─── Fallback toast sequencer ─────────────────────────────────────────
// Shows one toast every 4s while waiting. Returns a stop function.

function startFallbackToasts() {
  const MESSAGES = [
    "AI is thinking — this can take 15–40 seconds…",
    "Switching to a backup model for a faster response…",
    "Still building — complex plans take a little longer.",
    "Almost there — finalising your blueprint…",
  ];
  let index = 0;
  let timer = null;
  let stopped = false;

  function showNext() {
    if (stopped) return;
    toast.info(MESSAGES[index % MESSAGES.length], { duration: 3200 });
    index++;
    timer = setTimeout(showNext, 4000);
  }

  // First message after 8s (give AI a fair chance to start)
  timer = setTimeout(showNext, 8000);

  return function stop() {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}

// ─── Main content ─────────────────────────────────────────────────────

function NewProjectContent() {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const addProject = useProjectStore((s) => s.addProject);
  const { loading: limitLoading, allowed: limitAllowed } = useProjectLimit();

  const [showEarlyAuthGate, setShowEarlyAuthGate] = useState(false);

  // ── Wizard navigation ─────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);

  // ── Inputs ────────────────────────────────────────────────────────
  const [idea, setIdea] = useState("");
  const [clarifyAnswers, setClarifyAnswers] = useState({});
  const [cachedQuestions, setCachedQuestions] = useState(null);
  const [scopeLevel, setScopeLevel] = useState("standard");

  // ── Blueprint & generation state ──────────────────────────────────
  const [blueprint, setBlueprint] = useState(null);
  // The input fingerprint when the blueprint was last generated
  const [blueprintKey, setBlueprintKey] = useState(null);

  // Generation stream state (owned here, passed down to StepReview)
  const [genStatus, setGenStatus] = useState("idle"); // idle | streaming | done | error
  const [genCharCount, setGenCharCount] = useState(0);
  const [genError, setGenError] = useState(null);

  const rawRef = useRef("");
  const readerRef = useRef(null);
  const rafRef = useRef(null);
  const stopFallbackRef = useRef(null);
  const retryCount = useRef(0);
  const MAX_RETRIES = 2;

  // ── Input fingerprint ─────────────────────────────────────────────
  const inputKey = `${idea.trim()}||${scopeLevel}||${JSON.stringify(
    clarifyAnswers
  )}`;
  const blueprintIsStale =
    blueprint !== null && blueprintKey !== null && inputKey !== blueprintKey;

  // Show regen banner on steps 2 and 3 when stale
  const showRegenBanner = blueprintIsStale && (step === 2 || step === 3);

  // ── Puter credential injection ────────────────────────────────────
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_PUTER_APP_ID;
    const authToken = process.env.NEXT_PUBLIC_PUTER_AUTH_TOKEN;
    if (!localStorage.getItem("puter.app.id") && appId)
      localStorage.setItem("puter.app.id", appId);
    if (!localStorage.getItem("puter.auth.token") && authToken)
      localStorage.setItem("puter.auth.token", authToken);
  }, []);

  // ── Early limit gate ──────────────────────────────────────────────
  useEffect(() => {
    if (!limitLoading && !limitAllowed && !isSignedIn) {
      setShowEarlyAuthGate(true);
    }
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

  // ── Generation ────────────────────────────────────────────────────
  // Cleanup helper
  function stopGeneration() {
    if (stopFallbackRef.current) {
      stopFallbackRef.current();
      stopFallbackRef.current = null;
    }
    try {
      readerRef.current?.cancel();
    } catch {
      /* ignore */
    }
    readerRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }

  useEffect(() => {
    return () => stopGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runGeneration() {
    if (!limitAllowed) {
      setGenStatus("limited");
      return;
    }

    stopGeneration();
    setBlueprint(null);
    setGenStatus("streaming");
    setGenCharCount(0);
    setGenError(null);
    rawRef.current = "";

    // Start fallback toast sequence
    stopFallbackRef.current = startFallbackToasts();

    try {
      const profile = loadUserProfile();
      const profileContext = buildProfileContext(profile);
      const clarifications = Object.entries(clarifyAnswers)
        .map(([i, answer]) => ({ question: `Q${parseInt(i) + 1}`, answer }))
        .filter((c) => c.answer?.trim());

      const stream = await generateBlueprint({
        idea,
        clarifications,
        scopeLevel,
        profileContext,
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
          // Stop fallback toasts once AI starts responding
          if (stopFallbackRef.current) {
            stopFallbackRef.current();
            stopFallbackRef.current = null;
          }
          toast.success("AI is responding — building your plan!", {
            duration: 2500,
          });
        }

        rawRef.current += chunk;

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          setGenCharCount(rawRef.current.length);
        });
      }

      rafRef.current = null;
      readerRef.current = null;

      if (rawRef.current.trim().length < 50) {
        throw new Error("AI returned incomplete response. Please try again.");
      }

      const parsed = parseBlueprint(rawRef.current);

      retryCount.current = 0;
      if (stopFallbackRef.current) {
        stopFallbackRef.current();
        stopFallbackRef.current = null;
      }

      // Signal completion
      setGenCharCount(Infinity);
      await new Promise((r) => setTimeout(r, 300));

      toast.success("Your blueprint is ready! 🎯", { duration: 3000 });
      setBlueprint(parsed);
      setBlueprintKey(inputKey);
      setGenStatus("done");

      // Auto-advance to step 4 (Commit) when generation completes
      setStep(4);
      setMaxReached((prev) => Math.max(prev, 4));
    } catch (e) {
      if (stopFallbackRef.current) {
        stopFallbackRef.current();
        stopFallbackRef.current = null;
      }
      readerRef.current = null;

      if (
        (e.code === "RATE_LIMITED" || e.status === 429) &&
        retryCount.current < MAX_RETRIES
      ) {
        retryCount.current++;
        const delay = 3000 * retryCount.current;
        toast.warn(
          `Rate limited — retrying in ${delay / 1000}s… (${
            retryCount.current
          }/${MAX_RETRIES})`
        );
        await new Promise((r) => setTimeout(r, delay));
        runGeneration();
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
  }

  // Called when user clicks "Generate plan →" on StepScope
  const handleStartGeneration = useCallback(() => {
    retryCount.current = 0;
    advance(3);
    runGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea, clarifyAnswers, scopeLevel, limitAllowed, advance]);

  const handleRetryGeneration = useCallback(() => {
    retryCount.current = 0;
    runGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea, clarifyAnswers, scopeLevel, limitAllowed]);

  // User keeps the stale plan
  const handleKeepPlan = useCallback(() => {
    setBlueprintKey(inputKey);
    toast.success("Keeping current plan.", { duration: 2000 });
  }, [inputKey]);

  // User wants a fresh plan
  const handleRegeneratePlan = useCallback(() => {
    retryCount.current = 0;
    runGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea, clarifyAnswers, scopeLevel, limitAllowed]);

  // Called by StepCommit
  const handleCommit = async ({ deadline }) => {
    if (!blueprint) {
      toast.error("Blueprint is missing. Please go back and regenerate.");
      return;
    }
    const toastId = toast.loading("Creating your project…");
    try {
      const projectData = {
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
      };
      const id = await addProject(projectData);
      toast.dismiss(toastId);
      router.push(`/project/${id}`);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(
        err?.message ?? "Failed to create project. Please try again."
      );
    }
  };

  // ── Early gate screen ─────────────────────────────────────────────
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
                    Sign up free to create unlimited projects, save your work,
                    and access deeper AI planning.
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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />

        {/* ── Breadcrumb ── */}
        <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {STEP_LABELS.map((label, i) => {
                const isActive = i === step;
                const isVisited = i <= maxReached;
                const isDonePast = isVisited && i < step;
                const isDoneAhead = isVisited && i > step;
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
                            : isDoneAhead
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

              {/* Stale badge on non-review steps */}
              {blueprintIsStale && step !== 2 && step !== 3 && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[var(--amber-bg)] text-[var(--amber)] border border-[var(--amber)] whitespace-nowrap shrink-0 flex items-center gap-1">
                  <BiSolidPencil size={9} /> Edited
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Step content ── */}
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
