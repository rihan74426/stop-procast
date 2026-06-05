"use client";

import React, { useState, useCallback, memo, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { useI18n } from "@/lib/i18n";
import { createToastSequence } from "@/lib/toastSequence";
import { FaLightbulb } from "react-icons/fa";
import {
  FiCpu,
  FiMap,
  FiTarget,
  FiClipboard,
  FiAlertTriangle,
  FiTool,
  FiStar,
  FiCheck,
  FiCircle,
  FiLoader,
  FiActivity,
} from "react-icons/fi";

// ─── Stage definitions ────────────────────────────────────────────────
const STREAM_STAGES = [
  { at: 0, Icon: FiCpu, key: "blueprint_toast_analysing" },
  { at: 300, Icon: FiMap, key: "blueprint_toast_mapping" },
  { at: 800, Icon: FiTarget, key: "blueprint_toast_defining" },
  { at: 1400, Icon: FiClipboard, key: "blueprint_toast_writing" },
  { at: 2000, Icon: FiAlertTriangle, key: "blueprint_toast_blockers" },
  { at: 2600, Icon: FiTool, key: "blueprint_toast_tools" },
  { at: 3200, Icon: FiStar, key: "blueprint_toast_finalising" },
];

// ─── Scope config ─────────────────────────────────────────────────────
const SCOPE_META = {
  lean: { badge: "emerald", color: "var(--emerald)" },
  standard: { badge: "violet", color: "var(--violet)" },
  ambitious: { badge: "amber", color: "var(--amber)" },
};

const SCOPE_DISPLAY = {
  lean: {
    labelKey: "scope_lean_label",
    labelFallback: "Lean",
    hintKey: "scope_lean_hint",
    hintFallback: "2 phases · fast start",
  },
  standard: {
    labelKey: "scope_standard_label",
    labelFallback: "Standard",
    hintKey: "scope_standard_hint",
    hintFallback: "3 phases · balanced",
  },
  ambitious: {
    labelKey: "scope_ambitious_label",
    labelFallback: "Ambitious",
    hintKey: "scope_ambitious_hint",
    hintFallback: "4–5 phases · deep mode",
  },
};

function tSafe(t, key, fallback) {
  const result = t(key);
  return result && result !== key ? result : fallback;
}

// ─── Streaming progress UI ────────────────────────────────────────────
const StreamingProgress = memo(function StreamingProgress({
  charCount,
  scopeLevel,
  t,
}) {
  const scopeInfo = SCOPE_META[scopeLevel] ?? SCOPE_META.standard;
  const display = SCOPE_DISPLAY[scopeLevel] ?? SCOPE_DISPLAY.standard;
  const isDeep = scopeLevel === "ambitious";

  const scopeLabel = tSafe(t, display.labelKey, display.labelFallback);
  const scopeHint = tSafe(t, display.hintKey, display.hintFallback);
  const deepDesc = tSafe(
    t,
    "scope_deep_desc",
    "Using advanced AI for your ambitious plan — this takes a little longer"
  );
  const deepTime = tSafe(
    t,
    "scope_deep_time",
    "Deep plans usually take 30–90 seconds"
  );
  const normalTime = tSafe(
    t,
    "scope_normal_time",
    "Usually takes 15–40 seconds"
  );

  const stage =
    [...STREAM_STAGES].reverse().find((s) => charCount >= s.at) ??
    STREAM_STAGES[0];
  const Icon = stage.Icon;
  const pct =
    charCount === Infinity
      ? 100
      : Math.min(98, Math.round((charCount / 3200) * 100));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <h1
            className="text-2xl sm:text-3xl font-display font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {t("intake_review_building")}
          </h1>
          <Badge variant={scopeInfo.badge}>{scopeLabel}</Badge>
          {isDeep && (
            <Badge variant="amber">
              <FiActivity size={10} />
              {t("intake_review_deep")}
            </Badge>
          )}
        </div>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {isDeep ? deepDesc : scopeHint}
        </p>
      </div>

      {charCount === 0 && (
        <div
          className="flex items-center gap-2 text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          <div
            className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin shrink-0"
            style={{
              borderColor: "var(--violet)",
              borderTopColor: "transparent",
            }}
          />
          <span>{t("intake_review_contacting")}</span>
        </div>
      )}

      {/* Active stage card */}
      <div
        className="flex items-center gap-3 rounded-[var(--r-lg)] border px-4 py-3"
        style={{
          borderColor: "var(--violet)",
          background: "var(--violet-bg)",
        }}
      >
        <span style={{ color: "var(--violet)" }}>
          <Icon size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-medium"
            style={{ color: "var(--violet-dim)" }}
          >
            {pct === 100
              ? tSafe(t, "common_done", "Done") + "!"
              : tSafe(t, stage.key, stage.key)}
          </p>
          <div
            className="mt-1.5 h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--bg-muted)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: "var(--violet)" }}
            />
          </div>
        </div>
        <span
          className="text-xs tabular-nums shrink-0"
          style={{ color: "var(--text-tertiary)" }}
        >
          {pct}%
        </span>
      </div>

      {/* Stage grid */}
      <div className="grid grid-cols-2 gap-2">
        {STREAM_STAGES.map((s) => {
          const done = charCount >= s.at;
          const active = stage.at === s.at;
          const StageIcon = s.Icon;

          return (
            <div
              key={s.at}
              className="flex items-center gap-2 px-3 py-2 rounded-[var(--r-md)] text-xs transition-all duration-300"
              style={{
                background: done
                  ? active
                    ? "var(--violet-bg)"
                    : "transparent"
                  : "transparent",
                border:
                  done && active
                    ? "1px solid var(--violet)"
                    : "1px solid transparent",
                color: done
                  ? active
                    ? "var(--violet-dim)"
                    : "var(--emerald)"
                  : "var(--text-tertiary)",
                opacity: done ? 1 : 0.4,
              }}
            >
              <span className="shrink-0">
                {done ? (
                  active ? (
                    <FiLoader size={11} className="animate-spin" />
                  ) : (
                    <FiCheck size={11} strokeWidth={2.5} />
                  )
                ) : (
                  <FiCircle size={11} />
                )}
              </span>
              <span className="truncate">{tSafe(t, s.key, s.key)}</span>
            </div>
          );
        })}
      </div>

      <p
        className="text-xs text-center"
        style={{ color: "var(--text-tertiary)" }}
      >
        {isDeep ? deepTime : normalTime}
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
      toastSequenceRef.current?.unmount();
    };
  }, [genStatus, genError, locale, t]);

  const handleCommitClick = useCallback(() => {
    if (!isSignedIn) setShowAuthGate(true);
    else onCommit(blueprint);
  }, [isSignedIn, onCommit, blueprint]);

  const handleContinueAnyway = useCallback(() => {
    setShowAuthGate(false);
    onCommit(blueprint);
  }, [onCommit, blueprint]);

  const display = SCOPE_DISPLAY[scopeLevel] ?? SCOPE_DISPLAY.standard;
  const scopeInfo = SCOPE_META[scopeLevel] ?? SCOPE_META.standard;
  const scopeLabel = tSafe(t, display.labelKey, display.labelFallback);
  const name = user?.firstName || user?.username || null;
  const greeting = isSignedIn
    ? name
      ? `Hi ${name}! Let's build something great.`
      : "Let's do this — onward!"
    : "Hello there — ready to explore?";

  function GreetingBanner() {
    return (
      <div
        className="rounded-[var(--r-md)] border px-4 py-3 mb-4"
        style={{
          background: "var(--bg-elevated)",
          borderColor: "var(--border)",
        }}
      >
        <p
          className="text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          {greeting}
        </p>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────
  if (limitLoading && genStatus === "idle") {
    return (
      <>
        <GreetingBanner />
        <div className="flex flex-col gap-4 items-center py-12">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{
              borderColor: "var(--violet)",
              borderTopColor: "transparent",
            }}
          />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {t("common_loading")}
          </p>
        </div>
      </>
    );
  }

  // ── Limit gate ─────────────────────────────────────────────────────
  if (genStatus === "limited" || (!limitLoading && !limitAllowed)) {
    return (
      <>
        <GreetingBanner />
        <div className="flex flex-col gap-6">
          <div
            className="rounded-[var(--r-xl)] border-2 p-6 text-center"
            style={{
              borderColor: "var(--violet)",
              background: "var(--violet-bg)",
            }}
          >
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-[var(--r-xl)] mb-4"
              style={{
                background:
                  "color-mix(in srgb, var(--violet) 18%, transparent)",
              }}
            >
              <FiTarget size={26} style={{ color: "var(--violet)" }} />
            </div>
            <h2
              className="font-display font-semibold text-2xl mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              {isSignedIn
                ? t("intake_review_limit_title_authed")
                : t("intake_review_limit_title_anon")}
            </h2>
            <p
              className="text-sm leading-relaxed max-w-sm mx-auto mb-5"
              style={{ color: "var(--text-secondary)" }}
            >
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

  // ── Error ──────────────────────────────────────────────────────────
  if (genStatus === "error") {
    return (
      <>
        <GreetingBanner />
        <div className="flex flex-col gap-6">
          <div
            className="rounded-[var(--r-lg)] border p-5"
            style={{
              borderColor: "color-mix(in srgb, var(--coral) 40%, transparent)",
              background: "var(--coral-bg)",
              color: "var(--coral)",
            }}
          >
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

  // ── Streaming / idle ───────────────────────────────────────────────
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

  // ── No blueprint ───────────────────────────────────────────────────
  if (!blueprint) {
    return (
      <>
        <GreetingBanner />
        <div className="flex flex-col gap-4 items-center py-12">
          <p style={{ color: "var(--text-secondary)" }}>
            {t("intake_review_no_blueprint")}
          </p>
          <Button variant="ghost" onClick={onBack}>
            {t("common_back")}
          </Button>
        </div>
      </>
    );
  }

  // ── Done — show blueprint ──────────────────────────────────────────
  return (
    <>
      <GreetingBanner />
      <div className="flex flex-col gap-6 sm:gap-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: "var(--emerald)" }}
            />
            <span
              className="text-sm font-medium"
              style={{ color: "var(--emerald)" }}
            >
              {t("intake_review_ready")}
            </span>
            <Badge variant={scopeInfo.badge}>{scopeLabel}</Badge>
            {scopeLevel === "ambitious" && (
              <Badge variant="amber">
                <FiActivity size={10} />
                {t("intake_review_deep")}
              </Badge>
            )}
          </div>
          <h1
            className="text-2xl sm:text-3xl font-display font-semibold mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            {blueprint.projectTitle}
          </h1>
          <p
            className="text-sm sm:text-base"
            style={{ color: "var(--text-secondary)" }}
          >
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
            {scopeLabel} {t("intake_review_meta_scope")}
          </span>
          <span style={{ color: "var(--text-secondary)" }}>
            {blueprint.phases.length} {t("intake_review_meta_phases")}
          </span>
          <span style={{ color: "var(--text-secondary)" }}>
            {blueprint.tasks.length} {t("intake_review_meta_tasks")}
          </span>
          {blueprint.timeline && (
            <span style={{ color: "var(--text-secondary)" }}>
              {blueprint.timeline}
            </span>
          )}
          {blueprint.estimatedEffort && (
            <span style={{ color: "var(--text-secondary)" }}>
              {blueprint.estimatedEffort}
            </span>
          )}
        </div>

        {/* Phases */}
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: "var(--text-tertiary)" }}
          >
            {t("intake_review_phases")}
          </p>
          <div className="flex flex-col gap-2 sm:gap-3">
            {blueprint.phases.map((phase, i) => (
              <div
                key={phase.id}
                className="rounded-[var(--r-lg)] border p-3 sm:p-4"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-1.5">
                  <div
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                    style={{
                      background: "var(--violet-bg)",
                      color: "var(--violet-dim)",
                    }}
                  >
                    {i + 1}
                  </div>
                  <p
                    className="font-medium text-sm sm:text-base"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {phase.name}
                  </p>
                </div>
                <p
                  className="text-xs sm:text-sm ml-7 sm:ml-9"
                  style={{ color: "var(--text-secondary)" }}
                >
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
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--text-tertiary)" }}
            >
              {t("intake_review_success")}
            </p>
            <ul className="flex flex-col gap-1.5">
              {blueprint.successCriteria.map((c, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs sm:text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <FiCheck
                    size={13}
                    strokeWidth={2.5}
                    className="shrink-0 mt-0.5"
                    style={{ color: "var(--emerald)" }}
                  />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Challenges / blockers */}
        {blueprint.blockers?.length > 0 && (
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--text-tertiary)" }}
            >
              {t("intake_review_challenges")}
            </p>
            <ul className="flex flex-col gap-1.5">
              {blueprint.blockers.map((b, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs sm:text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <FiAlertTriangle
                    size={12}
                    className="shrink-0 mt-0.5"
                    style={{ color: "var(--amber)" }}
                  />
                  {typeof b === "string" ? b : b.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sign-in nudge */}
        {!isSignedIn && (
          <div
            className="rounded-[var(--r-md)] border px-4 py-3 flex items-start gap-3"
            style={{
              background: "var(--violet-bg)",
              borderColor: "color-mix(in srgb, var(--violet) 40%, transparent)",
            }}
          >
            <FaLightbulb
              size={15}
              className="shrink-0 mt-0.5"
              style={{ color: "var(--violet)" }}
            />
            <div>
              <p
                className="text-xs font-medium"
                style={{ color: "var(--violet-dim)" }}
              >
                {t("intake_review_signin_nudge")}
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--text-secondary)" }}
              >
                {t("intake_review_signin_desc")}{" "}
                <button
                  onClick={() => setShowAuthGate(true)}
                  className="font-medium hover:underline"
                  style={{ color: "var(--violet)" }}
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
