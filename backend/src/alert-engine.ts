import { Prisma } from "@prisma/client";
import prisma from "./db.js";
import { serializeAlert, serializeVitalsSample } from "./serializers.js";
import { broadcastAlertNew, broadcastDeviceStatus, broadcastVitalsTick } from "./ws-client.js";
import { sendPushToElderSubscribers } from "./web-push.js";
import type { IngestFrame } from "../../shared/contracts/types.js";

// ─── Rolling HR window for vitals_anomaly ────────────────────────────────────
// Track high heart rate samples per elder (timestamp → bpm)
const highHrWindows = new Map<string, number[]>(); // elderId → array of timestamps (ms)
const VITALS_ANOMALY_THRESHOLD_BPM = 150;
const VITALS_ANOMALY_SUSTAINED_MS = 60_000;

// ─── Last motion timestamps per elder (from motion_sensor devices) ────────────
const lastMotionByElder = new Map<string, number>(); // elderId → timestamp ms

// ─── Last heartbeat per device ───────────────────────────────────────────────
const lastHeartbeatByDevice = new Map<string, number>(); // deviceId → timestamp ms

// ─── Helper: create alert and broadcast ──────────────────────────────────────
async function createAlert(params: {
  elderId: string;
  type: string;
  severity: string;
  payload?: Record<string, unknown>;
}) {
  const alert = await prisma.alert.create({
    data: {
      elderId: params.elderId,
      type: params.type,
      severity: params.severity,
      status: "open",
      payload: (params.payload ?? {}) as Prisma.InputJsonValue,
    },
  });

  const serialized = serializeAlert(alert);
  broadcastAlertNew(serialized);
  await sendPushToElderSubscribers(params.elderId, { type: "alert.new", data: serialized });

  return serialized;
}

// ─── Main ingest dispatcher ──────────────────────────────────────────────────
export async function processIngestFrame(
  frame: IngestFrame,
  deviceId: string,
  elderId: string
): Promise<void> {
  // Update device lastSeenAt on every frame
  lastHeartbeatByDevice.set(deviceId, Date.now());
  await prisma.device.update({
    where: { id: deviceId },
    data: { lastSeenAt: new Date() },
  });

  switch (frame.type) {
    case "fall": {
      await createAlert({
        elderId,
        type: "fall",
        severity: "critical",
        payload: { gForce: frame.payload.gForce, orientation: frame.payload.orientation, ts: frame.payload.ts },
      });
      break;
    }

    case "sos": {
      await createAlert({
        elderId,
        type: "sos",
        severity: "critical",
        payload: { ts: frame.payload.ts },
      });
      break;
    }

    case "vitals": {
      const { ts, heartRate, spo2, steps, batteryPct } = frame.payload;

      // Save vitals sample
      const sample = await prisma.vitalsSample.create({
        data: {
          elderId,
          deviceId,
          ts: new Date(ts),
          heartRate: heartRate ?? null,
          spo2: spo2 ?? null,
          steps: steps ?? null,
          batteryPct: batteryPct ?? null,
        },
      });

      // Update device batteryPct
      if (batteryPct !== undefined) {
        await prisma.device.update({
          where: { id: deviceId },
          data: { batteryPct },
        });
      }

      // Broadcast vitals tick to connected clients
      broadcastVitalsTick(serializeVitalsSample(sample));

      // Track high HR for anomaly detection
      if (heartRate !== undefined && heartRate >= VITALS_ANOMALY_THRESHOLD_BPM) {
        const window = highHrWindows.get(elderId) ?? [];
        window.push(Date.now());
        // Keep only samples within the last 2 minutes
        const cutoff = Date.now() - 120_000;
        const trimmed = window.filter((t) => t > cutoff);
        highHrWindows.set(elderId, trimmed);

        // Check if sustained for 60s
        const oldest = trimmed[0];
        if (oldest !== undefined && Date.now() - oldest >= VITALS_ANOMALY_SUSTAINED_MS) {
          // Deduplicate: only create one open vitals_anomaly alert per elder
          const existing = await prisma.alert.findFirst({
            where: { elderId, type: "vitals_anomaly", status: "open" },
          });
          if (!existing) {
            await createAlert({
              elderId,
              type: "vitals_anomaly",
              severity: "warn",
              payload: { heartRate, sustainedMs: VITALS_ANOMALY_SUSTAINED_MS },
            });
          }
        }
      } else {
        // Reset window if HR drops below threshold
        highHrWindows.delete(elderId);
      }
      break;
    }

    case "motion": {
      if (frame.payload.detected) {
        lastMotionByElder.set(elderId, Date.now());
      }
      break;
    }

    case "door": {
      // No specific alert for door — store in audit or handle in future
      break;
    }

    case "heartbeat": {
      const { batteryPct } = frame.payload;
      if (batteryPct !== undefined) {
        await prisma.device.update({
          where: { id: deviceId },
          data: { batteryPct },
        });
      }

      // Broadcast updated device status
      const device = await prisma.device.findUnique({ where: { id: deviceId } });
      if (device) {
        broadcastDeviceStatus({
          id: device.id,
          online: true,
          lastSeenAt: new Date().toISOString(),
        });
      }
      break;
    }

    case "medication_taken": {
      const { scheduleId } = frame.payload;
      // Find the most recent pending event for this schedule
      const event = await prisma.medicationEvent.findFirst({
        where: { scheduleId, status: "pending" },
        orderBy: { dueAt: "asc" },
      });

      if (event) {
        await prisma.medicationEvent.update({
          where: { id: event.id },
          data: {
            status: "taken",
            takenAt: new Date(frame.payload.ts),
            source: "wearable_confirm",
          },
        });
      }
      break;
    }
  }
}

