"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { parseBlueprint } from "@/lib/ai/parser";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { useI18n } from "@/lib/i18n";
import { getStoredModel, AI_MODELS } from "@/lib/ai/models";
import { loadUserProfile, buildProfileContext } from "@/lib/userProfile";

export function StepReview({
  idea,
  clarifications,
  scopeLevel,
  onBack,
  onCommit,
}) {
  const { isSignedIn } = useUser();
  const { t } = useI18n();

  const [raw, setRaw] = useState("");
  const [blueprint, setBlueprint] = useState(null);
  const [status, setStatus] = useState("streaming");
  const [error, setError] = useState(null);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const rawRef = useRef("");

  useEffect(() => {
    let cancelled = false;

    async function stream() {
      try {
        // ✅ Build profileContext entirely on client — send as plain string
        const modelId = getStoredModel();
        const profile = loadUserProfile();
        const profileContext = buildProfileContext(profile); // pure transform, no server call

        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "generate",
            idea,
            clarifications,
            scopeLevel,
            modelId,
            profileContext, // plain string — safe to send
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Generation failed");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;
          rawRef.current += decoder.decode(value);
          setRaw(rawRef.current);
        }

        if (!cancelled) {
          const parsed = parseBlueprint(rawRef.current);
          setBlueprint(parsed);
          setStatus("done");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          setStatus("error");
        }
      }
    }

    stream();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCommitClick = () => {
    if (!isSignedIn) {
      setShowAuthGate(true);
    } else {
      onCommit(blueprint);
    }
  };

  // ── Error state ──────────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-[var(--r-lg)] border border-[var(--coral)] bg-[var(--coral-bg)] p-5 text-[var(--coral)]">
          <p className="font-medium mb-1">Generation failed</p>
          <p className="text-sm opacity-80">{error}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onBack}>
            {t("common_back")}
          </Button>
          <Button
            onClick={() => {
              setStatus("streaming");
              setRaw("");
              setError(null);
              rawRef.current = "";
            }}
          >
            {t("common_retry")}
          </Button>
        </div>
      </div>
    );
  }

  // ── Streaming state ──────────────────────────────────────────
  if (status === "streaming") {
    const currentModel = AI_MODELS.find((m) => m.id === getStoredModel());
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[var(--text-primary)] mb-2">
            {t("intake_review_title")}
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-[var(--text-secondary)] text-sm sm:text-base">
              {t("intake_review_subtitle")}
            </p>
            {currentModel && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--violet-bg)] text-[var(--violet-dim)] font-medium shrink-0">
                {currentModel.name}
              </span>
            )}
          </div>
        </div>

        {/* Live stream display */}
        <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 font-mono text-xs text-[var(--text-tertiary)] max-h-56 sm:max-h-64 overflow-y-auto leading-relaxed">
          {raw || (
            <span className="animate-pulse text-[var(--text-tertiary)]">
              {t("intake_review_thinking")}
            </span>
          )}
          <span className="inline-block w-0.5 h-3 bg-[var(--violet)] ml-0.5 animate-pulse align-middle" />
        </div>

        {/* Animated progress hint */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-[var(--violet)]"
                style={{
                  animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite`,
                }}
              />
            ))}
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            Building your blueprint…
          </p>
        </div>

        <style>{`
          @keyframes bounce {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
            40% { transform: translateY(-4px); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // ── Done state ───────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col gap-6 sm:gap-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[var(--emerald)]" />
            <span className="text-sm text-[var(--emerald)] font-medium">
              {t("intake_review_ready")}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[var(--text-primary)] mb-1">
            {blueprint.projectTitle}
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            {blueprint.oneLineGoal}
          </p>
        </div>

        {/* Phases */}
        <div>
          <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-3">
            {t("intake_review_phases", {
              phases: blueprint.phases.length,
              tasks: blueprint.tasks.length,
              timeline: blueprint.timeline,
            })}
          </p>
          <div className="flex flex-col gap-2 sm:gap-3">
            {blueprint.phases.map((phase, i) => (
              <div
                key={phase.id}
                className="rounded-[var(--r-lg)] border border-[var(--border)] p-3 sm:p-4"
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
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
                  <div className="ml-7 sm:ml-9 mt-2 sm:mt-3 flex flex-wrap gap-1.5 sm:gap-2">
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
        {blueprint.successCriteria.length > 0 && (
          <div>
            <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-3">
              {t("intake_review_success")}
            </p>
            <ul className="flex flex-col gap-1.5 sm:gap-2">
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

        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            {t("intake_review_back")}
          </Button>
          <Button variant="emerald" size="lg" onClick={handleCommitClick}>
            {t("intake_review_commit")}
          </Button>
        </div>
      </div>

      <AuthGateModal
        open={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        onContinueAnyway={() => {
          setShowAuthGate(false);
          onCommit(blueprint);
        }}
      />
    </>
  );
}
