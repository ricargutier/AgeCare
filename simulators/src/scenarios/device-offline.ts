/**
 * Device-offline scenario — fires a device_offline alert via /demo/scenarios.
 *
 * Run: pnpm sim:device-offline (from simulators/)
 */

import { triggerScenario } from "../lib/api-client.js";

export {};

async function main(): Promise<void> {
  console.log("[sim:device-offline] Triggering device_offline alert via /demo/scenarios...");
  const result = (await triggerScenario("device_offline")) as { alert: { id: string; type: string; severity: string } };
  console.log(
    `[sim:device-offline] Done. Alert(id=${result.alert.id}, type=${result.alert.type}, severity=${result.alert.severity})`
  );
}

main().catch((err) => {
  console.error("[sim:device-offline] Fatal:", err.message);
  process.exit(1);
});
