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
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ background: "rgba(12,12,15,0.6)", backdropFilter: "blur(4px)" }}
      aria-hidden={open ? "false" : "true"}
    >
      <div
        // responsive width + full width on very small viewports
        className={[
          "w-full rounded-[var(--r-xl)] border border-[var(--border)]",
          "bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)]",
          "animate-[modalIn_200ms_var(--ease-spring)_both]",
          "mx-0 sm:mx-auto",
          "max-h-[calc(100vh-48px)]", // overall cap so modal doesn't exceed viewport (keeps some gap)
          sizeClasses[size] || sizeClasses.md,
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
      >
        {/* Header */}
        {title && (
          <div className="sticky top-0 z-10 bg-[var(--bg-elevated)] flex items-center justify-between px-6 pt-4 pb-3 border-b border-[var(--border)]">
            <h2
              id={titleId}
              className="text-lg font-display font-semibold text-[var(--text-primary)]"
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-[var(--r-md)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </div>
        )}

        {/* Body: scrollable area with smooth & native touch scrolling */}
        <div
          className="px-6 py-5 overflow-y-auto"
          style={{
            maxHeight: "calc(100vh - 120px)", // leave room for header/footer and modal gap on small screens
            WebkitOverflowScrolling: "touch",
            scrollBehavior: "smooth",
          }}
        >
          {children}
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.98) translateY(6px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        /* Thinner, subtle scrollbar for desktop when available */
        .modal-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .modal-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 999px; }
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
