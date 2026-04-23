"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepCapture } from "@/components/intake/StepCapture";
import { StepClarify } from "@/components/intake/StepClarify";
import { StepScope } from "@/components/intake/StepScope";
import { StepReview } from "@/components/intake/StepReview";
import { StepCommit } from "@/components/intake/StepCommit";
import { AuthGateModal } from "@/components/ui/AuthGateModal";
import { useProjectStore } from "@/lib/store/projectStore";
import { DataProvider } from "@/components/providers/DataProvider";
import { SavePromptModal } from "@/components/ui/SavePromptModal";
import { useI18n } from "@/lib/i18n/context";

const STEPS = ["Capture", "Clarify", "Scope", "Review", "Commit"];

function NewProjectContent() {
  const router = useRouter();
  const { t } = useI18n();
  const addProject = useProjectStore((s) => s.addProject);

  const [step, setStep] = useState(0);
  const [idea, setIdea] = useState("");
  const [clarifyAnswers, setClarifyAnswers] = useState({});
  const [scopeLevel, setScopeLevel] = useState("standard");
  const [blueprint, setBlueprint] = useState(null);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [pendingBlueprint, setPendingBlueprint] = useState(null);

  const clarifications = Object.entries(clarifyAnswers)
    .map(([i, answer]) => ({ question: `Q${parseInt(i) + 1}`, answer }))
    .filter((c) => c.answer.trim());

  // Called when user hits "Commit to this plan" in StepReview
  const handleBlueprintReady = (bp) => {
    setPendingBlueprint(bp);
    setBlueprint(bp);
    setStep(4);
  };

  const handleCommit = async ({ deadline }) => {
    const bp = blueprint || pendingBlueprint;
    const id = await addProject({
      ...bp,
      scopeLevel,
      completionDate: null,
      ...(deadline ? { timeline: deadline } : {}),
    });
    router.push(`/project/${id}`);
  };

  // Show auth gate when user tries to start project (step commit)
  const handleCommitWithAuthCheck = (commitData) => {
    // Store commitData and run handleCommit
    handleCommit(commitData);
  };

  const handleClarifyChange = (index, value) => {
    setClarifyAnswers((prev) => ({ ...prev, [index]: value }));
  };

  const stepLabels = ["Capture", "Clarify", "Scope", "Review", "Commit"];

  return (
    <div className="min-h-screen bg-[var(--bg-surface)] flex flex-col">
      {/* Progress header */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {stepLabels.map((label, i) => (
              <div key={i} className="flex items-center gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div
                    className={[
                      "w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300",
                      i < step
                        ? "bg-[var(--emerald)] text-white"
                        : i === step
                        ? "bg-[var(--violet)] text-white"
                        : "bg-[var(--bg-muted)] text-[var(--text-tertiary)]",
                    ].join(" ")}
                  >
                    {i < step ? "✓" : i + 1}
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:block ${
                      i === step
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-tertiary)]"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div
                    className={`h-px w-4 sm:w-8 transition-colors duration-300 ${
                      i < step ? "bg-[var(--emerald)]" : "bg-[var(--border)]"
                    }`}
                  />
                )}
              </div>
            ))}
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
              onBack={() => setStep(2)}
              onCommit={handleBlueprintReady}
            />
          )}
          {step === 4 && blueprint && (
            <StepCommit
              blueprint={blueprint}
              onBack={() => setStep(3)}
              onConfirm={(commitData) => {
                // Show auth gate before final commit
                setShowAuthGate(true);
                // Store commit data
                window._pendingCommit = commitData;
              }}
            />
          )}
        </div>
      </div>

      {/* Auth Gate Modal */}
      <AuthGateModal
        open={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        onContinue={() => {
          setShowAuthGate(false);
          handleCommit(window._pendingCommit || {});
        }}
      />

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
