/**
 * Service Worker push/notificationclick handlers.
 *
 * This file is compiled under tsconfig.sw.json (lib: WebWorker, ES2020) and
 * imported from src/sw.ts — the custom service worker entry used by
 * vite-plugin-pwa's `injectManifest` strategy.
 */

// `self` is already declared by the WebWorker lib as WorkerGlobalScope; cast to
// ServiceWorkerGlobalScope here so we get access to push/notificationclick types.
const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  let payload: {
    title?: string;
    body?: string;
    alertId?: string;
    elderName?: string;
    alertType?: string;
    severity?: string;
  } = {};

  try {
    payload = event.data.json() as typeof payload;
  } catch {
    payload = { body: event.data.text() };
  }

  const title = payload.title ?? `AgeCare Alert — ${payload.elderName ?? "Elder"}`;
  const body =
    payload.body ??
    `${payload.alertType ?? "Alert"} (${payload.severity ?? "info"})`;

  // renotify and vibrate are valid in browsers but not in TS lib types for NotificationOptions.
  const options = {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.alertId ?? "agecare-alert",
    renotify: true,
    requireInteraction: payload.severity === "critical",
    data: { alertId: payload.alertId },
    vibrate: payload.severity === "critical" ? [200, 100, 200] : undefined,
  } as NotificationOptions;

  event.waitUntil(sw.registration.showNotification(title, options));
});

sw.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const alertId = (event.notification.data as { alertId?: string }).alertId;
  const url = alertId ? `/alerts/${alertId}` : "/alerts";

  event.waitUntil(
    sw.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing PWA window if open
        for (const client of clientList) {
          if ("focus" in client) {
            void (client as WindowClient).focus();
            void (client as WindowClient).navigate(url);
            return;
          }
        }
        // Otherwise open a new window
        return sw.clients.openWindow(url);
      })
  );
});
