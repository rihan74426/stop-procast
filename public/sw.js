// public/sw.js — Momentum Service Worker
// Handles push notifications for daily task reminders

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener("push", (e) => {
  if (!e.data) return;

  let data;
  try {
    data = e.data.json();
  } catch {
    data = { title: "Momentum", body: e.data.text() };
  }

  const options = {
    body: data.body || "You have tasks waiting. Let's make progress today!",
    icon: "/favicon.png",
    badge: "/favicon.png",
    tag: data.tag || "momentum-reminder",
    renotify: true,
    requireInteraction: false,
    actions: [
      { action: "open", title: "Open Momentum" },
      { action: "dismiss", title: "Dismiss" },
    ],
    data: { url: data.url || "/" },
  };

  e.waitUntil(
    self.registration.showNotification(data.title || "Momentum", options),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();

  if (e.action === "dismiss") return;

  const url = e.notification.data?.url || "/";
  e.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(url);
      }),
  );
});
