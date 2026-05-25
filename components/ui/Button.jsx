"use client";

import { forwardRef } from "react";

/**
 * Button — variant colours use CSS design tokens so they automatically
 * adapt between light and dark mode without going all-black / all-white.
 *
 * primary  → violet fill (brand action)
 * ghost    → transparent + border, text-secondary (secondary action)
 * danger   → coral tint fill, coral text → coral fill + white on hover
 * emerald  → green fill (positive / completion)
 * subtle   → muted surface, secondary text (tertiary action)
 */

const variants = {
  primary: [
    "bg-[var(--violet)] text-white",
    "hover:bg-[var(--violet-dim)]",
    "border-transparent",
  ],
  ghost: [
    "bg-transparent text-[var(--text-secondary)]",
    "hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]",
    "border-[var(--border)]",
  ],
  danger: [
    "bg-[var(--coral-bg)] text-[var(--coral)]",
    "hover:bg-[var(--coral)] hover:text-white",
    "border-[var(--coral)]",
  ],
  emerald: [
    "bg-[var(--emerald)] text-white",
    "hover:bg-[var(--emerald-dim)]",
    "border-transparent",
  ],
  subtle: [
    "bg-[var(--bg-subtle)] text-[var(--text-secondary)]",
    "hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]",
    "border-transparent",
  ],
};

const sizes = {
  sm: "h-9  px-3          text-sm  gap-1.5",
  md: "h-10 px-4          text-sm  gap-2",
  lg: "h-11 sm:h-12 px-5 sm:px-6 text-sm sm:text-base gap-2 sm:gap-2.5",
  icon: "h-9  w-9 p-0       text-sm  justify-center",
};

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
  const vArr = variants[variant] ?? variants.primary;
  const s = sizes[size] ?? sizes.md;

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        // layout + shape
        "inline-flex items-center justify-center font-medium rounded-[var(--r-md)] border",
        // motion
        "transition-all duration-[var(--dur-base)] ease-[var(--ease-smooth)]",
        "active:scale-[0.97]",
        // focus
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-1",
        // disabled
        "disabled:opacity-40 disabled:pointer-events-none",
        // base
        "select-none cursor-pointer min-h-[36px]",
        // variant tokens
        ...vArr,
        // size
        s,
        // caller overrides (last, highest specificity)
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
        strokeOpacity="0.3"
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
