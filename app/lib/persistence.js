import { SCHEMA_VERSION } from "./schema";

const KEY = `stopprocast_projects_v${SCHEMA_VERSION}`;

export function loadProjects() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.projects) ? parsed.projects : [];
  } catch {
    return [];
  }
}

export function saveProjects(projects) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ version: SCHEMA_VERSION, projects })
    );
  } catch (e) {
    console.warn("StopProcast: failed to save projects", e);
  }
}

export function clearAll() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
