"use client";

/**
 * app/new/page.jsx
 *
 * Changes in this version:
 * 1. Edit detection: when user goes back to Step 0 or 1 and changes
 *    idea/clarifications, a banner appears on Step 2/3 asking permission
 *    to regenerate (instead of silently marking stale).
 * 2. Permission dialog: a clear modal/banner with "Keep current plan" vs
 *    "Regenerate" — no surprise regenerations.
 * 3. StepReview receives the permission state so it knows whether to
 *    re-run generation or show the cached blueprint.
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
import { toast } from "@/lib/toast";
import { Sidebar } from "@/components/layout/Sidebar";
import { BiSolidPencil } from "react-icons/bi";
import { FaRocket } from "react-icons/fa";

const STEP_LABELS = ["Capture", "Clarify", "Scope", "Review", "Commit"];

export default function NewProjectPage() {
  return (
    <DataProvider>
      <NewProjectContent />
    </DataProvider>
  );
}

// ─── Regeneration permission banner ──────────────────────────────────

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
            You edited your idea or answers after generating your plan. Do you
            want to regenerate with the updated inputs, or keep your current
            plan?
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

// ─── Main content ─────────────────────────────────────────────────────

function NewProjectContent() {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const addProject = useProjectStore((s) => s.addProject);
  const { loading: limitLoading, allowed: limitAllowed } = useProjectLimit();

  const [showEarlyAuthGate, setShowEarlyAuthGate] = useState(false);

  useEffect(() => {
    if (!limitLoading && !limitAllowed && !isSignedIn) {
      setShowEarlyAuthGate(true);
    }
  }, [limitLoading, limitAllowed, isSignedIn]);

  // ── Wizard state ─────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);

  const [idea, setIdea] = useState("");
  const [clarifyAnswers, setClarifyAnswers] = useState({});
  const [cachedQuestions, setCachedQuestions] = useState(null);
  const [scopeLevel, setScopeLevel] = useState("standard");

  // Blueprint + change tracking
  const [blueprint, setBlueprint] = useState(null);
  const [blueprintKey, setBlueprintKey] = useState(null);
  // null = no conflict; 'pending' = waiting for user decision; 'keep' | 'regen'
  const [regenDecision, setRegenDecision] = useState(null);

  // The key that was used to generate the current blueprint
  const inputKey = `${idea.trim()}||${scopeLevel}||${JSON.stringify(
    clarifyAnswers
  )}`;
  const blueprintIsStale =
    blueprint !== null && blueprintKey !== null && inputKey !== blueprintKey;

  // When blueprint becomes stale and user is on step 2 or 3 (Scope or Review), show banner
  const showRegenBanner =
    blueprintIsStale && (step === 2 || step === 3) && regenDecision === null;

  // ── Navigation ───────────────────────────────────────────────────
  const maxReached = blueprint !== null && !blueprintIsStale ? 4 : maxStep;

  const goTo = useCallback(
    (target) => {
      if (target < 0 || target > maxReached) return;
      // If navigating to step 2 or 3 and blueprint is stale, reset decision so user must choose
      if ((target === 2 || target === 3) && blueprintIsStale) {
        setRegenDecision(null);
      }
      setStep(target);
    },
    [maxReached, blueprintIsStale]
  );

  const advance = useCallback((target) => {
    setStep(target);
    setMaxStep((prev) => Math.max(prev, target));
  }, []);

  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_PUTER_APP_ID;
    const authToken = process.env.NEXT_PUBLIC_PUTER_AUTH_TOKEN;
    if (!localStorage.getItem("puter.app.id") && appId)
      localStorage.setItem("puter.app.id", appId);
    if (!localStorage.getItem("puter.auth.token") && authToken)
      localStorage.setItem("puter.auth.token", authToken);
  }, []);

  // ── Input handlers ───────────────────────────────────────────────
  const handleIdeaChange = useCallback((v) => setIdea(v), []);

  const handleClarifyChange = useCallback(
    (i, v) => setClarifyAnswers((prev) => ({ ...prev, [i]: v })),
    []
  );

  const handleScopeChange = useCallback((v) => setScopeLevel(v), []);

  /**
   * Called by StepReview when blueprint is ready (fresh generation).
   * Advances to step 4 (Commit) and caches the blueprint.
   */
  const handleBlueprintReady = useCallback(
    (bp) => {
      setBlueprint(bp);
      setBlueprintKey(inputKey);
      setRegenDecision(null);
      advance(4);
    },
    [inputKey, advance]
  );

  // User chose to keep the stale plan
  const handleKeepPlan = useCallback(() => {
    setBlueprintKey(inputKey); // treat current inputs as "accepted"
    setRegenDecision("keep");
    // small UX feedback
    toast.success("Kept current plan. Your inputs are accepted.");
  }, [inputKey]);

  // User chose to regenerate
  const handleRegenerate = useCallback(() => {
    setBlueprint(null);
    setBlueprintKey(null);
    setRegenDecision("regen");
  }, []);

  /**
   * Called by StepCommit when user commits.
   */
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
      toast.success(
        `Project created! Let's get to work. ${(
          <FaRocket className="inline" />
        )}`
      );
      router.push(`/project/${id}`);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(
        err?.message ?? "Failed to create project. Please try again."
      );
    }
  };

  const clarifications = Object.entries(clarifyAnswers)
    .map(([i, answer]) => ({ question: `Q${parseInt(i) + 1}`, answer }))
    .filter((c) => c.answer?.trim());

  // The blueprint to pass to StepReview:
  // - null if we want fresh generation (no cached blueprint OR user explicitly chose regen)
  // - blueprint if we want to show cached (either not stale, or stale but user hasn't chosen regen yet OR user chose keep)
  const reviewBlueprint =
    blueprint === null
      ? null
      : blueprintIsStale
      ? regenDecision === "regen"
        ? null
        : blueprint
      : blueprint;

  // ── Early gate ───────────────────────────────────────────────────
  if (!limitLoading && !limitAllowed && !isSignedIn) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <TopBar />
          <main className="flex-1 overflow-y-auto">
            <div className="flex-1 flex items-center justify-center px-4 py-12">
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
                <p className="text-xs text-[var(--text-tertiary)]">
                  Free account · No credit card · Unlimited projects
                </p>
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

        <main className="flex-1 overflow-y-auto">
          {/* Step breadcrumb */}
          <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-10">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-1.5 sm:gap-2">
                {STEP_LABELS.map((label, i) => {
                  const isActive = i === step;
                  const isVisited = i <= maxReached;
                  const isDone = isVisited && !isActive;
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
                            isDone && i < step
                              ? "bg-[var(--emerald)] text-white"
                              : isActive
                              ? "bg-[var(--violet)] text-white"
                              : isDone && i > step
                              ? "bg-[var(--bg-muted)] text-[var(--violet-dim)] ring-1 ring-[var(--violet)]"
                              : "bg-[var(--bg-muted)] text-[var(--text-tertiary)]",
                          ].join(" ")}
                        >
                          {isDone && i < step ? "✓" : i + 1}
                        </div>
                        <span
                          className={`text-xs font-medium hidden sm:block transition-colors ${
                            isActive
                              ? "text-[var(--text-primary)]"
                              : isDone
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

                {/* Compact stale indicator in breadcrumb (not a decision point) */}
                {blueprintIsStale && step !== 2 && step !== 3 && (
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[var(--amber-bg)] text-[var(--amber)] border border-[var(--amber)] whitespace-nowrap shrink-0">
                    <BiSolidPencil /> Edited
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Step content */}
          <div className="flex-1 flex items-start justify-center px-4 sm:px-6 py-8 sm:py-12">
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
                <StepScope
                  value={scopeLevel}
                  onChange={handleScopeChange}
                  onNext={() => advance(3)}
                  onBack={() => goTo(1)}
                />
              )}

              {step === 3 && (
                <>
                  {/* Regeneration permission banner (now shown on step 2 or 3; decision controlled by showRegenBanner) */}
                  {showRegenBanner && (
                    <RegenPermissionBanner
                      onKeep={handleKeepPlan}
                      onRegenerate={handleRegenerate}
                    />
                  )}
                  <StepReview
                    idea={idea}
                    clarifications={clarifications}
                    scopeLevel={scopeLevel}
                    cachedBlueprint={reviewBlueprint}
                    regenDecision={regenDecision} // StepReview can reflect permission state
                    onBack={() => goTo(2)}
                    onCommit={handleBlueprintReady}
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
