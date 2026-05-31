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
import { getSessionId } from "@/lib/sessionId";
import {
  FiSearch,
  FiStar,
  FiClock,
  FiEye,
  FiHeart,
  FiDownload,
  FiGitBranch,
} from "react-icons/fi";

const SCOPE_COLOR = {
  lean: "emerald",
  standard: "violet",
  ambitious: "amber",
};

// ─── Engagement bar ───────────────────────────────────────────────────

function EngagementBar({
  project,
  sessionId,
  onStar,
  onHelped,
  starring,
  helping,
}) {
  const hasStarred =
    typeof window !== "undefined" &&
    sessionStorage.getItem(`starred_${project.id}`) === "1";
  const hasHelped =
    typeof window !== "undefined" &&
    sessionStorage.getItem(`helped_${project.id}`) === "1";

  return (
    <div className="flex items-center gap-3 text-[10px] text-[var(--text-tertiary)]">
      {/* Views */}
      {(project.views ?? 0) > 0 && (
        <span className="flex items-center gap-1">
          <FiEye size={10} />
          {project.views}
        </span>
      )}

      {/* Stars */}
      <button
        onClick={() => onStar(project)}
        disabled={starring}
        title="Star this project"
        className={[
          "flex items-center gap-1 transition-colors",
          hasStarred
            ? "text-[var(--amber)] font-semibold"
            : "hover:text-[var(--amber)]",
        ].join(" ")}
      >
        <FiStar size={10} className={hasStarred ? "fill-current" : ""} />
        {(project.stars ?? 0) > 0 ? project.stars : "Star"}
      </button>

      {/* Helped */}
      <button
        onClick={() => onHelped(project)}
        disabled={helping}
        title="Mark as helpful"
        className={[
          "flex items-center gap-1 transition-colors",
          hasHelped
            ? "text-[var(--coral)] font-semibold"
            : "hover:text-[var(--coral)]",
        ].join(" ")}
      >
        <FiHeart size={10} className={hasHelped ? "fill-current" : ""} />
        {(project.helpedCount ?? 0) > 0 ? project.helpedCount : "Helpful"}
      </button>

      {/* Exports */}
      {(project.exportCount ?? 0) > 0 && (
        <span className="flex items-center gap-1">
          <FiDownload size={10} />
          {project.exportCount}
        </span>
      )}
    </div>
  );
}

// ─── Project card ─────────────────────────────────────────────────────

function ProjectPublicCard({
  project,
  sessionId,
  onFork,
  onStar,
  onHelped,
  starringId,
  helpingId,
}) {
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
        {project.publicQuality != null && (
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
        )}
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
      <div className="flex items-center justify-between pt-1 border-t border-[var(--border)] mt-auto gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant={SCOPE_COLOR[project.scopeLevel] ?? "slate"}>
            {project.scopeLevel}
          </Badge>
          {project.timeline && (
            <span className="text-[10px] text-[var(--text-tertiary)] truncate">
              {project.timeline}
            </span>
          )}
        </div>
        <button
          onClick={() => onFork(project)}
          className="flex items-center gap-1 text-xs font-medium text-[var(--violet)] hover:underline transition-colors shrink-0"
        >
          <FiGitBranch size={11} />
          Use template
        </button>
      </div>

      {/* Engagement row */}
      <EngagementBar
        project={project}
        sessionId={sessionId}
        onStar={onStar}
        onHelped={onHelped}
        starring={starringId === project.id}
        helping={helpingId === project.id}
      />
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
  const [sessionId, setSessionId] = useState(null);
  const [starringId, setStarringId] = useState(null);
  const [helpingId, setHelpingId] = useState(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

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

  const handleStar = async (project) => {
    const actor = sessionId;
    if (!actor) return;
    const key = `starred_${project.id}`;
    const alreadyStarred = sessionStorage.getItem(key) === "1";
    const action = alreadyStarred ? "unstar" : "star";

    setStarringId(project.id);
    try {
      const res = await fetch(`/api/projects/${project.id}/engage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, actorId: actor }),
      });
      const data = await res.json();
      if (data.ok) {
        if (alreadyStarred) {
          sessionStorage.removeItem(key);
        } else {
          sessionStorage.setItem(key, "1");
        }
        // Update local state
        setProjects((prev) =>
          prev.map((p) =>
            p.id === project.id ? { ...p, stars: data.stars } : p
          )
        );
      }
    } catch {
      /* silent */
    } finally {
      setStarringId(null);
    }
  };

  const handleHelped = async (project) => {
    const actor = sessionId;
    if (!actor) return;
    const key = `helped_${project.id}`;
    if (sessionStorage.getItem(key) === "1") return;

    setHelpingId(project.id);
    try {
      const res = await fetch(`/api/projects/${project.id}/engage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "helped", actorId: actor }),
      });
      const data = await res.json();
      if (data.ok && !data.alreadyMarked) {
        sessionStorage.setItem(key, "1");
        setProjects((prev) =>
          prev.map((p) =>
            p.id === project.id ? { ...p, helpedCount: data.helpedCount } : p
          )
        );
      }
    } catch {
      /* silent */
    } finally {
      setHelpingId(null);
    }
  };

  const hasMore = projects.length < total;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-[var(--text-primary)] mb-1">
                {t("explore_title")}
              </h1>
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
                  { id: "quality", icon: FiStar, label: "Top rated" },
                  { id: "recent", icon: FiClock, label: "Recent" },
                  { id: "stars", icon: FiStar, label: "Stars" },
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
                  ? "No projects found"
                  : `${total} project${total !== 1 ? "s" : ""}`}
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
                      sessionId={sessionId}
                      onFork={handleFork}
                      onStar={handleStar}
                      onHelped={handleHelped}
                      starringId={starringId}
                      helpingId={helpingId}
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
                  Load more
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
                <div className="w-16 h-16 rounded-2xl bg-[var(--bg-subtle)] flex items-center justify-center mb-4">
                  <FiSearch size={24} className="text-[var(--text-tertiary)]" />
                </div>
                <h2 className="font-display font-semibold text-xl text-[var(--text-primary)] mb-2">
                  No projects yet
                </h2>
                <p className="text-sm text-[var(--text-secondary)] max-w-sm mb-6">
                  Be the first to share a completed project with the community.
                </p>
                <Link
                  href="/new"
                  className="px-5 py-2.5 rounded-[var(--r-md)] bg-[var(--violet)] text-white text-sm font-semibold hover:bg-[var(--violet-dim)] transition-colors"
                >
                  Start a project
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
