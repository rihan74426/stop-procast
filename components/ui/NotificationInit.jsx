"use client";

import { useEffect } from "react";
import { useProjectStore } from "@/lib/store/projectStore";
import {
  initNotifications,
  getReminderPrefs,
  scheduleNextReminder,
  getNotificationPermission,
} from "@/lib/notifications";

/**
 * Mounts silently in layout — registers service worker
 * and re-schedules any active reminder on app load.
 */
export function NotificationInit() {
  const projects = useProjectStore((s) => s.projects);

  useEffect(() => {
    (async () => {
      await initNotifications();
      const permission = await getNotificationPermission();
      if (permission !== "granted") return;

      const prefs = getReminderPrefs();
      if (!prefs.enabled) return;

      // Use most recently active project for the reminder context
      const activeProject = projects
        .filter((p) => !p.completionDate)
        .sort(
          (a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt),
        )[0];

      scheduleNextReminder(prefs, activeProject?.projectTitle);
    })();
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
