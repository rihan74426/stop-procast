"use client";

import { useState } from "react";
import Link from "next/link";
import { useProjectStore } from "@/lib/store/projectStore";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { TopBar } from "@/components/layout/Topbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { DataProvider } from "@/components/providers/DataProvider";
import { SavePromptModal } from "@/components/ui/SavePromptModal";
import { ImportProjectModal } from "@/components/project/ImportProjectModal";
import { useI18n } from "@/lib/i18n";

function DashboardContent() {
  const { t } = useI18n();
  const projects = useProjectStore((s) => s.projects);
  const active = projects.filter((p) => !p.completionDate);
  const completed = projects.filter((p) => p.completionDate);
  const [showImport, setShowImport] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <div>
                <h1 className="font-display font-semibold text-xl sm:text-2xl text-[var(--text-primary)]">
                  {t("dashboard_title")}
                </h1>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
                  {active.length === 0
                    ? t("dashboard_no_active")
                    : active.length === 1
                    ? t("dashboard_active_count", { count: 1 })
                    : t("dashboard_active_count_plural", {
                        count: active.length,
                      })}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Import button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowImport(true)}
                  className="gap-1.5"
                  title="Import a project from JSON"
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M7 1v8M4 6l3 3 3-3M2 11h10"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="hidden sm:inline">Import</span>
                </Button>

                <Link href="/new">
                  <Button size="sm" className="gap-1.5 sm:gap-2">
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M7 1v12M1 7h12"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="hidden sm:inline">
                      {t("dashboard_new_project")}
                    </span>
                    <span className="sm:hidden">{t("dashboard_new")}</span>
                  </Button>
                </Link>
              </div>
            </div>

            {projects.length === 0 && <EmptyState />}

            {active.length > 0 && (
              <section className="mb-8 sm:mb-10">
                <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-3 sm:mb-4">
                  {t("dashboard_active")}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {active.map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                </div>
              </section>
            )}

            {completed.length > 0 && (
              <section className="pb-16 lg:pb-4">
                <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-3 sm:mb-4">
                  {t("dashboard_shipped")}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {completed.map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                </div>
              </section>
            )}
          </div>
          {projects.length > 0 && <Footer />}
        </main>
      </div>

      <ImportProjectModal
        open={showImport}
        onClose={() => setShowImport(false)}
      />
      <SavePromptModal />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DataProvider>
      <DashboardContent />
    </DataProvider>
  );
}
