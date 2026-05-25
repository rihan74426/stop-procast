"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProjectStore } from "@/lib/store/projectStore";
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
import { Modal } from "@/components/ui/Modal";
import { overallProgress } from "@/lib/utils/progress";
import { formatDate, projectAgeLabel } from "@/lib/utils/date";
import {
  exportProjectMarkdown,
  exportProjectJSON,
} from "@/lib/utils/exportMarkdown";
import { useI18n } from "@/lib/i18n";
import { toast } from "@/lib/toast";
import {
  FaFilePdf,
  FaJs,
  FaMailBulk,
  FaMarkdown,
  FaRocket,
} from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { DataProvider } from "@/components/providers/DataProvider";

function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  confirmVariant = "danger",
  loading,
}) {
  const { t } = useI18n();
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col gap-5">
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {description}
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {t("common_cancel")}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ProjectPageClient({ id }) {
  const router = useRouter();
  const { t } = useI18n();

  const project = useProjectStore((s) => s.getProject(id));
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const completeProject = useProjectStore((s) => s.completeProject);

  const [showEmailExport, setShowEmailExport] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    type: null,
    loading: false,
  });

  const openConfirm = useCallback((type) => {
    setConfirmModal({ open: true, type, loading: false });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmModal((s) => ({ ...s, open: false, loading: false }));
  }, []);

  const handleConfirmAction = useCallback(async () => {
    setConfirmModal((s) => ({ ...s, loading: true }));
    try {
      if (confirmModal.type === "delete") {
        await deleteProject(id);
        router.push("/");
      } else if (confirmModal.type === "complete") {
        await completeProject(id);
        router.push(`/project/${id}/complete`);
      }
    } catch {
      setConfirmModal({ open: false, type: null, loading: false });
      toast.error(
        confirmModal.type === "delete"
          ? t("toast_delete_error")
          : t("toast_complete_error")
      );
    }
  }, [confirmModal.type, deleteProject, completeProject, id, router, t]);

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

  const handleExportMarkdown = () => {
    try {
      exportProjectMarkdown(project);
    } catch {
      toast.error(t("toast_export_md_error"));
    }
  };

  const handleExportJSON = () => {
    try {
      exportProjectJSON(project);
    } catch {
      toast.error(t("toast_export_json_error"));
    }
  };

  const handleExportPDF = async () => {
    const toastId = toast.loading(t("toast_export_pdf_generating"));
    try {
      const { exportProjectPDF } = await import("@/lib/utils/exportPDF");
      await exportProjectPDF(project);
      toast.dismiss(toastId);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(t("toast_export_pdf_error"));
    }
  };

  const confirmConfig = {
    delete: {
      title: t("confirm_delete_title"),
      description: t("confirm_delete_desc", { title: project.projectTitle }),
      confirmLabel: t("confirm_delete_label"),
      confirmVariant: "danger",
    },
    complete: {
      title: t("confirm_complete_title"),
      description: t("confirm_complete_desc", { title: project.projectTitle }),
      confirmLabel: t("confirm_complete_label"),
      confirmVariant: "emerald",
    },
  };

  const activeConfig = confirmModal.type
    ? confirmConfig[confirmModal.type]
    : null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] mb-4 sm:mb-6 min-w-0">
              <Link
                href="/"
                className="hover:text-[var(--text-primary)] transition-colors shrink-0"
              >
                {t("nav_dashboard")}
              </Link>
              <span className="shrink-0">/</span>
              <span className="text-[var(--text-primary)] truncate min-w-0">
                {project.projectTitle}
              </span>
            </div>

            {/* Responsive two-column layout */}
            <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-[1fr_260px] xl:grid-cols-[1fr_280px]">
              {/* ── Left column ── */}
              <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
                {/* Project header */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h1 className="font-display font-semibold text-xl sm:text-3xl text-[var(--text-primary)] leading-tight flex-1 min-w-0">
                      {project.projectTitle}
                    </h1>
                    <ProgressRing
                      value={progress}
                      size={48}
                      strokeWidth={4}
                      label={`${progress}%`}
                      className="shrink-0"
                    />
                  </div>
                  {project.oneLineGoal && (
                    <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                      {project.oneLineGoal}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
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
                    {isCompleted && (
                      <Badge status="completed">✓ {t("project_done")}</Badge>
                    )}
                  </div>
                </div>

                <ProjectPressure project={project} />
                <StreakBanner project={project} />

                <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:p-5">
                  <PhaseTimeline project={project} />
                </div>

                {!isCompleted && <NextAction project={project} />}

                <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:p-5">
                  <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-widest mb-3 sm:mb-4">
                    {t("project_all_tasks")}
                  </p>
                  <TaskList project={project} />
                </div>
              </div>

              {/* ── Right column ── */}
              <div className="flex flex-col gap-3 sm:gap-4 pb-20 lg:pb-0">
                {/* Stats */}
                <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
                  <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-widest mb-3">
                    {t("project_stats")}
                  </p>
                  <div className="grid grid-cols-4 gap-2 lg:grid-cols-2">
                    {[
                      {
                        label: t("project_done"),
                        value: project.tasks.filter((t) => t.status === "done")
                          .length,
                        color: "var(--emerald)",
                      },
                      {
                        label: t("project_todo"),
                        value: project.tasks.filter((t) => t.status === "todo")
                          .length,
                        color: "var(--text-primary)",
                      },
                      {
                        label: t("project_blocked"),
                        value: project.tasks.filter(
                          (t) => t.status === "blocked"
                        ).length,
                        color: "var(--coral)",
                      },
                      {
                        label: t("project_streak"),
                        value: `${project.streakDays}d`,
                        color: "var(--amber)",
                      },
                    ].map(({ label, value, color }) => (
                      <div
                        key={label}
                        className="rounded-[var(--r-md)] bg-[var(--bg-surface)] p-2.5 text-center lg:text-left"
                      >
                        <p className="text-[10px] sm:text-xs text-[var(--text-tertiary)] mb-1 leading-tight">
                          {label}
                        </p>
                        <p
                          className="text-base sm:text-lg font-display font-semibold"
                          style={{ color }}
                        >
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Success criteria */}
                {project.successCriteria?.length > 0 && (
                  <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
                    <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-widest mb-3">
                      {t("project_success_criteria")}
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {project.successCriteria.map((c, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs sm:text-sm text-[var(--text-secondary)]"
                        >
                          <span className="text-[var(--emerald)] mt-0.5 shrink-0">
                            ✓
                          </span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Blockers */}
                <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
                  <BlockerPanel project={project} />
                </div>

                {/* Tools */}
                {project.toolsSuggested?.length > 0 && (
                  <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
                    <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-widest mb-3">
                      {t("project_tools")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {project.toolsSuggested.map((tool, i) => (
                        <Badge key={i} variant="slate">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 flex flex-col gap-2">
                  <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-widest mb-1">
                    {t("project_actions")}
                  </p>

                  {!isCompleted && (
                    <Button
                      variant="emerald"
                      onClick={() => openConfirm("complete")}
                      className="w-full justify-center"
                    >
                      <FaRocket className="shrink-0" />
                      <span className="truncate">
                        {t("project_mark_shipped")}
                      </span>
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    onClick={() => setShowEmailExport(true)}
                    className="w-full justify-center"
                  >
                    <FaMailBulk className="shrink-0" />
                    <span className="truncate">
                      {t("project_export_email")}
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleExportPDF}
                    className="w-full justify-center"
                  >
                    <FaFilePdf className="shrink-0" />
                    <span className="truncate">{t("project_export_pdf")}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleExportMarkdown}
                    className="w-full justify-center"
                  >
                    <FaMarkdown className="shrink-0" />
                    <span className="truncate">{t("project_export_md")}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleExportJSON}
                    className="w-full justify-center"
                  >
                    <FaJs className="shrink-0" />
                    <span className="truncate">{t("project_export_json")}</span>
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => openConfirm("delete")}
                    className="w-full justify-center"
                  >
                    <MdDelete className="shrink-0" />
                    <span className="truncate">{t("project_delete")}</span>
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

      {activeConfig && (
        <ConfirmModal
          open={confirmModal.open}
          onClose={closeConfirm}
          onConfirm={handleConfirmAction}
          loading={confirmModal.loading}
          title={activeConfig.title}
          description={activeConfig.description}
          confirmLabel={activeConfig.confirmLabel}
          confirmVariant={activeConfig.confirmVariant}
        />
      )}

      <SavePromptModal />
    </div>
  );
}

export default function ProjectContent({ id }) {
  return (
    <DataProvider>
      <ProjectPageClient id={id} />
    </DataProvider>
  );
}
