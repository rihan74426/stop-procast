"use client";

import { forwardRef } from "react";

// ─── Base ─────────────────────────────────────────────────────────────
const base = [
  "inline-flex items-center justify-center font-medium rounded-[var(--r-md)] border",
  "transition-all duration-150 ease-out",
  "active:scale-[0.97]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]",
  "disabled:opacity-40 disabled:pointer-events-none",
  "select-none cursor-pointer whitespace-nowrap",
].join(" ");

// ─── Variants ─────────────────────────────────────────────────────────
const variants = {
  // Solid fill — brand violet with subtle depth
  primary:
    "bg-[var(--violet)] text-white border-transparent " +
    "shadow-[0_1px_2px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.10)] " +
    "hover:bg-[var(--violet-dim)] hover:shadow-[0_3px_10px_color-mix(in_srgb,var(--violet)_30%,transparent),inset_0_1px_0_rgba(255,255,255,0.10)] " +
    "active:shadow-none " +
    "focus-visible:ring-[var(--violet)]",

  // Outlined — clear border, no fill
  ghost:
    "bg-transparent text-[var(--text-secondary)] " +
    "border-[color-mix(in_srgb,var(--text-tertiary)_55%,transparent)] " +
    "hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] hover:border-[color-mix(in_srgb,var(--text-secondary)_60%,transparent)] " +
    "focus-visible:ring-[var(--border-focus)]",

  // Destructive — coral tint, fills on hover
  danger:
    "bg-[var(--coral-bg)] text-[var(--coral)] " +
    "border-[color-mix(in_srgb,var(--coral)_60%,transparent)] " +
    "hover:bg-[var(--coral)] hover:text-white hover:border-transparent " +
    "hover:shadow-[0_3px_10px_color-mix(in_srgb,var(--coral)_25%,transparent)] " +
    "active:shadow-none " +
    "focus-visible:ring-[var(--coral)]",

  // Positive — green fill
  emerald:
    "bg-[var(--emerald)] text-white border-transparent " +
    "shadow-[0_1px_2px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.10)] " +
    "hover:bg-[var(--emerald-dim)] hover:shadow-[0_3px_10px_color-mix(in_srgb,var(--emerald)_30%,transparent),inset_0_1px_0_rgba(255,255,255,0.10)] " +
    "active:shadow-none " +
    "focus-visible:ring-[var(--emerald)]",

  // Muted surface — tertiary action
  subtle:
    "bg-[var(--bg-subtle)] text-[var(--text-secondary)] " +
    "border-[var(--border)] " +
    "hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] " +
    "focus-visible:ring-[var(--border-focus)]",
};

// ─── Sizes ────────────────────────────────────────────────────────────
const sizes = {
  sm: "h-8  px-3     text-xs  gap-1.5 tracking-[0.01em]",
  md: "h-9  px-4     text-sm  gap-2",
  lg: "h-11 px-5 sm:px-6 text-sm sm:text-[0.9375rem] gap-2",
  icon: "h-9  w-9  p-0 text-sm  justify-center",
};

// ─── Component ────────────────────────────────────────────────────────
export const Button = forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    className = "",
    disabled,
    loading,
    children,
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        base,
        variants[variant] ?? variants.primary,
        sizes[size] ?? sizes.md,
        className,
      ].join(" ")}
      {...props}
    >
      {loading ? (
        <>
          <Spinner />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
});

// ─── Spinner ──────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg
      className="animate-spin shrink-0"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="7"
        cy="7"
        r="5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.25"
      />
      <path
        d="M7 1.5A5.5 5.5 0 0 1 12.5 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
