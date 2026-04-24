"use client";

import { useToastStore } from "@/lib/toast";

const ICONS = {
  success: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle
        cx="7.5"
        cy="7.5"
        r="6.5"
        stroke="var(--emerald)"
        strokeWidth="1.3"
      />
      <path
        d="M4.5 7.5l2 2 4-4"
        stroke="var(--emerald)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  error: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle
        cx="7.5"
        cy="7.5"
        r="6.5"
        stroke="var(--coral)"
        strokeWidth="1.3"
      />
      <path
        d="M5 5l5 5M10 5l-5 5"
        stroke="var(--coral)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  warn: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path
        d="M7.5 2L13.5 13H1.5L7.5 2z"
        stroke="var(--amber)"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 6v3M7.5 10.5v.5"
        stroke="var(--amber)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  info: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle
        cx="7.5"
        cy="7.5"
        r="6.5"
        stroke="var(--violet)"
        strokeWidth="1.3"
      />
      <path
        d="M7.5 7v4M7.5 4.5v.5"
        stroke="var(--violet)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  loading: (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      className="animate-spin"
    >
      <circle
        cx="7.5"
        cy="7.5"
        r="5.5"
        stroke="var(--violet)"
        strokeWidth="1.5"
        strokeOpacity="0.25"
      />
      <path
        d="M7.5 2A5.5 5.5 0 0 1 13 7.5"
        stroke="var(--violet)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
};

const BORDER = {
  success: "border-[var(--emerald)]",
  error: "border-[var(--coral)]",
  warn: "border-[var(--amber)]",
  info: "border-[var(--violet)]",
  loading: "border-[var(--violet)]",
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (!toasts.length) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
      style={{ maxWidth: "min(360px, calc(100vw - 32px))" }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            "pointer-events-auto flex items-start gap-3 px-4 py-3",
            "rounded-[var(--r-lg)] border bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)]",
            "animate-[toastIn_200ms_var(--ease-spring)_both]",
            BORDER[t.type] ?? BORDER.info,
          ].join(" ")}
        >
          <span className="shrink-0 mt-0.5">{ICONS[t.type]}</span>
          <p className="flex-1 text-sm text-[var(--text-primary)] leading-snug">
            {t.message}
          </p>
          {t.action && (
            <button
              onClick={() => {
                t.action.onClick();
                dismiss(t.id);
              }}
              className="shrink-0 text-xs font-medium text-[var(--violet)] hover:underline"
            >
              {t.action.label}
            </button>
          )}
          <button
            onClick={() => dismiss(t.id)}
            className="shrink-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors mt-0.5"
            aria-label="Dismiss"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M9 3L3 9M3 3l6 6"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      ))}

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
