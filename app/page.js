"use client";

import Link from "next/link";
import { useProjectStore } from "@/lib/store/projectStore";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { TopBar } from "@/components/layout/Topbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { DataProvider } from "@/components/providers/DataProvider";
import { SavePromptModal } from "@/components/ui/SavePromptModal";

function DashboardContent() {
  const projects = useProjectStore((s) => s.projects);

  const active = projects.filter((p) => !p.completionDate);
  const completed = projects.filter((p) => p.completionDate);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <div>
                <h1 className="font-display font-semibold text-xl sm:text-2xl text-[var(--text-primary)]">
                  Dashboard
                </h1>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
                  {active.length === 0
                    ? "No active projects yet"
                    : `${active.length} active project${
                        active.length !== 1 ? "s" : ""
                      }`}
                </p>
              </div>
              <Link href="/new">
                <Button size="sm" className="gap-1.5 sm:gap-2">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 14 14"
                    fill="none"
                    className="sm:hidden"
                  >
                    <path
                      d="M7 1v12M1 7h12"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    className="hidden sm:block"
                  >
                    <path
                      d="M7 1v12M1 7h12"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="hidden sm:inline">New project</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </Link>
            </div>

            {/* Empty state */}
            {projects.length === 0 && <EmptyState />}

            {/* Active projects */}
            {active.length > 0 && (
              <section className="mb-8 sm:mb-10">
                <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-3 sm:mb-4">
                  Active
                </p>
                <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {active.map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                </div>
              </section>
            )}

            {/* Completed projects */}
            {completed.length > 0 && (
              <section className="pb-16 lg:pb-0">
                <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-3 sm:mb-4">
                  Shipped ✓
                </p>
                <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

export default function DashboardPage() {
  return (
    <DataProvider>
      <DashboardContent />
      <SavePromptModal />
    </DataProvider>
  );
}
