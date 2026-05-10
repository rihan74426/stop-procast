/**
 * lib/Notifications.js — Push notification manager for Momentum
 *
 * Plain utility module — no "use client" directive.
 * All functions guard typeof window themselves, so this is safe to import
 * from both client components and (accidentally) server code without crashing.
 *
 * Uses Web Push API + Service Worker.
 * Morning reminders are scheduled client-side using setTimeout/localStorage.
 */

const REMINDER_KEY = "momentum_reminder_prefs";
const SW_PATH = "/sw.js";

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "Notification" in window
  );
}

export async function getNotificationPermission() {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!isPushSupported()) return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function getReminderPrefs() {
  if (typeof window === "undefined") return getDefaultPrefs();
  try {
    const raw = localStorage.getItem(REMINDER_KEY);
    return raw
      ? { ...getDefaultPrefs(), ...JSON.parse(raw) }
      : getDefaultPrefs();
  } catch {
    return getDefaultPrefs();
  }
}

export function saveReminderPrefs(prefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REMINDER_KEY, JSON.stringify(prefs));
}

function getDefaultPrefs() {
  return {
    enabled: false,
    hour: 9,
    minute: 0,
    message: "Time to make progress! What's your next action today?",
  };
}

export async function initNotifications() {
  if (!isPushSupported()) return;
  try {
    await navigator.serviceWorker.register(SW_PATH);
  } catch (err) {
    console.warn("[SW] Registration failed:", err.message);
  }
}

export async function showTestNotification(title, body) {
  if (!isPushSupported()) return false;
  if (Notification.permission !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, {
      body,
      icon: "/favicon.png",
      badge: "/favicon.png",
      tag: "momentum-test",
      actions: [{ action: "open", title: "Open Momentum" }],
    });
    return true;
  } catch {
    new Notification(title, { body, icon: "/favicon.png" });
    return true;
  }
}

let _reminderTimer = null;

export function scheduleNextReminder(prefs, projectTitle) {
  if (_reminderTimer) {
    clearTimeout(_reminderTimer);
    _reminderTimer = null;
  }
  if (!prefs?.enabled || Notification.permission !== "granted") return;

  const now = new Date();
  const next = new Date();
  next.setHours(prefs.hour, prefs.minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  const delay = next.getTime() - now.getTime();
  _reminderTimer = setTimeout(async () => {
    const title = "Momentum — Daily Check-in 🎯";
    const body = projectTitle
      ? `${prefs.message} Working on: "${projectTitle}"`
      : prefs.message;
    await showTestNotification(title, body);
    const updatedPrefs = getReminderPrefs();
    scheduleNextReminder(updatedPrefs, projectTitle);
  }, delay);
}

export function cancelReminders() {
  if (_reminderTimer) {
    clearTimeout(_reminderTimer);
    _reminderTimer = null;
  }
}
