"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { getSessionId } from "@/lib/sessionId";

/**
 * useProjectLimit
 *
 * Checks the server-side project creation limit for anonymous users.
 * Returns:
 *   { loading, allowed, count, limit, isAuthed }
 *
 * - `allowed`  → true if the user can create a new project right now
 * - `isAuthed` → true if signed in (no limit applies)
 * - `count`    → how many anonymous projects exist for this session
 * - `limit`    → the cap (1 for anon users)
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

  useEffect(() => {
    if (!isLoaded) return;

    // Signed-in users are always allowed — skip the check
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
    })
      .then((r) => r.json())
      .then((data) => {
        setState({
          loading: false,
          allowed: data.allowed ?? true,
          count: data.count ?? 0,
          limit: data.limit ?? 1,
          isAuthed: data.authed ?? false,
        });
      })
      .catch(() => {
        // Fail open
        setState({
          loading: false,
          allowed: true,
          count: 0,
          limit: 1,
          isAuthed: false,
        });
      });
  }, [isLoaded, isSignedIn]);

  return state;
}
