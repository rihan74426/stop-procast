"use client";

import { useState, useCallback, useEffect } from "react";
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
import { useEngageView, trackExport } from "@/lib/utils/engage";
import { useI18n } from "@/lib/i18n";
import { toast } from "@/lib/toast";
import {
  FaFilePdf,
  FaJs,
  FaMailBulk,
  FaMarkdown,
  FaRocket,
  FaLock,
  FaLockOpen,
} from "react-icons/fa";
import { FiStar, FiHeart, FiEye, FiDownload } from "react-icons/fi";
import { MdDelete } from "react-icons/md";
import { DataProvider } from "@/components/providers/DataProvider";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

// ─── Public-view read-only banner ─────────────────────────────────────

function PublicViewBanner({ projectTitle }) {
  const { t } = useI18n();
  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--violet)] bg-[var(--violet-bg)] px-4 py-3 flex items-center gap-3 mb-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--violet-dim)]">
          {t("project_public_view_title")}
        </p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          {t("project_public_view_desc")}
        </p>
      </div>
      <Link href="/new">
        <Button size="sm" variant="primary">
          {t("project_public_view_cta")}
        </Button>
      </Link>
    </div>
  );
}

// ─── Engagement bar for public view ───────────────────────────────────

function PublicEngagementBar({ project }) {
  const stars = project.stars ?? 0;
  const helpedCount = project.helpedCount ?? 0;
  const views = project.views ?? 0;
  const exportCount = project.exportCount ?? 0;

  if (stars + helpedCount + views + exportCount === 0) return null;

  return (
    <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)] mb-4">
      {views > 0 && (
        <span className="flex items-center gap-1.5">
          <FiEye size={12} /> {views} {views === 1 ? "view" : "views"}
        </span>
      )}
      {stars > 0 && (
        <span className="flex items-center gap-1.5">
          <FiStar size={12} /> {stars} {stars === 1 ? "star" : "stars"}
        </span>
      )}
      {helpedCount > 0 && (
        <span className="flex items-center gap-1.5">
          <FiHeart size={12} /> helped {helpedCount}
        </span>
      )}
      {exportCount > 0 && (
        <span className="flex items-center gap-1.5">
          <FiDownload size={12} /> {exportCount}{" "}
          {exportCount === 1 ? "export" : "exports"}
        </span>
      )}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────

function ProjectSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden">
      <div className="w-56 shrink-0 border-r border-[var(--border)] bg-[var(--bg-elevated)] hidden lg:block" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-14 border-b border-[var(--border)] bg-[var(--bg-elevated)]" />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-pulse">
            <div className="h-4 bg-[var(--bg-muted)] rounded w-48 mb-6" />
            <div className="h-8 bg-[var(--bg-muted)] rounded w-2/3 mb-3" />
            <div className="h-4 bg-[var(--bg-muted)] rounded w-full mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-32 bg-[var(--bg-muted)] rounded-[var(--r-lg)]"
                  />
                ))}
              </div>
              <div className="flex flex-col gap-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-40 bg-[var(--bg-muted)] rounded-[var(--r-lg)]"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────

