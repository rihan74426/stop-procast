"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { parseBlueprint } from "@/lib/ai/parser";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { useI18n } from "@/lib/i18n";
import { loadUserProfile, buildProfileContext } from "@/lib/userProfile";
import {
  canMakeRequest,
  recordRequest,
  getRemainingRequests,
} from "@/lib/ai/rateLimit";
import { toast } from "@/lib/toast";
import {
  FiCpu,
  FiMap,
  FiTarget,
  FiClipboard,
  FiAlertTriangle,
  FiTool,
  FiStar,
  FiCheck,
  FiRefreshCw,
  FiCircle,
  FiZap,
} from "react-icons/fi";

// Animated stage messages shown while the AI streams
const STREAM_STAGES = [
  { at: 0, icon: FiCpu, text: "Analysing your idea…" },
  { at: 300, icon: FiMap, text: "Mapping out phases…" },
  { at: 800, icon: FiTarget, text: "Defining success criteria…" },
  { at: 1400, icon: FiClipboard, text: "Writing tasks & milestones…" },
  { at: 2000, icon: FiAlertTriangle, text: "Identifying blockers & risks…" },
  { at: 2600, icon: FiTool, text: "Suggesting tools & resources…" },
  { at: 3200, icon: FiStar, text: "Finalising your blueprint…" },
];

function StreamingProgress({ charCount }) {
  const stage =
    [...STREAM_STAGES].reverse().find((s) => charCount >= s.at) ??
    STREAM_STAGES[0];
  const pct = Math.min(100, Math.round((charCount / 3500) * 100));

  return (
    <div className="flex flex-col gap-5">
      {/* Stage indicator */}
      <div className="flex items-center gap-3 rounded-[var(--r-lg)] border border-[var(--violet)] bg-[var(--violet-bg)] px-4 py-3">
        <span className="text-xl">
          <stage.icon />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--violet-dim)]">
            {stage.text}
          </p>
          <div className="mt-1.5 h-1.5 rounded-full bg-[var(--bg-muted)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--violet)] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-[var(--text-tertiary)] tabular-nums shrink-0">
          {pct}%
        </span>
      </div>

      {/* Stage checklist */}
      <div className="grid grid-cols-2 gap-2">
        {STREAM_STAGES.map((s) => {
          const done = charCount >= s.at;
          const active = stage.at === s.at;
          return (
            <div
              key={s.at}
              className={[
                "flex items-center gap-2 px-3 py-2 rounded-[var(--r-md)] text-xs transition-all",
                done
                  ? active
                    ? "bg-[var(--violet-bg)] text-[var(--violet-dim)] border border-[var(--violet)]"
                    : "text-[var(--emerald)] opacity-70"
                  : "text-[var(--text-tertiary)] opacity-40",
              ].join(" ")}
            >
              <span>
                {done ? active ? <FiRefreshCw /> : <FiCheck /> : <FiCircle />}
              </span>
              <span>{s.text.replace("…", "")}</span>
            </div>
          );
        })}
      </div>

      {/* Live token stream preview */}
      <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-4 font-mono text-[11px] text-[var(--text-tertiary)] max-h-32 overflow-hidden leading-relaxed relative">
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--bg-surface)] to-transparent pointer-events-none" />
        <span className="animate-pulse">Streaming blueprint</span>
        <span className="inline-block w-0.5 h-3 bg-[var(--violet)] ml-1 animate-pulse align-middle" />
      </div>

      <p className="text-xs text-center text-[var(--text-tertiary)]">
        This usually takes 20–60 seconds depending on scope
      </p>
    </div>
  );
}

const SCOPE_META = {
  lean: {
    label: "Lean",
    color: "var(--emerald)",
    badge: "emerald",
    hint: "2 phases · fast start",
  },
  standard: {
    label: "Standard",
    color: "var(--violet)",
    badge: "violet",
    hint: "3 phases · balanced",
  },
  ambitious: {
    label: "Ambitious",
    color: "var(--amber)",
    badge: "amber",
    hint: "4–5 phases · full vision",
  },
};

