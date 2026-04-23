"use client";

import { useUser, SignInButton, SignUpButton } from "@clerk/nextjs";
import { useI18n } from "@/lib/i18n";

/**
 * Shown after StepReview generates the blueprint.
 * Gates "Commit to this plan" for unauthenticated users.
 * Offers free account creation with clear value props.
 */
export function AuthGateModal({ open, onClose, onContinueAnyway }) {
  const { isSignedIn } = useUser();
  const { t } = useI18n();

  if (isSignedIn || !open) return null;

  const features = [
    { key: "auth_gate_feature_1", icon: "💾" },
    { key: "auth_gate_feature_2", icon: "📱" },
    { key: "auth_gate_feature_3", icon: "🎯" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(12,12,15,0.75)", backdropFilter: "blur(8px)" }}
    >
      <div
        className={[
          "w-full sm:max-w-md",
          "rounded-t-[var(--r-xl)] sm:rounded-[var(--r-xl)]",
          "border border-[var(--border)] bg-[var(--bg-elevated)]",
          "shadow-[var(--shadow-lg)] overflow-hidden",
        ].join(" ")}
        style={{
          animation: "gateIn 260ms cubic-bezier(0.175,0.885,0.32,1.275) both",
        }}
      >
        {/* Header band */}
        <div
          className="px-5 sm:px-6 py-5 sm:py-6"
          style={{
            background:
              "linear-gradient(135deg, var(--violet) 0%, #534ab7 100%)",
          }}
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-[var(--r-md)] bg-white/20 flex items-center justify-center shrink-0 overflow-hidden">
              <img
                src="/logo.png"
                alt="Momentum"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.parentElement.innerHTML = "🚀";
                }}
              />
            </div>
            <div>
              <p className="font-display font-bold text-white text-lg leading-tight">
                {t("auth_gate_title")}
              </p>
            </div>
          </div>
          <p className="text-white/80 text-sm leading-relaxed mt-2">
            {t("auth_gate_subtitle")}
          </p>
        </div>

        <div className="px-5 sm:px-6 py-5">
          {/* Feature list */}
          <ul className="flex flex-col gap-2.5 mb-5">
            {features.map(({ key, icon }) => (
              <li
                key={key}
                className="flex items-center gap-3 text-sm text-[var(--text-primary)]"
              >
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0"
                  style={{ background: "var(--emerald-bg)" }}
                >
                  {icon}
                </span>
                {t(key)}
              </li>
            ))}
          </ul>

          {/* CTAs */}
          <div className="flex flex-col gap-2.5">
            <SignUpButton mode="modal">
              <button
                onClick={onClose}
                className="w-full h-11 rounded-[var(--r-md)] font-semibold text-sm text-white transition-all active:scale-[0.98]"
                style={{ background: "var(--violet)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--violet-dim)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "var(--violet)")
                }
              >
                {t("auth_gate_cta_signup")}
              </button>
            </SignUpButton>

            <SignInButton mode="modal">
              <button
                onClick={onClose}
                className="w-full h-11 rounded-[var(--r-md)] border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-all"
              >
                {t("auth_gate_cta_signin")}
              </button>
            </SignInButton>

            <button
              onClick={onContinueAnyway}
              className="w-full py-2 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              {t("auth_gate_skip")}
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
