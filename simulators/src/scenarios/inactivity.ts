/**
 * Inactivity scenario — fires an inactivity alert via /demo/scenarios/inactivity.
 *
 * Run: pnpm sim:inactivity (from simulators/)
 */

import { triggerScenario } from "../lib/api-client.js";

export {};

async function main(): Promise<void> {
  console.log("[sim:inactivity] Triggering inactivity alert via /demo/scenarios...");
  const result = (await triggerScenario("inactivity")) as { alert: { id: string; type: string; severity: string } };
  console.log(
    `[sim:inactivity] Done. Alert(id=${result.alert.id}, type=${result.alert.type}, severity=${result.alert.severity})`
  );
}

main().catch((err) => {
  console.error("[sim:inactivity] Fatal:", err.message);
  process.exit(1);
});
