"use client";

// ─── Ring (circular progress) ─────────────────────────────────────────
export function ProgressRing({
  value = 0, // 0–100
  size = 48,
  strokeWidth = 4,
  color = "var(--emerald)",
  trackColor = "var(--border)",
  label,
  className = "",
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;

  return (
    <div
      className={[
        "relative inline-flex items-center justify-center",
        className,
      ].join(" ")}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </svg>
      {/* Centre label */}
      {label !== undefined && (
        <span
          className="absolute text-xs font-medium text-[var(--text-primary)] tabular-nums"
          style={{ fontSize: size < 40 ? 10 : 12 }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

// ─── Bar (linear progress) ────────────────────────────────────────────
export function ProgressBar({
  value = 0,
  color = "var(--emerald)",
  height = 6,
  className = "",
  showLabel = false,
}) {
  return (
    <div className={["flex items-center gap-3", className].join(" ")}>
      <div
        className="flex-1 rounded-full overflow-hidden bg-[var(--bg-muted)]"
        style={{ height }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-[var(--ease-smooth)]"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      {showLabel && (
        <span className="text-xs tabular-nums text-[var(--text-secondary)] min-w-[2.5rem] text-right">
          {Math.round(value)}%
        </span>
      )}
    </div>
  );
}
