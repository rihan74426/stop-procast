"use client";

import { useState } from "react";
import { useProjectStore } from "@/lib/store/projectStore";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";
import { FiCircle, FiCheckCircle, FiMinusCircle } from "react-icons/fi";

// ─── Half-circle SVG for "doing" state ───────────────────────────────
function DoingIcon({ size = 15, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="5.75" stroke={color} strokeWidth="1.5" />
      <path d="M7.5 1.75 A5.75 5.75 0 0 1 7.5 13.25 Z" fill={color} />
    </svg>
  );
}

const STATUS_CONFIG = {
  todo: {
    Icon: ({ color }) => <FiCircle size={14} style={{ color }} />,
    color: "var(--text-tertiary)",
    title: "Todo — click to start",
  },
  doing: {
    Icon: ({ color }) => <DoingIcon size={14} color={color} />,
    color: "var(--violet)",
    title: "Doing — click to complete",
  },
  done: {
    Icon: ({ color }) => <FiCheckCircle size={14} style={{ color }} />,
    color: "var(--emerald)",
    title: "Done — click to reset",
  },
  blocked: {
    Icon: ({ color }) => <FiMinusCircle size={14} style={{ color }} />,
    color: "var(--coral)",
    title: "Blocked — click to reset",
  },
};

const STATUS_CYCLE = {
  todo: "doing",
  doing: "done",
  done: "todo",
  blocked: "todo",
};

// ─── TaskRow ──────────────────────────────────────────────────────────
function TaskRow({ task, onToggle, onDelete }) {
  const [hovering, setHovering] = useState(false);
  const { Icon, color } = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.todo;
  const isDone = task.status === "done";

  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-[var(--r-md)] transition-colors group"
      style={{ background: hovering ? "var(--bg-subtle)" : "transparent" }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <button
        onClick={onToggle}
        className="shrink-0 transition-transform hover:scale-110 active:scale-95"
        title={STATUS_CONFIG[task.status]?.title}
      >
        <Icon color={color} />
      </button>

      <p
        className="flex-1 text-sm transition-colors"
        style={{
          color: isDone ? "var(--text-tertiary)" : "var(--text-primary)",
          textDecoration: isDone ? "line-through" : "none",
        }}
      >
        {task.title}
      </p>

      {task.priority !== "medium" && (
        <Badge priority={task.priority}>{task.priority}</Badge>
      )}

      {hovering && (
        <button
          onClick={onDelete}
          className="text-xs transition-colors opacity-0 group-hover:opacity-100"
          style={{ color: "var(--text-tertiary)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--coral)")}
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--text-tertiary)")
          }
          aria-label="Delete task"
        >
          <FiMinusCircle size={12} />
        </button>
      )}
    </div>
  );
}

// ─── TaskList ─────────────────────────────────────────────────────────
export function TaskList({ project }) {
  const { t } = useI18n();
  const updateTask = useProjectStore((s) => s.updateTask);
  const addTask = useProjectStore((s) => s.addTask);
  const deleteTask = useProjectStore((s) => s.deleteTask);

  const [newTaskText, setNewTaskText] = useState("");
  const [addingToPhase, setAddingToPhase] = useState(null);
  const [collapsed, setCollapsed] = useState({});

  const toggle = (id) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));

  const handleStatusCycle = (task) =>
    updateTask(project.id, task.id, { status: STATUS_CYCLE[task.status] });

  const handleAddTask = (phaseId) => {
    if (!newTaskText.trim()) return;
    addTask(project.id, { title: newTaskText.trim(), phaseId, status: "todo" });
    setNewTaskText("");
    setAddingToPhase(null);
  };

  const unphasedTasks = project.tasks.filter((t) => !t.phaseId);

  return (
    <div className="flex flex-col gap-6">
      {project.phases.map((phase) => {
        const tasks = project.tasks.filter((t) => t.phaseId === phase.id);
        const doneCnt = tasks.filter((t) => t.status === "done").length;
        const isCollapsed = collapsed[phase.id];

        return (
          <div key={phase.id}>
            {/* Phase header */}
            <button
              onClick={() => toggle(phase.id)}
              className="w-full flex items-center gap-3 mb-3 px-2 py-1.5 rounded-[var(--r-md)] group transition-colors"
              style={{ background: "transparent" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--bg-subtle)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {/* Chevron */}
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                className="transition-transform duration-200 shrink-0"
                style={{
                  transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                  color: "var(--text-tertiary)",
                }}
              >
                <path
                  d="M2 3.5l3 3 3-3"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <p
                className="font-medium text-sm"
                style={{ color: "var(--text-primary)" }}
              >
                {phase.name}
              </p>
              <span
                className="text-xs"
                style={{ color: "var(--text-tertiary)" }}
              >
                {doneCnt}/{tasks.length}
              </span>
              <div
                className="flex-1 h-px transition-colors"
                style={{ background: "var(--border)" }}
              />
              <Badge
                variant={
                  phase.status === "active"
                    ? "violet"
                    : phase.status === "done"
                    ? "emerald"
                    : "slate"
                }
              >
                {phase.status}
              </Badge>
            </button>

            {/* Tasks */}
            {!isCollapsed && (
              <div className="flex flex-col gap-0.5 pl-5">
                {tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={() => handleStatusCycle(task)}
                    onDelete={() => deleteTask(project.id, task.id)}
                  />
                ))}

                {/* Add task input */}
                {addingToPhase === phase.id ? (
                  <div className="flex gap-2 mt-1">
                    <input
                      autoFocus
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddTask(phase.id);
                        if (e.key === "Escape") setAddingToPhase(null);
                      }}
                      placeholder={t("task_add_placeholder")}
                      className="flex-1 h-8 px-3 text-sm rounded-[var(--r-md)] border focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
                      style={{
                        borderColor: "var(--violet)",
                        background: "var(--bg-base)",
                        color: "var(--text-primary)",
                      }}
                    />
                    <Button size="sm" onClick={() => handleAddTask(phase.id)}>
                      {t("task_add_btn")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAddingToPhase(null)}
                    >
                      ×
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingToPhase(phase.id)}
                    className="flex items-center gap-1.5 text-xs mt-1 px-3 py-1 transition-colors"
                    style={{ color: "var(--text-tertiary)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "var(--violet)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--text-tertiary)")
                    }
                  >
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path
                        d="M5.5 1v9M1 5.5h9"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                    </svg>
                    {t("task_add")}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Unphased tasks */}
      {unphasedTasks.length > 0 && (
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: "var(--text-tertiary)" }}
          >
            {t("task_unassigned")}
          </p>
          <div className="flex flex-col gap-0.5">
            {unphasedTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={() => handleStatusCycle(task)}
                onDelete={() => deleteTask(project.id, task.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
