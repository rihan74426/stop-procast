"use client";

import { useState } from "react";
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

// Which steps can be navigated back to (0-indexed)
// Step 3 (Review) is only re-enterable if blueprint exists — shows cached result
function canGoToStep(targetStep, currentStep, blueprint) {
  if (targetStep >= currentStep) return false; // can't skip forward
  if (targetStep < 0) return false;
  return true;
}

function NewProjectContent() {
  const router = useRouter();
  const addProject = useProjectStore((s) => s.addProject);

  const [step, setStep] = useState(0);
  const [idea, setIdea] = useState("");
  const [clarifyAnswers, setClarifyAnswers] = useState({});
  const [cachedQuestions, setCachedQuestions] = useState(null); // cache clarify questions
  const [scopeLevel, setScopeLevel] = useState("standard");
  const [blueprint, setBlueprint] = useState(null); // cache generated blueprint

  const clarifications = Object.entries(clarifyAnswers)
    .map(([i, answer]) => ({ question: `Q${parseInt(i) + 1}`, answer }))
    .filter((c) => c.answer.trim());

  const goToStep = (target) => {
    if (!canGoToStep(target, step, blueprint)) return;
    setStep(target);
  };

  const handleBlueprintReady = (bp) => {
    setBlueprint(bp); // cache it — won't regenerate on back
    setStep(4);
  };

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
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Failed to create project. Please try again.");
    }
  };

  const handleClarifyChange = (index, value) => {
    setClarifyAnswers((prev) => ({ ...prev, [index]: value }));
  };

  return (
    <div className="min-h-screen bg-[var(--bg-surface)] flex flex-col">
      <TopBar />

      {/* Step progress — clickable dots for visited steps */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 sm:px-6 py-3 sm:py-4 sticky top-14 z-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {STEP_LABELS.map((label, i) => {
              const isActive = i === step;
              const isDone = i < step;
              const isClickable = isDone; // can go back to completed steps

              return (
                <div key={i} className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={() => isClickable && goToStep(i)}
                    disabled={!isClickable}
                    className={[
                      "flex items-center gap-1.5 sm:gap-2 transition-all",
                      isClickable
                        ? "cursor-pointer hover:opacity-80"
                        : "cursor-default",
                    ].join(" ")}
                    title={isClickable ? `Go back to ${label}` : undefined}
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
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-start justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-2xl">
          {step === 0 && (
            <StepCapture
              value={idea}
              onChange={setIdea}
              onNext={() => setStep(1)}
            />
          )}

          {step === 1 && (
            <StepClarify
              idea={idea}
              answers={clarifyAnswers}
              onChange={handleClarifyChange}
              onNext={() => setStep(2)}
              onBack={() => setStep(0)}
              cachedQuestions={cachedQuestions}
              onQuestionsLoaded={(qs) => setCachedQuestions(qs)}
            />
          )}

          {step === 2 && (
            <StepScope
              value={scopeLevel}
              onChange={setScopeLevel}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <StepReview
              idea={idea}
              clarifications={clarifications}
              scopeLevel={scopeLevel}
              cachedBlueprint={blueprint} // ← pass cache; skips re-generation if set
              onBack={() => setStep(2)}
              onCommit={handleBlueprintReady}
            />
          )}

          {step === 4 && blueprint && (
            <StepCommit
              blueprint={blueprint}
              onBack={() => setStep(3)} // goes back to Review showing cached blueprint
              onConfirm={handleCommit}
            />
          )}
        </div>
      </div>

      <SavePromptModal />
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <DataProvider>
      <NewProjectContent />
    </DataProvider>
  );
}
