import { SCHEMA_VERSION } from "./schema";

const LOCAL_KEY = `stopprocast_projects_v${SCHEMA_VERSION}`;

// ─── localStorage (instant, offline-capable cache) ────────────────────

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

// ─── MongoDB (server, via API routes) ────────────────────────────────

export async function loadProjectsRemote() {
  try {
    const res = await fetch("/api/projects");
    if (!res.ok) return null;
    const { projects } = await res.json();
    return projects ?? [];
  } catch {
    return null;
  }
}

export async function createProjectRemote(project) {
  try {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteProjectRemote(id) {
  try {
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}
