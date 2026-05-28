"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useUser, SignInButton } from "@clerk/nextjs";
import { useProjectStore } from "@/lib/store/projectStore";
import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/context";
import {
  FiGrid,
  FiPlus,
  FiSettings,
  FiMenu,
  FiX,
  FiMessageSquare,
  FiCompass,
} from "react-icons/fi";
import { FaCloud } from "react-icons/fa";

const FEEDBACK_SEEN_KEY = "momentum_feedback_seen";

export function Sidebar() {
  const { t } = useI18n();
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useUser();
  const projects = useProjectStore((s) => s.projects);
  const activeProjects = projects.filter((p) => !p.completionDate);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [feedbackSeen, setFeedbackSeen] = useState(true);

  useEffect(() => {
    try {
      setFeedbackSeen(!!localStorage.getItem(FEEDBACK_SEEN_KEY));
    } catch {
      setFeedbackSeen(true);
    }
  }, []);

  useEffect(() => {
    if (pathname === "/feedback") {
      try {
        localStorage.setItem(FEEDBACK_SEEN_KEY, "1");
        setFeedbackSeen(true);
      } catch {}
    }
  }, [pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const showFeedbackBadge = !feedbackSeen && pathname !== "/feedback";

  // Dashboard href: /dashboard for authed users, / for guests
  const dashHref = "/dashboard";
  const dashActive = pathname === "/dashboard" || pathname === "/";

  const navItems = [
    { href: "/", label: t("nav_dashboard"), icon: FiGrid },
    { href: "/new", label: t("nav_new_project"), icon: FiPlus },
    { href: "/feedback", label: "Feedback", icon: FiMessageSquare },
    { href: "/settings", label: t("nav_settings"), icon: FiSettings },
  ];

  const SidebarContent = ({ onClose }) => (
    <div className="flex flex-col h-full w-56">
      {/* Mobile header */}
      {onClose && (
        <div className="flex items-center justify-between px-3 py-3 border-b border-[var(--border)] lg:hidden">
          <div className="flex items-center gap-2">
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
                loading="lazy" // ADD THIS
              />
            </div>
            <span className="font-display font-semibold text-sm text-[var(--text-primary)]">
              Momentum
            </span>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 flex items-center justify-center rounded-[var(--r-md)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
            aria-label="Close menu"
          >
            <FiX size={16} />
          </button>
        </div>
      )}

      {/* Desktop logo */}
      <div className="hidden lg:flex items-center gap-2 px-4 py-4 border-b border-[var(--border)]">
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
            loading="lazy" // ADD THIS
          />
        </div>
        <span className="font-display font-semibold text-sm tracking-tight text-[var(--text-primary)]">
          Momentum
        </span>
      </div>

      {/* Nav */}
      <nav className="p-3 flex flex-col gap-0.5" aria-label="Main navigation">
        {navItems.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={href + label}
            href={href}
            onClick={onClose}
            className={[
              "flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--r-md)] text-sm",
              "transition-colors duration-[var(--dur-fast)]",
              "min-h-[var(--touch-min)] lg:min-h-0",
              active
                ? "bg-[var(--violet-bg)] text-[var(--violet-dim)] font-medium"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]",
            ].join(" ")}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={15} className="shrink-0" />
            <span className="truncate">{label}</span>
            {href === "/feedback" && showFeedbackBadge && (
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--violet-bg)] text-[var(--violet-dim)] font-medium shrink-0">
                new
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Active projects quick-links */}
      {activeProjects.length > 0 && (
        <div className="px-3 pb-3 mt-1">
          <p className="text-[10px] text-[var(--text-tertiary)] font-semibold uppercase tracking-widest px-3 mb-2">
            {t("nav_active")}
          </p>
          <div className="flex flex-col gap-0.5">
            {activeProjects.slice(0, 5).map((p) => (
              <Link
                key={p.id}
                href={`/project/${p.id}`}
                onClick={onClose}
                className={[
                  "flex items-center gap-2 px-3 py-2 rounded-[var(--r-md)] text-sm",
                  "transition-colors duration-[var(--dur-fast)]",
                  "min-h-[var(--touch-min)] lg:min-h-0",
                  pathname === `/project/${p.id}`
                    ? "bg-[var(--bg-subtle)] text-[var(--text-primary)] font-medium"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]",
                ].join(" ")}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--emerald)] shrink-0" />
                <span className="truncate min-w-0">
                  {p.projectTitle || "Untitled"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1" />

      {/* Footer */}
      <div className="p-3 border-t border-[var(--border)]">
        {isLoaded && !isSignedIn ? (
          <SignInButton mode="modal">
            <button className="w-full rounded-[var(--r-md)] bg-[var(--violet-bg)] border border-[var(--violet)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--violet)] hover:text-white group">
              <p className="text-xs font-semibold text-[var(--violet-dim)] group-hover:text-white transition-colors flex items-center gap-1.5">
                <FaCloud className="shrink-0" /> {t("nav_sign_in")}
              </p>
              <p className="text-xs text-[var(--text-tertiary)] group-hover:text-white/70 transition-colors mt-0.5">
                Sign in to keep your data
              </p>
            </button>
          </SignInButton>
        ) : (
          <p className="text-xs text-[var(--text-tertiary)] px-1">
            {activeProjects.length}{" "}
            {activeProjects.length !== 1
              ? t("dash_active_projects_plural")
              : t("dash_active_projects")}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 shrink-0 border-r border-[var(--border)] bg-[var(--bg-elevated)] flex-col h-full">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{
            background: "rgba(12,12,15,0.6)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 w-64 bg-[var(--bg-elevated)] border-r border-[var(--border)] flex flex-col",
          "transition-transform duration-300 ease-[var(--ease-smooth)] lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        aria-label="Navigation"
        aria-hidden={!mobileOpen}
      >
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Mobile FAB */}
      <button
        onClick={() => setMobileOpen(true)}
        style={{ backgroundColor: "#7F77DD" }}
        className={[
          "fixed bottom-5 left-4 z-30 lg:hidden",
          "h-12 w-12 rounded-full text-white shadow-[var(--shadow-lg)]",
          "flex items-center justify-center transition-all duration-200",
          "hover:opacity-90 active:scale-95",
          mobileOpen
            ? "opacity-0 pointer-events-none scale-90"
            : "opacity-100 scale-100",
        ].join(" ")}
        aria-label="Open navigation menu"
      >
        <FiMenu size={18} />
      </button>
    </>
  );
}
