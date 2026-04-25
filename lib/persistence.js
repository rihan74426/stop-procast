import { SCHEMA_VERSION } from "./schema";
import { getSessionId } from "./sessionId";

const LOCAL_KEY = `stopprocast_projects_v${SCHEMA_VERSION}`;

// ─── localStorage (backup only, MongoDB is primary) ───────────────────

export function loadProjectsLocal() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.projects) ? parsed.projects : [];
  } catch {
    return [];
  }
}

export function saveProjectsLocal(projects) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      LOCAL_KEY,
      JSON.stringify({ version: SCHEMA_VERSION, projects })
    );
  } catch (e) {
    console.warn("Momentum: failed to write localStorage", e);
  }
}

export function clearLocal() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LOCAL_KEY);
}

// ─── User profile helpers ─────────────────────────────────────────────

export function loadUserProfile() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("momentum_user_profile");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveUserProfile(profile) {
  if (typeof window === "undefined") return;
  localStorage.setItem("momentum_user_profile", JSON.stringify(profile));
}

// ─── MongoDB (primary storage for ALL users) ──────────────────────────

export async function loadProjectsRemote(isAuthenticated = false) {
  try {
    const headers = { "Content-Type": "application/json" };

    // For anonymous users, send sessionId
    if (!isAuthenticated) {
      const sessionId = getSessionId();
      if (sessionId) {
        headers["X-Session-Id"] = sessionId;
      }
    }

    const res = await fetch("/api/projects", { headers });
    if (!res.ok) return null;
    const { projects } = await res.json();
    return projects ?? [];
  } catch (err) {
    console.error("Failed to load projects from server:", err);
    return null;
  }
}

export async function createProjectRemote(project, isAuthenticated = false) {
  try {
    const headers = { "Content-Type": "application/json" };
    const body = { ...project };

    // For anonymous users, attach sessionId
    if (!isAuthenticated) {
      const sessionId = getSessionId();
      if (sessionId) {
        body.sessionId = sessionId;
        body.isAnonymous = true;
      }
    }

    const res = await fetch("/api/projects", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const { project: saved } = await res.json();
    return saved;
  } catch (err) {
    console.error("Failed to create project on server:", err);
    return null;
  }
}

export async function updateProjectRemote(id, patch, isAuthenticated = false) {
  try {
    const headers = { "Content-Type": "application/json" };

    if (!isAuthenticated) {
      const sessionId = getSessionId();
      if (sessionId) {
        headers["X-Session-Id"] = sessionId;
      }
    }

    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(patch),
    });
    return res.ok;
  } catch (err) {
    console.error("Failed to update project on server:", err);
    return false;
  }
}

export async function deleteProjectRemote(id, isAuthenticated = false) {
  try {
    const headers = { "Content-Type": "application/json" };

    if (!isAuthenticated) {
      const sessionId = getSessionId();
      if (sessionId) {
        headers["X-Session-Id"] = sessionId;
      }
    }

    const res = await fetch(`/api/projects/${id}`, {
      method: "DELETE",
      headers,
    });
    return res.ok;
  } catch (err) {
    console.error("Failed to delete project on server:", err);
    return false;
  }
}

// ─── Claim anonymous projects on login ────────────────────────────────

export async function claimAnonymousProjects() {
  try {
    const sessionId = getSessionId();
    if (!sessionId) return { success: false, count: 0 };

    const res = await fetch("/api/projects/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });

    if (!res.ok) return { success: false, count: 0 };
    const data = await res.json();

    // Clear session ID after successful claim
    if (data.claimed > 0) {
      const { clearSessionId } = await import("./sessionId");
      clearSessionId();
    }

    return { success: true, count: data.claimed };
  } catch (err) {
    console.error("Failed to claim anonymous projects:", err);
    return { success: false, count: 0 };
  }
}
