"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProjectStore } from "@/lib/store/projectStore";
import { DataProvider } from "@/components/providers/DataProvider";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { NextAction } from "@/components/project/NextAction";
import { PhaseTimeline } from "@/components/project/PhaseTimeline";
import { TaskList } from "@/components/project/TaskList";
import { BlockerPanel } from "@/components/project/BlockerPanel";
import { StreakBanner } from "@/components/project/StreakBanner";
import { ProjectPressure } from "@/components/project/ProjectPressure";
import { ProgressRing } from "@/components/ui/Progress";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { overallProgress } from "@/lib/utils/progress";
import { formatDate, projectAgeLabel } from "@/lib/utils/date";

export default function ProjectPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const project = useProjectStore((s) => s.getProject(id));
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const completeProject = useProjectStore((s) => s.completeProject);

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--text-secondary)] mb-4">
            Project not found.
          </p>
          <Link href="/">
            <Button variant="ghost">← Dashboard</Button>
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
    if (
      confirm(
        "Mark this project as shipped? This will trigger the completion flow."
      )
    ) {
      completeProject(id);
      router.push(`/project/${id}/complete`);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)] mb-6">
              <Link
                href="/"
                className="hover:text-[var(--text-primary)] transition-colors"
              >
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-[var(--text-primary)] truncate">
                {project.projectTitle}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
              {/* ── Left column ───────────────────────────────────── */}
              <div className="flex flex-col gap-6 min-w-0">
                {/* Project header */}
                <div>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h1 className="font-display font-semibold text-3xl text-[var(--text-primary)] leading-tight">
                      {project.projectTitle}
                    </h1>
                    <ProgressRing
                      value={progress}
                      size={56}
                      strokeWidth={5}
                      label={`${progress}%`}
                      className="shrink-0"
                    />
                  </div>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    {project.oneLineGoal}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="slate">
                      {projectAgeLabel(project.createdAt)}
                    </Badge>
                    {project.timeline && (
                      <Badge variant="slate">
                        Target:{" "}
                        {formatDate(project.timeline) || project.timeline}
                      </Badge>
                    )}
                    {isCompleted && <Badge status="completed">✓ Shipped</Badge>}
                  </div>
                </div>

                {/* Pressure & streak */}
                <ProjectPressure project={project} />
                <StreakBanner project={project} />

                {/* Phase timeline */}
                <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
                  <PhaseTimeline project={project} />
                </div>

                {/* Next action — only for active projects */}
                {!isCompleted && <NextAction project={project} />}

                {/* Task list */}
                <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
                  <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-4">
                    All tasks
                  </p>
                  <TaskList project={project} />
                </div>
              </div>

              {/* ── Right column ──────────────────────────────────── */}
              <div className="flex flex-col gap-5">
                {/* Quick stats */}
                <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
                  <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-4">
                    Stats
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        label: "Done",
                        value: project.tasks.filter((t) => t.status === "done")
                          .length,
                      },
                      {
                        label: "Todo",
                        value: project.tasks.filter((t) => t.status === "todo")
                          .length,
                      },
                      {
                        label: "Blocked",
                        value: project.tasks.filter(
                          (t) => t.status === "blocked"
                        ).length,
                      },
                      { label: "Streak", value: `${project.streakDays}d` },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="rounded-[var(--r-md)] bg-[var(--bg-surface)] p-3"
                      >
                        <p className="text-xs text-[var(--text-tertiary)] mb-1">
                          {label}
                        </p>
                        <p className="text-lg font-display font-semibold text-[var(--text-primary)]">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Success criteria */}
                {project.successCriteria?.length > 0 && (
                  <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
                    <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-3">
                      Success criteria
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

                {/* Blockers */}
                <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
                  <BlockerPanel project={project} />
                </div>

                {/* Tools suggested */}
                {project.toolsSuggested?.length > 0 && (
                  <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
                    <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-3">
                      Suggested tools
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {project.toolsSuggested.map((t, i) => (
                        <Badge key={i} variant="slate">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 flex flex-col gap-2">
                  <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-2">
                    Actions
                  </p>
                  {!isCompleted && (
                    <Button
                      variant="emerald"
                      onClick={handleComplete}
                      className="w-full justify-center"
                    >
                      🚀 Mark as shipped
                    </Button>
                  )}
                  <Link href={`/project/${id}/export`}>
                    <Button variant="ghost" className="w-full justify-center">
                      Export project
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    onClick={handleDelete}
                    className="w-full justify-center"
                  >
                    Delete project
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
