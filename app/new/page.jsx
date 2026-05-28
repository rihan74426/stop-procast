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
import { useI18n } from "@/lib/i18n";
import { BiSolidPencil } from "react-icons/bi";
import { isTosAccepted } from "@/lib/tos";
import { TosModal } from "@/components/ui/TosModal";

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

// Add stable serializer / input key builder to avoid false "stale" detections
function stableSerializeClarifyAnswers(answers) {
  // produce a deterministic array of answers based on numeric indices
  if (!answers || typeof answers !== "object") return "[]";
  const keys = Object.keys(answers)
    .filter((k) => k != null)
    .sort((a, b) => {
      // sort numerically when possible e.g. "0","1"... else lexicographic
      const na = Number.isFinite(Number(a)) ? Number(a) : a;
      const nb = Number.isFinite(Number(b)) ? Number(b) : b;
      if (typeof na === "number" && typeof nb === "number") return na - nb;
      return String(a).localeCompare(String(b));
    });
  const arr = keys.map((k) => {
    const v = answers[k];
    if (v == null) return "";
    // normalize whitespace so insignificant changes don't flip the key
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
  // include locale and allowed flag to ensure exact matching when relevant
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
  const { isSignedIn } = useUser();
  const { locale, t } = useI18n();
  const addProject = useProjectStore((s) => s.addProject);
  const { loading: limitLoading, allowed: limitAllowed } = useProjectLimit();

  const [showEarlyAuthGate, setShowEarlyAuthGate] = useState(false);
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

  const genInputsRef = useRef({
    idea,
    clarifyAnswers,
    scopeLevel,
    limitAllowed,
    locale,
  });
  useEffect(() => {
    genInputsRef.current = {
      idea,
      clarifyAnswers,
      scopeLevel,
      limitAllowed,
      locale,
    };
  }, [idea, clarifyAnswers, scopeLevel, limitAllowed, locale]);

  // Keep t() fresh
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

  useEffect(() => {
    if (!limitLoading && !limitAllowed && !isSignedIn)
      setShowEarlyAuthGate(true);
  }, [limitLoading, limitAllowed, isSignedIn]);

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

  const handleIdeaChange = useCallback((v) => setIdea(v), []);
  const handleClarifyChange = useCallback(
    (i, v) => setClarifyAnswers((prev) => ({ ...prev, [i]: v })),
    []
  );
  const handleScopeChange = useCallback((v) => setScopeLevel(v), []);

  // replace inputKey with buildInputKey to make stale detection deterministic
  const inputKey = buildInputKey({
    idea,
    scopeLevel,
    clarifyAnswers,
    locale,
    limitAllowed,
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
      limitAllowed: currentAllowed,
      locale: currentLocale,
    } = genInputsRef.current;
    const currentT = tRef.current;

    if (!currentAllowed) {
      setGenStatus("limited");
      return;
    }

    stopGeneration();
    setBlueprint(null);
    setGenStatus("streaming");
    setGenCharCount(0);
    setGenError(null);
    rawRef.current = "";

    // capture the exact input key for this generation run
    const generationInputKey = buildInputKey({
      idea: currentIdea,
      scopeLevel: currentScope,
      clarifyAnswers: currentAnswers,
      locale: currentLocale,
      limitAllowed: currentAllowed,
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

      // set the blueprintKey to the stable generation input key captured earlier
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
  }, [stopGeneration]);

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
    // When user explicitly chooses to keep the current plan, mark the blueprint
    // as matching the current inputs (use stable key) — this prevents spurious
    // stale banners caused by object key order or whitespace.
    const currentKey = buildInputKey({
      idea,
      scopeLevel,
      clarifyAnswers,
      locale,
      limitAllowed,
    });
    setBlueprintKey(currentKey);
    toast.success(t("toast_keep_plan"), { duration: 2000 });
  }, [idea, scopeLevel, clarifyAnswers, locale, limitAllowed, t]);

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

  if (!limitLoading && !limitAllowed && !isSignedIn) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <TopBar />
          <main className="flex-1 overflow-y-auto bg-[var(--bg-elevated)]">
            <div className="flex items-center justify-center px-4 py-12">
              <div className="w-full max-w-md text-center flex flex-col gap-6">
                <div className="text-5xl">🎯</div>
                <div>
                  <h1 className="font-display font-bold text-2xl text-[var(--text-primary)] mb-2">
                    {t("intake_review_limit_title_anon")}
                  </h1>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    {t("intake_review_limit_desc_anon")}
                  </p>
                </div>
                <div className="flex flex-col gap-2 mx-auto w-full max-w-xs">
                  <button
                    onClick={() => setShowEarlyAuthGate(true)}
                    className="w-full h-12 rounded-[var(--r-md)] bg-[var(--violet)] text-white font-semibold hover:bg-[var(--violet-dim)] transition-colors"
                  >
                    {t("intake_review_limit_signup")}
                  </button>
                  <button
                    onClick={() => router.push("/")}
                    className="w-full h-10 rounded-[var(--r-md)] border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                  >
                    {t("common_back")}
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

        {/* Step breadcrumb — compact on mobile */}
        <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] px-3 sm:px-6 py-2.5 sm:py-4 sticky top-0 z-10 backdrop-blur-sm shadow-sm">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-1 sm:gap-2">
              {STEP_LABELS_KEYS.map((label, i) => {
                const isActive = i === step;
                const isVisited = i <= maxReached;
                const isDonePast = isVisited && i < step;
                const isClickable = isVisited && !isActive;
                return (
                  <div key={i} className="flex items-center gap-1 sm:gap-2 ">
                    <button
                      onClick={() => isClickable && goTo(i)}
                      disabled={!isClickable}
                      aria-current={isActive ? "step" : undefined}
                      aria-disabled={!isClickable}
                      style={{
                        borderRadius: "1.5rem",
                        padding: "5px",
                      }}
                      className={[
                        "flex items-center gap-1 sm:gap-1.5 transition-all p-2",
                        // remove any default browser background and ensure consistent focus behavior
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
    </div>
  );
}
