"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { getSessionId } from "@/lib/sessionId";

/**
 * useProjectLimit
 *
 * Limits:
 *   - Anonymous: 1 project per session
 *   - Authenticated: 4 projects (server-enforced)
 *
 * Returns: { loading, allowed, count, limit, isAuthed }
 */
export function useProjectLimit() {
  const { isSignedIn, isLoaded } = useUser();
  const [state, setState] = useState({
    loading: true,
    allowed: true,
    count: 0,
    limit: 1,
    isAuthed: false,
  });

  const check = useCallback(
    (signal) => {
      if (!isLoaded) return;

      const sessionId = getSessionId();
      fetch("/api/projects/check-limit", {
        headers: sessionId ? { "X-Session-Id": sessionId } : {},
        signal,
      })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((data) => {
          setState({
            loading: false,
            allowed: data.allowed ?? true,
            count: data.count ?? 0,
            limit: data.limit ?? (isSignedIn ? 4 : 1),
            isAuthed: data.authed ?? isSignedIn ?? false,
          });
        })
        .catch((err) => {
          if (err?.name === "AbortError") return;
          // Fail open — never block on our network error
          setState({
            loading: false,
            allowed: true,
            count: 0,
            limit: isSignedIn ? 4 : 1,
            isAuthed: isSignedIn ?? false,
          });
        });
    },
    [isLoaded, isSignedIn],
  );

  useEffect(() => {
    if (!isLoaded) return;
    const controller = new AbortController();
    check(controller.signal);
    return () => controller.abort();
  }, [check, isLoaded]);

  return state;
}
