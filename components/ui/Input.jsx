"use client";

import { forwardRef } from "react";

const base = [
  "w-full rounded-[var(--r-md)] border bg-[var(--bg-base)]",
  "text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]",
  "transition-all duration-150",
  "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-[var(--bg-surface)]",
  "disabled:opacity-40 disabled:cursor-not-allowed",
].join(" ");

const stateClasses = {
  default:
    "border-[color-mix(in_srgb,var(--text-tertiary)_40%,transparent)] focus:ring-[var(--violet)] focus:border-[var(--violet)]",
  error: "border-[var(--coral)]   focus:ring-[var(--coral)]",
  success: "border-[var(--emerald)] focus:ring-[var(--emerald)]",
};

export const Input = forwardRef(function Input(
  { state = "default", className = "", label, hint, error, ...props },
  ref
) {
  return (
    <Field label={label} hint={hint} error={error}>
      <input
        ref={ref}
        className={[
          base,
          stateClasses[error ? "error" : state],
          "h-10 px-3",
          className,
        ].join(" ")}
        {...props}
      />
    </Field>
  );
});

export const Textarea = forwardRef(function Textarea(
  { state = "default", className = "", label, hint, error, rows = 4, ...props },
  ref
) {
  return (
    <Field label={label} hint={hint} error={error}>
      <textarea
        ref={ref}
        rows={rows}
        className={[
          base,
          stateClasses[error ? "error" : state],
          "px-3 py-2.5 resize-none",
          className,
        ].join(" ")}
        {...props}
      />
    </Field>
  );
});

function Field({ label, hint, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          className="text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          {label}
        </label>
      )}
      {children}
      {(error || hint) && (
        <p
          className="text-xs"
          style={{ color: error ? "var(--coral)" : "var(--text-tertiary)" }}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}