// ─── Inactivity check (every 5 minutes) ──────────────────────────────────────
const INACTIVITY_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

async function checkInactivity() {
  const now = new Date();
  const hour = now.getHours();
  // Only during 06:00-22:00 local time
  if (hour < 6 || hour >= 22) return;

  const elders = await prisma.elder.findMany({ include: { devices: true } });

  for (const elder of elders) {
    // Only check if the elder has motion_sensor devices
    const hasMotionSensor = elder.devices.some((d) => d.type === "motion_sensor");
    if (!hasMotionSensor) continue;

    const lastMotion = lastMotionByElder.get(elder.id);
    if (lastMotion === undefined) continue; // Never received motion (skip until we have baseline)

    const elapsed = Date.now() - lastMotion;
    if (elapsed > INACTIVITY_THRESHOLD_MS) {
      // Only create one open inactivity alert per elder
      const existing = await prisma.alert.findFirst({
        where: { elderId: elder.id, type: "inactivity", status: "open" },
      });
      if (!existing) {
        await createAlert({
          elderId: elder.id,
          type: "inactivity",
          severity: "warn",
          payload: { lastMotionAt: new Date(lastMotion).toISOString(), elapsedMs: elapsed },
        });
      }
    }
  }
}

// ─── Device heartbeat check (every 1 minute) ─────────────────────────────────
const DEVICE_OFFLINE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

async function checkDeviceHeartbeats() {
  const devices = await prisma.device.findMany();

  for (const device of devices) {
    if (!device.lastSeenAt) continue;

    const elapsed = Date.now() - device.lastSeenAt.getTime();
    if (elapsed > DEVICE_OFFLINE_THRESHOLD_MS) {
      // Create device_offline alert if not already open
      const existing = await prisma.alert.findFirst({
        where: { elderId: device.elderId, type: "device_offline", status: "open", payload: { path: ["deviceId"], equals: device.id } },
      });

      if (!existing) {
        await createAlert({
          elderId: device.elderId,
          type: "device_offline",
          severity: "warn",
          payload: { deviceId: device.id, serial: device.serial, lastSeenAt: device.lastSeenAt.toISOString() },
        });
      }

      // Broadcast offline status
      broadcastDeviceStatus({
        id: device.id,
        online: false,
        lastSeenAt: device.lastSeenAt.toISOString(),
      });
    }
  }
}

// ─── Medication missed check (every 1 minute) ─────────────────────────────────
const MEDICATION_GRACE_MS = 30 * 60 * 1000; // 30 minutes

async function checkMedicationMissed() {
  const now = new Date();
  const graceCutoff = new Date(now.getTime() - MEDICATION_GRACE_MS);

  // Find all pending events whose dueAt + 30min has passed
  const overdueEvents = await prisma.medicationEvent.findMany({
    where: {
      status: "pending",
      dueAt: { lte: graceCutoff },
    },
    include: { schedule: true },
  });

  for (const event of overdueEvents) {
    // Mark as missed
    await prisma.medicationEvent.update({
      where: { id: event.id },
      data: { status: "missed" },
    });

    // Create medication_missed alert
    await createAlert({
      elderId: event.schedule.elderId,
      type: "medication_missed",
      severity: "info",
      payload: {
        eventId: event.id,
        scheduleId: event.scheduleId,
        drugName: event.schedule.drugName,
        dose: event.schedule.dose,
        dueAt: event.dueAt.toISOString(),
      },
    });
  }
}

// ─── Background interval workers ─────────────────────────────────────────────
let inactivityInterval: ReturnType<typeof setInterval> | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let medicationInterval: ReturnType<typeof setInterval> | null = null;

export function startBackgroundWorkers() {
  inactivityInterval = setInterval(() => {
    checkInactivity().catch((err) => console.error("[alert-engine] inactivity check error:", err));
  }, 5 * 60 * 1000);

  heartbeatInterval = setInterval(() => {
    checkDeviceHeartbeats().catch((err) => console.error("[alert-engine] heartbeat check error:", err));
  }, 60_000);

  medicationInterval = setInterval(() => {
    checkMedicationMissed().catch((err) => console.error("[alert-engine] medication check error:", err));
  }, 60_000);

  console.log("[alert-engine] Background workers started");
}

export function stopBackgroundWorkers() {
  if (inactivityInterval) clearInterval(inactivityInterval);
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  if (medicationInterval) clearInterval(medicationInterval);
}
