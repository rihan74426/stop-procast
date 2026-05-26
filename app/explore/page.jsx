"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { TopBar } from "@/components/layout/Topbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/Badge";
import { DataProvider } from "@/components/providers/DataProvider";
import { CATEGORIES } from "@/lib/ai/publicize";
import { useI18n } from "@/lib/i18n";
import {
  FiSearch,
  FiFilter,
  FiTrendingUp,
  FiClock,
  FiStar,
} from "react-icons/fi";

const SCOPE_COLOR = {
  lean: "emerald",
  standard: "violet",
  ambitious: "amber",
};

function ProjectPublicCard({ project, onFork }) {
  const { t } = useI18n();
  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 flex flex-col gap-3 hover:border-[var(--violet)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200 group">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-base text-[var(--text-primary)] leading-snug mb-1 group-hover:text-[var(--violet)] transition-colors">
            {project.projectTitle}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
            {project.oneLineGoal}
          </p>
        </div>
        {/* Quality score badge */}
        <div
          className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2"
          style={{
            borderColor:
              project.publicQuality >= 90
                ? "var(--emerald)"
                : project.publicQuality >= 80
                ? "var(--violet)"
                : "var(--amber)",
            color:
              project.publicQuality >= 90
                ? "var(--emerald)"
                : project.publicQuality >= 80
                ? "var(--violet)"
                : "var(--amber)",
          }}
        >
          {project.publicQuality}
        </div>
      </div>

      {/* Phases preview */}
      {project.phases?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {project.phases.slice(0, 3).map((ph, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-muted)] text-[var(--text-tertiary)]"
            >
              {ph.name}
            </span>
          ))}
          {project.phases.length > 3 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-muted)] text-[var(--text-tertiary)]">
              +{project.phases.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Tags */}
      {project.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {project.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--violet-bg)] text-[var(--violet-dim)]"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-[var(--border)] mt-auto">
        <div className="flex items-center gap-2">
          <Badge variant={SCOPE_COLOR[project.scopeLevel] ?? "slate"}>
            {project.scopeLevel}
          </Badge>
          {project.timeline && (
            <span className="text-[10px] text-[var(--text-tertiary)]">
              {project.timeline}
            </span>
          )}
        </div>
        <button
          onClick={() => onFork(project)}
          className="text-xs font-medium text-[var(--violet)] hover:underline transition-colors"
        >
          {t("explore_use_as_template")} →
        </button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 animate-pulse">
      <div className="flex gap-3 mb-3">
        <div className="flex-1">
          <div className="h-4 bg-[var(--bg-muted)] rounded w-3/4 mb-2" />
          <div className="h-3 bg-[var(--bg-muted)] rounded w-full mb-1" />
          <div className="h-3 bg-[var(--bg-muted)] rounded w-2/3" />
        </div>
        <div className="w-10 h-10 rounded-full bg-[var(--bg-muted)] shrink-0" />
      </div>
      <div className="flex gap-1 mb-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-5 w-16 bg-[var(--bg-muted)] rounded-full" />
        ))}
      </div>
      <div className="h-px bg-[var(--bg-muted)] mb-3" />
      <div className="flex justify-between">
        <div className="h-5 w-16 bg-[var(--bg-muted)] rounded-full" />
        <div className="h-3 w-24 bg-[var(--bg-muted)] rounded" />
      </div>
    </div>
  );
}

