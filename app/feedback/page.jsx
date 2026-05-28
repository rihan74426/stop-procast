"use client";

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
import { useI18n } from "@/lib/i18n";
import { BiBug, BiBulb, BiStar } from "react-icons/bi";
import {
  FiHelpCircle,
  FiCheckCircle,
  FiMail,
  FiMapPin,
  FiShield,
} from "react-icons/fi";

// ─── Static config ────────────────────────────────────────────────────

const TYPE_ICONS = {
  bug: BiBug,
  suggestion: BiBulb,
  praise: BiStar,
  question: FiHelpCircle,
};

const TYPE_COLORS = {
  bug: "coral",
  suggestion: "violet",
  praise: "emerald",
  question: "amber",
};

const STATUS_COLORS = {
  open: "violet",
  in_progress: "amber",
  resolved: "emerald",
  wont_fix: "coral",
  duplicate: "slate",
};

const STATUS_OPTIONS = [
  "open",
  "in_progress",
  "resolved",
  "wont_fix",
  "duplicate",
];
const FILTER_IDS = ["all", "open", "in_progress", "resolved"];

function timeAgo(iso) {
  if (!iso) return "";
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

// ─── Admin Panel ──────────────────────────────────────────────────────

function AdminPanel({ item, onClose, onUpdated }) {
  const { t } = useI18n();
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
      // keep modal open
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={t("feedback_admin_title")} size="sm">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
            {t("feedback_admin_status")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setStatus(opt)}
                className={[
                  "py-2 px-3 text-xs font-medium rounded-[var(--r-md)] border transition-all text-left",
                  status === opt
                    ? "bg-[var(--violet)] text-white border-[var(--violet)]"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--violet)]",
                ].join(" ")}
              >
                {t(`feedback_status_${opt}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
            {t("feedback_admin_note")}
          </label>
          <textarea
            rows={3}
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder={t("feedback_admin_note_placeholder")}
            className="w-full px-3 py-2.5 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("feedback_admin_cancel")}
          </Button>
          <Button size="sm" loading={saving} onClick={handleSave}>
            {t("feedback_admin_save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Submit Modal ─────────────────────────────────────────────────────

function SubmitModal({ open, onClose, onSuccess }) {
  const { t } = useI18n();
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

  // type key mapping: "suggestion" → "idea" for the translation key
  const typeI18nKey = (k) => `feedback_type_${k === "suggestion" ? "idea" : k}`;

  const SelectedIcon = TYPE_ICONS[type];

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t("feedback_submit_title")}
      size="md"
    >
      <div className="flex flex-col gap-5">
        {status === "done" ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <FiCheckCircle className="text-5xl text-[var(--emerald)]" />
            <p className="font-semibold text-[var(--text-primary)]">
              {t("feedback_success_title")}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              {t("feedback_success_desc")}
            </p>
          </div>
        ) : (
          <>
            {/* Type picker */}
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                {t("feedback_type")}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {Object.keys(TYPE_ICONS).map((key) => {
                  const Icon = TYPE_ICONS[key];
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
                      {t(typeI18nKey(key))}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                {t("feedback_title_label")}{" "}
                <span className="text-[var(--coral)]">
                  {t("feedback_title_required")}
                </span>
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
                {t("feedback_title_count", { n: title.length })}
              </p>
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                {t("feedback_details")}{" "}
                <span className="text-[var(--text-tertiary)]">
                  {t("feedback_details_optional")}
                </span>
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
                {t("feedback_details_count", { n: body.length })}
              </p>
            </div>

            {status === "error" && (
              <p className="text-sm text-[var(--coral)] rounded-[var(--r-md)] bg-[var(--coral-bg)] border border-[var(--coral)] px-3 py-2">
                {t("feedback_error_submit")}
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={handleClose}
                disabled={status === "submitting"}
              >
                {t("feedback_cancel")}
              </Button>
              <Button
                onClick={handleSubmit}
                loading={status === "submitting"}
                disabled={title.trim().length < 5}
              >
                {t("feedback_submit_btn")}{" "}
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
  const { t } = useI18n();

  const TypeIcon = TYPE_ICONS[item.type] ?? TYPE_ICONS.suggestion;
  const typeColor = TYPE_COLORS[item.type] ?? "violet";
  const statusColor = STATUS_COLORS[item.status] ?? "violet";

  // Map "suggestion" → "idea" for translation key
  const typeLabelKey =
    item.type === "suggestion"
      ? "feedback_type_idea"
      : `feedback_type_${item.type}`;
  const statusLabelKey = `feedback_status_${item.status}`;

  const hasVoted = item.upvotedBy?.includes(sessionId);
  const isResolved = item.status === "resolved";

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
          title={hasVoted ? t("feedback_already_voted") : t("feedback_upvote")}
          className={[
            "flex flex-col items-center gap-0.5 min-w-[40px] py-1.5 rounded-[var(--r-md)] border transition-all",
            hasVoted
              ? "border-[var(--violet)] bg-[var(--violet-bg)] text-[var(--violet-dim)] cursor-default"
              : "border-[var(--border)] text-[var(--text-tertiary)] hover:border-[var(--violet)] hover:text-[var(--violet-dim)] hover:bg-[var(--violet-bg)]",
          ].join(" ")}
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
                <FiMapPin size={10} /> {t("feedback_team_note")}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {item.adminNote}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={typeColor}>{t(typeLabelKey)}</Badge>
            <Badge variant={statusColor}>{t(statusLabelKey)}</Badge>
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
  const { t } = useI18n();
  const { user, isLoaded } = useUser();
  const isAdmin = isLoaded && user?.publicMetadata?.role === "admin";

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [adminItem, setAdminItem] = useState(null);
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
    setTotal((n) => n + 1);
  };

  const handleAdminUpdated = (updated) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  };

  const openCount = items.filter((i) => i.status === "open").length;
  const resolvedCount = items.filter((i) => i.status === "resolved").length;
  const inProgressCount = items.filter(
    (i) => i.status === "in_progress"
  ).length;

  const filterCount = (id) => {
    if (id === "all") return total;
    if (id === "open") return openCount;
    if (id === "resolved") return resolvedCount;
    if (id === "in_progress") return inProgressCount;
    return items.filter((i) => i.status === id).length;
  };

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
                    {t("feedback_title")}
                  </h1>
                  {isAdmin && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[var(--violet-bg)] text-[var(--violet-dim)] border border-[var(--violet)] font-medium">
                      <FiShield size={10} /> Admin
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                  {t("feedback_subtitle")} · {total}{" "}
                  {total !== 1
                    ? t("feedback_reports_plural")
                    : t("feedback_reports")}{" "}
                  · {resolvedCount} {t("feedback_resolved")}
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
                <span className="hidden sm:inline">
                  {t("feedback_new_report")}
                </span>
                <span className="sm:hidden">{t("feedback_report")}</span>
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-6">
              {[
                {
                  label: t("feedback_stat_total"),
                  value: total,
                  color: "var(--text-primary)",
                },
                {
                  label: t("feedback_stat_open"),
                  value: openCount,
                  color: "var(--violet)",
                },
                {
                  label: t("feedback_stat_in_progress"),
                  value: inProgressCount,
                  color: "var(--amber)",
                },
                {
                  label: t("feedback_stat_resolved"),
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
              {FILTER_IDS.map((id) => (
                <button
                  key={id}
                  onClick={() => setFilter(id)}
                  className={[
                    "px-3 py-1.5 text-xs rounded-[var(--r-full)] border font-medium transition-all whitespace-nowrap shrink-0",
                    filter === id
                      ? "bg-[var(--violet)] text-white border-[var(--violet)]"
                      : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--violet)] hover:text-[var(--violet-dim)]",
                  ].join(" ")}
                >
                  {t(`feedback_filter_${id}`)}
                  {id !== "all" && (
                    <span
                      className={`ml-1.5 ${
                        filter === id
                          ? "text-white/70"
                          : "text-[var(--text-tertiary)]"
                      }`}
                    >
                      {filterCount(id)}
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
                    ? t("feedback_empty_all")
                    : t("feedback_empty_filtered", {
                        filter: t(`feedback_filter_${filter}`),
                      })}
                </p>
                <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-xs">
                  {filter === "all"
                    ? t("feedback_empty_desc_all")
                    : t("feedback_empty_desc_filtered")}
                </p>
                {filter === "all" && (
                  <Button onClick={() => setShowModal(true)} size="sm">
                    {t("feedback_share")}
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
                  {t("feedback_have_more")}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mb-4">
                  {t("feedback_every_helps")}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowModal(true)}
                >
                  {t("feedback_add_report")}
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
