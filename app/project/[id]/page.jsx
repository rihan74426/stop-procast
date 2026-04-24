"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useProjectStore } from "@/lib/store/projectStore";
import { DataProvider } from "@/components/providers/DataProvider";
import { SavePromptModal } from "@/components/ui/SavePromptModal";
import { TopBar } from "@/components/layout/Topbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { NextAction } from "@/components/project/NextAction";
import { PhaseTimeline } from "@/components/project/PhaseTimeline";
import { TaskList } from "@/components/project/TaskList";
import { BlockerPanel } from "@/components/project/BlockerPanel";
import { StreakBanner } from "@/components/project/StreakBanner";
import { ProjectPressure } from "@/components/project/ProjectPressure";
import { EmailExportModal } from "@/components/project/EmailExportModal";
import { ProgressRing } from "@/components/ui/Progress";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { overallProgress } from "@/lib/utils/progress";
import { formatDate, projectAgeLabel } from "@/lib/utils/date";
import { useI18n } from "@/lib/i18n";

function toBase64Safe(str) {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}

function ProjectContent({ id }) {
  const router = useRouter();
  const { t } = useI18n();
  const project = useProjectStore((s) => s.getProject(id));
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const completeProject = useProjectStore((s) => s.completeProject);
  const [showEmailExport, setShowEmailExport] = useState(false);

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="text-[var(--text-secondary)] mb-4">
            {t("project_not_found")}
          </p>
          <Link href="/">
            <Button variant="ghost">← {t("nav_dashboard")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const progress = overallProgress(project);
  const isCompleted = !!project.completionDate;

  const handleDelete = () => {
    if (confirm(`Delete "${project.projectTitle}"? This cannot be undone.`)) {
      deleteProject(id);
      router.push("/");
    }
  };

  const handleComplete = () => {
    if (confirm("Mark this project as complete?")) {
      completeProject(id);
      router.push(`/project/${id}/complete`);
    }
  };

  const handleExport = (format = "json") => {
    const encoded = toBase64Safe(JSON.stringify(project));
    window.location.href = `/project/${id}/export?format=${format}&data=${encoded}`;
  };

  const handleExportPDF = async () => {
    try {
      const { exportProjectPDF } = await import("@/lib/utils/exportPDF");
      await exportProjectPDF(project);
    } catch (err) {
      console.error("PDF export failed:", err);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--text-tertiary)] mb-5 sm:mb-6">
              <Link
                href="/"
                className="hover:text-[var(--text-primary)] transition-colors shrink-0"
              >
                {t("nav_dashboard")}
              </Link>
              <span>/</span>
              <span className="text-[var(--text-primary)] truncate">
                {project.projectTitle}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_300px]">
              {/* Left column */}
              <div className="flex flex-col gap-5 sm:gap-6 min-w-0">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h1 className="font-display font-semibold text-2xl sm:text-3xl text-[var(--text-primary)] leading-tight">
                      {project.projectTitle}
                    </h1>
                    <ProgressRing
                      value={progress}
                      size={48}
                      strokeWidth={4}
                      label={`${progress}%`}
                      className="shrink-0 sm:hidden"
                    />
                    <ProgressRing
                      value={progress}
                      size={56}
                      strokeWidth={5}
                      label={`${progress}%`}
                      className="shrink-0 hidden sm:flex"
                    />
                  </div>
                  <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                    {project.oneLineGoal}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="slate">
                      {projectAgeLabel(project.createdAt)}
                    </Badge>
                    {project.timeline && (
                      <Badge variant="slate">
                        {t("project_target", {
                          date:
                            formatDate(project.timeline) || project.timeline,
                        })}
                      </Badge>
                    )}
                    {isCompleted && <Badge status="completed">✓ Done</Badge>}
                  </div>
                </div>

                <ProjectPressure project={project} />
                <StreakBanner project={project} />

                <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:p-5">
                  <PhaseTimeline project={project} />
                </div>

                {!isCompleted && <NextAction project={project} />}

                <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:p-5">
                  <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-4">
                    {t("project_all_tasks")}
                  </p>
                  <TaskList project={project} />
                </div>
              </div>

              {/* Right column */}
              <div className="flex flex-col gap-4 sm:gap-5 pb-16 lg:pb-0">
                {/* Stats */}
                <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:p-5">
                  <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-3 sm:mb-4">
                    {t("project_stats")}
                  </p>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-2 sm:gap-3">
                    {[
                      {
                        label: t("project_done"),
                        value: project.tasks.filter((t) => t.status === "done")
                          .length,
                      },
                      {
                        label: t("project_todo"),
                        value: project.tasks.filter((t) => t.status === "todo")
                          .length,
                      },
                      {
                        label: t("project_blocked"),
                        value: project.tasks.filter(
                          (t) => t.status === "blocked"
                        ).length,
                      },
                      {
                        label: t("project_streak"),
                        value: `${project.streakDays}d`,
                      },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="rounded-[var(--r-md)] bg-[var(--bg-surface)] p-2 sm:p-3 text-center sm:text-left"
                      >
                        <p className="text-xs text-[var(--text-tertiary)] mb-0.5 sm:mb-1">
                          {label}
                        </p>
                        <p className="text-base sm:text-lg font-display font-semibold text-[var(--text-primary)]">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {project.successCriteria?.length > 0 && (
                  <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:p-5">
                    <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-3">
                      {t("project_success_criteria")}
                    </p>
                    <ul className="flex flex-col gap-2">
                      {project.successCriteria.map((c, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"
                        >
                          <span className="text-[var(--emerald)] mt-0.5 shrink-0">
                            ✓
                          </span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:p-5">
                  <BlockerPanel project={project} />
                </div>

                {project.toolsSuggested?.length > 0 && (
                  <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:p-5">
                    <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-3">
                      {t("project_tools")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {project.toolsSuggested.map((tool, i) => (
                        <Badge key={i} variant="slate">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:p-5 flex flex-col gap-2">
                  <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-1">
                    {t("project_actions")}
                  </p>
                  {!isCompleted && (
                    <Button
                      variant="emerald"
                      onClick={handleComplete}
                      className="w-full justify-center"
                    >
                      {t("project_mark_shipped")}
                    </Button>
                  )}
                  {/* Email export — requires auth (handled inside modal) */}
                  <Button
                    variant="ghost"
                    onClick={() => setShowEmailExport(true)}
                    className="w-full justify-center"
                  >
                    ✉️ {t("project_export_email")}
                  </Button>
                  {/* PDF and file exports available to all */}
                  <Button
                    variant="ghost"
                    onClick={handleExportPDF}
                    className="w-full justify-center"
                  >
                    {t("project_export_pdf")}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleExport("markdown")}
                    className="w-full justify-center"
                  >
                    {t("project_export_md")}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleDelete}
                    className="w-full justify-center"
                  >
                    {t("project_delete")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <Footer />
        </main>
      </div>

      <EmailExportModal
        open={showEmailExport}
        onClose={() => setShowEmailExport(false)}
        project={project}
      />
      <SavePromptModal />
    </div>
  );
}

export default function ProjectPage({ params }) {
  const { id } = use(params);
  return (
    <DataProvider>
      <ProjectContent id={id} />
    </DataProvider>
  );
}
