// ─── Colour map ───────────────────────────────────────────────────────
const variants = {
  violet:
    "bg-[var(--violet-bg)]  text-[var(--violet-dim)]  border-[color-mix(in_srgb,var(--violet)_25%,transparent)]",
  emerald:
    "bg-[var(--emerald-bg)] text-[var(--emerald-dim)] border-[color-mix(in_srgb,var(--emerald)_25%,transparent)]",
  amber:
    "bg-[var(--amber-bg)]   text-[var(--amber)]        border-[color-mix(in_srgb,var(--amber)_30%,transparent)]",
  coral:
    "bg-[var(--coral-bg)]   text-[var(--coral)]        border-[color-mix(in_srgb,var(--coral)_30%,transparent)]",
  rose: "bg-[var(--rose-bg)]    text-[var(--rose)]         border-[color-mix(in_srgb,var(--rose)_25%,transparent)]",
  slate:
    "bg-[var(--bg-subtle)]  text-[var(--text-secondary)] border-[var(--border)]",
};

// ─── Semantic shortcuts ────────────────────────────────────────────────
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
        "inline-flex items-center gap-1",
        "px-2 py-[3px]",
        "text-[11px] font-semibold leading-none tracking-[0.02em]",
        "rounded-[var(--r-full)] border",
        variants[resolved] ?? variants.slate,
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
