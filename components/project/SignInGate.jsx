"use client";

/**
 * SignInGate — shown to anonymous users on project page
 * when they try to export or acquire a project.
 *
 * Drop this file at:  components/project/SignInGate.jsx
 * Then import it in   app/project/[id]/ProjectPageClient.jsx
 * replacing the inline SignInGate function.
 */

import { useUser, SignInButton, SignUpButton } from "@clerk/nextjs";
import {
  FiPackage,
  FiSend,
  FiDownload,
  FiMail,
  FiSave,
  FiCrosshair,
  FiCheckSquare,
  FiTrendingUp,
} from "react-icons/fi";
import { FaFire } from "react-icons/fa";

const EXPORT_FEATURES = [
  { Icon: FiDownload, text: "Export as PDF, Markdown, or JSON" },
  { Icon: FiMail, text: "Send the blueprint to your email" },
  { Icon: FiSave, text: "Your projects sync across all devices" },
];

const ACQUIRE_FEATURES = [
  { Icon: FiCrosshair, text: "Get your own editable copy of this plan" },
  { Icon: FiCheckSquare, text: "Check off tasks and mark milestones" },
  { Icon: FiTrendingUp, text: "Build streaks — finish what you start" },
];

export function SignInGate({
  open,
  onClose,
  context = "export",
  projectTitle,
}) {
  if (!open) return null;

  const isExport = context === "export";
  const TitleIcon = isExport ? FiPackage : FiSend;
  const features = isExport ? EXPORT_FEATURES : ACQUIRE_FEATURES;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(12,12,15,0.78)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full sm:max-w-md rounded-t-[var(--r-xl)] sm:rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)] overflow-hidden"
        style={{
          animation: "gateIn 260ms cubic-bezier(0.175,0.885,0.32,1.275) both",
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-5"
          style={{
            background:
              "linear-gradient(135deg, var(--violet) 0%, #534ab7 100%)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span
                className="flex items-center justify-center w-9 h-9 rounded-[var(--r-md)] shrink-0 mt-0.5"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                <TitleIcon size={18} color="white" />
              </span>
              <div>
                <p className="font-display font-bold text-white text-lg leading-snug">
                  {isExport
                    ? "Sign in to export"
                    : "Sign in to acquire this plan"}
                </p>
                <p className="text-white/75 text-sm mt-1 leading-relaxed">
                  {isExport
                    ? `Download the full blueprint for "${projectTitle}".`
                    : `Fork "${projectTitle}" to your dashboard and start your own execution.`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/50 hover:text-white transition-colors text-xl leading-none mt-0.5 shrink-0"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <ul className="flex flex-col gap-2 mb-5">
            {features.map(({ Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-3 text-sm"
                style={{ color: "var(--text-primary)" }}
              >
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "var(--emerald-bg)" }}
                >
                  <Icon size={13} style={{ color: "var(--emerald)" }} />
                </span>
                {text}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2.5">
            <SignUpButton mode="modal">
              <button
                onClick={onClose}
                className="w-full h-11 rounded-[var(--r-md)] font-semibold text-sm text-white transition-all active:scale-[0.97]"
                style={{ background: "var(--violet)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--violet-dim)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "var(--violet)")
                }
              >
                Create free account — it takes 30 seconds
              </button>
            </SignUpButton>

            <SignInButton mode="modal">
              <button
                onClick={onClose}
                className="w-full h-10 rounded-[var(--r-md)] border text-sm transition-all"
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
            </SignInButton>

            <button
              onClick={onClose}
              className="w-full py-1.5 text-xs transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--text-secondary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-tertiary)")
              }
            >
              Continue browsing
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
