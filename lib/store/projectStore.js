import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { createProject, createTask, createBlocker } from "../schema";
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

// ─── Debounced remote PATCH ───────────────────────────────────────────
// Tracks consecutive failures per project so we can warn the user once
// without spamming toasts on every keystroke.

const pendingRemote = new Map();
const failureCount = new Map(); // projectId → consecutive failure count
const FAILURE_TOAST_THRESHOLD = 3; // warn after 3 consecutive failures

function debouncedRemoteUpdate(id, patch, delay = 1500) {
  if (pendingRemote.has(id)) clearTimeout(pendingRemote.get(id));
  pendingRemote.set(
    id,
    setTimeout(async () => {
      pendingRemote.delete(id);
      try {
        const ok = await updateProjectRemote(id, patch);
        if (ok) {
          // Reset failure counter on success
          failureCount.delete(id);
        } else {
          _recordFailure(id);
        }
      } catch {
        _recordFailure(id);
      }
    }, delay)
  );
}

function _recordFailure(id) {
  const count = (failureCount.get(id) ?? 0) + 1;
  failureCount.set(id, count);
  // Warn once when threshold is crossed, not on every failure
  if (count === FAILURE_TOAST_THRESHOLD) {
    toast.warn(
      "Changes saved locally but not syncing to cloud. Check your connection.",
      { duration: 6000, dedup: true }
    );
  }
}

function flushRemoteUpdate(id) {
  if (pendingRemote.has(id)) {
    clearTimeout(pendingRemote.get(id));
    pendingRemote.delete(id);
  }
}

// ─── Store ────────────────────────────────────────────────────────────

export const useProjectStore = create(
  immer((set, get) => ({
    projects: loadProjectsLocal(),
    hydrated: false,

    async hydrateFromServer() {
      const syncId = toast.loading("Syncing your projects…");
      try {
        const remote = await loadProjectsRemote();
        if (!remote) {
          // DB unavailable — work offline, no error toast needed
          return;
        }

        const localProjects = get().projects;
        const remoteIds = new Set(remote.map((p) => p.id));
        const localOnly = localProjects.filter((p) => !remoteIds.has(p.id));

        if (localOnly.length > 0) {
          await Promise.allSettled(
            localOnly.map((p) => createProjectRemote(p))
          );
          toast.success(
            `Saved ${localOnly.length} local project${
              localOnly.length > 1 ? "s" : ""
            } to your account.`
          );
        }

        const merged = [...remote, ...localOnly];
        set((s) => {
          s.projects = merged;
          s.hydrated = true;
        });
        saveProjectsLocal(merged);
      } catch {
        toast.warn("Couldn't sync from server — working offline.");
      } finally {
        // Always dismiss the loading toast, even on early return or throw
        toast.dismiss(syncId);
        set((s) => {
          s.hydrated = true;
        });
      }
    },

    async addProject(data = {}) {
      const project = createProject(data);
      const projectId = project.id; // capture BEFORE set() — Immer draft proxy

      set((s) => {
        s.projects.push(project);
      });
      saveLocal(get());

      try {
        await createProjectRemote(project);
      } catch {
        toast.warn("Saved locally — will sync to cloud when online.", {
          duration: 3000,
        });
      }

      return projectId;
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
      flushRemoteUpdate(id);
      set((s) => {
        s.projects = s.projects.filter((x) => x.id !== id);
      });
      saveLocal(get());
      try {
        await deleteProjectRemote(id);
      } catch {
        /* silent — already removed locally */
      }
    },

    async completeProject(id) {
      const completionDate = new Date().toISOString();

      // Compute stats INSIDE the Immer callback so we read the same
      // committed state that we're writing — no stale-snapshot race.
      let snapshotForRemote = null;

      set((s) => {
        const p = s.projects.find((x) => x.id === id);
        if (!p) return;

        p.completionDate = completionDate;
        p.postmortem.completedAt = completionDate;
        p.postmortem.stats.daysToComplete = Math.floor(
          (new Date(completionDate) - new Date(p.createdAt)) / 86400000
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

        // Capture the values we need for remote PATCH while still inside
        // the Immer callback — Immer has not committed yet but the draft
        // values are final and correct.
        snapshotForRemote = {
          completionDate: p.completionDate,
          postmortem: {
            completedAt: p.postmortem.completedAt,
            answers: [...p.postmortem.answers],
            stats: { ...p.postmortem.stats },
          },
        };
      });

      saveLocal(get());
      flushRemoteUpdate(id);

      if (snapshotForRemote) {
        // Use delay=0 to fire immediately (flush pattern for important writes)
        debouncedRemoteUpdate(id, snapshotForRemote, 0);
      }
    },

    async addTask(projectId, data = {}) {
      const task = createTask(data);
      const now = new Date().toISOString();

      set((s) => {
        const p = s.projects.find((x) => x.id === projectId);
        if (!p) return;
        p.tasks.push(task);
        p.lastActivityAt = now;
      });
      saveLocal(get());

      const p = get().projects.find((x) => x.id === projectId);
      if (p)
        debouncedRemoteUpdate(projectId, {
          tasks: p.tasks,
          lastActivityAt: now,
        });
      return task.id;
    },

    async updateTask(projectId, taskId, patch) {
      const now = new Date().toISOString();
      const today = todayISO();
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString()
        .split("T")[0];

      set((s) => {
        const p = s.projects.find((x) => x.id === projectId);
        if (!p) return;
        const t = p.tasks.find((x) => x.id === taskId);
        if (!t) return;
        Object.assign(t, patch);
        if (patch.status === "done" && !t.completedAt) {
          t.completedAt = now;
        }

        // Read lastActivityAt BEFORE overwriting it
        const lastActive = p.lastActivityAt?.split("T")[0];
        p.lastActivityAt = now;

        if (lastActive === today) {
          if (p.streakDays < 1) p.streakDays = 1;
        } else if (lastActive === yesterday) {
          p.streakDays = p.streakDays + 1;
        } else {
          p.streakDays = 1;
        }
      });
      saveLocal(get());

      const p = get().projects.find((x) => x.id === projectId);
      if (p) {
        debouncedRemoteUpdate(projectId, {
          tasks: p.tasks,
          lastActivityAt: p.lastActivityAt,
          streakDays: p.streakDays,
        });
      }
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
      const today = todayISO();
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString()
        .split("T")[0];
      set((s) => {
        const p = s.projects.find((x) => x.id === projectId);
        if (!p) return;
        const lastActive = p.lastActivityAt?.split("T")[0];
        if (lastActive === today) {
          if (p.streakDays < 1) p.streakDays = 1;
        } else if (lastActive === yesterday) {
          p.streakDays = p.streakDays + 1;
        } else {
          p.streakDays = 1;
        }
      });
      saveLocal(get());
    },

    getProject(id) {
      return get().projects.find((p) => p.id === id) ?? null;
    },
  }))
);
