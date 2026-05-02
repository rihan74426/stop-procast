"use client";

/**
 * app/feedback/page.jsx
 *
 * Fully public — no auth required to view, vote, or submit.
 * Admin panel visible only when user has { publicMetadata: { role: "admin" } } in Clerk.
 */

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { TopBar } from "@/components/layout/Topbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { DataProvider } from "@/components/providers/DataProvider";
import { getSessionId } from "@/lib/sessionId";
import { BiBug, BiBulb, BiStar } from "react-icons/bi";
import {
  FiHelpCircle,
  FiCheckCircle,
  FiMail,
  FiMapPin,
  FiShield,
} from "react-icons/fi";

// ─── Config ───────────────────────────────────────────────────────────

const TYPE_META = {
  bug: { label: "Bug", icon: BiBug, color: "coral" },
  suggestion: { label: "Idea", icon: BiBulb, color: "violet" },
  praise: { label: "Praise", icon: BiStar, color: "emerald" },
  question: { label: "Question", icon: FiHelpCircle, color: "amber" },
};

const STATUS_META = {
  open: { label: "Open", color: "violet" },
  in_progress: { label: "In Progress", color: "amber" },
  resolved: { label: "Resolved", color: "emerald" },
  wont_fix: { label: "Won't Fix", color: "coral" },
  duplicate: { label: "Duplicate", color: "slate" },
};

const STATUS_OPTIONS = [
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In Progress" },
  { id: "resolved", label: "Resolved" },
  { id: "wont_fix", label: "Won't Fix" },
  { id: "duplicate", label: "Duplicate" },
];

const FILTERS = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In Progress" },
  { id: "resolved", label: "Resolved" },
];

