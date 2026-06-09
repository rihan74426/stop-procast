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
import { TosModal } from "@/components/ui/TosModal";
import { FiCheck } from "react-icons/fi";

// ─── Auth gate overlay (shown before step 1 for unauthenticated users) ──
function CaptureAuthGate({ idea, onClose, onContinueAnyway }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{
        background: "rgba(12,12,15,0.82)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        className="w-full sm:max-w-md rounded-t-[var(--r-xl)] sm:rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)] overflow-hidden"
        style={{
          animation: "gateIn 260ms cubic-bezier(0.175,0.885,0.32,1.275) both",
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 border-b border-[var(--border)]"
          style={{
            background:
              "linear-gradient(135deg, var(--violet) 0%, #534ab7 100%)",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-[var(--r-md)] flex items-center justify-center shrink-0 text-xl"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              🚀
            </div>
            <div>
              <p className="font-display font-bold text-white text-lg leading-snug">
                Sign in to build your plan
              </p>
              <p className="text-white/75 text-sm mt-1 leading-relaxed">
                Your idea is ready. Sign in so we can generate your AI-powered
                blueprint.
              </p>
            </div>
          </div>

          {/* Idea preview pill */}
          {idea && idea.trim().length > 0 && (
            <div
              className="mt-4 px-3 py-2 rounded-[var(--r-md)] text-xs text-white/90 line-clamp-2 leading-relaxed"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >
              💡 "{idea.trim().slice(0, 120)}
              {idea.trim().length > 120 ? "…" : ""}"
            </div>
          )}
        </div>

        {/* Benefits */}
        <div className="px-6 py-5">
          <ul className="flex flex-col gap-2.5 mb-5">
            {[
              { icon: "🎯", text: "AI generates your full project blueprint" },
              { icon: "✅", text: "Track tasks, milestones & streaks" },
              { icon: "☁️", text: "Projects sync across all your devices" },
              { icon: "🆓", text: "100% free — no credit card needed" },
            ].map(({ icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-3 text-sm"
                style={{ color: "var(--text-primary)" }}
              >
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm"
                  style={{ background: "var(--emerald-bg)" }}
                >
                  {icon}
                </span>
                {text}
              </li>
            ))}
          </ul>

          {/* CTAs */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => {
                // Trigger Clerk sign-up modal via programmatic click on a hidden SignUpButton
                const btn = document.getElementById("__new_signup_trigger");
                if (btn) btn.click();
              }}
              className="w-full h-11 rounded-[var(--r-md)] font-semibold text-sm text-white transition-all active:scale-[0.97]"
              style={{ background: "var(--violet)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--violet-dim)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "var(--violet)")
              }
            >
              Create free account — 30 seconds
            </button>

            <button
              onClick={() => {
                const btn = document.getElementById("__new_signin_trigger");
                if (btn) btn.click();
              }}
              className="w-full h-11 rounded-[var(--r-md)] border text-sm transition-all"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-secondary)",
                background: "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-subtle)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              Sign in to existing account
            </button>

            <button
              onClick={onClose}
              className="w-full py-2 text-xs transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--text-secondary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-tertiary)")
              }
            >
              ← Go back and edit my idea
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes gateIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (max-width: 640px) {
          @keyframes gateIn {
            from { opacity: 0; transform: translateY(100%); }
            to   { opacity: 1; transform: translateY(0); }
          }
        }
      `}</style>
    </div>
  );
}

const STEP_LABELS_KEYS = ["Capture", "Clarify", "Scope", "Review", "Commit"];

function startWaitSequence(t) {
  const MESSAGES = [
    { after: 6000, key: "wait_thinking" },
    { after: 15000, key: "wait_switching" },
    { after: 28000, key: "wait_still_working" },
    { after: 42000, key: "wait_almost" },
  ];

  let activeToastId = null;
  const timers = [];

  MESSAGES.forEach(({ after, key }) => {
    timers.push(
      setTimeout(() => {
        if (activeToastId !== null) toast.dismiss(activeToastId);
        activeToastId = toast.info(t(key), { duration: 0 });
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

function RegenPermissionBanner({ onKeep, onRegenerate, t }) {
  return (
    <div className="mb-5 rounded-[var(--r-lg)] border-2 border-[var(--amber)] bg-[var(--amber-bg)] px-4 py-4">
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0 mt-0.5">✏️</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">
            {t("regen_banner_title")}
          </p>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">
            {t("regen_banner_desc")}
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={onRegenerate}
              className="h-8 px-4 text-xs font-semibold rounded-[var(--r-md)] bg-[var(--amber)] text-white hover:opacity-90 active:scale-[0.97] transition-all appearance-none -webkit-appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--amber)]"
            >
              {t("regen_regenerate")}
            </button>
            <button
              onClick={onKeep}
              className="h-8 px-4 text-xs font-medium rounded-[var(--r-md)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-all appearance-none -webkit-appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--border)]"
            >
              {t("regen_keep")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function stableSerializeClarifyAnswers(answers) {
  if (!answers || typeof answers !== "object") return "[]";
  const keys = Object.keys(answers)
    .filter((k) => k != null)
    .sort((a, b) => {
      const na = Number.isFinite(Number(a)) ? Number(a) : a;
      const nb = Number.isFinite(Number(b)) ? Number(b) : b;
      if (typeof na === "number" && typeof nb === "number") return na - nb;
      return String(a).localeCompare(String(b));
    });
  const arr = keys.map((k) => {
    const v = answers[k];
    if (v == null) return "";
    return String(v).replace(/\s+/g, " ").trim();
  });
  return JSON.stringify(arr);
}

function buildInputKey({
  idea = "",
  scopeLevel = "",
  clarifyAnswers = {},
  locale = "",
  limitAllowed = false,
}) {
  const ideaNorm = String(idea ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const clar = stableSerializeClarifyAnswers(clarifyAnswers);
  return `${ideaNorm}||${scopeLevel}||${clar}||${locale}||${
    limitAllowed ? "1" : "0"
  }`;
}

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
  const { locale, t } = useI18n();
  const addProject = useProjectStore((s) => s.addProject);

  // Auth gate state — shown when user tries to proceed from capture without being signed in
  const [showCaptureAuthGate, setShowCaptureAuthGate] = useState(false);
  const [pendingAdvance, setPendingAdvance] = useState(false);

  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [idea, setIdea] = useState("");
  const [clarifyAnswers, setClarifyAnswers] = useState({});
  const [cachedQuestions, setCachedQuestions] = useState(null);
  const [scopeLevel, setScopeLevel] = useState("standard");
  const [blueprint, setBlueprint] = useState(null);
  const [blueprintKey, setBlueprintKey] = useState(null);
  const [showTos, setShowTos] = useState(false);

  const [genStatus, setGenStatus] = useState("idle");
  const [genCharCount, setGenCharCount] = useState(0);
  const [genError, setGenError] = useState(null);

  const rawRef = useRef("");
  const readerRef = useRef(null);
  const rafRef = useRef(null);
  const stopWaitRef = useRef(null);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);
  const MAX_RETRIES = 2;

  const genInputsRef = useRef({ idea, clarifyAnswers, scopeLevel, locale });
  useEffect(() => {
    genInputsRef.current = { idea, clarifyAnswers, scopeLevel, locale };
  }, [idea, clarifyAnswers, scopeLevel, locale]);

  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_PUTER_APP_ID;
    const authToken = process.env.NEXT_PUBLIC_PUTER_AUTH_TOKEN;
    if (!localStorage.getItem("puter.app.id") && appId)
      localStorage.setItem("puter.app.id", appId);
    if (!localStorage.getItem("puter.auth.token") && authToken)
      localStorage.setItem("puter.auth.token", authToken);
  }, []);

  // If user just signed in while gate was showing, auto-advance
  useEffect(() => {
    if (isLoaded && isSignedIn && pendingAdvance) {
      setPendingAdvance(false);
      setShowCaptureAuthGate(false);
      advance(1);
    }
  }, [isLoaded, isSignedIn, pendingAdvance]); // eslint-disable-line

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

  // Called when user presses "Continue" from StepCapture
  // Gate fires here if not signed in
  const handleCaptureNext = useCallback(() => {
    if (!isSignedIn) {
      setPendingAdvance(true);
      setShowCaptureAuthGate(true);
      return;
    }
    advance(1);
  }, [isSignedIn, advance]);

  const handleIdeaChange = useCallback((v) => setIdea(v), []);
  const handleClarifyChange = useCallback(
    (i, v) => setClarifyAnswers((prev) => ({ ...prev, [i]: v })),
    []
  );
  const handleScopeChange = useCallback((v) => setScopeLevel(v), []);

  const inputKey = buildInputKey({
    idea,
    scopeLevel,
    clarifyAnswers,
    locale,
    limitAllowed: isSignedIn,
  });

  const blueprintIsStale =
    blueprint !== null && blueprintKey !== null && inputKey !== blueprintKey;
  const showRegenBanner = blueprintIsStale && (step === 2 || step === 3);

  const stopGeneration = useCallback(() => {
    if (stopWaitRef.current) {
      stopWaitRef.current();
      stopWaitRef.current = null;
    }
    try {
      readerRef.current?.cancel();
    } catch {}
    readerRef.current = null;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => () => stopGeneration(), [stopGeneration]);

  const runGeneration = useCallback(async () => {
    const {
      idea: currentIdea,
      clarifyAnswers: currentAnswers,
      scopeLevel: currentScope,
      locale: currentLocale,
    } = genInputsRef.current;
    const currentT = tRef.current;

    // Should not reach here if not signed in, but guard anyway
    if (!isSignedIn) {
      setPendingAdvance(true);
      setShowCaptureAuthGate(true);
      return;
    }

    stopGeneration();
    setBlueprint(null);
    setGenStatus("streaming");
    setGenCharCount(0);
    setGenError(null);
    rawRef.current = "";

    const generationInputKey = buildInputKey({
      idea: currentIdea,
      scopeLevel: currentScope,
      clarifyAnswers: currentAnswers,
      locale: currentLocale,
      limitAllowed: true,
    });

    stopWaitRef.current = startWaitSequence(currentT);

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
          if (stopWaitRef.current) {
            stopWaitRef.current();
            stopWaitRef.current = null;
          }
          toast.success(currentT("toast_building"), { duration: 2000 });
        }

        rawRef.current += chunk;

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          if (isMountedRef.current) setGenCharCount(rawRef.current.length);
        });
      }

      rafRef.current = null;
      readerRef.current = null;

      if (!isMountedRef.current) return;
      if (rawRef.current.trim().length < 50)
        throw new Error(currentT("common_error"));

      const parsed = parseBlueprint(rawRef.current);
      retryCountRef.current = 0;

      if (stopWaitRef.current) {
        stopWaitRef.current();
        stopWaitRef.current = null;
      }

      setGenCharCount(Infinity);
      await new Promise((r) => setTimeout(r, 300));
      if (!isMountedRef.current) return;

      toast.success(currentT("toast_blueprint_ready"), { duration: 3000 });

      setBlueprint(parsed);
      setBlueprintKey(generationInputKey);
      setGenStatus("done");
      setStep(4);
      setMaxReached((prev) => Math.max(prev, 4));
    } catch (e) {
      if (!isMountedRef.current) return;
      if (stopWaitRef.current) {
        stopWaitRef.current();
        stopWaitRef.current = null;
      }
      readerRef.current = null;

      if (
        (e.code === "RATE_LIMITED" || e.status === 429) &&
        retryCountRef.current < MAX_RETRIES
      ) {
        retryCountRef.current += 1;
        const delay = 3000 * retryCountRef.current;
        toast.warn(
          currentT("toast_rate_limited", {
            seconds: delay / 1000,
            count: retryCountRef.current,
            max: MAX_RETRIES,
          })
        );
        await new Promise((r) => setTimeout(r, delay));
        if (isMountedRef.current) runGeneration();
        return;
      }

      const message =
        e.code === "RATE_LIMITED" || e.status === 429
          ? currentT("wait_thinking")
          : e.code === "QUOTA_EXCEEDED" || e.status === 402
          ? "AI quota exceeded for today. Try again tomorrow."
          : e.code === "TIMEOUT" || e.status === 504
          ? "Request timed out. Please try again."
          : e?.message ?? currentT("common_error");

      setGenError(message);
      setGenStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopGeneration, isSignedIn]);

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
    setGenStatus("streaming");
    setGenCharCount(0);
    setGenError(null);
    setStep(3);
    setMaxReached((prev) => Math.max(prev, 3));
    runGeneration();
  }, [runGeneration]);

  const handleKeepPlan = useCallback(() => {
    const currentKey = buildInputKey({
      idea,
      scopeLevel,
      clarifyAnswers,
      locale,
      limitAllowed: isSignedIn,
    });
    setBlueprintKey(currentKey);
    toast.success(t("toast_keep_plan"), { duration: 2000 });
  }, [idea, scopeLevel, clarifyAnswers, locale, isSignedIn, t]);

  const handleCommit = useCallback(
    async ({ deadline }) => {
      if (!blueprint) {
        toast.error(t("toast_blueprint_missing"));
        return;
      }
      const toastId = toast.loading(t("toast_creating"));
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
        toast.error(err?.message ?? t("common_error"));
      }
    },
    [blueprint, scopeLevel, addProject, router, t]
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Hidden Clerk trigger buttons — programmatically clicked by gate overlay */}
      <div className="hidden" aria-hidden="true">
        <SignUpButtonHidden
          onSuccess={() => {
            setPendingAdvance(true);
          }}
        />
        <SignInButtonHidden
          onSuccess={() => {
            setPendingAdvance(true);
          }}
        />
      </div>

      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />

        {/* Step breadcrumb */}
        <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] px-3 sm:px-6 py-2.5 sm:py-4 sticky top-0 z-10 backdrop-blur-sm shadow-sm">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-1 sm:gap-2">
              {STEP_LABELS_KEYS.map((label, i) => {
                const isActive = i === step;
                const isVisited = i <= maxReached;
                const isDonePast = isVisited && i < step;
                const isClickable = isVisited && !isActive;
                return (
                  <div key={i} className="flex items-center gap-1 sm:gap-2">
                    <button
                      onClick={() => isClickable && goTo(i)}
                      disabled={!isClickable}
                      aria-current={isActive ? "step" : undefined}
                      aria-disabled={!isClickable}
                      style={{ borderRadius: "1.5rem", padding: "5px" }}
                      className={[
                        "flex items-center gap-1 sm:gap-1.5 transition-all p-2",
                        "appearance-none -webkit-appearance-none bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--violet)] rounded",
                        isClickable
                          ? "cursor-pointer hover:opacity-90"
                          : "cursor-default",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs sm:text-xs font-medium transition-all duration-300 shadow-sm",
                          isDonePast
                            ? "bg-[var(--emerald)] text-white"
                            : isActive
                            ? "bg-[var(--violet)] text-white"
                            : isVisited
                            ? "bg-[var(--bg-muted)] text-[var(--violet-dim)] ring-1 ring-[var(--violet)/20]"
                            : "bg-[var(--bg-muted)] text-[var(--text-tertiary)]",
                        ].join(" ")}
                        aria-hidden="true"
                      >
                        {isDonePast ? (
                          <FiCheck size={10} strokeWidth={2.5} />
                        ) : (
                          i + 1
                        )}
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
                    {i < STEP_LABELS_KEYS.length - 1 && (
                      <div
                        className={`h-px w-3 sm:w-6 transition-colors duration-300 ${
                          i < step
                            ? "bg-[var(--emerald)]"
                            : "bg-[var(--border)]"
                        }`}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                );
              })}
              {blueprintIsStale && step !== 2 && step !== 3 && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[var(--amber-bg)] text-[var(--amber)] border border-[var(--amber)] whitespace-nowrap shrink-0 flex items-center gap-1">
                  <BiSolidPencil size={9} /> Changed
                </span>
              )}
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="flex items-start justify-center px-4 sm:px-6 py-6 sm:py-12">
            <div className="w-full max-w-2xl">
              {step === 0 && (
                <StepCapture
                  value={idea}
                  onChange={handleIdeaChange}
                  onNext={handleCaptureNext}
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
                      t={t}
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
                      t={t}
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
                    limitAllowed={true}
                    limitLoading={false}
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
                    {t("intake_review_no_blueprint")}
                  </p>
                  <button
                    onClick={() => goTo(3)}
                    className="text-[var(--violet)] hover:underline text-sm"
                  >
                    {t("common_back")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>

        <TosModal
          open={showTos}
          onAccept={() => {
            setShowTos(false);
            runGeneration();
          }}
          onDecline={() => setShowTos(false)}
        />
        <SavePromptModal />
      </div>

      {/* Auth gate overlay — shown when unauthenticated user tries to proceed from capture */}
      {showCaptureAuthGate && !isSignedIn && (
        <CaptureAuthGate
          idea={idea}
          onClose={() => {
            setShowCaptureAuthGate(false);
            setPendingAdvance(false);
          }}
          onContinueAnyway={() => {
            // Not offered — user must sign in
            setShowCaptureAuthGate(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Hidden Clerk trigger wrappers ────────────────────────────────────
// These render Clerk's modal buttons invisibly so we can trigger them
// programmatically from the custom overlay.

import { SignUpButton, SignInButton } from "@clerk/nextjs";

function SignUpButtonHidden({ onSuccess }) {
  return (
    <SignUpButton mode="modal" afterSignUpUrl="/new">
      <button id="__new_signup_trigger" tabIndex={-1} aria-hidden="true">
        signup
      </button>
    </SignUpButton>
  );
}

function SignInButtonHidden({ onSuccess }) {
  return (
    <SignInButton mode="modal" afterSignInUrl="/new">
      <button id="__new_signin_trigger" tabIndex={-1} aria-hidden="true">
        signin
      </button>
    </SignInButton>
  );
}
