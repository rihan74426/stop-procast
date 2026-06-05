"use client";

import { useEffect, useRef, useId } from "react";
import { FiX } from "react-icons/fi";

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
      style={{
        background: "rgba(12,12,15,0.65)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? titleId : undefined}
    >
      <div
        className={[
          "w-full",
          "rounded-t-[var(--r-xl)] sm:rounded-[var(--r-xl)]",
          "border border-[var(--border)]",
          "bg-[var(--bg-elevated)]",
          "shadow-[0_24px_48px_rgba(0,0,0,0.18),0_8px_16px_rgba(0,0,0,0.10)]",
          "animate-[modalIn_220ms_var(--ease-spring)_both]",
          "sm:mx-auto",
          "max-h-[92dvh] sm:max-h-[85vh]",
          "flex flex-col",
          sizeClasses[size] ?? sizeClasses.md,
        ].join(" ")}
      >
        {/* ── Header ── */}
        {title && (
          <div
            className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 sm:px-6 pt-4 pb-3.5 border-b shrink-0 rounded-t-[var(--r-xl)]"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--border)",
            }}
          >
            <h2
              id={titleId}
              className="font-display font-semibold text-base sm:text-lg truncate pr-4"
              style={{ color: "var(--text-primary)" }}
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-[var(--r-md)] shrink-0 transition-colors"
              style={{
                color: "var(--text-tertiary)",
                background: "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-subtle)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-tertiary)";
              }}
              aria-label="Close"
            >
              <FiX size={16} strokeWidth={2} />
            </button>
          </div>
        )}

        {/* ── Body ── */}
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
