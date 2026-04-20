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
        "transition-all duration-[var(--dur-base)] ease-[var(--ease-smooth)]",
        interactive
          ? "cursor-pointer hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 hover:border-[var(--violet)] active:translate-y-0 active:shadow-[var(--shadow-sm)]"
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
