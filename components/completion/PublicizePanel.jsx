"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useI18n } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/ai/publicize";

/**
 * PublicizePanel — shown on the completion page.
 * Lets users opt-in to public sharing after a project is marked complete.
 */
export function PublicizePanel({ project, onPublicized }) {
  const { t } = useI18n();
  const { isSignedIn } = useUser();
  const [status, setStatus] = useState("idle"); // idle | loading | success | failed | skipped
  const [result, setResult] = useState(null);

  if (!isSignedIn) return null;
  if (project.isPublic) {
    return (
      <div className="rounded-[var(--r-lg)] border border-[var(--emerald)] bg-[var(--emerald-bg)] px-4 py-3 flex items-center gap-3">
        <span className="text-emerald text-xl">🌍</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--emerald-dim)]">
            {t("publicize_already_public")}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {t("publicize_category_label")}: <strong>{project.category}</strong>
          </p>
        </div>
      </div>
    );
  }

  const handlePublicize = async () => {
    setStatus("loading");
    try {
      const res = await fetch(`/api/projects/${project.id}/publicize`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setStatus(data.qualifies ? "success" : "failed");
        if (data.qualifies) onPublicized?.(data);
      } else {
        setStatus("failed");
        setResult({ reason: data.error });
      }
    } catch {
      setStatus("failed");
    }
  };

  if (status === "skipped") return null;

  if (status === "success" && result) {
    return (
      <div className="rounded-[var(--r-lg)] border border-[var(--emerald)] bg-[var(--emerald-bg)] px-5 py-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎉</span>
          <p className="font-semibold text-sm text-[var(--emerald-dim)]">
            {t("publicize_success_title")}
          </p>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          {t("publicize_success_desc", {
            category: result.category,
            score: result.score,
          })}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {(result.tags ?? []).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)]"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (status === "failed" && result) {
    return (
      <div className="rounded-[var(--r-lg)] border border-[var(--amber)] bg-[var(--amber-bg)] px-5 py-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚠️</span>
          <p className="font-semibold text-sm text-[var(--amber)]">
            {t("publicize_failed_title")}
          </p>
        </div>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {result.reason || t("publicize_failed_desc")}
        </p>
        <p className="text-xs text-[var(--text-tertiary)]">
          {t("publicize_score_label")}: {result.score ?? "–"}/100 (
          {t("publicize_threshold_label")}: {result.threshold ?? 72})
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-4">
      <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl shrink-0">🌍</span>
        <div>
          <p className="font-semibold text-sm text-[var(--text-primary)] mb-1">
            {t("publicize_cta_title")}
          </p>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {t("publicize_cta_desc")}
          </p>
        </div>
      </div>

      {/* What gets shared */}
      <div className="rounded-[var(--r-md)] bg-[var(--bg-subtle)] border border-[var(--border)] p-3 mb-4">
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
          {t("publicize_shared_label")}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { icon: "✓", text: t("publicize_shared_title") },
            { icon: "✓", text: t("publicize_shared_goal") },
            { icon: "✓", text: t("publicize_shared_phases") },
            { icon: "✓", text: t("publicize_shared_tags") },
            { icon: "✗", text: t("publicize_hidden_tasks") },
            { icon: "✗", text: t("publicize_hidden_identity") },
          ].map(({ icon, text }) => (
            <div
              key={text}
              className={`flex items-center gap-1.5 text-[10px] ${
                icon === "✓"
                  ? "text-[var(--emerald-dim)]"
                  : "text-[var(--text-tertiary)]"
              }`}
            >
              <span className="font-bold">{icon}</span> {text}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setStatus("skipped")}
          className="flex-1 h-9 rounded-[var(--r-md)] border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
        >
          {t("publicize_skip")}
        </button>
        <button
          onClick={handlePublicize}
          disabled={status === "loading"}
          className={[
            "flex-1 h-9 rounded-[var(--r-md)] text-xs font-semibold transition-all",
            status === "loading"
              ? "bg-[var(--bg-muted)] text-[var(--text-tertiary)] cursor-not-allowed"
              : "bg-[var(--violet)] text-white hover:bg-[var(--violet-dim)]",
          ].join(" ")}
        >
          {status === "loading" ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              {t("publicize_checking")}
            </span>
          ) : (
            t("publicize_share_btn")
          )}
        </button>
      </div>
    </div>
  );
}
