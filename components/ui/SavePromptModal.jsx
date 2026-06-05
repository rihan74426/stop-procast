"use client";

import { useEffect, useState } from "react";
import { useUser, SignInButton, SignUpButton } from "@clerk/nextjs";
import { useProjectStore } from "@/lib/store/projectStore";
import { useI18n } from "@/lib/i18n";
import { FiSave } from "react-icons/fi";

export function SavePromptModal() {
  const { isSignedIn, isLoaded } = useUser();
  const { t } = useI18n();
  const projects = useProjectStore((s) => s.projects);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) return;
    if (dismissed) return;

    const seen = localStorage.getItem("sp_save_nudge_seen");
    if (seen) return;

    const hasActivity =
      projects.some((p) => p.tasks.some((t) => t.status === "done")) ||
      projects.length >= 1;

    if (hasActivity) {
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, isSignedIn, projects, dismissed]);

  const handleDismiss = () => {
    localStorage.setItem("sp_save_nudge_seen", "1");
    setDismissed(true);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 animate-[slideUp_300ms_var(--ease-spring)_both]">
      <div
        className="rounded-[var(--r-xl)] border bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)] p-5"
        style={{
          borderColor: "color-mix(in srgb, var(--violet) 50%, transparent)",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-[var(--r-md)] flex items-center justify-center shrink-0"
              style={{ background: "var(--violet-bg)" }}
            >
              <FiSave size={15} style={{ color: "var(--violet)" }} />
            </div>
            <p
              className="font-display font-semibold text-sm"
              style={{ color: "var(--text-primary)" }}
            >
              {t("save_prompt_title")}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-xl leading-none transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--text-primary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-tertiary)")
            }
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>

        <p
          className="text-sm leading-relaxed mb-4"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("save_prompt_desc")}
        </p>

        <div className="flex gap-2">
          <SignUpButton mode="modal">
            <button
              onClick={handleDismiss}
              className="flex-1 h-9 rounded-[var(--r-md)] text-white text-sm font-medium transition-colors"
              style={{ background: "var(--violet)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--violet-dim)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "var(--violet)")
              }
            >
              {t("save_prompt_signup")}
            </button>
          </SignUpButton>
          <SignInButton mode="modal">
            <button
              onClick={handleDismiss}
              className="flex-1 h-9 rounded-[var(--r-md)] border text-sm transition-colors"
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
              {t("save_prompt_signin")}
            </button>
          </SignInButton>
        </div>

        <button
          onClick={handleDismiss}
          className="w-full mt-2 text-xs py-1 transition-colors"
          style={{ color: "var(--text-tertiary)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--text-secondary)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--text-tertiary)")
          }
        >
          {t("save_prompt_continue")}
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
