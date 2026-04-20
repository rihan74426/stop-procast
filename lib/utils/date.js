// ─── Relative time ────────────────────────────────────────────────────

export function timeAgo(iso) {
  if (!iso) return "";
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  const days = Math.floor(secs / 86400);
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// ─── Days since a date ────────────────────────────────────────────────

export function daysSince(iso) {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso)) / 86400000);
}

// ─── Days until a deadline ────────────────────────────────────────────

export function daysUntil(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(iso) - Date.now()) / 86400000);
}

// ─── Is overdue ───────────────────────────────────────────────────────

export function isOverdue(iso) {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

// ─── Format date ─────────────────────────────────────────────────────

export function formatDate(iso, opts = {}) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...opts,
  });
}

// ─── Project age label ────────────────────────────────────────────────

export function projectAgeLabel(createdAt) {
  const days = daysSince(createdAt);
  if (days === 0) return "Started today";
  if (days === 1) return "1 day old";
  if (days < 7) return `${days} days old`;
  if (days < 30) return `${Math.floor(days / 7)}w old`;
  return `${Math.floor(days / 30)}mo old`;
}

// ─── Today's ISO date string (YYYY-MM-DD) ─────────────────────────────

export function todayISO() {
  return new Date().toISOString().split("T")[0];
}
