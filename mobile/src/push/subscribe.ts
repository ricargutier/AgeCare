import { api } from "../api/client";
import type { PushSubscribeRequest } from '../../../shared/contracts/types';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushSupportStatus =
  | "subscribed"
  | "denied"
  | "unsupported"
  | "error";

/**
 * Request notification permission and subscribe to web push using the VAPID
 * public key from the backend. Idempotent — safe to call on every auth.
 *
 * Returns a status string. Callers should show an in-app banner when status is
 * "unsupported" or "denied" so users know they'll only get in-app alerts.
 */
export async function subscribeToPush(token: string): Promise<PushSupportStatus> {
  // Check for service worker + PushManager support (not available on iOS < 16.4)
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }

  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return "denied";
  }

  try {
    const { publicKey } = await api.getVapidPublicKey(token);
    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    const sw = await navigator.serviceWorker.ready;
    const subscription = await sw.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as BufferSource,
    });

    const json = subscription.toJSON();
    const sub: PushSubscribeRequest = {
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime,
      keys: {
        p256dh: json.keys?.["p256dh"] ?? "",
        auth: json.keys?.["auth"] ?? "",
      },
    };

    await api.subscribePush(sub, token);
    return "subscribed";
  } catch (err) {
    console.error("[push] subscribe failed:", err);
    return "error";
  }
}
