/**
 * Vitals-anomaly scenario — sends vitals frames with HR 165 every 5s for 90s.
 *
 * Expected backend response: After detecting sustained high HR (backend
 * typically fires after 2–3 consecutive anomalous readings), an
 * Alert(type=vitals_anomaly, severity=warn) should appear within ~15s.
 *
 * Run: pnpm sim:vitals-anomaly  (from simulators/)
 */

import { WsClient, type IngestFrame } from "../lib/ws-client.js";
import { WEARABLE } from "../lib/devices.js";

const ANOMALOUS_HR = 165;
const INTERVAL_MS = 5_000;
const DURATION_MS = 90_000;

async function main(): Promise<void> {
  console.log("[sim:vitals-anomaly] Connecting to backend...");
  const client = new WsClient(WEARABLE.token);
  await client.connect();

  console.log(
    `[sim:vitals-anomaly] Sending HR=${ANOMALOUS_HR} vitals every ${INTERVAL_MS / 1000}s for ${DURATION_MS / 1000}s...`
  );

  const startedAt = Date.now();
  let count = 0;

  function sendAnomaly(): void {
    const frame: IngestFrame = {
      type: "vitals",
      deviceId: WEARABLE.id,
      payload: {
        ts: new Date().toISOString(),
        heartRate: ANOMALOUS_HR,
        spo2: 97,
        batteryPct: 80,
      },
    };
    client.send(frame);
    count++;
    console.log(`[sim:vitals-anomaly] Sent vitals #${count}: HR=${ANOMALOUS_HR}`);
  }

  sendAnomaly();
  const timer = setInterval(() => {
    if (Date.now() - startedAt >= DURATION_MS) {
      clearInterval(timer);
      console.log(
        `[sim:vitals-anomaly] Done (${count} frames sent). Expect Alert(type=vitals_anomaly, severity=warn).`
      );
      setTimeout(() => {
        client.close();
        process.exit(0);
      }, 500);
      return;
    }
    sendAnomaly();
  }, INTERVAL_MS);
}

main().catch((err) => {
  console.error("[sim:vitals-anomaly] Fatal:", err);
  process.exit(1);
});
