"use client";

import React, { useState, useCallback, memo, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { useI18n } from "@/lib/i18n";
import { createToastSequence } from "@/lib/toastSequence";
import {
  FiCpu,
  FiMap,
  FiTarget,
  FiClipboard,
  FiAlertTriangle,
  FiTool,
  FiStar,
} from "react-icons/fi";
import { FaLightbulb } from "react-icons/fa";

const STREAM_STAGES = [
  { at: 0, icon: FiCpu, key: "blueprint_toast_analysing" },
  { at: 300, icon: FiMap, key: "blueprint_toast_mapping" },
  { at: 800, icon: FiTarget, key: "blueprint_toast_defining" },
  { at: 1400, icon: FiClipboard, key: "blueprint_toast_writing" },
  { at: 2000, icon: FiAlertTriangle, key: "blueprint_toast_blockers" },
  { at: 2600, icon: FiTool, key: "blueprint_toast_tools" },
  { at: 3200, icon: FiStar, key: "blueprint_toast_finalising" },
];

const SCOPE_META = {
  lean: { badge: "emerald", color: "var(--emerald)" },
  standard: { badge: "violet", color: "var(--violet)" },
  ambitious: { badge: "amber", color: "var(--amber)" },
};

// ─── Streaming progress UI ────────────────────────────────────────────

const StreamingProgress = memo(function StreamingProgress({
  charCount,
  scopeLevel,
  t,
}) {
  const scopeInfo = SCOPE_META[scopeLevel] ?? SCOPE_META.standard;
  const isDeep = scopeLevel === "ambitious";

  // Compute which stage we are in based on char count
  const stage =
    [...STREAM_STAGES].reverse().find((s) => charCount >= s.at) ??
    STREAM_STAGES[0];
  const Icon = stage.icon;
  const pct =
    charCount === Infinity
      ? 100
      : Math.min(98, Math.round((charCount / 3200) * 100));

  const scopeLabel =
    t(`intake_scope_${scopeLevel}`) ||
    scopeLevel.charAt(0).toUpperCase() + scopeLevel.slice(1);
  const scopeHint = {
    lean: t("scope_lean_hint") || "2 phases · fast start",
    standard: t("scope_standard_hint") || "3 phases · balanced",
    ambitious: t("scope_ambitious_hint") || "4–5 phases · deep mode",
  }[scopeLevel];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[var(--text-primary)]">
            {t("intake_review_building")}
          </h1>
          <Badge variant={scopeInfo.badge}>{scopeLabel}</Badge>
          {isDeep && (
            <Badge variant="amber">🔬 {t("intake_review_deep")}</Badge>
          )}
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          {isDeep
            ? t("scope_deep_desc") ||
              "Using advanced AI for your ambitious plan — this takes a little longer"
            : scopeHint}
        </p>
      </div>

      {charCount === 0 && (
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <div className="w-3 h-3 rounded-full border-2 border-[var(--violet)] border-t-transparent animate-spin" />
          <span>{t("intake_review_contacting")}</span>
        </div>
      )}

      <div className="flex items-center gap-3 rounded-[var(--r-lg)] border border-[var(--violet)] bg-[var(--violet-bg)] px-4 py-3">
        <span className="text-xl">
          <Icon />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--violet-dim)]">
            {pct === 100 ? t("common_done") + "!" : t(stage.key) || stage.key}
          </p>
          <div className="mt-1.5 h-1.5 rounded-full bg-[var(--bg-muted)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: "var(--violet)" }}
            />
          </div>
        </div>
        <span className="text-xs text-[var(--text-tertiary)] tabular-nums shrink-0">
          {pct}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {STREAM_STAGES.map((s) => {
          const done = charCount >= s.at;
          const active = stage.at === s.at;
          return (
            <div
              key={s.at}
              className={[
                "flex items-center gap-2 px-3 py-2 rounded-[var(--r-md)] text-xs transition-all duration-300",
                done
                  ? active
                    ? "bg-[var(--violet-bg)] text-[var(--violet-dim)] border border-[var(--violet)]"
                    : "text-[var(--emerald)] opacity-75"
                  : "text-[var(--text-tertiary)] opacity-40",
              ].join(" ")}
            >
              <span className="shrink-0 text-sm">
                {done ? (active ? "⟳" : "✓") : "○"}
              </span>
              <span className="truncate">{t(s.key) || s.key}</span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-center text-[var(--text-tertiary)]">
        {isDeep
          ? t("scope_deep_time") || "Deep plans usually take 30–90 seconds"
          : t("scope_normal_time") || "Usually takes 15–40 seconds"}
      </p>
    </div>
  );
});

// ─── Main component ───────────────────────────────────────────────────

export function StepReview({
  blueprint,
  genStatus,
  genCharCount,
  genError,
  scopeLevel,
  onBack,
  onRetry,
  onCommit,
  limitAllowed,
  limitLoading,
}) {
  const { isSignedIn, user } = useUser();
  const { t, locale } = useI18n();
  const [showAuthGate, setShowAuthGate] = useState(false);
  const toastSequenceRef = useRef(null);

  // Manage toast sequence during generation — pass locale so messages are translated
  useEffect(() => {
    if (genStatus === "streaming" && !toastSequenceRef.current) {
      toastSequenceRef.current = createToastSequence("blueprint", locale);
      toastSequenceRef.current.start();
    } else if (genStatus === "done") {
      toastSequenceRef.current?.success(t("toast_blueprint_ready"));
      toastSequenceRef.current = null;
    } else if (genStatus === "error") {
      toastSequenceRef.current?.error(
        genError || t("intake_review_error_title")
      );
      toastSequenceRef.current = null;
    }

    return () => {
      if (toastSequenceRef.current) {
        toastSequenceRef.current.unmount();
      }
    };
  }, [genStatus, genError, locale, t]);

  const handleCommitClick = useCallback(() => {
    if (!isSignedIn) {
      setShowAuthGate(true);
    } else {
      onCommit(blueprint);
    }
  }, [isSignedIn, onCommit, blueprint]);

  const handleContinueAnyway = useCallback(() => {
    setShowAuthGate(false);
    onCommit(blueprint);
  }, [onCommit, blueprint]);

  // Greeting bar
  const name = user?.firstName || user?.username || null;
  const greeting = isSignedIn
    ? name
      ? `Hi ${name}! Let's build something great.`
      : "Let's do this — onward!"
    : "Hello there — ready to explore?";

  function GreetingBanner() {
    return (
      <div className="rounded-[var(--r-md)] px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border)] mb-4">
        <p className="text-sm text-[var(--text-primary)] font-medium">
          {greeting}
        </p>
      </div>
    );
  }

  // Scope labels resolved via t() with fallbacks
  const scopeLabels = {
    lean: t("scope_lean_label") || "Lean",
    standard: t("scope_standard_label") || "Standard",
    ambitious: t("scope_ambitious_label") || "Ambitious",
  };
  const scopeInfo = SCOPE_META[scopeLevel] ?? SCOPE_META.standard;

  // ── Loading while checking limit ──────────────────────────────────
  if (limitLoading && genStatus === "idle") {
    return (
      <>
        <GreetingBanner />
        <div className="flex flex-col gap-4 items-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--violet)] border-t-transparent animate-spin" />
          <p className="text-sm text-[var(--text-secondary)]">
            {t("common_loading")}
          </p>
        </div>
      </>
    );
  }

  // ── Limit gate ────────────────────────────────────────────────────
  if (genStatus === "limited" || (!limitLoading && !limitAllowed)) {
    return (
      <>
        <GreetingBanner />
        <div className="flex flex-col gap-6">
          <div className="rounded-[var(--r-xl)] border-2 border-[var(--violet)] bg-[var(--violet-bg)] p-6 text-center">
            <div className="text-5xl mb-4">🎯</div>
            <h2 className="font-display font-semibold text-2xl text-[var(--text-primary)] mb-2">
              {isSignedIn
                ? t("intake_review_limit_title_authed")
                : t("intake_review_limit_title_anon")}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto mb-5">
              {isSignedIn
                ? t("intake_review_limit_desc_authed")
                : t("intake_review_limit_desc_anon")}
            </p>
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              <Button
                variant="primary"
                size="lg"
                className="w-full justify-center"
                onClick={() => setShowAuthGate(true)}
              >
                {isSignedIn
                  ? t("intake_review_limit_upgrade")
                  : t("intake_review_limit_signup")}
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-center"
                onClick={onBack}
              >
                {t("intake_review_limit_back")}
              </Button>
            </div>
          </div>
        </div>
        <AuthGateModal
          open={showAuthGate}
          onClose={() => setShowAuthGate(false)}
          onContinueAnyway={() => setShowAuthGate(false)}
        />
      </>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────
  if (genStatus === "error") {
    return (
      <>
        <GreetingBanner />
        <div className="flex flex-col gap-6">
          <div className="rounded-[var(--r-lg)] border border-[var(--coral)] bg-[var(--coral-bg)] p-5 text-[var(--coral)]">
            <p className="font-medium mb-1">{t("intake_review_error_title")}</p>
            <p className="text-sm opacity-80">{genError}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onBack}>
              {t("common_back")}
            </Button>
            <Button onClick={onRetry}>{t("common_retry")}</Button>
          </div>
        </div>
      </>
    );
  }

  // ── Streaming / idle (waiting) ────────────────────────────────────
  if (genStatus === "streaming" || genStatus === "idle") {
    return (
      <>
        <GreetingBanner />
        <StreamingProgress
          charCount={genCharCount}
          scopeLevel={scopeLevel}
          t={t}
        />
      </>
    );
  }

  // ── Done — show blueprint ─────────────────────────────────────────
  if (!blueprint) {
    return (
      <>
        <GreetingBanner />
        <div className="flex flex-col gap-4 items-center py-12">
          <p className="text-[var(--text-secondary)]">
            {t("intake_review_no_blueprint")}
          </p>
          <Button variant="ghost" onClick={onBack}>
            {t("common_back")}
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <GreetingBanner />
      <div className="flex flex-col gap-6 sm:gap-8">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-[var(--emerald)] shrink-0" />
            <span className="text-sm text-[var(--emerald)] font-medium">
              {t("intake_review_ready")}
            </span>
            <Badge variant={scopeInfo.badge}>
              {scopeLabels[scopeLevel] || scopeLevel}
            </Badge>
            {scopeLevel === "ambitious" && (
              <Badge variant="amber">🔬 {t("intake_review_deep")}</Badge>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[var(--text-primary)] mb-1">
            {blueprint.projectTitle}
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            {blueprint.oneLineGoal}
          </p>
        </div>

        {/* Meta strip */}
        <div
          className="rounded-[var(--r-lg)] border px-4 py-3 flex flex-wrap gap-x-5 gap-y-2 text-sm"
          style={{
            borderColor: scopeInfo.color,
            background: `color-mix(in srgb, ${scopeInfo.color} 8%, transparent)`,
          }}
        >
          <span style={{ color: scopeInfo.color }} className="font-semibold">
            {scopeLabels[scopeLevel]} {t("intake_review_meta_scope")}
          </span>
          <span className="text-[var(--text-secondary)]">
            {blueprint.phases.length} {t("intake_review_meta_phases")}
          </span>
          <span className="text-[var(--text-secondary)]">
            {blueprint.tasks.length} {t("intake_review_meta_tasks")}
          </span>
          {blueprint.timeline && (
            <span className="text-[var(--text-secondary)]">
              {blueprint.timeline}
            </span>
          )}
          {blueprint.estimatedEffort && (
            <span className="text-[var(--text-secondary)]">
              {blueprint.estimatedEffort}
            </span>
          )}
        </div>

        {/* Phases */}
        <div>
          <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-3">
            {t("intake_review_phases")}
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
        {blueprint.successCriteria?.length > 0 && (
          <div>
            <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-3">
              {t("intake_review_success")}
            </p>
            <ul className="flex flex-col gap-1.5">
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

        {/* Blockers */}
        {blueprint.blockers?.length > 0 && (
          <div>
            <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-3">
              {t("intake_review_challenges")}
            </p>
            <ul className="flex flex-col gap-1.5">
              {blueprint.blockers.map((b, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs sm:text-sm text-[var(--text-secondary)]"
                >
                  <span className="text-[var(--amber)] mt-0.5 shrink-0">⚠</span>
                  {typeof b === "string" ? b : b.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sign-in nudge */}
        {!isSignedIn && (
          <div className="rounded-[var(--r-md)] bg-[var(--violet-bg)] border border-[var(--violet)] px-4 py-3 flex items-start gap-3">
            <span className="text-lg shrink-0">
              <FaLightbulb />
            </span>
            <div>
              <p className="text-xs font-medium text-[var(--violet-dim)]">
                {t("intake_review_signin_nudge")}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {t("intake_review_signin_desc")}{" "}
                <button
                  onClick={() => setShowAuthGate(true)}
                  className="text-[var(--violet)] hover:underline font-medium"
                >
                  {t("intake_review_signin_link")}
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            {t("intake_review_change_scope")}
          </Button>
          <Button variant="emerald" size="lg" onClick={handleCommitClick}>
            {t("intake_review_commit")}
          </Button>
        </div>
      </div>

      <AuthGateModal
        open={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        onContinueAnyway={handleContinueAnyway}
      />
    </>
  );
}
