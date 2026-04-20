import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  createProject,
  createTask,
  createPhase,
  createMilestone,
  createBlocker,
} from "../schema";
import { loadProjects, saveProjects } from "../persistence";
import { todayISO } from "../utils/date";

function save(state) {
  saveProjects(state.projects);
}

export const useProjectStore = create(
  immer((set, get) => ({
    projects: loadProjects(),

    // ─── Project CRUD ───────────────────────────────────────────────

    addProject(data = {}) {
      const project = createProject(data);
      set((s) => {
        s.projects.push(project);
      });
      save(get());
      return project.id;
    },

    updateProject(id, patch) {
      set((s) => {
        const p = s.projects.find((x) => x.id === id);
        if (!p) return;
        Object.assign(p, patch);
        p.lastActivityAt = new Date().toISOString();
      });
      save(get());
    },

    deleteProject(id) {
      set((s) => {
        s.projects = s.projects.filter((x) => x.id !== id);
      });
      save(get());
    },

    completeProject(id) {
      set((s) => {
        const p = s.projects.find((x) => x.id === id);
        if (!p) return;
        p.completionDate = new Date().toISOString();
        // Compute postmortem stats
        p.postmortem.completedAt = p.completionDate;
        p.postmortem.stats.daysToComplete = Math.floor(
          (new Date(p.completionDate) - new Date(p.createdAt)) / 86400000
        );
        p.postmortem.stats.tasksCompleted = p.tasks.filter(
          (t) => t.status === "done"
        ).length;
        p.postmortem.stats.tasksAdded = p.tasks.length;
        p.postmortem.stats.blockersHit = p.blockers.length;
        const milestones = p.phases.flatMap((ph) => ph.milestones);
        p.postmortem.stats.milestonesOnTime = milestones.filter(
          (m) => m.status === "done"
        ).length;
        p.postmortem.stats.milestonesMissed = milestones.filter(
          (m) => m.status === "missed"
        ).length;
      });
      save(get());
    },

    // ─── Task CRUD ──────────────────────────────────────────────────

    addTask(projectId, data = {}) {
      const task = createTask(data);
      set((s) => {
        const p = s.projects.find((x) => x.id === projectId);
        if (!p) return;
        p.tasks.push(task);
        p.lastActivityAt = new Date().toISOString();
      });
      save(get());
      return task.id;
    },

    updateTask(projectId, taskId, patch) {
      set((s) => {
        const p = s.projects.find((x) => x.id === projectId);
        if (!p) return;
        const t = p.tasks.find((x) => x.id === taskId);
        if (!t) return;
        Object.assign(t, patch);
        if (patch.status === "done") t.completedAt = new Date().toISOString();
        p.lastActivityAt = new Date().toISOString();
      });
      save(get());
      // Update streak
      get().refreshStreak(projectId);
    },

    deleteTask(projectId, taskId) {
      set((s) => {
        const p = s.projects.find((x) => x.id === projectId);
        if (!p) return;
        p.tasks = p.tasks.filter((x) => x.id !== taskId);
      });
      save(get());
    },

    // ─── Phase CRUD ─────────────────────────────────────────────────

    addPhase(projectId, data = {}) {
      const phase = createPhase({
        order:
          get().projects.find((p) => p.id === projectId)?.phases.length ?? 0,
        ...data,
      });
      set((s) => {
        const p = s.projects.find((x) => x.id === projectId);
        if (p) p.phases.push(phase);
      });
      save(get());
      return phase.id;
    },

    updatePhase(projectId, phaseId, patch) {
      set((s) => {
        const p = s.projects.find((x) => x.id === projectId);
        if (!p) return;
        const ph = p.phases.find((x) => x.id === phaseId);
        if (ph) Object.assign(ph, patch);
      });
      save(get());
    },

    // ─── Blocker CRUD ───────────────────────────────────────────────

    addBlocker(projectId, description) {
      const blocker = createBlocker({ description });
      set((s) => {
        const p = s.projects.find((x) => x.id === projectId);
        if (p) p.blockers.push(blocker);
      });
      save(get());
    },

    resolveBlocker(projectId, blockerId) {
      set((s) => {
        const p = s.projects.find((x) => x.id === projectId);
        if (!p) return;
        const b = p.blockers.find((x) => x.id === blockerId);
        if (b) {
          b.status = "resolved";
          b.resolvedAt = new Date().toISOString();
        }
      });
      save(get());
    },

    // ─── Streak logic ────────────────────────────────────────────────

    refreshStreak(projectId) {
      set((s) => {
        const p = s.projects.find((x) => x.id === projectId);
        if (!p) return;
        const today = todayISO();
        const lastActive = p.lastActivityAt?.split("T")[0];
        if (lastActive === today) {
          // already counted today — ensure streak is at least 1
          if (p.streakDays < 1) p.streakDays = 1;
        } else {
          const yesterday = new Date(Date.now() - 86400000)
            .toISOString()
            .split("T")[0];
          p.streakDays = lastActive === yesterday ? p.streakDays + 1 : 1;
        }
      });
      save(get());
    },

    // ─── Selectors ──────────────────────────────────────────────────

    getProject(id) {
      return get().projects.find((p) => p.id === id) ?? null;
    },
  }))
);
