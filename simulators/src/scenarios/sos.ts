/**
 * SOS scenario — sends a single SOS event from the wearable and exits.
 *
 * Expected backend response: Alert(type=sos, severity=critical) within 1s.
 * Both web portal and mobile app should receive the alert via /ws/client.
 *
 * Run: pnpm sim:sos  (from simulators/)
 */

import { WsClient } from "../lib/ws-client.js";
import { WEARABLE } from "../lib/devices.js";

async function main(): Promise<void> {
  console.log("[sim:sos] Connecting to backend...");
  const client = new WsClient(WEARABLE.token);
  await client.connect();

  const frame = {
    type: "sos" as const,
    deviceId: WEARABLE.id,
    payload: {
      ts: new Date().toISOString(),
    },
  };

  console.log("[sim:sos] Sending SOS event:", JSON.stringify(frame, null, 2));
  client.send(frame);

  await new Promise((r) => setTimeout(r, 500));
  client.close();
  console.log("[sim:sos] Done. Expect Alert(type=sos, severity=critical) in the dashboard.");
}

main().catch((err) => {
  console.error("[sim:sos] Fatal:", err);
  process.exit(1);
});
