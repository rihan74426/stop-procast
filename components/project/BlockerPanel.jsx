"use client";

import { useState } from "react";
import { useProjectStore } from "@/lib/store/projectStore";
import { Button } from "@/components/ui/Button";
import { timeAgo } from "@/lib/utils/date";
import { useI18n } from "@/lib/i18n";
import { FiMinusCircle, FiCheckCircle, FiSmile } from "react-icons/fi";

export function BlockerPanel({ project }) {
  const { t } = useI18n();
  const addBlocker = useProjectStore((s) => s.addBlocker);
  const resolveBlocker = useProjectStore((s) => s.resolveBlocker);
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);

  const active = project.blockers.filter((b) => b.status === "active");
  const resolved = project.blockers.filter((b) => b.status === "resolved");

  const handleAdd = () => {
    if (!text.trim()) return;
    addBlocker(project.id, text.trim());
    setText("");
    setAdding(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-tertiary)" }}
        >
          {t("blocker_title")}{" "}
          {active.length > 0 && (
            <span style={{ color: "var(--coral)" }}>({active.length})</span>
          )}
        </p>
        <button
          onClick={() => setAdding((a) => !a)}
          className="text-xs font-medium hover:underline transition-colors"
          style={{ color: "var(--violet)" }}
        >
          {t("blocker_add")}
        </button>
      </div>

      {/* Add input */}
      {adding && (
        <div className="flex gap-2 mb-3">
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") setAdding(false);
            }}
            placeholder={t("blocker_placeholder")}
            className="flex-1 h-9 px-3 text-sm rounded-[var(--r-md)] border bg-[var(--bg-base)] focus:outline-none focus:ring-2"
            style={{
              borderColor: "var(--coral)",
              color: "var(--text-primary)",
              // ring via focus-visible
            }}
          />
          <Button size="sm" variant="danger" onClick={handleAdd}>
            {t("blocker_add_btn")}
          </Button>
        </div>
      )}

      {/* Active blockers */}
      {active.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {active.map((b) => (
            <div
              key={b.id}
              className="flex items-start gap-3 rounded-[var(--r-md)] border px-4 py-3"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--coral) 35%, transparent)",
                background: "var(--coral-bg)",
              }}
            >
              <FiMinusCircle
                size={15}
                className="shrink-0 mt-0.5"
                style={{ color: "var(--coral)" }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                  {b.description}
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {timeAgo(b.createdAt)}
                </p>
              </div>
              <button
                onClick={() => resolveBlocker(project.id, b.id)}
                className="text-xs font-medium hover:underline shrink-0 transition-colors"
                style={{ color: "var(--emerald)" }}
              >
                {t("blocker_resolve")}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {active.length === 0 && !adding && (
        <div
          className="flex items-center gap-2 text-sm"
          style={{ color: "var(--text-tertiary)" }}
        >
          <FiSmile size={14} />
          <span>{t("blocker_none")}</span>
        </div>
      )}

      {/* Resolved list */}
      {resolved.length > 0 && (
        <details className="mt-2">
          <summary
            className="text-xs cursor-pointer hover:underline transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            {t("blocker_resolved_count", { n: resolved.length })}
          </summary>
          <div className="mt-2 flex flex-col gap-1">
            {resolved.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-2 px-3 py-1.5 text-sm"
                style={{
                  color: "var(--text-tertiary)",
                  textDecoration: "line-through",
                }}
              >
                <FiCheckCircle size={12} style={{ flexShrink: 0 }} />
                {b.description}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