function timeAgo(iso) {
  if (!iso) return "";
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

// ─── Admin Panel Modal ────────────────────────────────────────────────

function AdminPanel({ item, onClose, onUpdated }) {
  const [status, setStatus] = useState(item.status);
  const [adminNote, setAdminNote] = useState(item.adminNote ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status, adminNote }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onUpdated(data.item);
      onClose();
    } catch {
      // silent — keep modal open
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Admin: Update Report" size="sm">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
            Status
          </p>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setStatus(opt.id)}
                className={[
                  "py-2 px-3 text-xs font-medium rounded-[var(--r-md)] border transition-all text-left",
                  status === opt.id
                    ? "bg-[var(--violet)] text-white border-[var(--violet)]"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--violet)]",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
            Team note (visible to users)
          </label>
          <textarea
            rows={3}
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="Optional note for the community…"
            className="w-full px-3 py-2.5 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" loading={saving} onClick={handleSave}>
            Save changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Submit Modal ─────────────────────────────────────────────────────

function SubmitModal({ open, onClose, onSuccess }) {
  const [type, setType] = useState("suggestion");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("idle");

  const reset = () => {
    setType("suggestion");
    setTitle("");
    setBody("");
    setStatus("idle");
  };
  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (title.trim().length < 5) return;
    setStatus("submitting");
    try {
      const sessionId = getSessionId();
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title.trim(),
          body: body.trim(),
          sessionId,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStatus("done");
      onSuccess(data.item);
      setTimeout(handleClose, 1200);
    } catch {
      setStatus("error");
    }
  };

  const SelectedIcon = TYPE_META[type]?.icon;

  return (
    <Modal open={open} onClose={handleClose} title="Share feedback" size="md">
      <div className="flex flex-col gap-5">
        {status === "done" ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <FiCheckCircle className="text-5xl text-[var(--emerald)]" />
            <p className="font-semibold text-[var(--text-primary)]">
              Thanks for your feedback!
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              It's now live on the board.
            </p>
          </div>
        ) : (
          <>
            {/* Type picker */}
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Type
              </p>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(TYPE_META).map(([key, meta]) => {
                  const Icon = meta.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setType(key)}
                      className={[
                        "flex flex-col items-center gap-1.5 py-3 rounded-[var(--r-lg)] border-2 text-xs font-medium transition-all",
                        type === key
                          ? "border-[var(--violet)] bg-[var(--violet-bg)] text-[var(--violet-dim)]"
                          : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--slate-4)]",
                      ].join(" ")}
                    >
                      <span className="text-lg">
                        <Icon />
                      </span>
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                Title <span className="text-[var(--coral)]">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder={
                  type === "bug"
                    ? "What broke? e.g. 'Navigation resets on back'"
                    : type === "suggestion"
                    ? "What would improve this? e.g. 'Drag to reorder tasks'"
                    : type === "praise"
                    ? "What do you love?"
                    : "What's your question?"
                }
                className="w-full h-10 px-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--violet)] focus:border-[var(--violet)]"
              />
              <p className="text-xs text-[var(--text-tertiary)] mt-1 text-right">
                {title.length}/120
              </p>
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                Details{" "}
                <span className="text-[var(--text-tertiary)]">(optional)</span>
              </label>
              <textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
                placeholder={
                  type === "bug"
                    ? "Steps to reproduce, expected vs actual…"
                    : "Extra context…"
                }
                className="w-full px-3 py-2.5 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
              />
              <p className="text-xs text-[var(--text-tertiary)] mt-1 text-right">
                {body.length}/2000
              </p>
            </div>

            {status === "error" && (
              <p className="text-sm text-[var(--coral)] rounded-[var(--r-md)] bg-[var(--coral-bg)] border border-[var(--coral)] px-3 py-2">
                Something went wrong. Please try again.
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={handleClose}
                disabled={status === "submitting"}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                loading={status === "submitting"}
                disabled={title.trim().length < 5}
              >
                Submit{" "}
                {SelectedIcon && (
                  <span className="ml-1">
                    <SelectedIcon />
                  </span>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ─── Feedback card ────────────────────────────────────────────────────

function FeedbackCard({ item, sessionId, isAdmin, onUpvote, onAdminEdit }) {
  const typeMeta = TYPE_META[item.type] ?? TYPE_META.suggestion;
  const statusMeta = STATUS_META[item.status] ?? STATUS_META.open;
  const hasVoted = item.upvotedBy?.includes(sessionId);
  const isResolved = item.status === "resolved";
  const TypeIcon = typeMeta.icon;

  return (
    <div
      className={[
        "rounded-[var(--r-lg)] border bg-[var(--bg-elevated)] p-4 sm:p-5 transition-all duration-200",
        isResolved
          ? "border-[var(--emerald)] opacity-80"
          : "border-[var(--border)] hover:border-[var(--slate-4)]",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        {/* Upvote */}
        <button
          onClick={() => !hasVoted && onUpvote(item.id)}
          disabled={hasVoted}
          className={[
            "flex flex-col items-center gap-0.5 min-w-[40px] py-1.5 rounded-[var(--r-md)] border transition-all",
            hasVoted
              ? "border-[var(--violet)] bg-[var(--violet-bg)] text-[var(--violet-dim)] cursor-default"
              : "border-[var(--border)] text-[var(--text-tertiary)] hover:border-[var(--violet)] hover:text-[var(--violet-dim)] hover:bg-[var(--violet-bg)]",
          ].join(" ")}
          title={hasVoted ? "Already upvoted" : "Upvote"}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M6 2L10 8H2L6 2Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
              fill={hasVoted ? "currentColor" : "none"}
            />
          </svg>
          <span className="text-xs font-semibold tabular-nums">
            {item.upvotes ?? 0}
          </span>
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-sm">
              <TypeIcon />
            </span>
            <p
              className={[
                "font-medium text-sm sm:text-base text-[var(--text-primary)] leading-snug",
                isResolved ? "line-through opacity-60" : "",
              ].join(" ")}
            >
              {item.title}
            </p>
            {/* Admin edit button */}
            {isAdmin && (
              <button
                onClick={() => onAdminEdit(item)}
                className="ml-auto flex items-center gap-1 text-xs px-2 py-0.5 rounded-[var(--r-full)] bg-[var(--violet-bg)] text-[var(--violet-dim)] border border-[var(--violet)] hover:bg-[var(--violet)] hover:text-white transition-all shrink-0"
              >
                <FiShield size={10} /> Edit
              </button>
            )}
          </div>

          {item.body && (
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed mb-2.5 line-clamp-3">
              {item.body}
            </p>
          )}

          {item.adminNote && (
            <div className="rounded-[var(--r-md)] bg-[var(--violet-bg)] border border-[var(--violet)] px-3 py-2 mb-2.5">
              <p className="text-xs font-medium text-[var(--violet-dim)] mb-0.5 flex items-center gap-1">
                <FiMapPin size={10} /> Team note
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {item.adminNote}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={typeMeta.color}>{typeMeta.label}</Badge>
            <Badge variant={statusMeta.color}>{statusMeta.label}</Badge>
            <span className="text-xs text-[var(--text-tertiary)] ml-auto">
              {timeAgo(item.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────

function FeedbackContent() {
  const { user, isLoaded } = useUser();
  // Admin = Clerk publicMetadata.role === "admin"
  const isAdmin = isLoaded && user?.publicMetadata?.role === "admin";

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [adminItem, setAdminItem] = useState(null); // item being edited by admin
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  const fetchItems = useCallback(async (statusFilter = "all") => {
    setLoading(true);
    try {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/feedback${params}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems(filter);
  }, [filter, fetchItems]);

  const handleUpvote = async (id) => {
    if (!sessionId) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              upvotes: (item.upvotes ?? 0) + 1,
              upvotedBy: [...(item.upvotedBy ?? []), sessionId],
            }
          : item
      )
    );
    try {
      await fetch("/api/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "upvote", sessionId }),
      });
    } catch {
      fetchItems(filter);
    }
  };

  const handleSuccess = (newItem) => {
    setItems((prev) => [newItem, ...prev]);
    setTotal((t) => t + 1);
  };

  const handleAdminUpdated = (updated) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  };

  const openCount = items.filter((i) => i.status === "open").length;
  const resolvedCount = items.filter((i) => i.status === "resolved").length;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-6 sm:mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="font-display font-semibold text-xl sm:text-2xl text-[var(--text-primary)]">
                    Feedback & Bug Reports
                  </h1>
                  {isAdmin && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[var(--violet-bg)] text-[var(--violet-dim)] border border-[var(--violet)] font-medium">
                      <FiShield size={10} /> Admin
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                  Public board · {total} report{total !== 1 ? "s" : ""} ·{" "}
                  {resolvedCount} resolved
                </p>
              </div>
              <Button
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={() => setShowModal(true)}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M6 1v10M1 6h10"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="hidden sm:inline">New report</span>
                <span className="sm:hidden">Report</span>
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-6">
              {[
                { label: "Total", value: total, color: "var(--text-primary)" },
                { label: "Open", value: openCount, color: "var(--violet)" },
                {
                  label: "In Progress",
                  value: items.filter((i) => i.status === "in_progress").length,
                  color: "var(--amber)",
                },
                {
                  label: "Resolved",
                  value: resolvedCount,
                  color: "var(--emerald)",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-3 text-center"
                >
                  <p
                    className="font-display font-semibold text-xl sm:text-2xl tabular-nums"
                    style={{ color: stat.color }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5 leading-tight">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={[
                    "px-3 py-1.5 text-xs rounded-[var(--r-full)] border font-medium transition-all whitespace-nowrap shrink-0",
                    filter === f.id
                      ? "bg-[var(--violet)] text-white border-[var(--violet)]"
                      : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--violet)] hover:text-[var(--violet-dim)]",
                  ].join(" ")}
                >
                  {f.label}
                  {f.id !== "all" && (
                    <span
                      className={`ml-1.5 ${
                        filter === f.id
                          ? "text-white/70"
                          : "text-[var(--text-tertiary)]"
                      }`}
                    >
                      {f.id === "open"
                        ? openCount
                        : f.id === "resolved"
                        ? resolvedCount
                        : items.filter((i) => i.status === f.id).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* List */}
            {loading ? (
              <div className="flex flex-col gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 animate-pulse"
                  >
                    <div className="flex gap-3">
                      <div className="w-10 h-12 bg-[var(--bg-muted)] rounded-[var(--r-md)]" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-[var(--bg-muted)] rounded w-2/3" />
                        <div className="h-3 bg-[var(--bg-muted)] rounded w-full" />
                        <div className="h-3 bg-[var(--bg-muted)] rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <FiMail className="text-5xl mb-4 text-[var(--text-tertiary)]" />
                <p className="font-display font-semibold text-lg text-[var(--text-primary)] mb-2">
                  {filter === "all"
                    ? "No reports yet"
                    : `No ${filter.replace("_", " ")} reports`}
                </p>
                <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-xs">
                  {filter === "all"
                    ? "Be the first to share feedback, report a bug, or suggest an improvement."
                    : "Nothing here. Try a different filter."}
                </p>
                {filter === "all" && (
                  <Button onClick={() => setShowModal(true)} size="sm">
                    Share feedback
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {items.map((item) => (
                  <FeedbackCard
                    key={item.id}
                    item={item}
                    sessionId={sessionId}
                    isAdmin={isAdmin}
                    onUpvote={handleUpvote}
                    onAdminEdit={setAdminItem}
                  />
                ))}
              </div>
            )}

            {!loading && items.length > 0 && (
              <div className="mt-8 rounded-[var(--r-xl)] border-2 border-dashed border-[var(--border)] p-6 text-center">
                <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
                  Have something to add?
                </p>
                <p className="text-xs text-[var(--text-secondary)] mb-4">
                  Every report helps make Momentum better. Takes 30 seconds.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowModal(true)}
                >
                  + Add report
                </Button>
              </div>
            )}
          </div>
          <Footer />
        </main>
      </div>

      <SubmitModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleSuccess}
      />

      {adminItem && (
        <AdminPanel
          item={adminItem}
          onClose={() => setAdminItem(null)}
          onUpdated={(updated) => {
            handleAdminUpdated(updated);
            setAdminItem(null);
          }}
        />
      )}
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <DataProvider>
      <FeedbackContent />
    </DataProvider>
  );
}
