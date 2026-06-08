"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, SignInButton, SignUpButton } from "@clerk/nextjs";
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
import { Badge } from "@/components/ui/Badge";
import { overallProgress } from "@/lib/utils/progress";
import { formatDate, projectAgeLabel } from "@/lib/utils/date";
import {
  exportProjectMarkdown,
  exportProjectJSON,
} from "@/lib/utils/exportMarkdown";
import { useEngageView, trackExport } from "@/lib/utils/engage";
import { useI18n } from "@/lib/i18n";
import {
  FaFilePdf,
  FaJs,
  FaMailBulk,
  FaMarkdown,
  FaRocket,
  FaLock,
  FaLockOpen,
} from "react-icons/fa";
import {
  FiStar,
  FiHeart,
  FiEye,
  FiDownload,
  FiGitBranch,
  FiArrowRight,
  FiAlertCircle,
  FiCheckCircle,
  FiLock,
} from "react-icons/fi";
import { MdDelete } from "react-icons/md";
import { DataProvider } from "@/components/providers/DataProvider";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { SignInGate } from "@/components/project/SignInGate";
import Link from "next/link";
import { useProjectStore } from "@/lib/store/projectStore";
import { Button } from "@/components/ui/Button";
import { toast } from "@/lib/toast";

// ─── Access levels ────────────────────────────────────────────────────
// OWNER       → project is in their account (storeProject !== null)
// AUTHED      → signed in but does not own this project
// ANONYMOUS   → not signed in
//
// Capabilities by level:
//   OWNER    : edit tasks, blockers, complete, delete, visibility, all exports
//   AUTHED   : export only + acquire (everything else locked until acquired)
//   ANONYMOUS: read-only view; sign-in gate on export + acquire

// ─── Acquire panel (shown to signed-in non-owners) ────────────────────
// Checks the 4-project limit before forking.

// Drop-in replacement for the AcquirePanel function inside ProjectPageClient.jsx
// Paste this to replace the existing AcquirePanel component at the top of that file.

const AUTH_LIMIT = 4;

