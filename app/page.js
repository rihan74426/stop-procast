"use client";

import Link from "next/link";
import { useProjectStore } from "@/lib/store/projectStore";

import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";

export default function DashboardPage() {
  const projects = useProjectStore((s) => s.projects);

  const active = projects.filter((p) => !p.completionDate);
  const completed = projects.filter((p) => p.completionDate);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-display font-semibold text-2xl text-[var(--text-primary)]">
                  Dashboard
                </h1>
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                  {active.length === 0
                    ? "No active projects yet"
                    : `${active.length} active project${
                        active.length !== 1 ? "s" : ""
                      }`}
                </p>
              </div>
              <Link href="/new">
                <Button size="md" className="gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M7 1v12M1 7h12"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                  New project
                </Button>
              </Link>
            </div>

            {/* Empty state */}
            {projects.length === 0 && <EmptyState />}

            {/* Active projects */}
            {active.length > 0 && (
              <section className="mb-10">
                <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-4">
                  Active
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {active.map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                </div>
              </section>
            )}

            {/* Completed projects */}
            {completed.length > 0 && (
              <section>
                <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-4">
                  Shipped ✓
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {completed.map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
