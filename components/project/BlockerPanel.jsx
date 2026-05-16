"use client";

import { useState } from "react";
import { useProjectStore } from "@/lib/store/projectStore";
import { Button } from "@/components/ui/Button";
import { timeAgo } from "@/lib/utils/date";
import { useI18n } from "@/lib/i18n";
import { PiConfetti } from "react-icons/pi";

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
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider">
          {t("blocker_title")}{" "}
          {active.length > 0 && (
            <span className="text-[var(--coral)]">({active.length})</span>
          )}
        </p>
        <button
          onClick={() => setAdding((a) => !a)}
          className="text-xs text-[var(--violet)] hover:underline"
        >
          {t("blocker_add")}
        </button>
      </div>

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
            className="flex-1 h-9 px-3 text-sm rounded-[var(--r-md)] border border-[var(--coral)] bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none"
          />
          <Button size="sm" variant="danger" onClick={handleAdd}>
            {t("blocker_add_btn")}
          </Button>
        </div>
      )}

      {active.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {active.map((b) => (
            <div
              key={b.id}
              className="flex items-start gap-3 rounded-[var(--r-md)] border border-[var(--coral)] bg-[var(--coral-bg)] px-4 py-3"
            >
              <span className="text-[var(--coral)] text-base mt-0.5">⊘</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-primary)]">
                  {b.description}
                </p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  {timeAgo(b.createdAt)}
                </p>
              </div>
              <button
                onClick={() => resolveBlocker(project.id, b.id)}
                className="text-xs text-[var(--emerald)] hover:underline shrink-0"
              >
                {t("blocker_resolve")}
              </button>
            </div>
          ))}
        </div>
      )}

      {active.length === 0 && !adding && (
        <p className="text-sm text-[var(--text-tertiary)]">
          {t("blocker_none")} <PiConfetti className="inline" />
        </p>
      )}

      {resolved.length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-[var(--text-tertiary)] cursor-pointer hover:text-[var(--text-secondary)]">
            {t("blocker_resolved_count", { n: resolved.length })}
          </summary>
          <div className="mt-2 flex flex-col gap-1">
            {resolved.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-tertiary)] line-through"
              >
                <span>✓</span>
                {b.description}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
