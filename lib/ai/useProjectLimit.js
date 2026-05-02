"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { getSessionId } from "@/lib/sessionId";

/**
 * useProjectLimit
 *
 * Checks the server-side project creation limit for anonymous users.
 * Returns: { loading, allowed, count, limit, isAuthed }
 *
 * Fixes:
 *  - AbortController cleans up fetch on unmount
 *  - Authenticated users skip the network check entirely
 *  - Fail-open on network error (never block the user on our error)
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

      // Signed-in users are always allowed — skip network call
      if (isSignedIn) {
        setState({
          loading: false,
          allowed: true,
          count: 0,
          limit: null,
          isAuthed: true,
        });
        return;
      }

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
            limit: data.limit ?? 1,
            isAuthed: data.authed ?? false,
          });
        })
        .catch((err) => {
          if (err?.name === "AbortError") return; // unmounted — ignore
          // Fail open — never block the user due to our network error
          setState({
            loading: false,
            allowed: true,
            count: 0,
            limit: 1,
            isAuthed: false,
          });
        });
    },
    [isLoaded, isSignedIn]
  );

  useEffect(() => {
    const controller = new AbortController();
    check(controller.signal);
    return () => controller.abort();
  }, [check]);

  return state;
}
