"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { StepCapture } from "@/components/intake/StepCapture";
import { StepClarify } from "@/components/intake/StepClarify";
import { StepScope } from "@/components/intake/StepScope";
import { StepReview } from "@/components/intake/StepReview";
import { StepCommit } from "@/components/intake/StepCommit";
import { useProjectStore } from "@/lib/store/projectStore";
import { DataProvider } from "@/components/providers/DataProvider";
import { SavePromptModal } from "@/components/ui/SavePromptModal";
import { TopBar } from "@/components/layout/Topbar";
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
  const addProject = useProjectStore((s) => s.addProject);

  const [step, setStep] = useState(0);

  // ── Persistent state — survives all navigation ──────────────────
  const [idea, setIdea] = useState("");
  const [clarifyAnswers, setClarifyAnswers] = useState({});
  const [cachedQuestions, setCachedQuestions] = useState(null);
  const [scopeLevel, setScopeLevel] = useState("standard");
  const [blueprint, setBlueprint] = useState(null);

  // Track what was in place when the blueprint was generated
  // so we know if something changed and regeneration is needed
  const [blueprintSnapshot, setBlueprintSnapshot] = useState(null);

  // ── Dirty detection ─────────────────────────────────────────────
  const currentSnapshot = JSON.stringify({
    idea,
    clarifyAnswers,
    scopeLevel,
  });

  const blueprintIsStale =
    blueprint !== null &&
    blueprintSnapshot !== null &&
    currentSnapshot !== blueprintSnapshot;

  // ── Handlers ────────────────────────────────────────────────────
  const handleIdeaChange = useCallback((val) => setIdea(val), []);

  const handleClarifyChange = useCallback((index, value) => {
    setClarifyAnswers((prev) => ({ ...prev, [index]: value }));
  }, []);

  const handleScopeChange = useCallback((val) => setScopeLevel(val), []);

  const handleBlueprintReady = useCallback(
    (bp) => {
      setBlueprint(bp);
      setBlueprintSnapshot(currentSnapshot);
      setStep(4);
      setMaxReached(4); // mark full progress reachable when blueprint exists
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

  // ── Navigation helpers ───────────────────────────────────────────
  // Forward navigation — always allowed to visited+1 steps
  // Backward — always allowed, never resets cached data
  const [maxReached, setMaxReached] = useState(0);

  // When a blueprint exists, the user can access the commit step (4)
  const displayMax = blueprint !== null ? 4 : maxReached;
  const clickableMax = blueprint !== null ? 4 : maxReached + 1;

  const goTo = (target) => {
    if (target < 0 || target > clickableMax) return;
    setStep(target);
    if (target > maxReached) setMaxReached(target);
  };

  const clarifications = Object.entries(clarifyAnswers)
    .map(([i, answer]) => ({ question: `Q${parseInt(i) + 1}`, answer }))
    .filter((c) => c.answer?.trim());

  return (
    <div className="min-h-screen bg-[var(--bg-surface)] flex flex-col">
      <TopBar />

      {/* Step progress */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 sm:px-6 py-3 sm:py-4 sticky top-14 z-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {STEP_LABELS.map((label, i) => {
              const isActive = i === step;
              const isDone = i < step || (i <= displayMax && i !== step);
              const isClickable = i <= clickableMax && i !== step;

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
                    title={isClickable ? `Go to ${label}` : undefined}
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

            {/* Stale warning badge */}
            {blueprintIsStale && (
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[var(--amber-bg)] text-[var(--amber)] border border-[var(--amber)] whitespace-nowrap">
                ⚠ Edited — regenerate
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
              // Pass null if stale to force regeneration, else pass cache
              cachedBlueprint={blueprintIsStale ? null : blueprint}
              onBack={() => goTo(2)}
              onCommit={handleBlueprintReady}
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
