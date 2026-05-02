/**
 * Fall scenario — sends a single fall event from the wearable and exits.
 *
 * Expected backend response: Alert(type=fall, severity=critical) within 1s.
 * Both web portal and mobile app should receive the alert via /ws/client.
 *
 * Run: pnpm sim:fall  (from simulators/)
 */

import { WsClient } from "../lib/ws-client.js";
import { WEARABLE } from "../lib/devices.js";

async function main(): Promise<void> {
  console.log("[sim:fall] Connecting to backend...");
  const client = new WsClient(WEARABLE.token);
  await client.connect();

  const frame = {
    type: "fall" as const,
    deviceId: WEARABLE.id,
    payload: {
      ts: new Date().toISOString(),
      gForce: 4.2,
      orientation: "face_down",
    },
  };

  console.log("[sim:fall] Sending fall event:", JSON.stringify(frame, null, 2));
  client.send(frame);

  // Give the frame time to transmit before closing
  await new Promise((r) => setTimeout(r, 500));
  client.close();
  console.log("[sim:fall] Done. Expect Alert(type=fall, severity=critical) in the dashboard.");
}

main().catch((err) => {
  console.error("[sim:fall] Fatal:", err);
  process.exit(1);
});
