"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, SignInButton } from "@clerk/nextjs";
import { useProjectStore } from "@/lib/store/projectStore";

const navItems = [
  { href: "/", label: "Dashboard", icon: GridIcon },
  { href: "/new", label: "New Project", icon: PlusIcon },
  { href: "/settings", label: "Settings", icon: CogIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useUser();
  const projects = useProjectStore((s) => s.projects);
  const activeProjects = projects.filter((p) => !p.completionDate);

  return (
    <aside className="w-56 shrink-0 border-r border-[var(--border)] bg-[var(--bg-elevated)] flex flex-col h-full">
      {/* Nav */}
      <nav className="p-3 flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center gap-2.5 px-3 py-2 rounded-[var(--r-md)] text-sm",
                "transition-colors duration-[var(--dur-fast)]",
                active
                  ? "bg-[var(--violet-bg)] text-[var(--violet-dim)] font-medium"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]",
              ].join(" ")}
            >
              <Icon />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Active projects list */}
      {activeProjects.length > 0 && (
        <div className="px-3 pb-3 mt-2">
          <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider px-3 mb-2">
            Active
          </p>
          <div className="flex flex-col gap-0.5">
            {activeProjects.slice(0, 5).map((p) => (
              <Link
                key={p.id}
                href={`/project/${p.id}`}
                className={[
                  "flex items-center gap-2 px-3 py-1.5 rounded-[var(--r-md)] text-sm",
                  "transition-colors duration-[var(--dur-fast)]",
                  pathname === `/project/${p.id}`
                    ? "bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]",
                ].join(" ")}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--emerald)] shrink-0" />
                <span className="truncate">{p.projectTitle || "Untitled"}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1" />

      {/* Footer — sign-in nudge for guests, project count for members */}
      <div className="p-3 border-t border-[var(--border)]">
        {isLoaded && !isSignedIn ? (
          <SignInButton mode="modal">
            <button className="w-full rounded-[var(--r-md)] bg-[var(--violet-bg)] border border-[var(--violet)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--violet)] hover:text-white group">
              <p className="text-xs font-medium text-[var(--violet-dim)] group-hover:text-white transition-colors">
                ☁️ Save to cloud
              </p>
              <p className="text-xs text-[var(--text-tertiary)] group-hover:text-white/70 transition-colors mt-0.5">
                Sign in to keep your data
              </p>
            </button>
          </SignInButton>
        ) : (
          <p className="text-xs text-[var(--text-tertiary)] px-1">
            {activeProjects.length} active project
            {activeProjects.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </aside>
  );
}

function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect
        x="1"
        y="1"
        width="5.5"
        height="5.5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <rect
        x="8.5"
        y="1"
        width="5.5"
        height="5.5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <rect
        x="1"
        y="8.5"
        width="5.5"
        height="5.5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <rect
        x="8.5"
        y="8.5"
        width="5.5"
        height="5.5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path
        d="M7.5 2v11M2 7.5h11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
function CogIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M7.5 1v2M7.5 12v2M1 7.5h2M12 7.5h2M3.1 3.1l1.4 1.4M10.5 10.5l1.4 1.4M10.5 4.5l1.4-1.4M4.5 10.5l-1.4 1.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
