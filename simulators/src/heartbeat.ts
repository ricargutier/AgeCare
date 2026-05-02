/**
 * Continuous heartbeat simulator — runs indefinitely.
 * Sends a heartbeat from every seeded device every 30s.
 * Sends realistic vitals from the wearable every 60s.
 * Sends occasional motion events from the living-room sensor (06:00–22:00).
 *
 * Run: pnpm dev  (from simulators/)
 */

import { WsClient, type IngestFrame } from "./lib/ws-client.js";
import { WEARABLE, HUB, MOTION_LIVING, DOOR_FRONT } from "./lib/devices.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

/** Returns a random integer in [min, max] inclusive. */
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** True if the current local hour is between 06:00 and 22:00. */
function isDaytime(): boolean {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 22;
}

// ─── Clients — one per device token ─────────────────────────────────────────

const clients: Record<string, WsClient> = {
  [WEARABLE.id]: new WsClient(WEARABLE.token),
  [HUB.id]: new WsClient(HUB.token),
  [MOTION_LIVING.id]: new WsClient(MOTION_LIVING.token),
  [DOOR_FRONT.id]: new WsClient(DOOR_FRONT.token),
};

async function connectAll(): Promise<void> {
  await Promise.all(Object.values(clients).map((c) => c.connect()));
}

function send(deviceId: string, frame: IngestFrame): void {
  clients[deviceId]?.send(frame);
}

// ─── Cumulative steps counter ────────────────────────────────────────────────

let stepsToday = 0;

function resetStepsAtMidnight(): void {
  const msUntilMidnight = (() => {
    const t = new Date();
    t.setHours(24, 0, 0, 0);
    return t.getTime() - Date.now();
  })();
  setTimeout(() => {
    stepsToday = 0;
    console.log("[heartbeat] Steps counter reset for new day.");
    resetStepsAtMidnight();
  }, msUntilMidnight);
}

// ─── Periodic tasks ──────────────────────────────────────────────────────────

function sendHeartbeats(): void {
  const batteryPct = rand(60, 100);

  send(WEARABLE.id, {
    type: "heartbeat",
    deviceId: WEARABLE.id,
    payload: { batteryPct },
  });
  send(HUB.id, {
    type: "heartbeat",
    deviceId: HUB.id,
    payload: {},
  });
  send(MOTION_LIVING.id, {
    type: "heartbeat",
    deviceId: MOTION_LIVING.id,
    payload: {},
  });
  send(DOOR_FRONT.id, {
    type: "heartbeat",
    deviceId: DOOR_FRONT.id,
    payload: {},
  });

  console.log(`[heartbeat] Sent heartbeats from all devices (wearable battery: ${batteryPct}%)`);
}

function sendVitals(): void {
  // Normal: HR ~70±5 bpm, SpO2 ~99±1 %, steps accumulate during day
  const heartRate = rand(65, 75);
  const spo2 = rand(98, 100);
  if (isDaytime()) {
    stepsToday += rand(5, 30);
  }

  const frame: IngestFrame = {
    type: "vitals",
    deviceId: WEARABLE.id,
    payload: {
      ts: now(),
      heartRate,
      spo2,
      steps: stepsToday,
      batteryPct: rand(60, 100),
    },
  };
  send(WEARABLE.id, frame);
  console.log(`[heartbeat] Vitals → HR:${heartRate} SpO2:${spo2}% steps:${stepsToday}`);
}

function maybeMotion(): void {
  if (!isDaytime()) return;
  // ~40 % chance every 30s tick → plausible daytime activity
  if (Math.random() > 0.4) return;

  const frame: IngestFrame = {
    type: "motion",
    deviceId: MOTION_LIVING.id,
    payload: { ts: now(), room: "living_room", detected: true },
  };
  send(MOTION_LIVING.id, frame);
  console.log("[heartbeat] Motion detected in living room.");
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("[heartbeat] Starting continuous heartbeat simulator...");
  await connectAll();
  console.log("[heartbeat] All devices connected. Running...");

  resetStepsAtMidnight();

  // Immediately send first heartbeat + vitals
  sendHeartbeats();
  sendVitals();

  // Heartbeats every 30s
  setInterval(() => {
    sendHeartbeats();
    maybeMotion();
  }, 30_000);

  // Vitals every 60s
  setInterval(sendVitals, 60_000);
}

main().catch((err) => {
  console.error("[heartbeat] Fatal:", err);
  process.exit(1);
});
