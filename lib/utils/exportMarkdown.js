"use client";

import { toMarkdown, projectSlug } from "./toMarkdown";

export function exportProjectMarkdown(project) {
  const content = toMarkdown(project);
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectSlug(project.projectTitle)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportProjectJSON(project) {
  const { _id, __v, ...clean } = project;
  const blob = new Blob([JSON.stringify(clean, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectSlug(project.projectTitle)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
