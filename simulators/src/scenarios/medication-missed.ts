/**
 * Medication-missed scenario — fires a medication_missed alert via /demo/scenarios.
 *
 * Run: pnpm sim:medication-missed (from simulators/)
 */

import { triggerScenario } from "../lib/api-client.js";

export {};

async function main(): Promise<void> {
  console.log("[sim:medication-missed] Triggering medication_missed alert via /demo/scenarios...");
  const result = (await triggerScenario("medication_missed")) as { alert: { id: string; type: string; severity: string } };
  console.log(
    `[sim:medication-missed] Done. Alert(id=${result.alert.id}, type=${result.alert.type}, severity=${result.alert.severity})`
  );
}

main().catch((err) => {
  console.error("[sim:medication-missed] Fatal:", err.message);
  process.exit(1);
});
