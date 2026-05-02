import webPush from "web-push";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prisma from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VAPID_FILE = path.join(__dirname, "..", ".vapid.json");

let vapidPublicKey: string = "";
let vapidPrivateKey: string = "";

export function initVapid() {
  // Try env vars first
  if (process.env["VAPID_PUBLIC_KEY"] && process.env["VAPID_PRIVATE_KEY"]) {
    vapidPublicKey = process.env["VAPID_PUBLIC_KEY"];
    vapidPrivateKey = process.env["VAPID_PRIVATE_KEY"];
  } else if (fs.existsSync(VAPID_FILE)) {
    // Load from file
    const saved = JSON.parse(fs.readFileSync(VAPID_FILE, "utf8")) as {
      publicKey: string;
      privateKey: string;
    };
    vapidPublicKey = saved.publicKey;
    vapidPrivateKey = saved.privateKey;
  } else {
    // Generate new keys
    const keys = webPush.generateVAPIDKeys();
    vapidPublicKey = keys.publicKey;
    vapidPrivateKey = keys.privateKey;
    fs.writeFileSync(VAPID_FILE, JSON.stringify({ publicKey: vapidPublicKey, privateKey: vapidPrivateKey }, null, 2));
    console.warn("[web-push] Generated new VAPID keys and saved to .vapid.json");
  }

  webPush.setVapidDetails(
    "mailto:admin@agecare.demo",
    vapidPublicKey,
    vapidPrivateKey
  );

  console.log("[web-push] VAPID initialized, public key:", vapidPublicKey.slice(0, 20) + "...");
}

export function getVapidPublicKey(): string {
  return vapidPublicKey;
}

export async function sendPush(userId: string, payload: unknown): Promise<void> {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });

  for (const sub of subs) {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          expirationTime: sub.expirationTime ? Number(sub.expirationTime) : null,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
    } catch (err) {
      console.error(`[web-push] Failed to send to userId=${userId} endpoint=${sub.endpoint}:`, err);
      // Remove expired subscriptions
      if ((err as { statusCode?: number }).statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
    }
  }
}

// Send push to all admin/caregiver users subscribed to an elder
export async function sendPushToElderSubscribers(elderId: string, payload: unknown): Promise<void> {
  // Get users in care circle with admin or caregiver permission
  const members = await prisma.careCircleMember.findMany({
    where: {
      elderId,
      permissionLevel: { in: ["admin", "caregiver"] },
    },
    select: { userId: true },
  });

  await Promise.allSettled(members.map((m) => sendPush(m.userId, payload)));
}