export function AcquirePanel({ project }) {
  const router = useRouter();
  const addProject = useProjectStore((s) => s.addProject);
  const projects = useProjectStore((s) => s.projects);

  const [status, setStatus] = useState("idle");
  const [limitInfo, setLimitInfo] = useState(null);

  const activeLocalCount = projects.filter((p) => !p.completionDate).length;
  const alreadyAtLimit = activeLocalCount >= AUTH_LIMIT;

  const alreadyOwned = projects.some(
    (p) => p.id === project.id || p.forkedFrom === project.id
  );

  const handleAcquire = async () => {
    if (alreadyOwned) {
      const existing = projects.find(
        (p) => p.id === project.id || p.forkedFrom === project.id
      );
      if (existing) {
        router.push(`/project/${existing.id}`);
        return;
      }
    }

    setStatus("checking");

    try {
      const res = await fetch("/api/projects/check-limit");
      const data = await res.json();
      if (!data.allowed) {
        setLimitInfo({ count: data.count, limit: data.limit });
        setStatus("limited");
        return;
      }
    } catch {
      /* try anyway */
    }

    setStatus("acquiring");
    try {
      const newId = await addProject({
        projectTitle: project.projectTitle,
        oneLineGoal: project.oneLineGoal,
        problemStatement: project.problemStatement ?? "",
        targetUser: project.targetUser ?? "",
        successCriteria: project.successCriteria ?? [],
        scope: project.scope ?? {
          mustHave: [],
          niceToHave: [],
          outOfScope: [],
        },
        scopeLevel: project.scopeLevel ?? "standard",
        phases: project.phases ?? [],
        tasks: (project.tasks ?? []).map((t) => ({
          ...t,
          status: "todo",
          completedAt: null,
        })),
        dailyNextAction: "",
        blockers: [],
        toolsSuggested: project.toolsSuggested ?? [],
        estimatedEffort: project.estimatedEffort ?? "",
        timeline: project.timeline ?? "",
        reviewQuestions: project.reviewQuestions ?? [],
        forkedFrom: project.id,
      });

      setStatus("done");
      toast.success("Project added to your dashboard!", { duration: 2500 });

      // Trigger global re-sync so dashboard count updates
      if (typeof window !== "undefined" && window.__momentumRefresh) {
        window.__momentumRefresh();
      }

      setTimeout(() => router.push(`/project/${newId}`), 600);
    } catch (err) {
      if (err?.code === "LIMIT_REACHED" || err?.message?.includes("limit")) {
        setLimitInfo({ count: AUTH_LIMIT, limit: AUTH_LIMIT });
        setStatus("limited");
      } else {
        toast.error(err?.message ?? "Failed to acquire project. Try again.");
        setStatus("idle");
      }
    }
  };

  if (alreadyOwned) {
    return (
      <div
        className="rounded-[var(--r-xl)] border-2 p-4 flex items-center gap-3"
        style={{
          borderColor: "var(--emerald)",
          background: "var(--emerald-bg)",
        }}
      >
        <FiCheckCircle
          size={20}
          style={{ color: "var(--emerald)", flexShrink: 0 }}
        />
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--emerald-dim)" }}
          >
            Already in your projects
          </p>
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--text-secondary)" }}
          >
            You've already forked this plan.
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            const existing = projects.find(
              (p) => p.id === project.id || p.forkedFrom === project.id
            );
            if (existing) router.push(`/project/${existing.id}`);
          }}
        >
          Open →
        </Button>
      </div>
    );
  }

  if (status === "limited" || alreadyAtLimit) {
    const count = limitInfo?.count ?? activeLocalCount;
    const limit = limitInfo?.limit ?? AUTH_LIMIT;
    return (
      <div
        className="rounded-[var(--r-xl)] border-2 p-5 flex flex-col gap-4"
        style={{ borderColor: "var(--amber)", background: "var(--amber-bg)" }}
      >
        <div className="flex items-start gap-3">
          <FiAlertCircle
            size={20}
            style={{ color: "var(--amber)", flexShrink: 0, marginTop: 2 }}
          />
          <div>
            <p
              className="font-display font-semibold text-sm"
              style={{ color: "var(--text-primary)" }}
            >
              Project limit reached ({count}/{limit})
            </p>
            <p
              className="text-xs mt-1 leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              Complete or delete a project to make room.
            </p>
          </div>
        </div>
        <Link href="/dashboard">
          <Button size="sm" className="w-full justify-center" variant="ghost">
            Go to dashboard → manage projects
          </Button>
        </Link>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div
        className="rounded-[var(--r-xl)] border-2 p-4 flex items-center gap-3"
        style={{
          borderColor: "var(--emerald)",
          background: "var(--emerald-bg)",
        }}
      >
        <FiCheckCircle
          size={20}
          style={{ color: "var(--emerald)", flexShrink: 0 }}
        />
        <p
          className="text-sm font-semibold"
          style={{ color: "var(--emerald-dim)" }}
        >
          Added! Taking you there…
        </p>
        <div
          className="ml-auto w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
          style={{
            borderColor: "var(--emerald)",
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }

  const isLoading = status === "checking" || status === "acquiring";
  const loadingLabel =
    status === "checking" ? "Checking limit…" : "Forking plan…";

  return (
    <div
      className="rounded-[var(--r-xl)] border-2 p-5 flex flex-col gap-4"
      style={{
        borderColor: "var(--violet)",
        background:
          "linear-gradient(135deg, var(--violet-bg) 0%, color-mix(in srgb, var(--emerald-bg) 40%, transparent) 100%)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-[var(--r-md)] flex items-center justify-center shrink-0"
          style={{ background: "var(--violet)", color: "white" }}
        >
          <FiGitBranch size={17} />
        </div>
        <div className="min-w-0">
          <p
            className="font-display font-semibold text-sm mb-0.5"
            style={{ color: "var(--text-primary)" }}
          >
            Make this your project
          </p>
          <p
            className="text-xs leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Fork this blueprint. All tasks reset to "todo" — you start fresh.
          </p>
        </div>
      </div>

      {/* Slot indicator */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-[var(--r-md)] text-xs"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex gap-1">
          {Array.from({ length: AUTH_LIMIT }).map((_, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-sm transition-colors"
              style={{
                background:
                  i < activeLocalCount ? "var(--violet)" : "var(--bg-muted)",
                border: "1px solid var(--border)",
              }}
            />
          ))}
        </div>
        <span style={{ color: "var(--text-tertiary)" }}>
          {activeLocalCount}/{AUTH_LIMIT} project slots used
        </span>
      </div>

      <Button
        variant="emerald"
        onClick={handleAcquire}
        loading={isLoading}
        className="w-full justify-center gap-2"
      >
        {isLoading ? (
          loadingLabel
        ) : (
          <>
            <FiGitBranch size={14} /> Add to my projects ({activeLocalCount}/
            {AUTH_LIMIT})
          </>
        )}
      </Button>
    </div>
  );
}
// ─── Export panel ─────────────────────────────────────────────────────
// canExport: isOwner || isSignedIn
// If !canExport, clicking any export button triggers the sign-in gate.
function ExportPanel({ project, canExport, onNeedAuth, isOwner }) {
  const { t } = useI18n();
  const [showEmail, setShowEmail] = useState(false);

  const handlePDF = async () => {
    if (!canExport) return onNeedAuth();
    const id = toast.loading(t("toast_export_pdf_generating"));
    try {
      const { exportProjectPDF } = await import("@/lib/utils/exportPDF");
      await exportProjectPDF(project);
      trackExport(project.id);
      toast.dismiss(id);
    } catch {
      toast.dismiss(id);
      toast.error(t("toast_export_pdf_error"));
    }
  };

  const handleMarkdown = () => {
    if (!canExport) return onNeedAuth();
    try {
      exportProjectMarkdown(project);
      trackExport(project.id);
    } catch {
      toast.error(t("toast_export_md_error"));
    }
  };

  const handleJSON = () => {
    if (!canExport) return onNeedAuth();
    try {
      exportProjectJSON(project);
      trackExport(project.id);
    } catch {
      toast.error(t("toast_export_json_error"));
    }
  };

  const handleEmail = () => {
    if (!canExport) return onNeedAuth();
    setShowEmail(true);
  };

  const items = [
    {
      label: "PDF",
      icon: FaFilePdf,
      accentColor: "var(--coral)",
      handler: handlePDF,
    },
    {
      label: "Markdown",
      icon: FaMarkdown,
      accentColor: "var(--violet)",
      handler: handleMarkdown,
    },
    {
      label: "JSON",
      icon: FaJs,
      accentColor: "var(--emerald)",
      handler: handleJSON,
    },
    {
      label: "Email to me",
      icon: FaMailBulk,
      accentColor: "var(--amber)",
      handler: handleEmail,
    },
  ];

  return (
    <>
      <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <div className="flex items-center justify-between mb-3">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-tertiary)" }}
          >
            Export blueprint
          </p>
          {!canExport && (
            <span
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: "var(--amber-bg)", color: "var(--amber)" }}
            >
              <FiLock size={9} /> Sign in required
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          {items.map(({ label, icon: Icon, accentColor, handler }) => (
            <button
              key={label}
              onClick={handler}
              className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--r-md)] border text-sm text-left transition-all duration-150"
              style={{
                borderColor: "var(--border)",
                background: "transparent",
                color: "var(--text-secondary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-subtle)";
                e.currentTarget.style.color = "var(--text-primary)";
                if (canExport) e.currentTarget.style.borderColor = accentColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              <Icon size={14} style={{ color: accentColor, flexShrink: 0 }} />
              <span className="flex-1">{label}</span>
              {canExport ? (
                <FiArrowRight
                  size={12}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                />
              ) : (
                <FiLock size={10} style={{ color: "var(--text-tertiary)" }} />
              )}
            </button>
          ))}
        </div>

        {!canExport && (
          <p
            className="mt-3 text-[11px] text-center"
            style={{ color: "var(--text-tertiary)" }}
          >
            <SignInButton mode="modal">
              <button className="underline hover:text-[var(--violet)] transition-colors">
                Sign in
              </button>
            </SignInButton>{" "}
            or{" "}
            <SignUpButton mode="modal">
              <button className="underline hover:text-[var(--violet)] transition-colors">
                create a free account
              </button>
            </SignUpButton>{" "}
            to export
          </p>
        )}
      </div>

      {canExport && (
        <EmailExportModal
          open={showEmail}
          onClose={() => setShowEmail(false)}
          project={project}
        />
      )}
    </>
  );
}

// ─── Public view banner ───────────────────────────────────────────────
function PublicViewBanner() {
  const { t } = useI18n();
  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--violet)] bg-[var(--violet-bg)] px-4 py-3 flex items-center gap-3 mb-4">
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium"
          style={{ color: "var(--violet-dim)" }}
        >
          {t("project_public_view_title")}
        </p>
        <p
          className="text-xs mt-0.5"
          style={{ color: "var(--text-secondary)" }}
        >
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

// ─── Read-only task list (non-owners) ─────────────────────────────────
function ReadOnlyTaskList({ project }) {
  const doneTasks =
    project.tasks?.filter((t) => t.status === "done").length ?? 0;
  const total = project.tasks?.length ?? 0;

  return (
    <div>
      {/* Locked notice */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-[var(--r-md)] mb-3 text-xs"
        style={{
          background: "var(--bg-subtle)",
          border: "1px solid var(--border)",
          color: "var(--text-tertiary)",
        }}
      >
        <FiLock size={11} style={{ flexShrink: 0 }} />
        <span>
          Task editing is locked.{" "}
          <strong style={{ color: "var(--text-secondary)" }}>
            Acquire this project
          </strong>{" "}
          to track your own progress.
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {project.tasks?.slice(0, 25).map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-3 px-3 py-2 rounded-[var(--r-md)]"
            style={{ opacity: task.status === "done" ? 0.5 : 1 }}
          >
            <span
              className="text-sm leading-none shrink-0"
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
              className="text-sm flex-1 min-w-0 truncate"
              style={{
                color:
                  task.status === "done"
                    ? "var(--text-tertiary)"
                    : "var(--text-primary)",
                textDecoration:
                  task.status === "done" ? "line-through" : "none",
              }}
            >
              {task.title}
            </p>
          </div>
        ))}
        {total > 25 && (
          <p
            className="text-xs px-3 pt-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            +{total - 25} more tasks
          </p>
        )}
      </div>

      {total > 0 && (
        <p
          className="text-xs mt-3 px-1"
          style={{ color: "var(--text-tertiary)" }}
        >
          {doneTasks}/{total} tasks completed in the original plan
        </p>
      )}
    </div>
  );
}

// ─── Engagement bar ───────────────────────────────────────────────────
function PublicEngagementBar({ project }) {
  const v = project.views ?? 0,
    s = project.stars ?? 0,
    h = project.helpedCount ?? 0,
    e = project.exportCount ?? 0;
  if (v + s + h + e === 0) return null;
  return (
    <div
      className="flex items-center gap-4 text-xs mb-4"
      style={{ color: "var(--text-tertiary)" }}
    >
      {v > 0 && (
        <span className="flex items-center gap-1">
          <FiEye size={11} /> {v}
        </span>
      )}
      {s > 0 && (
        <span className="flex items-center gap-1">
          <FiStar size={11} /> {s}
        </span>
      )}
      {h > 0 && (
        <span className="flex items-center gap-1">
          <FiHeart size={11} /> {h}
        </span>
      )}
      {e > 0 && (
        <span className="flex items-center gap-1">
          <FiDownload size={11} /> {e}
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
  const { isSignedIn } = useUser();

  const storeProject = useProjectStore((s) => s.getProject(id));
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const completeProject = useProjectStore((s) => s.completeProject);
  const updateProject = useProjectStore((s) => s.updateProject);

  const [publicProject, setPublicProject] = useState(null);
  const [isPublicView, setIsPublicView] = useState(false);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState(false);

  const [showSignInGate, setShowSignInGate] = useState(false);
  const [gateContext, setGateContext] = useState("export");
  const [showOwnerEmail, setShowOwnerEmail] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    type: null,
    loading: false,
  });

  const project = storeProject ?? publicProject;

  // isOwner: true only when the project lives in this user's own store/account
  const isOwner = !!storeProject;

  // canExport: owner OR any signed-in user (public data is free to export once authed)
  const canExport = isOwner || isSignedIn;

  useEngageView(id, isOwner);

  // Fetch from public API when not the owner
  useEffect(() => {
    if (storeProject) return;
    setPublicLoading(true);
    fetch(`/api/projects/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((d) => {
        setPublicProject(d.project ?? null);
        setIsPublicView(d.isPublicView ?? false);
        setPublicLoading(false);
      })
      .catch(() => {
        setPublicError(true);
        setPublicLoading(false);
      });
  }, [id, storeProject]);

  const openGate = useCallback((ctx) => {
    setGateContext(ctx);
    setShowSignInGate(true);
  }, []);
  const openConfirm = useCallback(
    (type) => setConfirmModal({ open: true, type, loading: false }),
    []
  );
  const closeConfirm = useCallback(
    () => setConfirmModal((s) => ({ ...s, open: false, loading: false })),
    []
  );

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

  const handleToggleVisibility = useCallback(async () => {
    if (!isOwner || !project) return;
    const next = !project.isPublic;
    await updateProject(project.id, { isPublic: next });
    toast.success(
      next ? t("toast_project_made_public") : t("toast_project_made_private"),
      { duration: 3000 }
    );
  }, [isOwner, project, updateProject, t]);

  if (publicLoading) return <ProjectSkeleton />;

  if (publicError || (!project && !publicLoading)) {
    return (
      <div className="flex h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="mb-4" style={{ color: "var(--text-secondary)" }}>
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
            {/* Public view banner */}
            {isPublicView && !isOwner && <PublicViewBanner />}
            {!isOwner && <PublicEngagementBar project={project} />}

            {/* Breadcrumb */}
            <div
              className="flex items-center gap-2 text-xs mb-4 sm:mb-6 min-w-0"
              style={{ color: "var(--text-tertiary)" }}
            >
              <Link
                href="/"
                className="hover:text-[var(--text-primary)] transition-colors shrink-0"
              >
                {t("nav_dashboard")}
              </Link>
              <span className="shrink-0">/</span>
              <span
                className="truncate min-w-0"
                style={{ color: "var(--text-primary)" }}
              >
                {project.projectTitle}
              </span>
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-[1fr_260px] xl:grid-cols-[1fr_280px]">
              {/* ── Left column ─────────────────────────────────────── */}
              <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
                {/* Project header */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h1
                      className="font-display font-semibold text-xl sm:text-3xl leading-tight flex-1 min-w-0"
                      style={{ color: "var(--text-primary)" }}
                    >
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
                    <p
                      className="text-sm sm:text-base leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
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
                    {/* Non-owner read-only indicator */}
                    {!isOwner && (
                      <Badge variant="amber">
                        <FiLock size={9} className="inline mr-1" />
                        Viewing only
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Owner-only: pressure + streak */}
                {isOwner && <ProjectPressure project={project} />}
                {isOwner && <StreakBanner project={project} />}

                {/* Phase timeline — visible to all */}
                <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:p-5">
                  <PhaseTimeline project={project} />
                </div>

                {/* Next action — owner only */}
                {isOwner && !isCompleted && <NextAction project={project} />}

                {/* Task list */}
                <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:p-5">
                  <p
                    className="text-xs font-semibold uppercase tracking-widest mb-3 sm:mb-4"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {t("project_all_tasks")}
                  </p>
                  {isOwner ? (
                    <TaskList project={project} />
                  ) : (
                    <ReadOnlyTaskList project={project} />
                  )}
                </div>
              </div>

              {/* ── Right column ────────────────────────────────────── */}
              <div className="flex flex-col gap-3 sm:gap-4 pb-20 lg:pb-0">
                {/* Stats — visible to all */}
                <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
                  <p
                    className="text-xs font-semibold uppercase tracking-widest mb-3"
                    style={{ color: "var(--text-tertiary)" }}
                  >
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
                        <p
                          className="text-[10px] sm:text-xs mb-1 leading-tight"
                          style={{ color: "var(--text-tertiary)" }}
                        >
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

                {/* Success criteria — visible to all */}
                {project.successCriteria?.length > 0 && (
                  <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
                    <p
                      className="text-xs font-semibold uppercase tracking-widest mb-3"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {t("project_success_criteria")}
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {project.successCriteria.map((c, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs sm:text-sm"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          <span
                            className="mt-0.5 shrink-0"
                            style={{ color: "var(--emerald)" }}
                          >
                            +
                          </span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Blockers — owner only */}
                {isOwner && (
                  <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
                    <BlockerPanel project={project} />
                  </div>
                )}

                {/* Tools — visible to all */}
                {project.toolsSuggested?.length > 0 && (
                  <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
                    <p
                      className="text-xs font-semibold uppercase tracking-widest mb-3"
                      style={{ color: "var(--text-tertiary)" }}
                    >
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

                {/* ── OWNER ACTIONS ── */}
                {isOwner && (
                  <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 flex flex-col gap-2">
                    <p
                      className="text-xs font-semibold uppercase tracking-widest mb-1"
                      style={{ color: "var(--text-tertiary)" }}
                    >
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
                      onClick={() => setShowOwnerEmail(true)}
                      className="w-full justify-center"
                    >
                      <FaMailBulk className="shrink-0" />
                      <span className="truncate">
                        {t("project_export_email")}
                      </span>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        const id2 = toast.loading(
                          t("toast_export_pdf_generating")
                        );
                        try {
                          const { exportProjectPDF } = await import(
                            "@/lib/utils/exportPDF"
                          );
                          await exportProjectPDF(project);
                          trackExport(project.id);
                          toast.dismiss(id2);
                        } catch {
                          toast.dismiss(id2);
                          toast.error(t("toast_export_pdf_error"));
                        }
                      }}
                      className="w-full justify-center"
                    >
                      <FaFilePdf className="shrink-0" />
                      <span className="truncate">
                        {t("project_export_pdf")}
                      </span>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        try {
                          exportProjectMarkdown(project);
                          trackExport(project.id);
                        } catch {
                          toast.error(t("toast_export_md_error"));
                        }
                      }}
                      className="w-full justify-center"
                    >
                      <FaMarkdown className="shrink-0" />
                      <span className="truncate">{t("project_export_md")}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        try {
                          exportProjectJSON(project);
                          trackExport(project.id);
                        } catch {
                          toast.error(t("toast_export_json_error"));
                        }
                      }}
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

                {/* ── NON-OWNER ACTIONS ── */}
                {!isOwner && (
                  <>
                    {/* Acquire panel — signed-in users see the fork CTA; anon see sign-in prompt */}
                    {isSignedIn ? (
                      <AcquirePanel project={project} />
                    ) : (
                      <div
                        className="rounded-[var(--r-xl)] border-2 p-5 flex flex-col gap-3"
                        style={{
                          borderColor: "var(--violet)",
                          background: "var(--violet-bg)",
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="flex items-center justify-center w-9 h-9 rounded-[var(--r-md)] shrink-0"
                            style={{ background: "var(--violet-bg)" }}
                          >
                            <FiGitBranch
                              size={17}
                              style={{ color: "var(--violet)" }}
                            />
                          </div>{" "}
                          <div>
                            <p
                              className="font-display font-semibold text-sm"
                              style={{ color: "var(--text-primary)" }}
                            >
                              Start your own version
                            </p>
                            <p
                              className="text-xs mt-1 leading-relaxed"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              Sign in to fork this plan to your dashboard and
                              track your own journey.
                            </p>
                          </div>
                        </div>
                        <SignUpButton mode="modal">
                          <button
                            className="w-full h-10 rounded-[var(--r-md)] text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
                            style={{ background: "var(--violet)" }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background =
                                "var(--violet-dim)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background =
                                "var(--violet)")
                            }
                          >
                            <FiGitBranch size={13} />
                            Sign up — it's free
                          </button>
                        </SignUpButton>
                        <SignInButton mode="modal">
                          <button
                            className="w-full h-9 rounded-[var(--r-md)] text-xs font-medium border transition-all"
                            style={{
                              borderColor: "var(--violet)",
                              color: "var(--violet-dim)",
                              background: "transparent",
                            }}
                          >
                            Already have an account? Sign in
                          </button>
                        </SignInButton>
                      </div>
                    )}

                    {/* Export panel — works for signed-in non-owners; gated for anonymous */}
                    <ExportPanel
                      project={project}
                      canExport={canExport}
                      onNeedAuth={() => openGate("export")}
                      isOwner={false}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
          <Footer />
        </main>
      </div>

      {/* Modals */}
      <SignInGate
        open={showSignInGate}
        onClose={() => setShowSignInGate(false)}
        context={gateContext}
        projectTitle={project?.projectTitle}
      />

      {/* Owner email export */}
      <EmailExportModal
        open={showOwnerEmail}
        onClose={() => setShowOwnerEmail(false)}
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