function ExploreContent() {
  const { t } = useI18n();
  const [projects, setProjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("quality");
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const searchTimer = useRef(null);

  const fetchProjects = useCallback(
    async (opts = {}) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(opts.page ?? page),
          limit: "12",
          sort: opts.sort ?? sort,
          ...((opts.category ?? category) !== "All"
            ? { category: opts.category ?? category }
            : {}),
          ...(opts.query ?? query ? { q: opts.query ?? query } : {}),
        });
        const res = await fetch(`/api/explore?${params}`);
        const data = await res.json();
        if (opts.page === 1 || (!opts.page && page === 1)) {
          setProjects(data.projects ?? []);
        } else {
          setProjects((prev) => [...prev, ...(data.projects ?? [])]);
        }
        setTotal(data.total ?? 0);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    },
    [page, category, sort, query]
  );

  useEffect(() => {
    fetchProjects({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, sort, query]);

  const handleSearch = (val) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      setQuery(val);
    }, 400);
  };

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    setPage(1);
  };

  const handleSortChange = (s) => {
    setSort(s);
    setPage(1);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProjects({ page: nextPage });
  };

  const handleFork = (project) => {
    // Store template idea in sessionStorage, redirect to /new
    try {
      sessionStorage.setItem(
        "momentum_fork_template",
        JSON.stringify({
          idea: `${project.projectTitle}: ${project.oneLineGoal}`,
          fromPublicSlug: project.publicSlug,
        })
      );
    } catch {
      /* ignore */
    }
    window.location.href = "/new";
  };

  const hasMore = projects.length < total;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {/* Hero header */}
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🌍</span>
                <h1 className="font-display font-bold text-2xl sm:text-3xl text-[var(--text-primary)]">
                  {t("explore_title")}
                </h1>
              </div>
              <p className="text-sm text-[var(--text-secondary)] max-w-xl">
                {t("explore_subtitle")}
              </p>
            </div>

            {/* Search + sort bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <FiSearch
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
                  size={14}
                />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder={t("explore_search_placeholder")}
                  className="w-full h-10 pl-9 pr-4 text-sm rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
                />
              </div>
              {/* Sort */}
              <div className="flex gap-1.5 bg-[var(--bg-subtle)] rounded-[var(--r-md)] p-1">
                {[
                  {
                    id: "quality",
                    icon: FiStar,
                    label: t("explore_sort_quality"),
                  },
                  {
                    id: "recent",
                    icon: FiClock,
                    label: t("explore_sort_recent"),
                  },
                ].map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => handleSortChange(id)}
                    className={[
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--r-sm)] transition-all",
                      sort === id
                        ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
                        : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]",
                    ].join(" ")}
                  >
                    <Icon size={12} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
              {["All", ...CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={[
                    "px-3 py-1.5 text-xs font-medium rounded-full border whitespace-nowrap transition-all shrink-0",
                    category === cat
                      ? "bg-[var(--violet)] text-white border-[var(--violet)]"
                      : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--violet)] hover:text-[var(--violet-dim)]",
                  ].join(" ")}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Stats bar */}
            {!loading && (
              <p className="text-xs text-[var(--text-tertiary)] mb-4">
                {total === 0
                  ? t("explore_no_results")
                  : t("explore_count", { count: total })}
              </p>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {loading && projects.length === 0
                ? Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))
                : projects.map((p) => (
                    <ProjectPublicCard
                      key={p.publicSlug ?? p.id}
                      project={p}
                      onFork={handleFork}
                    />
                  ))}
            </div>

            {/* Load more */}
            {hasMore && !loading && (
              <div className="flex justify-center mb-8">
                <button
                  onClick={handleLoadMore}
                  className="px-6 py-2.5 text-sm font-medium rounded-[var(--r-md)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-all"
                >
                  {t("explore_load_more")}
                </button>
              </div>
            )}

            {loading && projects.length > 0 && (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 rounded-full border-2 border-[var(--violet)] border-t-transparent animate-spin" />
              </div>
            )}

            {/* Empty state */}
            {!loading && projects.length === 0 && (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="text-5xl mb-4">🔭</div>
                <h2 className="font-display font-semibold text-xl text-[var(--text-primary)] mb-2">
                  {t("explore_empty_title")}
                </h2>
                <p className="text-sm text-[var(--text-secondary)] max-w-sm mb-6">
                  {t("explore_empty_desc")}
                </p>
                <Link
                  href="/new"
                  className="px-5 py-2.5 rounded-[var(--r-md)] bg-[var(--violet)] text-white text-sm font-semibold hover:bg-[var(--violet-dim)] transition-colors"
                >
                  {t("explore_empty_cta")}
                </Link>
              </div>
            )}
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <DataProvider>
      <ExploreContent />
    </DataProvider>
  );
}
