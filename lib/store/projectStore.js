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
  loadDeletedIdsLocal,
  saveDeletedIdLocal,
  saveDeletedIdsLocal,
  clearDeletedIdsLocal,
} from "../persistence";
import { todayISO } from "../utils/date";
import { toast } from "../toast";
import { translations } from "../i18n/translations";

// ─── i18n helper (store-level, reads locale from localStorage) ────────
// The store runs outside React so we can't use useI18n().
// We read the stored locale and fall back to English.

function tr(key) {
  let locale = "en";
  try {
    if (typeof window !== "undefined") {
      locale = localStorage.getItem("momentum_locale") || "en";
    }
  } catch {
    /* ignore */
  }
  const dict = translations[locale] || translations.en;
  return dict[key] || translations.en[key] || key;
}

function saveLocal(state) {
  saveProjectsLocal(state.projects);
}

// ─── Debounced remote PATCH ───────────────────────────────────────────

const pendingRemote = new Map();
const failureCount = new Map();
const FAILURE_TOAST_THRESHOLD = 3;

function debouncedRemoteUpdate(id, patch, delay = 1500) {
  if (pendingRemote.has(id)) clearTimeout(pendingRemote.get(id));
  pendingRemote.set(
    id,
    setTimeout(async () => {
      pendingRemote.delete(id);
      try {
        const ok = await updateProjectRemote(id, patch);
        if (ok) {
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
  if (count === FAILURE_TOAST_THRESHOLD) {
    toast.warn(tr("toast_sync_warn"), { duration: 6000, dedup: true });
  }
}

function flushRemoteUpdate(id) {
  if (pendingRemote.has(id)) {
    clearTimeout(pendingRemote.get(id));
    pendingRemote.delete(id);
  }
}

// Session-level guard to avoid repeated hydrations in the same browser session
let hydratedSession = false;

// ─── Store ────────────────────────────────────────────────────────────

export const useProjectStore = create(
  immer((set, get) => ({
    projects: loadProjectsLocal(),
    hydrated: false,

    async hydrateFromServer() {
      // Skip if this session already hydrated (prevents re-run on each DataProvider mount)
      if (hydratedSession) return;
      hydratedSession = true;

      const syncId = toast.loading(tr("toast_syncing"));
      try {
        const remote = await loadProjectsRemote();
        // If fetch failed (offline), leave local state in place
        if (!remote) {
          return;
        }

        // Respect locally tracked deleted IDs — do not resurrect deleted projects
        const deletedIds = loadDeletedIdsLocal() || [];
        const remoteFiltered = remote.filter((p) => !deletedIds.includes(p.id));

        const localProjects = get().projects;
        const remoteIds = new Set(remoteFiltered.map((p) => p.id));
        // Local-only projects that are not in remote and are not in deleted IDs
        const localOnly = localProjects.filter(
          (p) => !remoteIds.has(p.id) && !deletedIds.includes(p.id)
        );

        if (localOnly.length > 0) {
          await Promise.allSettled(
            localOnly.map((p) =>
              // Only attempt to create remote for projects that are NOT marked deleted
              createProjectRemote(p)
            )
          );
          const count = localOnly.length;
          const msg =
            count === 1
              ? tr("toast_sync_saved", { count })
              : tr("toast_sync_saved_plural", { count });
          const resolved = msg.replace(/\{\{count\}\}/g, String(count));
          toast.success(resolved);
        }

        // Combine remote (already filtered) with localOnly
        const merged = [...remoteFiltered, ...localOnly];
        set((s) => {
          s.projects = merged;
          s.hydrated = true;
        });
        saveProjectsLocal(merged);
      } catch {
        toast.warn(tr("toast_sync_offline"));
      } finally {
        toast.dismiss(syncId);
        set((s) => {
          s.hydrated = true;
        });
      }
    },

    async addProject(data = {}) {
      const project = createProject(data);
      const projectId = project.id;

      set((s) => {
        s.projects.push(project);
      });
      saveLocal(get());

      try {
        await createProjectRemote(project);
      } catch {
        toast.warn(tr("toast_save_local"), { duration: 3000 });
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
      // Persist deletion locally so hydration won't resurrect it
      try {
        saveDeletedIdLocal(id);
      } catch {
        /* ignore */
      }

      flushRemoteUpdate(id);
      set((s) => {
        s.projects = s.projects.filter((x) => x.id !== id);
      });
      saveLocal(get());
      try {
        await deleteProjectRemote(id);
        // On successful remote delete, we could keep the id in deleted list for safety,
        // or clean it up later when appropriate. For now keep the marker to avoid races.
      } catch {
        /* silent — already removed locally */
      }
    },

    async completeProject(id) {
      const completionDate = new Date().toISOString();
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

// Export helper to reset session hydration guard (called on sign-out)
export function resetHydratedSession() {
  hydratedSession = false;
}
