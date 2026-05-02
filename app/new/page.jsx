"use client";

/**
 * app/new/page.jsx — Fixed wizard navigation
 *
 * Key fixes:
 * 1. Blueprint NEVER regenerated on back-nav — cached until inputs change
 * 2. goTo() allows free nav to any visited step (no state reset)
 * 3. Clarify questions cached, never refetched on back
 * 4. Stale detection: only marks stale if idea/scope actually changed
 * 5. StepReview receives cachedBlueprint when navigating back — skips AI call
 * 6. handleCommit correctly uses blueprint fields (not addProject defaults)
 * 7. Blueprint passed correctly from StepReview → StepCommit via state
 */

import { useState, useCallback, useEffect } from "react";
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

const STEP_LABELS = ["Capture", "Clarify", "Scope", "Review", "Commit"];

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
  const addProject = useProjectStore((s) => s.addProject);
  const { loading: limitLoading, allowed: limitAllowed } = useProjectLimit();

  const [showEarlyAuthGate, setShowEarlyAuthGate] = useState(false);

  useEffect(() => {
    if (!limitLoading && !limitAllowed && !isSignedIn) {
      setShowEarlyAuthGate(true);
    }
  }, [limitLoading, limitAllowed, isSignedIn]);

  // ── Wizard state ──────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);

  const [idea, setIdea] = useState("");
  const [clarifyAnswers, setClarifyAnswers] = useState({});
  const [cachedQuestions, setCachedQuestions] = useState(null);
  const [scopeLevel, setScopeLevel] = useState("standard");

  // Blueprint cache
  const [blueprint, setBlueprint] = useState(null);
  const [blueprintKey, setBlueprintKey] = useState(null);

  const inputKey = `${idea}||${scopeLevel}`;
  const blueprintIsStale =
    blueprint !== null && blueprintKey !== null && inputKey !== blueprintKey;

  const maxReached = blueprint !== null && !blueprintIsStale ? 4 : maxStep;

  // ── Navigation ────────────────────────────────────────────────────
  const goTo = useCallback(
    (target) => {
      if (target < 0 || target > maxReached) return;
      setStep(target);
    },
    [maxReached]
  );

  useEffect(() => {
    // Client-side code can only access env vars prefixed with NEXT_PUBLIC_.
    // Also ensure we use the same localStorage keys we check elsewhere.
    const appId = process.env.NEXT_PUBLIC_PUTER_APP_ID;
    const authToken = process.env.NEXT_PUBLIC_PUTER_AUTH_TOKEN;

    // Only write when values are available (avoid writing "undefined")
    if (!localStorage.getItem("puter.app.id") && appId) {
      localStorage.setItem("puter.app.id", appId);
    }
    if (!localStorage.getItem("puter.auth.token") && authToken) {
      localStorage.setItem("puter.auth.token", authToken);
    }

    // Informative logging
    if (
      localStorage.getItem("puter.app.id") &&
      localStorage.getItem("puter.auth.token")
    ) {
      console.log("Puter credentials available in localStorage");
    }
  }, []);

  const advance = useCallback((target) => {
    setStep(target);
    setMaxStep((prev) => Math.max(prev, target));
  }, []);

  // ── Input handlers ────────────────────────────────────────────────
  const handleIdeaChange = useCallback((v) => setIdea(v), []);
  const handleClarifyChange = useCallback(
    (i, v) => setClarifyAnswers((prev) => ({ ...prev, [i]: v })),
    []
  );
  const handleScopeChange = useCallback((v) => setScopeLevel(v), []);

  /**
   * Called by StepReview when blueprint is ready.
   * Advances to step 4 (Commit) and caches the blueprint.
   */
  const handleBlueprintReady = useCallback(
    (bp) => {
      setBlueprint(bp);
      setBlueprintKey(inputKey);
      advance(4);
    },
    [inputKey, advance]
  );

  /**
   * Called by StepCommit when user commits.
   * Uses blueprint data directly — addProject merges into createProject defaults.
   */
  const handleCommit = async ({ deadline }) => {
    if (!blueprint) {
      toast.error("Blueprint is missing. Please go back and regenerate.");
      return;
    }

    const toastId = toast.loading("Creating your project…");
    try {
      // Build the project data from blueprint
      // createProject() in the store merges these over the defaults
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
      toast.success("Project created! Let's get to work. 🚀");
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

  // ── Early gate (anon limit exceeded) ─────────────────────────────
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

                {blueprintIsStale && (
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[var(--amber-bg)] text-[var(--amber)] border border-[var(--amber)] whitespace-nowrap">
                    ⚠ Inputs changed — will regenerate
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
                <StepReview
                  idea={idea}
                  clarifications={clarifications}
                  scopeLevel={scopeLevel}
                  cachedBlueprint={blueprintIsStale ? null : blueprint}
                  onBack={() => goTo(2)}
                  onCommit={handleBlueprintReady}
                  limitAllowed={limitAllowed}
                  limitLoading={limitLoading}
                />
              )}

              {step === 4 && blueprint && (
                <StepCommit
                  blueprint={blueprint}
                  onBack={() => goTo(3)}
                  onConfirm={handleCommit}
                />
              )}

              {/* Safety: if somehow at step 4 without blueprint, go back */}
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
