"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { DataProvider } from "@/components/providers/DataProvider";
import { CATEGORIES } from "@/lib/ai/publicize";
import { useI18n } from "@/lib/i18n";
import { getSessionId } from "@/lib/sessionId";
import { useTheme } from "@/lib/theme";
import { useUser, SignInButton } from "@clerk/nextjs";
import Image from "next/image";
import {
  FiSearch,
  FiStar,
  FiClock,
  FiArrowRight,
  FiGitBranch,
  FiHeart,
  FiEye,
  FiDownload,
  FiGrid,
  FiCompass,
  FiPlus,
} from "react-icons/fi";

// ─── Scope color map ─────────────────────────────────────────────────
const SCOPE_ACCENT = {
  lean: { color: "var(--emerald)", bg: "var(--emerald-bg)", label: "Lean" },
  standard: {
    color: "var(--violet)",
    bg: "var(--violet-bg)",
    label: "Standard",
  },
  ambitious: {
    color: "var(--amber)",
    bg: "var(--amber-bg)",
    label: "Ambitious",
  },
};

// ─── Minimal top nav ─────────────────────────────────────────────────
function ExploreNav() {
  const { theme, toggle } = useTheme();
  const { isSignedIn, isLoaded, user } = useUser();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled
          ? "color-mix(in srgb, var(--bg-elevated) 90%, transparent)"
          : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled
          ? "1px solid var(--border)"
          : "1px solid transparent",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="h-7 w-7 rounded-[var(--r-md)] overflow-hidden flex items-center justify-center shrink-0">
            <Image
              src="/favicon.png"
              alt="Momentum"
              width={28}
              height={28}
              className="object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <span className="font-display font-semibold text-sm tracking-tight text-[var(--text-primary)] group-hover:text-[var(--violet)] transition-colors">
            Momentum
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{
              background: "var(--violet-bg)",
              color: "var(--violet-dim)",
            }}
          >
            Explore
          </span>
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="hidden sm:flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-[var(--r-md)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-all"
          >
            <FiGrid size={12} />
            Dashboard
          </Link>
          <Link
            href="/new"
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-[var(--r-md)] text-white transition-all"
            style={{ background: "var(--violet)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--violet-dim)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--violet)")
            }
          >
            <FiPlus size={12} />
            <span className="hidden sm:inline">New Project</span>
          </Link>
          {/* Theme toggle */}
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="h-8 w-8 flex items-center justify-center rounded-[var(--r-md)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-all"
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          {isLoaded && !isSignedIn && (
            <SignInButton mode="modal">
              <button className="h-8 px-3 text-xs font-medium rounded-[var(--r-md)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-all">
                Sign in
              </button>
            </SignInButton>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Quality score ring ───────────────────────────────────────────────
function QualityRing({ score }) {
  if (!score) return null;
  const color =
    score >= 90
      ? "var(--emerald)"
      : score >= 80
      ? "var(--violet)"
      : "var(--amber)";
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div
      className="relative w-10 h-10 shrink-0"
      title={`Quality score: ${score}/100`}
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        className="-rotate-90 absolute inset-0"
      >
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke="var(--bg-muted)"
          strokeWidth="3"
        />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

// ─── Project card ─────────────────────────────────────────────────────
function ProjectCard({
  project,
  sessionId,
  onStar,
  onHelped,
  starringId,
  helpingId,
  index,
}) {
  const router = useRouter();
  const scope = SCOPE_ACCENT[project.scopeLevel] ?? SCOPE_ACCENT.standard;
  const hasStarred =
    typeof window !== "undefined" &&
    sessionStorage.getItem(`starred_${project.id}`) === "1";
  const hasHelped =
    typeof window !== "undefined" &&
    sessionStorage.getItem(`helped_${project.id}`) === "1";

  const handleCardClick = (e) => {
    // Don't navigate if clicking action buttons
    if (e.target.closest("button[data-action]")) return;
    router.push(`/project/${project.id}`);
  };

  const handleFork = (e) => {
    e.stopPropagation();
    try {
      sessionStorage.setItem(
        "momentum_fork_template",
        JSON.stringify({
          idea: `${project.projectTitle}: ${project.oneLineGoal}`,
          fromPublicSlug: project.publicSlug,
        })
      );
    } catch {}
    router.push("/new");
  };

  return (
    <article
      onClick={handleCardClick}
      className="group relative rounded-[var(--r-xl)] border cursor-pointer overflow-hidden"
      style={{
        borderColor: "var(--border)",
        background: "var(--bg-elevated)",
        animationDelay: `${index * 60}ms`,
        animation: "cardReveal 0.5s ease both",
        transition:
          "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow =
          "0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px color-mix(in srgb, var(--violet) 40%, transparent)";
        e.currentTarget.style.borderColor =
          "color-mix(in srgb, var(--violet) 50%, transparent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      {/* Scope color stripe */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{
          background: `linear-gradient(90deg, ${scope.color}, transparent)`,
        }}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
                style={{ background: scope.bg, color: scope.color }}
              >
                {scope.label}
              </span>
              {project.category && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    background: "var(--bg-muted)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  {project.category}
                </span>
              )}
            </div>
            <h3
              className="font-display font-semibold text-base leading-snug mb-1"
              style={{ color: "var(--text-primary)" }}
            >
              {project.projectTitle}
            </h3>
            <p
              className="text-xs leading-relaxed line-clamp-2"
              style={{ color: "var(--text-secondary)" }}
            >
              {project.oneLineGoal}
            </p>
          </div>
          <QualityRing score={project.publicQuality} />
        </div>

        {/* Phases preview — compact pills */}
        {project.phases?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {project.phases.slice(0, 4).map((ph, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: "var(--bg-subtle)",
                  color: "var(--text-tertiary)",
                  border: "1px solid var(--border)",
                }}
              >
                {ph.name}
              </span>
            ))}
            {project.phases.length > 4 && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: "var(--bg-subtle)",
                  color: "var(--text-tertiary)",
                  border: "1px solid var(--border)",
                }}
              >
                +{project.phases.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Tags */}
        {project.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {project.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  color: "var(--violet-dim)",
                  background: "var(--violet-bg)",
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-2 pt-3"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {/* Engagement */}
          <div
            className="flex items-center gap-3 text-[11px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            {(project.views ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <FiEye size={10} />
                {project.views}
              </span>
            )}
            <button
              data-action="star"
              onClick={(e) => {
                e.stopPropagation();
                onStar(project);
              }}
              disabled={starringId === project.id}
              className="flex items-center gap-1 transition-colors"
              style={{
                color: hasStarred ? "var(--amber)" : "var(--text-tertiary)",
              }}
              onMouseEnter={(e) =>
                !hasStarred && (e.currentTarget.style.color = "var(--amber)")
              }
              onMouseLeave={(e) =>
                !hasStarred &&
                (e.currentTarget.style.color = "var(--text-tertiary)")
              }
            >
              <FiStar size={10} className={hasStarred ? "fill-current" : ""} />
              {(project.stars ?? 0) > 0 ? project.stars : "Star"}
            </button>
            <button
              data-action="helped"
              onClick={(e) => {
                e.stopPropagation();
                onHelped(project);
              }}
              disabled={helpingId === project.id}
              className="flex items-center gap-1 transition-colors"
              style={{
                color: hasHelped ? "var(--coral)" : "var(--text-tertiary)",
              }}
              onMouseEnter={(e) =>
                !hasHelped && (e.currentTarget.style.color = "var(--coral)")
              }
              onMouseLeave={(e) =>
                !hasHelped &&
                (e.currentTarget.style.color = "var(--text-tertiary)")
              }
            >
              <FiHeart size={10} className={hasHelped ? "fill-current" : ""} />
              {(project.helpedCount ?? 0) > 0 ? project.helpedCount : "Helpful"}
            </button>
          </div>

          {/* Use template */}
          <button
            data-action="fork"
            onClick={handleFork}
            className="flex items-center gap-1 text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-all duration-200 px-2.5 py-1 rounded-[var(--r-md)]"
            style={{
              color: "var(--violet-dim)",
              background: "var(--violet-bg)",
              border: "1px solid var(--violet)",
            }}
          >
            <FiGitBranch size={10} />
            Use template
          </button>
        </div>
      </div>

      {/* Hover overlay: "View project" hint */}
      <div
        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200"
        style={{
          background: "color-mix(in srgb, var(--violet) 4%, transparent)",
        }}
      />
    </article>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────
function SkeletonCard({ delay = 0 }) {
  return (
    <div
      className="rounded-[var(--r-xl)] border p-5 animate-pulse"
      style={{
        borderColor: "var(--border)",
        background: "var(--bg-elevated)",
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <div
            className="h-3 rounded-full w-16 mb-2"
            style={{ background: "var(--bg-muted)" }}
          />
          <div
            className="h-4 rounded w-3/4 mb-2"
            style={{ background: "var(--bg-muted)" }}
          />
          <div
            className="h-3 rounded w-full mb-1"
            style={{ background: "var(--bg-muted)" }}
          />
          <div
            className="h-3 rounded w-2/3"
            style={{ background: "var(--bg-muted)" }}
          />
        </div>
        <div
          className="w-10 h-10 rounded-full"
          style={{ background: "var(--bg-muted)" }}
        />
      </div>
      <div className="flex gap-1.5 mb-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-5 w-14 rounded-full"
            style={{ background: "var(--bg-muted)" }}
          />
        ))}
      </div>
      <div className="h-px mb-3" style={{ background: "var(--bg-muted)" }} />
      <div className="flex justify-between">
        <div
          className="h-3 w-20 rounded"
          style={{ background: "var(--bg-muted)" }}
        />
        <div
          className="h-5 w-24 rounded-full"
          style={{ background: "var(--bg-muted)" }}
        />
      </div>
    </div>
  );
}

// ─── Animated counter ─────────────────────────────────────────────────
function AnimatedStat({ value, label }) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (!value) return;
    const start = Date.now();
    const duration = 1200;
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(ease * value));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className="font-display font-bold text-2xl sm:text-3xl tabular-nums leading-none"
        style={{ color: "var(--text-primary)" }}
      >
        {displayed.toLocaleString()}
      </span>
      <span
        className="text-[11px] uppercase tracking-widest"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────
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
  const [searchFocused, setSearchFocused] = useState(false);
  const searchTimer = useRef(null);
  const heroRef = useRef(null);

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  const fetchProjects = useCallback(
    async (opts = {}) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(opts.page ?? page),
          limit: "15",
          sort: opts.sort ?? sort,
          ...((opts.category ?? category) !== "All"
            ? { category: opts.category ?? category }
            : {}),
          ...(opts.query ?? query ? { q: opts.query ?? query } : {}),
        });
        const res = await fetch(`/api/explore?${params}`);
        const data = await res.json();
        if ((opts.page ?? page) === 1) {
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
  }, [category, sort, query]); // eslint-disable-line

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
    const next = page + 1;
    setPage(next);
    fetchProjects({ page: next });
  };

  const handleStar = async (project) => {
    const actor = sessionId;
    if (!actor) return;
    const key = `starred_${project.id}`;
    const alreadyStarred = sessionStorage.getItem(key) === "1";
    setStarringId(project.id);
    try {
      const res = await fetch(`/api/projects/${project.id}/engage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: alreadyStarred ? "unstar" : "star",
          actorId: actor,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        alreadyStarred
          ? sessionStorage.removeItem(key)
          : sessionStorage.setItem(key, "1");
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

  const totalStars = projects.reduce((s, p) => s + (p.stars ?? 0), 0);
  const totalViews = projects.reduce((s, p) => s + (p.views ?? 0), 0);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-surface)" }}>
      <ExploreNav />

      {/* ── Hero ── */}
      <section
        ref={heroRef}
        className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28"
      >
        {/* Ambient background orbs */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div
            className="absolute -top-20 left-1/4 w-[600px] h-[500px] rounded-full"
            style={{
              background:
                "radial-gradient(ellipse, color-mix(in srgb, var(--violet) 15%, transparent) 0%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />
          <div
            className="absolute top-40 right-1/4 w-[400px] h-[400px] rounded-full"
            style={{
              background:
                "radial-gradient(ellipse, color-mix(in srgb, var(--emerald) 10%, transparent) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
          <div
            className="absolute -bottom-10 left-1/3 w-[500px] h-[300px] rounded-full"
            style={{
              background:
                "radial-gradient(ellipse, color-mix(in srgb, var(--amber) 8%, transparent) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-8 text-center">
          {/* Eyebrow */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 border"
            style={{
              background: "var(--violet-bg)",
              color: "var(--violet-dim)",
              borderColor: "color-mix(in srgb, var(--violet) 30%, transparent)",
            }}
          >
            <FiCompass size={11} />
            Community Showcase
          </div>

          <h1
            className="font-display font-bold text-4xl sm:text-6xl leading-[1.06] tracking-tight mb-5"
            style={{ color: "var(--text-primary)" }}
          >
            Ideas turned into
            <br />
            <span style={{ color: "var(--violet)" }}>real projects</span>
          </h1>

          <p
            className="text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-10"
            style={{ color: "var(--text-secondary)" }}
          >
            Explore completed blueprints from the community. Find inspiration,
            fork a plan, or see how others tackled goals like yours.
          </p>

          {/* Search bar — hero-sized */}
          <div
            className="relative max-w-2xl mx-auto mb-12 transition-all duration-300"
            style={{
              filter: searchFocused
                ? "drop-shadow(0 0 20px color-mix(in srgb, var(--violet) 30%, transparent))"
                : "none",
            }}
          >
            <FiSearch
              className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors"
              size={16}
              style={{
                color: searchFocused ? "var(--violet)" : "var(--text-tertiary)",
              }}
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search projects, goals, technologies…"
              className="w-full h-14 pl-11 pr-5 text-sm rounded-[var(--r-xl)] border transition-all duration-300"
              style={{
                background: "var(--bg-elevated)",
                borderColor: searchFocused ? "var(--violet)" : "var(--border)",
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
            {searchInput && (
              <button
                onClick={() => handleSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: "var(--text-tertiary)" }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Stats strip */}
          {total > 0 && (
            <div className="flex items-center justify-center gap-8 sm:gap-16">
              <AnimatedStat value={total} label="Projects" />
              <div
                className="w-px h-8"
                style={{ background: "var(--border)" }}
              />
              <AnimatedStat value={totalStars} label="Stars" />
              <div
                className="w-px h-8"
                style={{ background: "var(--border)" }}
              />
              <AnimatedStat value={totalViews} label="Views" />
            </div>
          )}
        </div>
      </section>

      {/* ── Filters ── */}
      <div
        className="sticky top-14 z-40 border-b"
        style={{
          background: "color-mix(in srgb, var(--bg-surface) 92%, transparent)",
          backdropFilter: "blur(16px)",
          borderColor: "var(--border)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex items-center gap-0 py-1 overflow-x-auto scrollbar-hide">
            {/* Sort toggles */}
            <div className="flex items-center gap-0.5 mr-4 shrink-0">
              {[
                { id: "quality", icon: FiStar, label: "Top" },
                { id: "recent", icon: FiClock, label: "New" },
                { id: "stars", icon: FiHeart, label: "Stars" },
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => handleSortChange(id)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-[var(--r-md)] transition-all"
                  style={{
                    background:
                      sort === id ? "var(--violet-bg)" : "transparent",
                    color:
                      sort === id
                        ? "var(--violet-dim)"
                        : "var(--text-tertiary)",
                  }}
                >
                  <Icon size={11} />
                  {label}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div
              className="w-px h-5 mr-4 shrink-0"
              style={{ background: "var(--border)" }}
            />

            {/* Category pills */}
            <div className="flex items-center gap-1.5 py-2 overflow-x-auto scrollbar-hide">
              {["All", ...CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className="px-3 py-1 text-xs font-medium rounded-[var(--r-full)] border whitespace-nowrap shrink-0 transition-all"
                  style={{
                    background:
                      category === cat ? "var(--violet)" : "transparent",
                    color: category === cat ? "white" : "var(--text-tertiary)",
                    borderColor:
                      category === cat ? "var(--violet)" : "var(--border)",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Count */}
            {!loading && (
              <span
                className="ml-auto pl-4 shrink-0 text-xs tabular-nums"
                style={{ color: "var(--text-tertiary)" }}
              >
                {total.toLocaleString()} {total === 1 ? "project" : "projects"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Grid ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* Active search indicator */}
        {query && !loading && (
          <div className="mb-6 flex items-center gap-3">
            <span
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Results for{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                "{query}"
              </strong>
            </span>
            <button
              onClick={() => handleSearch("")}
              className="text-xs px-2 py-0.5 rounded-full border"
              style={{
                color: "var(--text-tertiary)",
                borderColor: "var(--border)",
              }}
            >
              Clear
            </button>
          </div>
        )}

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {loading && projects.length === 0
            ? Array.from({ length: 9 }).map((_, i) => (
                <SkeletonCard key={i} delay={i * 50} />
              ))
            : projects.map((p, i) => (
                <ProjectCard
                  key={p.publicSlug ?? p.id}
                  project={p}
                  sessionId={sessionId}
                  onStar={handleStar}
                  onHelped={handleHelped}
                  starringId={starringId}
                  helpingId={helpingId}
                  index={i}
                />
              ))}
        </div>

        {/* Load more */}
        {hasMore && !loading && (
          <div className="flex justify-center mt-12">
            <button
              onClick={handleLoadMore}
              className="group flex items-center gap-2 px-8 py-3 rounded-[var(--r-full)] border text-sm font-medium transition-all duration-200"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-secondary)",
                background: "var(--bg-elevated)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--violet)";
                e.currentTarget.style.color = "var(--violet-dim)";
                e.currentTarget.style.background = "var(--violet-bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.background = "var(--bg-elevated)";
              }}
            >
              Load more projects
              <FiArrowRight
                size={13}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </button>
          </div>
        )}

        {loading && projects.length > 0 && (
          <div className="flex justify-center mt-8">
            <div
              className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
              style={{
                borderColor: "var(--violet)",
                borderTopColor: "transparent",
              }}
            />
          </div>
        )}

        {/* Empty state */}
        {!loading && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div
              className="w-20 h-20 rounded-[var(--r-xl)] flex items-center justify-center mb-6"
              style={{
                background: "var(--bg-elevated)",
                border: "2px dashed var(--border)",
              }}
            >
              <FiCompass size={28} style={{ color: "var(--text-tertiary)" }} />
            </div>
            <h2
              className="font-display font-semibold text-xl mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              {query
                ? "No projects match your search"
                : "The gallery is waiting"}
            </h2>
            <p
              className="text-sm max-w-xs leading-relaxed mb-8"
              style={{ color: "var(--text-secondary)" }}
            >
              {query
                ? "Try different keywords or browse all categories."
                : "Be the first to complete a project and share it with the community."}
            </p>
            {query ? (
              <button
                onClick={() => handleSearch("")}
                className="px-5 py-2 rounded-[var(--r-md)] text-sm font-medium"
                style={{ background: "var(--violet)", color: "white" }}
              >
                Clear search
              </button>
            ) : (
              <Link
                href="/new"
                className="px-6 py-2.5 rounded-[var(--r-md)] text-sm font-semibold text-white"
                style={{ background: "var(--violet)" }}
              >
                Start a project
              </Link>
            )}
          </div>
        )}
      </main>

      {/* ── CTA footer band ── */}
      <section
        className="border-t mt-8 py-16 sm:py-20"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-elevated)",
        }}
      >
        <div className="max-w-2xl mx-auto px-4 sm:px-8 text-center">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-[var(--r-xl)] mb-5"
            style={{ background: "var(--violet-bg)" }}
          >
            <FiGitBranch size={20} style={{ color: "var(--violet)" }} />
          </div>
          <h2
            className="font-display font-bold text-2xl sm:text-3xl mb-3"
            style={{ color: "var(--text-primary)" }}
          >
            Ready to build something?
          </h2>
          <p
            className="text-sm mb-8 leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Fork any project above as your template, or start fresh with
            AI-powered planning.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/new"
              className="inline-flex items-center gap-2 h-11 px-8 rounded-[var(--r-md)] text-sm font-semibold text-white transition-all w-full sm:w-auto justify-center"
              style={{ background: "var(--violet)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--violet-dim)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "var(--violet)")
              }
            >
              <FiPlus size={14} />
              Start a new project
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 h-11 px-6 rounded-[var(--r-md)] text-sm font-medium border transition-all w-full sm:w-auto justify-center"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-secondary)",
                background: "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-subtle)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              <FiGrid size={13} />
              Go to dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* ── Minimal footer ── */}
      <footer
        className="border-t py-6 text-center"
        style={{ borderColor: "var(--border)", color: "var(--text-tertiary)" }}
      >
        <p className="text-xs">
          © {new Date().getFullYear()} Momentum ·{" "}
          <Link
            href="/"
            className="hover:underline"
            style={{ color: "var(--violet)" }}
          >
            Home
          </Link>
          {" · "}
          <Link href="/feedback" className="hover:underline">
            Feedback
          </Link>
          {" · "}
          <a
            href="https://nuruddin-webician.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Built by Nuruddin
          </a>
        </p>
      </footer>

      {/* Keyframes */}
      <style>{`
        @keyframes cardReveal {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
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

// ─── Icon helpers ────────────────────────────────────────────────────
function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M11.54 4.46l-1.41 1.41M4.95 11.54l-1.41 1.41"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path
        d="M13.5 9A6 6 0 0 1 7 2.5a6 6 0 1 0 6.5 6.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
