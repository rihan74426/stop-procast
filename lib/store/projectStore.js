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
import { toast } from "../toast";

function saveLocal(state) {
  saveProjectsLocal(state.projects);
}

// Debounce remote updates to avoid hammering the API on rapid task clicks
const pendingRemote = new Map();
function debouncedRemoteUpdate(id, patch, delay = 1500) {
  if (pendingRemote.has(id)) clearTimeout(pendingRemote.get(id));
  pendingRemote.set(
    id,
    setTimeout(async () => {
      pendingRemote.delete(id);
      try {
        await updateProjectRemote(id, patch);
      } catch {
        toast.error("Sync failed — changes saved locally.", { duration: 4000 });
      }
    }, delay)
  );
}

export const useProjectStore = create(
  immer((set, get) => ({
    projects: loadProjectsLocal(),
    hydrated: false,

    // ─── Hydration: merge localStorage → MongoDB on sign-in ─────────
    async hydrateFromServer() {
      const syncId = toast.loading("Syncing your projects…");
      try {
        const remote = await loadProjectsRemote();
        if (!remote) {
          toast.dismiss(syncId);
          return;
        }

        const localProjects = get().projects;
        const remoteIds = new Set(remote.map((p) => p.id));
        const localOnly = localProjects.filter((p) => !remoteIds.has(p.id));

        // Upload any local-only (guest-created) projects
        if (localOnly.length > 0) {
          await Promise.all(localOnly.map((p) => createProjectRemote(p)));
          if (localOnly.length > 0) {
            toast.success(
              `Saved ${localOnly.length} local project${
                localOnly.length > 1 ? "s" : ""
              } to your account.`
            );
          }
        }

        const merged = [...remote, ...localOnly];
        set((s) => {
          s.projects = merged;
          s.hydrated = true;
        });
        saveProjectsLocal(merged);
        toast.dismiss(syncId);
      } catch (err) {
        toast.dismiss(syncId);
        toast.warn("Couldn't sync from server — working offline.");
      }
    },

    // ─── Project CRUD ────────────────────────────────────────────────
    async addProject(data = {}) {
      const project = createProject(data);
      set((s) => {
        s.projects.push(project);
      });
      saveLocal(get());
      try {
        await createProjectRemote(project);
      } catch {
        toast.warn("Project saved locally — will sync when online.");
      }
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
      debouncedRemoteUpdate(id, {
        ...patch,
        lastActivityAt: new Date().toISOString(),
      });
    },

    async deleteProject(id) {
      set((s) => {
        s.projects = s.projects.filter((x) => x.id !== id);
      });
      saveLocal(get());
      try {
        await deleteProjectRemote(id);
      } catch {
        toast.warn("Deletion synced locally — will update server when online.");
      }
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
      if (p) {
        try {
          await updateProjectRemote(id, {
            completionDate: p.completionDate,
            postmortem: p.postmortem,
          });
        } catch {
          toast.warn("Completion saved locally — will sync when online.");
        }
      }
    },

    // ─── Task CRUD ───────────────────────────────────────────────────
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
        debouncedRemoteUpdate(projectId, {
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
        debouncedRemoteUpdate(projectId, {
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
      if (p) debouncedRemoteUpdate(projectId, { tasks: p.tasks });
    },

    async updatePhase(projectId, phaseId, patch) {
      set((s) => {
        const p = s.projects.find((x) => x.id === projectId);
        if (!p) return;
        const ph = p.phases.find((x) => x.id === phaseId);
        if (ph) Object.assign(ph, patch);
      });
      saveLocal(get());
      const p = get().projects.find((x) => x.id === projectId);
      if (p) debouncedRemoteUpdate(projectId, { phases: p.phases });
    },

    async addBlocker(projectId, description) {
      const blocker = createBlocker({ description });
      set((s) => {
        const p = s.projects.find((x) => x.id === projectId);
        if (p) p.blockers.push(blocker);
      });
      saveLocal(get());
      const p = get().projects.find((x) => x.id === projectId);
      if (p) debouncedRemoteUpdate(projectId, { blockers: p.blockers });
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
      if (p) debouncedRemoteUpdate(projectId, { blockers: p.blockers });
    },

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

    getProject(id) {
      return get().projects.find((p) => p.id === id) ?? null;
    },
  }))
);
