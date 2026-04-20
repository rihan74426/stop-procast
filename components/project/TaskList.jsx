"use client";

import { useState } from "react";
import { useProjectStore } from "@/lib/store/projectStore";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const STATUS_CYCLE = {
  todo: "doing",
  doing: "done",
  done: "todo",
  blocked: "todo",
};

export function TaskList({ project }) {
  const updateTask = useProjectStore((s) => s.updateTask);
  const addTask = useProjectStore((s) => s.addTask);
  const deleteTask = useProjectStore((s) => s.deleteTask);
  const [newTaskText, setNewTaskText] = useState("");
  const [addingToPhase, setAddingToPhase] = useState(null);
  const [collapsed, setCollapsed] = useState({});

  const toggle = (id) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));

  const handleStatusCycle = (task) => {
    updateTask(project.id, task.id, { status: STATUS_CYCLE[task.status] });
  };

  const handleAddTask = (phaseId) => {
    if (!newTaskText.trim()) return;
    addTask(project.id, { title: newTaskText.trim(), phaseId, status: "todo" });
    setNewTaskText("");
    setAddingToPhase(null);
  };

  // Unphased tasks
  const unphasedTasks = project.tasks.filter((t) => !t.phaseId);

  return (
    <div className="flex flex-col gap-6">
      {project.phases.map((phase) => {
        const tasks = project.tasks.filter((t) => t.phaseId === phase.id);
        const doneTasks = tasks.filter((t) => t.status === "done").length;
        const isCollapsed = collapsed[phase.id];

        return (
          <div key={phase.id}>
            {/* Phase header */}
            <button
              onClick={() => toggle(phase.id)}
              className="w-full flex items-center gap-3 mb-3 group"
            >
              <span
                className={`text-xs transition-transform ${
                  isCollapsed ? "" : "rotate-90"
                }`}
              >
                ▶
              </span>
              <p className="font-medium text-[var(--text-primary)] text-sm">
                {phase.name}
              </p>
              <span className="text-xs text-[var(--text-tertiary)]">
                {doneTasks}/{tasks.length}
              </span>
              <div className="flex-1 h-px bg-[var(--border)] group-hover:bg-[var(--violet)] transition-colors" />
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

            {!isCollapsed && (
              <div className="flex flex-col gap-1 pl-6">
                {tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={() => handleStatusCycle(task)}
                    onDelete={() => deleteTask(project.id, task.id)}
                  />
                ))}

                {/* Add task inline */}
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
                      placeholder="Task title…"
                      className="flex-1 h-8 px-3 text-sm rounded-[var(--r-md)] border border-[var(--violet)] bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none"
                    />
                    <Button size="sm" onClick={() => handleAddTask(phase.id)}>
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAddingToPhase(null)}
                    >
                      ✕
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingToPhase(phase.id)}
                    className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] hover:text-[var(--violet)] mt-1 transition-colors"
                  >
                    + Add task
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
          <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-3">
            Unassigned
          </p>
          <div className="flex flex-col gap-1">
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

function TaskRow({ task, onToggle, onDelete }) {
  const [hovering, setHovering] = useState(false);

  const statusIcon = {
    todo: { icon: "○", color: "var(--text-tertiary)" },
    doing: { icon: "◑", color: "var(--violet)" },
    done: { icon: "●", color: "var(--emerald)" },
    blocked: { icon: "⊘", color: "var(--coral)" },
  }[task.status];

  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-[var(--r-md)] hover:bg-[var(--bg-subtle)] group transition-colors"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Status toggle */}
      <button
        onClick={onToggle}
        className="text-base leading-none transition-transform hover:scale-110"
        style={{ color: statusIcon.color }}
        title={`Status: ${task.status} — click to advance`}
      >
        {statusIcon.icon}
      </button>

      {/* Title */}
      <p
        className={`flex-1 text-sm transition-colors ${
          task.status === "done"
            ? "line-through text-[var(--text-tertiary)]"
            : "text-[var(--text-primary)]"
        }`}
      >
        {task.title}
      </p>

      {/* Priority badge */}
      {task.priority !== "medium" && (
        <Badge priority={task.priority}>{task.priority}</Badge>
      )}

      {/* Delete */}
      {hovering && (
        <button
          onClick={onDelete}
          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--coral)] transition-colors opacity-0 group-hover:opacity-100"
        >
          ✕
        </button>
      )}
    </div>
  );
}
