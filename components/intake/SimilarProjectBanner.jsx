"use client";

import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";

/**
 * SimilarProjectsBanner
 * Shows after StepClarify when user's idea matches existing public projects.
 * Debounced fetch — only fires when idea text is long enough and stable.
 */
export function SimilarProjectsBanner({ idea, onUseTemplate }) {
  const { t } = useI18n();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef(null);
  const prevIdeaRef = useRef("");

  useEffect(() => {
    if (!idea || idea.trim().length < 20) {
      setProjects([]);
      return;
    }
    if (idea === prevIdeaRef.current) return;
    prevIdeaRef.current = idea;

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/explore/similar?q=${encodeURIComponent(idea.slice(0, 200))}`
        );
        const data = await res.json();
        setProjects(data.projects ?? []);
        setDismissed(false);
      } catch {
        setProjects([]);
      } finally {
        setLoading(false);
      }
    }, 1200);

    return () => clearTimeout(timerRef.current);
  }, [idea]);

  if (dismissed || (!loading && projects.length === 0)) return null;

  if (loading) {
    return (
      <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 mb-5 animate-pulse">
        <div className="h-3 bg-[var(--bg-muted)] rounded w-48 mb-2" />
        <div className="h-3 bg-[var(--bg-muted)] rounded w-full" />
      </div>
    );
  }

  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--violet)] bg-[var(--violet-bg)] p-4 mb-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">💡</span>
          <p className="text-sm font-semibold text-[var(--violet-dim)]">
            {t("similar_found_title", { count: projects.length })}
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-lg leading-none"
        >
          ×
        </button>
      </div>

      <p className="text-xs text-[var(--text-secondary)] mb-3">
        {t("similar_found_desc")}
      </p>

      <div className="flex flex-col gap-2">
        {projects.map((p) => (
          <div
            key={p.publicSlug ?? p.id}
            className="flex items-start justify-between gap-3 rounded-[var(--r-md)] bg-[var(--bg-elevated)] border border-[var(--border)] px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                {p.projectTitle}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">
                {p.oneLineGoal}
              </p>
              {p.tags?.length > 0 && (
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {p.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-muted)] text-[var(--text-tertiary)]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => onUseTemplate(p)}
              className="text-xs font-medium text-[var(--violet)] hover:underline shrink-0"
            >
              {t("similar_view")}
            </button>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-[var(--text-tertiary)] mt-3">
        {t("similar_continue_anyway")}
      </p>
    </div>
  );
}
