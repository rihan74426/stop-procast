import { SCHEMA_VERSION } from "./schema";
import { getSessionId } from "./sessionId";

const LOCAL_KEY = `stopprocast_projects_v${SCHEMA_VERSION}`;

// ─── localStorage ─────────────────────────────────────────────────────

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
    console.warn("Momentum: localStorage write failed", e);
  }
}

export function clearLocal() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LOCAL_KEY);
}

// ─── User profile ─────────────────────────────────────────────────────

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

// ─── Shared header builder ────────────────────────────────────────────

function buildHeaders(extra = {}) {
  const headers = { "Content-Type": "application/json", ...extra };
  const sessionId = getSessionId();
  if (sessionId) headers["X-Session-Id"] = sessionId;
  return headers;
}

// ─── Remote: MongoDB via API routes ──────────────────────────────────

export async function loadProjectsRemote() {
  try {
    const res = await fetch("/api/projects", { headers: buildHeaders() });
    if (!res.ok) return null;
    const { projects } = await res.json();
    return projects ?? [];
  } catch {
    return null;
  }
}

export async function createProjectRemote(project) {
  try {
    const sessionId = getSessionId();
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({ ...project, sessionId }),
    });
    if (!res.ok) return null;
    const { project: saved } = await res.json();
    return saved;
  } catch {
    return null;
  }
}

export async function updateProjectRemote(id, patch) {
  try {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: buildHeaders(),
      body: JSON.stringify(patch),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteProjectRemote(id) {
  try {
    const res = await fetch(`/api/projects/${id}`, {
      method: "DELETE",
      headers: buildHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Claim anonymous projects on sign-in ─────────────────────────────

export async function claimAnonymousProjects() {
  try {
    const sessionId = getSessionId();
    if (!sessionId) return { success: true, count: 0 };

    const res = await fetch("/api/projects/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });

    if (!res.ok) return { success: false, count: 0 };
    const data = await res.json();

    // Clear session ID once claimed so it doesn't re-run
    if (data.claimed > 0) {
      const { clearSessionId } = await import("./sessionId");
      clearSessionId();
    }

    return { success: true, count: data.claimed ?? 0 };
  } catch {
    return { success: false, count: 0 };
  }
}
