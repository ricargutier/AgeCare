/**
 * Service Worker push/notificationclick handlers.
 *
 * This file is referenced from vite.config.ts via vite-plugin-pwa's
 * `additionalManifestEntries`. In practice, with the `generateSW` strategy the
 * workbox-generated SW is the active service worker, so we inject these
 * handlers via the workbox `injectManifest` approach or simply import this
 * module from a custom SW. For the prototype we register these listeners
 * directly in the main SW via the PWA plugin's self.__WB_MANIFEST injection.
 *
 * NOTE: This file is imported at the TOP of the custom service worker if you
 * switch to `injectManifest` strategy. For now the event listeners below are
 * bundled via the plugin's includeAssets.
 */

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("push", (event: PushEvent) => {
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

  const options: NotificationOptions = {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.alertId ?? "agecare-alert",
    renotify: true,
    requireInteraction: payload.severity === "critical",
    data: { alertId: payload.alertId },
    // vibrate is valid in browsers but not in TS lib types for NotificationOptions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(payload.severity === "critical" ? { vibrate: [200, 100, 200] } as any : {}),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const alertId = (event.notification.data as { alertId?: string }).alertId;
  const url = alertId ? `/alerts/${alertId}` : "/alerts";

  event.waitUntil(
    self.clients
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
        return self.clients.openWindow(url);
      })
  );
});