function ProjectPageClient({ id }) {
  const router = useRouter();
  const { t } = useI18n();

  const storeProject = useProjectStore((s) => s.getProject(id));
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const completeProject = useProjectStore((s) => s.completeProject);
  const updateProject = useProjectStore((s) => s.updateProject);

  const [publicProject, setPublicProject] = useState(null);
  const [isPublicView, setIsPublicView] = useState(false);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState(false);

  const [showEmailExport, setShowEmailExport] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    type: null,
    loading: false,
  });

  const project = storeProject ?? publicProject;
  const isOwner = !!storeProject;

  // Track view for non-owners
  useEngageView(id, isOwner);

  // Fetch from public API if not in store
  useEffect(() => {
    if (storeProject) return;
    setPublicLoading(true);
    fetch(`/api/projects/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data) => {
        setPublicProject(data.project ?? null);
        setIsPublicView(data.isPublicView ?? false);
        setPublicLoading(false);
      })
      .catch(() => {
        setPublicError(true);
        setPublicLoading(false);
      });
  }, [id, storeProject]);

  const handleToggleVisibility = useCallback(async () => {
    if (!isOwner || !project) return;
    const next = !project.isPublic;
    await updateProject(project.id, { isPublic: next });
    toast.success(
      next ? t("toast_project_made_public") : t("toast_project_made_private"),
      { duration: 3000 }
    );
  }, [isOwner, project, updateProject, t]);

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

  if (publicLoading) return <ProjectSkeleton />;

  if (publicError || (!project && !publicLoading)) {
    return (
      <div className="flex h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="text-[var(--text-secondary)] mb-4">
            {t("project_not_found")}
          </p>
          <Link href="/">
            <Button variant="ghost">Back to dashboard</Button>
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
      trackExport(project.id);
    } catch {
      toast.error(t("toast_export_md_error"));
    }
  };

  const handleExportJSON = () => {
    try {
      exportProjectJSON(project);
      trackExport(project.id);
    } catch {
      toast.error(t("toast_export_json_error"));
    }
  };

  const handleExportPDF = async () => {
    const toastId = toast.loading(t("toast_export_pdf_generating"));
    try {
      const { exportProjectPDF } = await import("@/lib/utils/exportPDF");
      await exportProjectPDF(project);
      trackExport(project.id);
      toast.dismiss(toastId);
    } catch {
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
            {isPublicView && !isOwner && (
              <PublicViewBanner projectTitle={project.projectTitle} />
            )}

            {/* Engagement stats for public view */}
            {!isOwner && <PublicEngagementBar project={project} />}

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

            {/* Two-column layout */}
            <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-[1fr_260px] xl:grid-cols-[1fr_280px]">
              {/* Left column */}
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
                      <Badge status="completed">{t("project_done")}</Badge>
                    )}
                    <Badge variant={project.isPublic ? "emerald" : "slate"}>
                      {project.isPublic ? "Public" : "Private"}
                    </Badge>
                  </div>
                </div>

                {isOwner && <ProjectPressure project={project} />}
                {isOwner && <StreakBanner project={project} />}

                <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:p-5">
                  <PhaseTimeline project={project} />
                </div>

                {isOwner && !isCompleted && <NextAction project={project} />}

                <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:p-5">
                  <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-widest mb-3 sm:mb-4">
                    {t("project_all_tasks")}
                  </p>
                  {isOwner ? (
                    <TaskList project={project} />
                  ) : (
                    <div className="flex flex-col gap-1">
                      {project.tasks?.slice(0, 20).map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 px-3 py-2 rounded-[var(--r-md)]"
                        >
                          <span
                            className="text-base leading-none"
                            style={{
                              color:
                                task.status === "done"
                                  ? "var(--emerald)"
                                  : task.status === "doing"
                                  ? "var(--violet)"
                                  : "var(--text-tertiary)",
                            }}
                          >
                            {task.status === "done"
                              ? "●"
                              : task.status === "doing"
                              ? "◑"
                              : "○"}
                          </span>
                          <p
                            className={`text-sm ${
                              task.status === "done"
                                ? "line-through text-[var(--text-tertiary)]"
                                : "text-[var(--text-primary)]"
                            }`}
                          >
                            {task.title}
                          </p>
                        </div>
                      ))}
                      {(project.tasks?.length ?? 0) > 20 && (
                        <p className="text-xs text-[var(--text-tertiary)] px-3 pt-1">
                          +{project.tasks.length - 20} more tasks
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right column */}
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
                        value:
                          project.tasks?.filter((t) => t.status === "done")
                            .length ?? 0,
                        color: "var(--emerald)",
                      },
                      {
                        label: t("project_todo"),
                        value:
                          project.tasks?.filter((t) => t.status === "todo")
                            .length ?? 0,
                        color: "var(--text-primary)",
                      },
                      {
                        label: t("project_blocked"),
                        value:
                          project.tasks?.filter((t) => t.status === "blocked")
                            .length ?? 0,
                        color: "var(--coral)",
                      },
                      {
                        label: t("project_streak"),
                        value: `${project.streakDays ?? 0}d`,
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
                            +
                          </span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Blockers — owners only */}
                {isOwner && (
                  <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
                    <BlockerPanel project={project} />
                  </div>
                )}

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

                {/* Actions — owners only */}
                {isOwner && (
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
                      onClick={handleToggleVisibility}
                      className="w-full justify-center"
                    >
                      {project.isPublic ? (
                        <>
                          <FaLock className="shrink-0" />
                          <span className="truncate">
                            {t("project_make_private")}
                          </span>
                        </>
                      ) : (
                        <>
                          <FaLockOpen className="shrink-0" />
                          <span className="truncate">
                            {t("project_make_public")}
                          </span>
                        </>
                      )}
                    </Button>

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
                      <span className="truncate">
                        {t("project_export_pdf")}
                      </span>
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
                      <span className="truncate">
                        {t("project_export_json")}
                      </span>
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
                )}

                {/* Public view: fork CTA */}
                {!isOwner && (
                  <div className="rounded-[var(--r-lg)] border-2 border-dashed border-[var(--violet)] bg-[var(--violet-bg)] p-4 text-center">
                    <p className="text-sm font-semibold text-[var(--violet-dim)] mb-2">
                      {t("project_fork_cta_title")}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mb-3">
                      {t("project_fork_cta_desc")}
                    </p>
                    <Link
                      href={`/new?fork=${id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--r-md)] bg-[var(--violet)] text-white text-xs font-semibold hover:bg-[var(--violet-dim)] transition-colors"
                    >
                      {t("project_fork_btn")}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
          <Footer />
        </main>
      </div>

      {isOwner && (
        <EmailExportModal
          open={showEmailExport}
          onClose={() => setShowEmailExport(false)}
          project={project}
        />
      )}

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

      {isOwner && <SavePromptModal />}
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
