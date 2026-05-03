"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  getReminderPrefs,
  saveReminderPrefs,
  scheduleNextReminder,
  cancelReminders,
  showTestNotification,
  initNotifications,
} from "@/lib/Notifications";
import { useProjectStore } from "@/lib/store/projectStore";
import { activePhase, nextAction } from "@/lib/utils/progress";

export function NotificationSettings() {
  const projects = useProjectStore((s) => s.projects);
  const activeProjects = projects.filter((p) => !p.completionDate);

  const [permission, setPermission] = useState("default");
  const [prefs, setPrefs] = useState(getReminderPrefs());
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const supported = isPushSupported();

  useEffect(() => {
    if (!supported) return;
    getNotificationPermission().then(setPermission);
    initNotifications();
  }, [supported]);

  const handleEnable = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setPermission("granted");
      const updated = { ...prefs, enabled: true };
      setPrefs(updated);
      saveReminderPrefs(updated);
      const topProject = activeProjects[0];
      scheduleNextReminder(updated, topProject?.projectTitle);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setPermission("denied");
    }
  };

  const handleSave = () => {
    saveReminderPrefs(prefs);
    if (prefs.enabled && permission === "granted") {
      const topProject = activeProjects[0];
      scheduleNextReminder(prefs, topProject?.projectTitle);
    } else {
      cancelReminders();
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setTesting(true);
    const topProject = activeProjects[0];
    const next = topProject ? nextAction(topProject) : null;
    await showTestNotification(
      "Momentum — Test Reminder 🎯",
      next ? `Your next action: "${next}"` : prefs.message
    );
    setTimeout(() => setTesting(false), 2000);
  };

  const handleToggle = (enabled) => {
    const updated = { ...prefs, enabled };
    setPrefs(updated);
  };

  if (!supported) {
    return (
      <div className="rounded-[var(--r-md)] bg-[var(--bg-subtle)] px-4 py-3">
        <p className="text-sm text-[var(--text-tertiary)]">
          Push notifications are not supported in this browser.
        </p>
      </div>
    );
  }

  const hourOptions = Array.from({ length: 24 }, (_, i) => {
    const h12 = i === 0 ? 12 : i > 12 ? i - 12 : i;
    const ampm = i < 12 ? "AM" : "PM";
    return { value: i, label: `${h12}:00 ${ampm}` };
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Permission state */}
      {permission === "denied" && (
        <div className="rounded-[var(--r-md)] border border-[var(--coral)] bg-[var(--coral-bg)] px-4 py-3 text-sm text-[var(--coral)]">
          Notifications are blocked in your browser. Please enable them in your
          browser settings to use reminders.
        </div>
      )}

      {/* Enable toggle */}
      {permission !== "granted" && permission !== "denied" && (
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Enable morning reminders
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              Get a daily push notification to remind you to work on your
              projects
            </p>
          </div>
          <Button size="sm" onClick={handleEnable}>
            Enable
          </Button>
        </div>
      )}

      {permission === "granted" && (
        <>
          {/* Toggle */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Daily reminders
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                Morning notification to keep you on track
              </p>
            </div>
            <button
              onClick={() => handleToggle(!prefs.enabled)}
              className={[
                "relative w-11 h-6 rounded-full transition-colors duration-200",
                prefs.enabled ? "bg-[var(--violet)]" : "bg-[var(--bg-muted)]",
              ].join(" ")}
              aria-label={
                prefs.enabled ? "Disable reminders" : "Enable reminders"
              }
            >
              <span
                className={[
                  "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200",
                  prefs.enabled ? "translate-x-6" : "translate-x-1",
                ].join(" ")}
              />
            </button>
          </div>

          {/* Time picker */}
          {prefs.enabled && (
            <>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-[var(--text-primary)] shrink-0 w-24">
                  Remind me at
                </label>
                <select
                  value={prefs.hour}
                  onChange={(e) =>
                    setPrefs((p) => ({ ...p, hour: parseInt(e.target.value) }))
                  }
                  className="h-9 px-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
                >
                  {hourOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom message */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  Reminder message
                </label>
                <input
                  type="text"
                  value={prefs.message}
                  onChange={(e) =>
                    setPrefs((p) => ({ ...p, message: e.target.value }))
                  }
                  maxLength={120}
                  className="h-10 px-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleTest}
                  loading={testing}
                >
                  Test notification
                </Button>
                <Button
                  size="sm"
                  variant={saved ? "subtle" : "primary"}
                  onClick={handleSave}
                >
                  {saved ? "✓ Saved" : "Save"}
                </Button>
              </div>

              <p className="text-xs text-[var(--text-tertiary)]">
                Note: Reminders fire while Momentum is open in your browser. For
                background notifications, add Momentum to your home screen as a
                PWA.
              </p>
            </>
          )}

          {!prefs.enabled && (
            <Button size="sm" onClick={handleSave}>
              Save preferences
            </Button>
          )}
        </>
      )}
    </div>
  );
}
