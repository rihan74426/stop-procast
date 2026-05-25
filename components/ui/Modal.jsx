"use client";

import { useEffect, useRef, useId } from "react";

export function Modal({ open, onClose, title, size = "md", children }) {
  const overlayRef = useRef(null);
  const titleId = useId();

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  if (!open) return null;

  const sizeClasses = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-lg",
    lg: "sm:max-w-2xl",
    xl: "sm:max-w-4xl",
  };

  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onClose?.()}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6"
      style={{ background: "rgba(12,12,15,0.65)", backdropFilter: "blur(6px)" }}
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? titleId : undefined}
    >
      <div
        className={[
          "w-full rounded-t-[var(--r-xl)] sm:rounded-[var(--r-xl)]",
          "border border-[var(--border)]",
          "bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)]",
          "animate-[modalIn_200ms_var(--ease-spring)_both]",
          "sm:mx-auto",
          // Max height: leave room for safe area on mobile
          "max-h-[92dvh] sm:max-h-[85vh]",
          "flex flex-col",
          sizeClasses[size] || sizeClasses.md,
        ].join(" ")}
      >
        {/* Header — sticky */}
        {title && (
          <div className="sticky top-0 z-10 bg-[var(--bg-elevated)] flex items-center justify-between px-5 sm:px-6 pt-4 pb-3 border-b border-[var(--border)] rounded-t-[var(--r-xl)] shrink-0">
            <h2
              id={titleId}
              className="text-base sm:text-lg font-display font-semibold text-[var(--text-primary)] truncate pr-4"
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-[var(--r-md)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors shrink-0"
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </div>
        )}

        {/* Body — scrollable */}
        <div
          className="px-5 sm:px-6 py-5 overflow-y-auto flex-1"
          style={{
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
          }}
        >
          {children}
        </div>

        {/* Safe area spacer for mobile */}
        <div
          className="h-safe-bottom sm:hidden shrink-0"
          style={{ height: "env(safe-area-inset-bottom, 0px)" }}
        />
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (max-width: 640px) {
          @keyframes modalIn {
            from { opacity: 0; transform: translateY(100%); }
            to   { opacity: 1; transform: translateY(0); }
          }
        }
      `}</style>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 4L4 12M4 4l8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
