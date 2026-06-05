"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useI18n } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/ai/publicize";
import {
  FiGlobe,
  FiAward,
  FiAlertTriangle,
  FiCheck,
  FiX,
  FiLoader,
} from "react-icons/fi";

export function PublicizePanel({ project, onPublicized }) {
  const { t } = useI18n();
  const { isSignedIn } = useUser();
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);

  if (!isSignedIn) return null;

  // ── Already public ───────────────────────────────────────────────
  if (project.isPublic) {
    return (
      <div
        className="rounded-[var(--r-lg)] border px-4 py-3 flex items-center gap-3"
        style={{
          borderColor: "color-mix(in srgb, var(--emerald) 35%, transparent)",
          background: "var(--emerald-bg)",
        }}
      >
        <span
          className="flex items-center justify-center w-7 h-7 rounded-[var(--r-sm)] shrink-0"
          style={{
            background: "color-mix(in srgb, var(--emerald) 18%, transparent)",
          }}
        >
          <FiGlobe size={14} style={{ color: "var(--emerald)" }} />
        </span>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-medium"
            style={{ color: "var(--emerald-dim)" }}
          >
            {t("publicize_already_public")}
          </p>
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--text-secondary)" }}
          >
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

  // ── Success ──────────────────────────────────────────────────────
  if (status === "success" && result) {
    return (
      <div
        className="rounded-[var(--r-lg)] border px-5 py-4 flex flex-col gap-2"
        style={{
          borderColor: "color-mix(in srgb, var(--emerald) 35%, transparent)",
          background: "var(--emerald-bg)",
        }}
      >
        <div className="flex items-center gap-2">
          <FiAward size={18} style={{ color: "var(--emerald)" }} />
          <p
            className="font-semibold text-sm"
            style={{ color: "var(--emerald-dim)" }}
          >
            {t("publicize_success_title")}
          </p>
        </div>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {t("publicize_success_desc", {
            category: result.category,
            score: result.score,
          })}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {(result.tags ?? []).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{
                background: "var(--bg-muted)",
                color: "var(--text-secondary)",
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // ── Quality check failed ─────────────────────────────────────────
  if (status === "failed" && result) {
    return (
      <div
        className="rounded-[var(--r-lg)] border px-5 py-4 flex flex-col gap-2"
        style={{
          borderColor: "color-mix(in srgb, var(--amber) 35%, transparent)",
          background: "var(--amber-bg)",
        }}
      >
        <div className="flex items-center gap-2">
          <FiAlertTriangle size={16} style={{ color: "var(--amber)" }} />
          <p
            className="font-semibold text-sm"
            style={{ color: "var(--amber)" }}
          >
            {t("publicize_failed_title")}
          </p>
        </div>
        <p
          className="text-xs leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {result.reason || t("publicize_failed_desc")}
        </p>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {t("publicize_score_label")}: {result.score ?? "–"}/100 (
          {t("publicize_threshold_label")}: {result.threshold ?? 72})
        </p>
      </div>
    );
  }

  // ── Default CTA ──────────────────────────────────────────────────
  const SHARED_ITEMS = [
    { icon: FiCheck, text: t("publicize_shared_title"), ok: true },
    { icon: FiCheck, text: t("publicize_shared_goal"), ok: true },
    { icon: FiCheck, text: t("publicize_shared_phases"), ok: true },
    { icon: FiCheck, text: t("publicize_shared_tags"), ok: true },
    { icon: FiX, text: t("publicize_hidden_tasks"), ok: false },
    { icon: FiX, text: t("publicize_hidden_identity"), ok: false },
  ];

  return (
    <div
      className="rounded-[var(--r-lg)] border px-5 py-4"
      style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
    >
      <div className="flex items-start gap-3 mb-4">
        <span
          className="flex items-center justify-center w-9 h-9 rounded-[var(--r-md)] shrink-0"
          style={{ background: "var(--violet-bg)" }}
        >
          <FiGlobe size={17} style={{ color: "var(--violet)" }} />
        </span>
        <div>
          <p
            className="font-semibold text-sm mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            {t("publicize_cta_title")}
          </p>
          <p
            className="text-xs leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("publicize_cta_desc")}
          </p>
        </div>
      </div>

      {/* What gets shared */}
      <div
        className="rounded-[var(--r-md)] border p-3 mb-4"
        style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("publicize_shared_label")}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {SHARED_ITEMS.map(({ icon: Icon, text, ok }) => (
            <div
              key={text}
              className="flex items-center gap-1.5 text-[10px]"
              style={{
                color: ok ? "var(--emerald-dim)" : "var(--text-tertiary)",
              }}
            >
              <Icon size={11} />
              {text}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setStatus("skipped")}
          className="flex-1 h-9 rounded-[var(--r-md)] border text-xs transition-colors"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-secondary)",
            background: "transparent",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--bg-subtle)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          {t("publicize_skip")}
        </button>
        <button
          onClick={handlePublicize}
          disabled={status === "loading"}
          className="flex-1 h-9 rounded-[var(--r-md)] text-xs font-semibold text-white transition-all disabled:opacity-50"
          style={{ background: "var(--violet)" }}
          onMouseEnter={(e) =>
            status !== "loading" &&
            (e.currentTarget.style.background = "var(--violet-dim)")
          }
          onMouseLeave={(e) =>
            status !== "loading" &&
            (e.currentTarget.style.background = "var(--violet)")
          }
        >
          {status === "loading" ? (
            <span className="flex items-center justify-center gap-2">
              <FiLoader size={12} className="animate-spin" />
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
