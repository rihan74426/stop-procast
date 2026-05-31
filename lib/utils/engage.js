"use client";

import { useEffect, useRef } from "react";
import { getSessionId } from "@/lib/sessionId";

/**
 * useEngageView — fires a view event once per project per session.
 * Call inside project page components.
 */
export function useEngageView(projectId, isOwner = false) {
  const firedRef = useRef(false);

  useEffect(() => {
    // Don't count owner's own views
    if (!projectId || isOwner || firedRef.current) return;

    const key = `viewed_${projectId}`;
    if (sessionStorage.getItem(key) === "1") return;

    firedRef.current = true;
    sessionStorage.setItem(key, "1");

    fetch(`/api/projects/${projectId}/engage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "view", actorId: getSessionId() }),
    }).catch(() => {
      /* fire-and-forget */
    });
  }, [projectId, isOwner]);
}

/**
 * trackExport — call whenever a project export is triggered.
 * Fire-and-forget, never blocks the export itself.
 */
export function trackExport(projectId) {
  if (!projectId) return;
  fetch(`/api/projects/${projectId}/engage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "export", actorId: getSessionId() }),
  }).catch(() => {
    /* fire-and-forget */
  });
}
