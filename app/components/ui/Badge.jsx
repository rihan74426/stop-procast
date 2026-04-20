const variants = {
  violet: "bg-[var(--violet-bg)]  text-[var(--violet-dim)]",
  emerald: "bg-[var(--emerald-bg)] text-[var(--emerald-dim)]",
  amber: "bg-[var(--amber-bg)]   text-[var(--amber)]",
  coral: "bg-[var(--coral-bg)]   text-[var(--coral)]",
  rose: "bg-[var(--rose-bg)]    text-[var(--rose)]",
  slate: "bg-[var(--bg-subtle)]  text-[var(--text-secondary)]",
};

// Semantic shortcuts
const statusMap = {
  active: "emerald",
  done: "emerald",
  todo: "slate",
  doing: "violet",
  blocked: "coral",
  missed: "coral",
  "idle-warning": "amber",
  "idle-danger": "coral",
  upcoming: "slate",
  pending: "slate",
  completed: "emerald",
};

const priorityMap = { high: "coral", medium: "amber", low: "slate" };

export function Badge({ variant, status, priority, className = "", children }) {
  const resolved =
    variant ??
    (status ? statusMap[status] : null) ??
    (priority ? priorityMap[priority] : null) ??
    "slate";

  return (
    <span
      className={[
        "inline-flex items-center gap-1 px-2 py-0.5",
        "text-xs font-medium rounded-[var(--r-full)]",
        variants[resolved] ?? variants.slate,
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
