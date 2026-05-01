"use client";

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
  const { isSignedIn, isLoaded } = useUser();
  const addProject = useProjectStore((s) => s.addProject);

  // Server-enforced anonymous project limit
  const { loading: limitLoading, allowed: limitAllowed } = useProjectLimit();

  // Show auth gate immediately when limit is exceeded
  // (before even entering the wizard)
  const [showEarlyAuthGate, setShowEarlyAuthGate] = useState(false);

  useEffect(() => {
    if (!limitLoading && !limitAllowed && !isSignedIn) {
      setShowEarlyAuthGate(true);
    }
  }, [limitLoading, limitAllowed, isSignedIn]);

  // ── Wizard state ─────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [idea, setIdea] = useState("");
  const [clarifyAnswers, setClarifyAnswers] = useState({});
  const [cachedQuestions, setCachedQuestions] = useState(null);
  const [scopeLevel, setScopeLevel] = useState("standard");
  const [blueprint, setBlueprint] = useState(null);
  const [blueprintSnapshot, setBlueprintSnapshot] = useState(null);

  // Snapshot of inputs at the time blueprint was generated
  const currentSnapshot = JSON.stringify({ idea, clarifyAnswers, scopeLevel });
  const blueprintIsStale =
    blueprint !== null &&
    blueprintSnapshot !== null &&
    currentSnapshot !== blueprintSnapshot;

  // Allow advancing one step forward (but don't let guests jump past Review).
  const maxReached = blueprint !== null ? 4 : Math.min(step + 1, 3);

  // ── Navigation ───────────────────────────────────────────────────
  const goTo = useCallback(
    (target) => {
      if (target < 0 || target > maxReached) return;
      setStep(target);
    },
    [maxReached]
  );

  // ── Handlers ─────────────────────────────────────────────────────
  const handleIdeaChange = useCallback((v) => setIdea(v), []);
  const handleClarifyChange = useCallback(
    (i, v) => setClarifyAnswers((prev) => ({ ...prev, [i]: v })),
    []
  );
  const handleScopeChange = useCallback((v) => setScopeLevel(v), []);

  const handleBlueprintReady = useCallback(
    (bp) => {
      setBlueprint(bp);
      setBlueprintSnapshot(currentSnapshot);
      setStep(4);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentSnapshot]
  );

  const handleCommit = async ({ deadline }) => {
    const toastId = toast.loading("Creating your project…");
    try {
      const id = await addProject({
        ...blueprint,
        scopeLevel,
        completionDate: null,
        ...(deadline ? { timeline: deadline } : {}),
      });
      toast.dismiss(toastId);
      toast.success("Project created! Let's get to work.");
      router.push(`/project/${id}`);
    } catch {
      toast.dismiss(toastId);
      toast.error("Failed to create project. Please try again.");
    }
  };

  const clarifications = Object.entries(clarifyAnswers)
    .map(([i, answer]) => ({ question: `Q${parseInt(i) + 1}`, answer }))
    .filter((c) => c.answer?.trim());

  // ── Early gate — shown on page load if already at limit ──────────
  if (!limitLoading && !limitAllowed && !isSignedIn) {
    return (
      <div className="min-h-screen bg-[var(--bg-surface)] flex flex-col">
        <TopBar />
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md text-center flex flex-col gap-6">
            <div className="text-5xl">🎯</div>
            <div>
              <h1 className="font-display font-bold text-2xl text-[var(--text-primary)] mb-2">
                You've used your free project
              </h1>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Sign up free to create unlimited projects, save your work, and
                access deeper AI planning.
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
        <AuthGateModal
          open={showEarlyAuthGate}
          onClose={() => setShowEarlyAuthGate(false)}
          onContinueAnyway={() => setShowEarlyAuthGate(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-surface)] flex flex-col">
      <TopBar />

      {/* Step progress breadcrumb */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 sm:px-6 py-3 sm:py-4 sticky top-14 z-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {STEP_LABELS.map((label, i) => {
              const isActive = i === step;
              const isDone = i <= maxReached && i !== step;
              const isClickable = i <= maxReached && i !== step;

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
                        isDone
                          ? "bg-[var(--emerald)] text-white"
                          : isActive
                          ? "bg-[var(--violet)] text-white"
                          : "bg-[var(--bg-muted)] text-[var(--text-tertiary)]",
                      ].join(" ")}
                    >
                      {isDone ? "✓" : i + 1}
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
                        i < step ? "bg-[var(--emerald)]" : "bg-[var(--border)]"
                      }`}
                    />
                  )}
                </div>
              );
            })}

            {blueprintIsStale && (
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[var(--amber-bg)] text-[var(--amber)] border border-[var(--amber)] whitespace-nowrap">
                ⚠ Edited — will regenerate
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
              onNext={() => goTo(1)}
            />
          )}

          {step === 1 && (
            <StepClarify
              idea={idea}
              answers={clarifyAnswers}
              onChange={handleClarifyChange}
              onNext={() => goTo(2)}
              onBack={() => goTo(0)}
              cachedQuestions={cachedQuestions}
              onQuestionsLoaded={setCachedQuestions}
            />
          )}

          {step === 2 && (
            <StepScope
              value={scopeLevel}
              onChange={handleScopeChange}
              onNext={() => goTo(3)}
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
        </div>
      </div>

      <SavePromptModal />
    </div>
  );
}
