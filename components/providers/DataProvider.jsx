"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useProjectStore } from "@/lib/store/projectStore";

/**
 * Wrap pages that need project data.
 * On first sign-in, uploads any locally-created projects to MongoDB,
 * then loads the full merged set. Prevents data loss after auth.
 */
export function DataProvider({ children }) {
  const { isSignedIn, isLoaded } = useUser();
  const hydrated = useProjectStore((s) => s.hydrated);
  const hydrateFromServer = useProjectStore((s) => s.hydrateFromServer);
  const syncStarted = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) return;
    if (hydrated) return;
    if (syncStarted.current) return;
    syncStarted.current = true;
    hydrateFromServer();
  }, [isLoaded, isSignedIn, hydrated, hydrateFromServer]);

  return <>{children}</>;
}