export function StepReview({
  idea,
  clarifications,
  scopeLevel,
  cachedBlueprint,
  onBack,
  onCommit,
}) {
  const { isSignedIn } = useUser();
  const { t } = useI18n();

  const [blueprint, setBlueprint] = useState(cachedBlueprint ?? null);
  const [charCount, setCharCount] = useState(0);
  const [status, setStatus] = useState(cachedBlueprint ? "done" : "idle");
  const [error, setError] = useState(null);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [creditGate, setCreditGate] = useState(false); // out of free credits
  const rawRef = useRef("");
  const hasStarted = useRef(false);
  const loadingToastId = useRef(null);

  useEffect(() => {
    if (cachedBlueprint) return;
    if (hasStarted.current) return;
    hasStarted.current = true;
    runGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runGeneration() {
    const remaining = getRemainingRequests("generate");

    if (remaining <= 0) {
      setCreditGate(true);
      setStatus("error");
      return;
    }

    setStatus("streaming");
    setCharCount(0);
    setError(null);
    rawRef.current = "";
    loadingToastId.current = toast.loading("Building your plan…");

    try {
      const profile = loadUserProfile();
      const profileContext = buildProfileContext(profile);

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "generate",
          idea,
          clarifications,
          scopeLevel,
          profileContext,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        toast.dismiss(loadingToastId.current);
        if (errData.code === "RATE_LIMITED") {
          toast.warn("Rate limited — retrying in 3s…");
          await new Promise((r) => setTimeout(r, 3000));
          hasStarted.current = false;
          return runGeneration();
        }
        if (errData.code === "QUOTA_EXCEEDED") {
          setCreditGate(true);
          setStatus("error");
          return;
        }
        throw new Error(errData.error ?? "Generation failed");
      }

      recordRequest("generate");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        rawRef.current += decoder.decode(value);
        setCharCount(rawRef.current.length);
      }

      const parsed = parseBlueprint(rawRef.current);
      setBlueprint(parsed);
      setStatus("done");
      toast.dismiss(loadingToastId.current);
      toast.success("Your plan is ready!");
    } catch (e) {
      toast.dismiss(loadingToastId.current);
      setError(e.message);
      setStatus("error");
    }
  }

  const handleCommitClick = () => {
    if (!isSignedIn) {
      setShowAuthGate(true);
    } else {
      onCommit(blueprint);
    }
  };

  // ── Credit gate — out of free generations ──────────────────────
  if (creditGate) {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-[var(--r-xl)] border-2 border-[var(--violet)] bg-[var(--violet-bg)] p-6 text-center">
          <div className="text-4xl mb-3">
            <FiTarget />
          </div>
          <h2 className="font-display font-semibold text-xl text-[var(--text-primary)] mb-2">
            You've used your free plan today
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto mb-4">
            Sign in for free to get more daily generations and never lose your
            work. Or come back tomorrow — your idea will still be here.
          </p>
          <div className="flex flex-col gap-2 max-w-xs mx-auto">
            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={() => setShowAuthGate(true)}
            >
              Sign in for more plans
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
        <AuthGateModal
          open={showAuthGate}
          onClose={() => setShowAuthGate(false)}
          onContinueAnyway={() => setShowAuthGate(false)}
        />
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-[var(--r-lg)] border border-[var(--coral)] bg-[var(--coral-bg)] p-5 text-[var(--coral)]">
          <p className="font-medium mb-1">Couldn't generate your plan</p>
          <p className="text-sm opacity-80">{error}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onBack}>
            {t("common_back")}
          </Button>
          <Button
            onClick={() => {
              hasStarted.current = false;
              runGeneration();
            }}
          >
            {t("common_retry")}
          </Button>
        </div>
      </div>
    );
  }

  // ── Streaming ───────────────────────────────────────────────────
  if (status === "streaming" || status === "idle") {
    const scopeInfo = SCOPE_META[scopeLevel] ?? SCOPE_META.standard;
    return (
      <div className="flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[var(--text-primary)]">
              Building your blueprint…
            </h1>
            <Badge variant={scopeInfo.badge}>{scopeInfo.label}</Badge>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            {scopeInfo.hint}
          </p>
        </div>
        <StreamingProgress charCount={charCount} />
      </div>
    );
  }

  // ── Done ────────────────────────────────────────────────────────
  const scopeInfo = SCOPE_META[scopeLevel] ?? SCOPE_META.standard;
  const remaining = getRemainingRequests("generate");

  return (
    <>
      <div className="flex flex-col gap-6 sm:gap-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[var(--emerald)]" />
            <span className="text-sm text-[var(--emerald)] font-medium">
              Blueprint ready
            </span>
            <Badge variant={scopeInfo.badge} className="ml-1">
              {scopeInfo.label}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[var(--text-primary)] mb-1">
            {blueprint.projectTitle}
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            {blueprint.oneLineGoal}
          </p>
        </div>

        {/* Scope summary */}
        <div
          className="rounded-[var(--r-lg)] border px-4 py-3 flex flex-wrap gap-4 text-sm"
          style={{
            borderColor: scopeInfo.color,
            background: `color-mix(in srgb, ${scopeInfo.color} 8%, transparent)`,
          }}
        >
          <span style={{ color: scopeInfo.color }} className="font-medium">
            {scopeInfo.label} scope
          </span>
          <span className="text-[var(--text-secondary)]">
            {blueprint.phases.length} phases
          </span>
          <span className="text-[var(--text-secondary)]">
            {blueprint.tasks.length} tasks
          </span>
          <span className="text-[var(--text-secondary)]">
            {blueprint.timeline}
          </span>
          <span className="text-[var(--text-secondary)]">
            {blueprint.estimatedEffort}
          </span>
        </div>

        {/* Phases */}
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

        {/* Success criteria */}
        {blueprint.successCriteria.length > 0 && (
          <div>
            <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-3">
              Success criteria
            </p>
            <ul className="flex flex-col gap-1.5 sm:gap-2">
              {blueprint.successCriteria.map((c, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs sm:text-sm text-[var(--text-secondary)]"
                >
                  <span className="text-[var(--emerald)] mt-0.5 shrink-0">
                    <FiCheck />
                  </span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Anticipated blockers */}
        {blueprint.blockers?.length > 0 && (
          <div>
            <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-3">
              Anticipated blockers
            </p>
            <ul className="flex flex-col gap-1.5">
              {blueprint.blockers.map((b, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs sm:text-sm text-[var(--text-secondary)]"
                >
                  <span className="text-[var(--coral)] mt-0.5 shrink-0">
                    <FiAlertTriangle />
                  </span>
                  {typeof b === "string" ? b : b.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Daily credits hint */}
        {!isSignedIn && (
          <div className="rounded-[var(--r-md)] bg-[var(--bg-subtle)] border border-[var(--border)] px-4 py-3 flex items-center gap-3">
            <span className="text-lg">
              <FiZap />
            </span>
            <p className="text-xs text-[var(--text-secondary)]">
              {remaining > 0
                ? `${remaining} free plan${
                    remaining !== 1 ? "s" : ""
                  } remaining today. `
                : "No free plans remaining today. "}
              <button
                onClick={() => setShowAuthGate(true)}
                className="text-[var(--violet)] hover:underline"
              >
                Sign in for unlimited access
              </button>
            </p>
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
        onContinueAnyway={() => {
          setShowAuthGate(false);
          onCommit(blueprint);
        }}
      />
    </>
  );
}
