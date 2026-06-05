"use client";

import { useToastStore } from "@/lib/toast";
import {
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiInfo,
  FiLoader,
  FiX,
} from "react-icons/fi";

// ─── Icon + border per type ───────────────────────────────────────────
const TYPE_CONFIG = {
  success: {
    Icon: FiCheckCircle,
    color: "var(--emerald)",
    border: "color-mix(in srgb, var(--emerald) 35%, transparent)",
  },
  error: {
    Icon: FiXCircle,
    color: "var(--coral)",
    border: "color-mix(in srgb, var(--coral) 35%, transparent)",
  },
  warn: {
    Icon: FiAlertTriangle,
    color: "var(--amber)",
    border: "color-mix(in srgb, var(--amber) 35%, transparent)",
  },
  info: {
    Icon: FiInfo,
    color: "var(--violet)",
    border: "color-mix(in srgb, var(--violet) 35%, transparent)",
  },
  loading: {
    Icon: FiLoader,
    color: "var(--violet)",
    border: "color-mix(in srgb, var(--violet) 35%, transparent)",
    spin: true,
  },
};

// ─── ToastContainer ───────────────────────────────────────────────────
export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (!toasts.length) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className={[
        "fixed z-[100] flex flex-col gap-2 pointer-events-none",
        "bottom-20 right-3 left-3 sm:left-auto sm:bottom-5 sm:right-5",
      ].join(" ")}
      style={{ maxWidth: "min(380px, calc(100vw - 24px))" }}
    >
      {toasts.map((t) => {
        const cfg = TYPE_CONFIG[t.type] ?? TYPE_CONFIG.info;

        // Allow custom icon component override
        const IconComponent = t.customIcon ? t.customIcon : cfg.Icon;

        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-[var(--r-lg)] border"
            style={{
              background: "var(--bg-elevated)",
              borderColor: cfg.border,
              boxShadow:
                "0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
              animation: "toastIn 200ms var(--ease-spring) both",
            }}
          >
            {/* Icon */}
            <span className="shrink-0 mt-0.5">
              <IconComponent
                size={15}
                className={cfg.spin ? "animate-spin" : ""}
                style={{ color: t.customIcon ? "var(--violet)" : cfg.color }}
              />
            </span>

            {/* Message */}
            <div className="flex-1 min-w-0">
              <p
                className="text-sm leading-snug break-words"
                style={{ color: "var(--text-primary)" }}
              >
                {t.message}
              </p>

              {/* Feedback link for errors */}
              {t.type === "error" && !t.action && (
                <a
                  href="/feedback"
                  className="inline-flex items-center gap-1 mt-1 text-xs hover:underline"
                  style={{ color: "var(--violet)" }}
                >
                  Report this issue →
                </a>
              )}

              {/* Custom action */}
              {t.action && (
                <button
                  onClick={() => {
                    t.action.onClick();
                    dismiss(t.id);
                  }}
                  className="mt-1 text-xs font-medium hover:underline"
                  style={{ color: "var(--violet)" }}
                >
                  {t.action.label} →
                </button>
              )}
            </div>

            {/* Dismiss */}
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 flex items-center justify-center w-5 h-5 rounded mt-0.5 transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--text-primary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-tertiary)")
              }
              aria-label="Dismiss notification"
            >
              <FiX size={12} strokeWidth={2} />
            </button>
          </div>
        );
      })}

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
