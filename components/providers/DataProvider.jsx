"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useProjectStore } from "@/lib/store/projectStore";

/**
 * Wrap this around any page that needs project data.
 * Once Clerk confirms the user is signed in, fetch their
 * projects from MongoDB and hydrate the Zustand store.
 */
export function DataProvider({ children }) {
  const { isSignedIn, isLoaded } = useUser();
  const hydrated = useProjectStore((s) => s.hydrated);
  const hydrateFromServer = useProjectStore((s) => s.hydrateFromServer);

  useEffect(() => {
    // Only hydrate once per session once auth is confirmed
    if (isLoaded && isSignedIn && !hydrated) {
      hydrateFromServer();
    }
  }, [isLoaded, isSignedIn, hydrated, hydrateFromServer]);

  return <>{children}</>;
}
