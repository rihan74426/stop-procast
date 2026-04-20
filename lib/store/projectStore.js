import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  createProject,
  createTask,
  createPhase,
  createMilestone,
  createBlocker,
} from "../schema";
import {
  loadProjectsLocal,
  saveProjectsLocal,
  loadProjectsRemote,
  createProjectRemote,
  updateProjectRemote,
  deleteProjectRemote,
} from "../persistence";
import { todayISO } from "../utils/date";

// Write to localStorage immediately (instant UI), then sync to MongoDB async
function saveLocal(state) {
  saveProjectsLocal(state.projects);
}

export const useProjectStore = create(
  immer((set, get) => ({
    projects: loadProjectsLocal(), // start from cache, hydrate from server on mount
    hydrated: false, // true once server data loaded

    // ─── Hydration (called once on app mount after Clerk auth) ──────

    async hydrateFromServer() {
      const remote = await loadProjectsRemote();
      if (!remote) return; // offline or not authed yet — keep localStorage

      set((s) => {
        s.projects = remote;
        s.hydrated = true;
      });
      saveProjectsLocal(remote);
    },

    // ─── Project CRUD ───────────────────────────────────────────────

    async addProject(data = {}) {
      const project = createProject(data);

      // Optimistic: write to local store immediately
      set((s) => {
        s.projects.push(project);
      });
      saveLocal(get());

      // Persist to MongoDB
      await createProjectRemote(project);

      return project.id;
    },

    async updateProject(id, patch) {
      set((s) => {
        const p = s.projects.find((x) => x.id === id);
        if (!p) return;
        Object.assign(p, patch);
        p.lastActivityAt = new Date().toISOString();
      });
      saveLocal(get());
      await updateProjectRemote(id, {
        ...patch,
        lastActivityAt: new Date().toISOString(),
      });
    },

    async deleteProject(id) {
      set((s) => {
        s.projects = s.projects.filter((x) => x.id !== id);
      });
      saveLocal(get());
      await deleteProjectRemote(id);
    },

    async completeProject(id) {
      set((s) => {
        const p = s.projects.find((x) => x.id === id);
        if (!p) return;
        p.completionDate = new Date().toISOString();
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
      saveLocal(get());
      const p = get().projects.find((x) => x.id === id);
      if (p)
        await updateProjectRemote(id, {
          completionDate: p.completionDate,
          postmortem: p.postmortem,
        });
    },

    // ─── Task CRUD ──────────────────────────────────────────────────

    async addTask(projectId, data = {}) {
      const task = createTask(data);
      set((s) => {
        const p = s.projects.find((x) => x.id === projectId);
        if (!p) return;
        p.tasks.push(task);
        p.lastActivityAt = new Date().toISOString();
      });
      saveLocal(get());
      const p = get().projects.find((x) => x.id === projectId);
      if (p)
        await updateProjectRemote(projectId, {
          tasks: p.tasks,
          lastActivityAt: p.lastActivityAt,
        });
      return task.id;
    },

    async updateTask(projectId, taskId, patch) {
      set((s) => {
        const p = s.projects.find((x) => x.id === projectId);
        if (!p) return;
        const t = p.tasks.find((x) => x.id === taskId);
        if (!t) return;
        Object.assign(t, patch);
        if (patch.status === "done") t.completedAt = new Date().toISOString();
        p.lastActivityAt = new Date().toISOString();
      });
      saveLocal(get());
      get().refreshStreak(projectId);
      const p = get().projects.find((x) => x.id === projectId);
      if (p)
        await updateProjectRemote(projectId, {
          tasks: p.tasks,
          lastActivityAt: p.lastActivityAt,
          streakDays: p.streakDays,
        });
    },

    async deleteTask(projectId, taskId) {
      set((s) => {
        const p = s.projects.find((x) => x.id === projectId);
        if (!p) return;
        p.tasks = p.tasks.filter((x) => x.id !== taskId);
      });
      saveLocal(get());
      const p = get().projects.find((x) => x.id === projectId);
      if (p) await updateProjectRemote(projectId, { tasks: p.tasks });
    },

    // ─── Phase CRUD ─────────────────────────────────────────────────

    async updatePhase(projectId, phaseId, patch) {
      set((s) => {
        const p = s.projects.find((x) => x.id === projectId);
        if (!p) return;
        const ph = p.phases.find((x) => x.id === phaseId);
        if (ph) Object.assign(ph, patch);
      });
      saveLocal(get());
      const p = get().projects.find((x) => x.id === projectId);
      if (p) await updateProjectRemote(projectId, { phases: p.phases });
    },

    // ─── Blocker CRUD ───────────────────────────────────────────────

    async addBlocker(projectId, description) {
      const blocker = createBlocker({ description });
      set((s) => {
        const p = s.projects.find((x) => x.id === projectId);
        if (p) p.blockers.push(blocker);
      });
      saveLocal(get());
      const p = get().projects.find((x) => x.id === projectId);
      if (p) await updateProjectRemote(projectId, { blockers: p.blockers });
    },

    async resolveBlocker(projectId, blockerId) {
      set((s) => {
        const p = s.projects.find((x) => x.id === projectId);
        if (!p) return;
        const b = p.blockers.find((x) => x.id === blockerId);
        if (b) {
          b.status = "resolved";
          b.resolvedAt = new Date().toISOString();
        }
      });
      saveLocal(get());
      const p = get().projects.find((x) => x.id === projectId);
      if (p) await updateProjectRemote(projectId, { blockers: p.blockers });
    },

    // ─── Streak logic ────────────────────────────────────────────────

    refreshStreak(projectId) {
      set((s) => {
        const p = s.projects.find((x) => x.id === projectId);
        if (!p) return;
        const today = todayISO();
        const lastActive = p.lastActivityAt?.split("T")[0];
        if (lastActive === today) {
          if (p.streakDays < 1) p.streakDays = 1;
        } else {
          const yesterday = new Date(Date.now() - 86400000)
            .toISOString()
            .split("T")[0];
          p.streakDays = lastActive === yesterday ? p.streakDays + 1 : 1;
        }
      });
      saveLocal(get());
    },

    // ─── Selectors ──────────────────────────────────────────────────

    getProject(id) {
      return get().projects.find((p) => p.id === id) ?? null;
    },
  }))
);
