"use client";

import { forwardRef } from "react";

const variants = {
  primary: {
    base: "bg-[var(--violet)] text-white hover:bg-[var(--violet-dim)] active:scale-[0.97]",
    border: "border-transparent",
  },
  ghost: {
    base: "bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] active:scale-[0.97]",
    border: "border-[var(--border)]",
  },
  danger: {
    base: "bg-[var(--coral-bg)] text-[var(--coral)] hover:bg-[var(--coral)] hover:text-white active:scale-[0.97]",
    border: "border-[var(--coral)]",
  },
  emerald: {
    base: "bg-[var(--emerald)] text-white hover:bg-[var(--emerald-dim)] active:scale-[0.97]",
    border: "border-transparent",
  },
  subtle: {
    base: "bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] active:scale-[0.97]",
    border: "border-transparent",
  },
};

const sizes = {
  sm: "h-8  px-3  text-sm  gap-1.5",
  md: "h-10 px-4  text-sm  gap-2",
  lg: "h-12 px-6  text-base gap-2.5",
  icon: "h-9  w-9   text-sm  p-0 justify-center",
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
  const v = variants[variant];
  const s = sizes[size];

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center font-medium rounded-[var(--r-md)] border",
        "transition-all duration-[var(--dur-base)] ease-[var(--ease-smooth)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
        "disabled:opacity-40 disabled:pointer-events-none",
        "select-none cursor-pointer",
        v.base,
        v.border,
        s,
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
      className="animate-spin"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
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
