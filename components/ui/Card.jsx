"use client";

export function Card({ className = "", hover = false, onClick, children }) {
  const interactive = hover || !!onClick;

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick(e) : undefined}
      className={[
        "rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)]",
        "transition-all duration-200 ease-out",
        interactive
          ? [
              "cursor-pointer",
              "hover:-translate-y-0.5",
              "hover:border-[color-mix(in_srgb,var(--violet)_45%,transparent)]",
              "hover:shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]",
              "active:translate-y-0 active:shadow-[0_1px_4px_rgba(0,0,0,0.06)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--violet)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]",
            ].join(" ")
          : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children }) {
  return (
    <div
      className={[
        "px-5 pt-5 pb-4 border-b border-[var(--border)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function CardBody({ className = "", children }) {
  return <div className={["px-5 py-4", className].join(" ")}>{children}</div>;
}

export function CardFooter({ className = "", children }) {
  return (
    <div
      className={[
        "px-5 pb-5 pt-3 border-t border-[var(--border)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
