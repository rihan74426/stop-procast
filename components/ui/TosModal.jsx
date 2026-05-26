"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { acceptTos } from "@/lib/tos";
import { useI18n } from "@/lib/i18n";

/**
 * TosModal — shown once per session before the first AI generation.
 * On accept: calls onAccept(), optionally persists if signed in.
 */
export function TosModal({ open, onAccept, onDecline }) {
  const { t } = useI18n();
  const { isSignedIn } = useUser();
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleAccept = () => {
    if (!checked) return;
    setLoading(true);
    acceptTos(isSignedIn); // persist for signed-in users
    setTimeout(() => {
      setLoading(false);
      onAccept();
    }, 200);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(12,12,15,0.75)", backdropFilter: "blur(8px)" }}
    >
      <div
        className={[
          "w-full sm:max-w-lg",
          "rounded-t-[var(--r-xl)] sm:rounded-[var(--r-xl)]",
          "border border-[var(--border)] bg-[var(--bg-elevated)]",
          "shadow-[var(--shadow-lg)] overflow-hidden",
        ].join(" ")}
        style={{
          animation: "tosIn 260ms cubic-bezier(0.175,0.885,0.32,1.275) both",
        }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--border)] bg-[var(--bg-surface)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[var(--r-md)] bg-[var(--violet-bg)] flex items-center justify-center text-lg">
              📋
            </div>
            <div>
              <h2 className="font-display font-semibold text-base text-[var(--text-primary)]">
                {t("tos_title")}
              </h2>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                {t("tos_version")}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[50vh] overflow-y-auto">
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
            {t("tos_intro")}
          </p>

          <div className="flex flex-col gap-3 mb-5">
            {[
              { icon: "🤖", key: "tos_rule_ai" },
              { icon: "🌍", key: "tos_rule_public" },
              { icon: "🚫", key: "tos_rule_abuse" },
              { icon: "🔒", key: "tos_rule_privacy" },
            ].map(({ icon, key }) => (
              <div key={key} className="flex items-start gap-3">
                <span className="text-base shrink-0 mt-0.5">{icon}</span>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {t(key)}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-[var(--r-md)] bg-[var(--bg-subtle)] border border-[var(--border)] px-4 py-3 text-xs text-[var(--text-tertiary)] leading-relaxed">
            {t("tos_full_link_note")}{" "}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--violet)] hover:underline"
            >
              {t("tos_full_link")}
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-surface)]">
          <label className="flex items-start gap-3 cursor-pointer mb-4">
            <div
              onClick={() => setChecked((c) => !c)}
              className={[
                "mt-0.5 w-5 h-5 rounded-[var(--r-sm)] border-2 flex items-center justify-center shrink-0 transition-all",
                checked
                  ? "bg-[var(--violet)] border-[var(--violet)]"
                  : "border-[var(--border)] hover:border-[var(--violet)]",
              ].join(" ")}
            >
              {checked && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M2 5l2 2 4-4"
                    stroke="white"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <span className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {t("tos_checkbox")}
            </span>
          </label>

          <div className="flex gap-2">
            <button
              onClick={onDecline}
              className="flex-1 h-10 rounded-[var(--r-md)] border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              {t("tos_decline")}
            </button>
            <button
              onClick={handleAccept}
              disabled={!checked || loading}
              className={[
                "flex-1 h-10 rounded-[var(--r-md)] text-sm font-semibold transition-all",
                checked && !loading
                  ? "bg-[var(--violet)] text-white hover:bg-[var(--violet-dim)]"
                  : "bg-[var(--bg-muted)] text-[var(--text-tertiary)] cursor-not-allowed",
              ].join(" ")}
            >
              {loading ? "…" : t("tos_accept")}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tosIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (max-width: 640px) {
          @keyframes tosIn {
            from { opacity: 0; transform: translateY(100%); }
            to   { opacity: 1; transform: translateY(0); }
          }
        }
      `}</style>
    </div>
  );
}
